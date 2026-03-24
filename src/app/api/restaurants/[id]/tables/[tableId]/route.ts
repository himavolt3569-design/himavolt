import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStaffForRestaurant } from "@/lib/staff-auth";
import { getAuthUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string; tableId: string }> };

async function verifyAccess(req: NextRequest, restaurantId: string) {
  const staff = await requireStaffForRestaurant(req, restaurantId);
  if (staff) return { actorId: staff.staffId, role: staff.role };
  const user = await getAuthUser();
  if (!user) return null;
  const r = await db.restaurant.findUnique({ where: { id: restaurantId }, select: { ownerId: true } });
  if (!r || r.ownerId !== user.id) return null;
  return { actorId: user.id, role: "OWNER" };
}

/** PATCH /api/restaurants/[id]/tables/[tableId] — update label or capacity */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id: restaurantId, tableId } = await params;
  const access = await verifyAccess(req, restaurantId);
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["OWNER", "MANAGER", "SUPER_ADMIN"].includes(access.role)) {
    return NextResponse.json({ error: "Manager or owner access required" }, { status: 403 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.label !== undefined) data.label = body.label;
  if (body.capacity !== undefined) data.capacity = body.capacity;
  if (body.isActive !== undefined) data.isActive = body.isActive;

  const table = await db.table.update({ where: { id: tableId }, data });
  return NextResponse.json({ table });
}

/** DELETE /api/restaurants/[id]/tables/[tableId] — remove a table */
export async function DELETE(req: NextRequest, { params }: Params) {
  const { id: restaurantId, tableId } = await params;
  const access = await verifyAccess(req, restaurantId);
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["OWNER", "MANAGER", "SUPER_ADMIN"].includes(access.role)) {
    return NextResponse.json({ error: "Manager or owner access required" }, { status: 403 });
  }

  await db.table.delete({ where: { id: tableId } });
  return NextResponse.json({ success: true });
}
