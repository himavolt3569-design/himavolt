import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStaffForRestaurant } from "@/lib/staff-auth";
import { getAuthUser } from "@/lib/auth";
import { logAudit, getClientIp } from "@/lib/audit";
import { STAFF_BILLING_ROLES, STAFF_TABLE_MANAGE_ROLES } from "@/lib/staff-roles";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/restaurants/[id]/table-session/clear
 * Manually clear (end) a table session so the next customer gets a fresh start.
 * Accepts either { tableNo } or { orderId }.
 * Requires CASHIER / MANAGER / SUPER_ADMIN staff role or restaurant owner.
 */
export async function POST(req: NextRequest, { params }: Params) {
  const { id: restaurantId } = await params;

  // Auth: staff or owner
  const staff = await requireStaffForRestaurant(req, restaurantId);
  let actorId = staff?.staffId;

  if (!staff) {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const restaurant = await db.restaurant.findUnique({
      where: { id: restaurantId },
      select: { ownerId: true },
    });
    if (!restaurant || restaurant.ownerId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    actorId = user.id;
  } else if (
    !(STAFF_BILLING_ROLES as readonly string[]).includes(staff.role) &&
    !(STAFF_TABLE_MANAGE_ROLES as readonly string[]).includes(staff.role)
  ) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const body = await req.json();
  const { tableNo, orderId } = body as { tableNo?: number; orderId?: string };

  if (!tableNo && !orderId) {
    return NextResponse.json(
      { error: "tableNo or orderId is required" },
      { status: 400 },
    );
  }

  // Find and end matching active sessions
  const where = orderId
    ? { restaurantId, orderId }
    : { restaurantId, tableNo: tableNo as number };

  // 1. Resolve the tableNo
  let resolvedTableNo = tableNo;
  if (!resolvedTableNo && orderId) {
    const active = await db.tableSession.findFirst({
      where: { restaurantId, orderId, isActive: true },
    });
    resolvedTableNo = active?.tableNo;
  }

  // 2. Delete any existing inactive sessions for this table to avoid unique constraint error
  // Prisma schema has @@unique([restaurantId, tableNo, isActive])
  if (resolvedTableNo) {
    await db.tableSession.deleteMany({
      where: { restaurantId, tableNo: resolvedTableNo, isActive: false },
    });
  }

  // 3. Safely end the active session
  const updated = await db.tableSession.updateMany({
    where: { ...where, isActive: true },
    data: { isActive: false, endedAt: new Date() },
  });

  logAudit({
    action: "TABLE_CLEARED",
    entity: "TableSession",
    entityId: orderId ?? `table-${tableNo}`,
    detail: tableNo
      ? `Table ${tableNo} manually cleared by staff`
      : `Table session for order cleared by staff`,
    userId: actorId,
    restaurantId,
    ipAddress: getClientIp(req.headers),
  });

  return NextResponse.json({ success: true, cleared: updated.count });
}
