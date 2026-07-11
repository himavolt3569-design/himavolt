import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { requireStaffForRestaurant } from "@/lib/staff-auth";
import { getAuthUser } from "@/lib/auth";
import { STAFF_TABLE_MANAGE_ROLES } from "@/lib/staff-roles";

type Params = { params: Promise<{ id: string }> };

/** Unguessable token printed in the table QR — the table identity the client can't forge. */
function newQrToken() {
  return randomUUID().replace(/-/g, "");
}

async function verifyAccess(req: NextRequest, restaurantId: string) {
  const staff = await requireStaffForRestaurant(req, restaurantId);
  if (staff) return { actorId: staff.staffId, role: staff.role };
  const user = await getAuthUser();
  if (!user) return null;
  const r = await db.restaurant.findUnique({ where: { id: restaurantId }, select: { ownerId: true } });
  if (!r || r.ownerId !== user.id) return null;
  return { actorId: user.id, role: "OWNER" };
}

/**
 * POST /api/restaurants/[id]/tables/bulk — create a numbered range of tables in
 * ONE round-trip. This replaces the old client loop that fired one HTTP POST per
 * table (20 tables = 20 sequential requests on the small serverless pool, which
 * is why bulk create was slow). Numbers that already exist are skipped, so the
 * call is safe to retry.
 *
 * Body: { from: number, to: number, capacity?: number }
 */
export async function POST(req: NextRequest, { params }: Params) {
  const { id: restaurantId } = await params;
  const access = await verifyAccess(req, restaurantId);
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const allowed: string[] = ["OWNER", ...STAFF_TABLE_MANAGE_ROLES];
  if (!allowed.includes(access.role)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const from = Number(body.from);
  const to = Number(body.to);
  const capacity = typeof body.capacity === "number" && body.capacity > 0 ? body.capacity : 4;

  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < from) {
    return NextResponse.json({ error: "Invalid range." }, { status: 400 });
  }
  if (to - from > 99) {
    return NextResponse.json({ error: "You can create at most 100 tables at once." }, { status: 400 });
  }

  try {
    // Only create the numbers that don't already exist — cheaper than relying
    // solely on skipDuplicates and lets us report an accurate created count.
    const existing = await db.table.findMany({
      where: { restaurantId, tableNo: { gte: from, lte: to } },
      select: { tableNo: true },
    });
    const taken = new Set(existing.map((t) => t.tableNo));

    const rows = [];
    for (let n = from; n <= to; n++) {
      if (taken.has(n)) continue;
      rows.push({ tableNo: n, capacity, restaurantId, qrToken: newQrToken() });
    }

    if (rows.length === 0) {
      return NextResponse.json({ created: 0, tables: [] }, { status: 200 });
    }

    // Single INSERT for the whole range. skipDuplicates guards the rare race
    // where a concurrent create grabbed a number between our read and write.
    const tables = await db.table.createManyAndReturn({
      data: rows,
      skipDuplicates: true,
    });

    return NextResponse.json({ created: tables.length, tables }, { status: 201 });
  } catch (err) {
    console.error("[tables/bulk] POST failed", err);
    return NextResponse.json(
      { error: "Could not create tables. Please try again." },
      { status: 500 },
    );
  }
}
