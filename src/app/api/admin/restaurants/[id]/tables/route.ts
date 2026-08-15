import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { logAudit, getClientIp } from "@/lib/audit";
import {
  requireAdminForRestaurant,
  adminActorLabel,
  TENANT_VIEW_PERMISSIONS,
  TENANT_MANAGE_PERMISSIONS,
} from "@/lib/admin-restaurant-guard";

type Params = { params: Promise<{ id: string }> };

/**
 * Master-admin table management on behalf of a business. Mirrors the owner
 * route at /api/restaurants/[id]/tables, minus the polling-driven maintenance
 * work (legacy QR backfill, idle-session sweeping) — that belongs on the hot
 * path an owner dashboard actually polls, not on an occasional support read.
 */

/** Unguessable token printed in the table QR — the table identity a client can't forge. */
function newQrToken() {
  return randomUUID().replace(/-/g, "");
}

export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const guard = await requireAdminForRestaurant(req, id, TENANT_VIEW_PERMISSIONS);
  if ("response" in guard) return guard.response;

  try {
    const tables = await db.table.findMany({
      where: { restaurantId: id },
      orderBy: { tableNo: "asc" },
    });

    const activeSessions = await db.tableSession.findMany({
      where: { restaurantId: id, isActive: true },
      select: { tableNo: true },
    });
    const occupied = new Set(activeSessions.map((s) => s.tableNo));

    return NextResponse.json(
      {
        tables: tables.map((t) => ({ ...t, isOccupied: occupied.has(t.tableNo) })),
        restaurant: { slug: guard.restaurant.slug, name: guard.restaurant.name },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[Admin tables] GET failed", err);
    return NextResponse.json(
      { error: "Could not load tables. Please try again." },
      { status: 503, headers: { "Retry-After": "2" } },
    );
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const guard = await requireAdminForRestaurant(req, id, TENANT_MANAGE_PERMISSIONS);
  if ("response" in guard) return guard.response;

  const body = await req.json().catch(() => ({}));
  const label =
    typeof body.label === "string" && body.label.trim() ? body.label.trim().slice(0, 60) : null;
  const capacity =
    typeof body.capacity === "number" && body.capacity > 0 && body.capacity <= 100
      ? Math.round(body.capacity)
      : 4;
  // tableNo stays the internal routing handle (QR URLs + live sessions key off
  // it); staff name tables by label, so it is auto-assigned unless given.
  const explicitNo =
    typeof body.tableNo === "number" && body.tableNo > 0 ? Math.round(body.tableNo) : null;
  // How many to create in one go, so a venue can be set up in a single action.
  const count =
    typeof body.count === "number" && body.count > 1 ? Math.min(100, Math.round(body.count)) : 1;

  const created: unknown[] = [];

  if (explicitNo !== null) {
    try {
      const table = await db.table.create({
        data: { tableNo: explicitNo, label, capacity, restaurantId: id, qrToken: newQrToken() },
      });
      created.push(table);
    } catch {
      return NextResponse.json({ error: "Table number already exists" }, { status: 409 });
    }
  } else {
    const last = await db.table.findFirst({
      where: { restaurantId: id },
      orderBy: { tableNo: "desc" },
      select: { tableNo: true },
    });
    let next = (last?.tableNo ?? 0) + 1;

    for (let made = 0; made < count; ) {
      let placed = false;
      // Retry past collisions — the @@unique constraint guards concurrent creates.
      for (let attempt = 0; attempt < 6 && !placed; attempt++) {
        try {
          const table = await db.table.create({
            data: {
              tableNo: next,
              label: count > 1 ? label && `${label} ${made + 1}` : label,
              capacity,
              restaurantId: id,
              qrToken: newQrToken(),
            },
          });
          created.push(table);
          placed = true;
        } catch {
          next++; // number taken by a concurrent create — try the next one
        }
      }
      if (!placed) {
        return NextResponse.json(
          { error: "Could not allocate a table number" },
          { status: 500 },
        );
      }
      next++;
      made++;
    }
  }

  logAudit({
    action: "TABLE_CREATED",
    entity: "Table",
    detail: `Platform admin added ${created.length} table(s) to "${guard.restaurant.name}"`,
    metadata: { by: adminActorLabel(guard.admin), count: created.length },
    restaurantId: id,
    ipAddress: getClientIp(req.headers),
  });

  return NextResponse.json(
    { tables: created, table: created[0] },
    { status: 201 },
  );
}
