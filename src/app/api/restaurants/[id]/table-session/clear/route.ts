import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStaffForRestaurant } from "@/lib/staff-auth";
import { getAuthUser } from "@/lib/auth";
import { logAudit, getClientIp } from "@/lib/audit";
import { STAFF_BILLING_ROLES, STAFF_TABLE_MANAGE_ROLES } from "@/lib/staff-roles";
import { endTableSession } from "@/lib/table-session";

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

  // Shared helper handles the delete-inactive-first dance required by the
  // @@unique([restaurantId, tableNo, isActive]) constraint.
  const result = await endTableSession(restaurantId, { orderId, tableNo });
  if (result.error) {
    return NextResponse.json(
      { error: `Failed to clear table session: ${result.error}` },
      { status: 500 },
    );
  }

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

  return NextResponse.json({ success: true, cleared: result.cleared });
}
