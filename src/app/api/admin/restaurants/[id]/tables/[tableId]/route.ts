import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logAudit, getClientIp } from "@/lib/audit";
import {
  requireAdminForRestaurant,
  adminActorLabel,
  TENANT_MANAGE_PERMISSIONS,
} from "@/lib/admin-restaurant-guard";

type Params = { params: Promise<{ id: string; tableId: string }> };

/** Master-admin edit/delete of a single table. The table is re-read against the
 *  restaurant in the URL first — an admin can address any business, so a
 *  mismatched pair would otherwise be an unguarded cross-tenant write. */

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id, tableId } = await params;
  const guard = await requireAdminForRestaurant(req, id, TENANT_MANAGE_PERMISSIONS);
  if ("response" in guard) return guard.response;

  const existing = await db.table.findFirst({
    where: { id: tableId, restaurantId: id },
    select: { id: true, tableNo: true },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "Table not found for this business" },
      { status: 404 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  if (body.label !== undefined) {
    data.label =
      typeof body.label === "string" && body.label.trim()
        ? body.label.trim().slice(0, 60)
        : null;
  }
  if (body.capacity !== undefined) {
    const capacity = Number(body.capacity);
    if (!Number.isFinite(capacity) || capacity < 1 || capacity > 100) {
      return NextResponse.json({ error: "Invalid capacity" }, { status: 400 });
    }
    data.capacity = Math.round(capacity);
  }
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const table = await db.table.update({ where: { id: tableId }, data });

  logAudit({
    action: "TABLE_UPDATED",
    entity: "Table",
    entityId: tableId,
    detail: `Platform admin updated table ${existing.tableNo} at "${guard.restaurant.name}"`,
    metadata: { by: adminActorLabel(guard.admin), fields: Object.keys(data) },
    restaurantId: id,
    ipAddress: getClientIp(req.headers),
  });

  return NextResponse.json({ table });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { id, tableId } = await params;
  const guard = await requireAdminForRestaurant(req, id, TENANT_MANAGE_PERMISSIONS);
  if ("response" in guard) return guard.response;

  const existing = await db.table.findFirst({
    where: { id: tableId, restaurantId: id },
    select: { id: true, tableNo: true },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "Table not found for this business" },
      { status: 404 },
    );
  }

  // A table with a live session is a table with diners sitting at it. Deleting
  // it orphans their order, so say so instead of silently breaking service.
  const liveSession = await db.tableSession.findFirst({
    where: { restaurantId: id, tableNo: existing.tableNo, isActive: true },
    select: { id: true },
  });
  if (liveSession) {
    return NextResponse.json(
      { error: "This table has a live session. Clear it before deleting." },
      { status: 409 },
    );
  }

  await db.table.delete({ where: { id: tableId } });

  logAudit({
    action: "TABLE_DELETED",
    entity: "Table",
    entityId: tableId,
    detail: `Platform admin deleted table ${existing.tableNo} from "${guard.restaurant.name}"`,
    metadata: { by: adminActorLabel(guard.admin), tableNo: existing.tableNo },
    restaurantId: id,
    ipAddress: getClientIp(req.headers),
  });

  return NextResponse.json({ deleted: true });
}
