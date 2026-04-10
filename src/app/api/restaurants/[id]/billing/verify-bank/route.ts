import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStaffForRestaurant } from "@/lib/staff-auth";
import { logAudit, getClientIp } from "@/lib/audit";
import { getAuthUser } from "@/lib/auth";

async function verifyStaffAccess(req: NextRequest, restaurantId: string) {
  const staff = await requireStaffForRestaurant(req, restaurantId);
  if (!staff) return null;
  if (!["CASHIER", "MANAGER", "SUPER_ADMIN"].includes(staff.role)) return null;
  return staff;
}

/**
 * POST /api/restaurants/[id]/billing/verify-bank
 * Biller verifies or rejects a bank transfer payment.
 *
 * Body: { paymentId: string, action: "VERIFY" | "REJECT", note?: string }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Auth: staff or owner
  const staff = await verifyStaffAccess(req, id);
  let actorId = staff?.staffId;

  if (!staff) {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized — Cashier/Manager access required" },
        { status: 401 },
      );
    }
    const restaurant = await db.restaurant.findUnique({
      where: { id },
      select: { ownerId: true },
    });
    if (!restaurant || restaurant.ownerId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    actorId = user.id;
  }

  const body = await req.json();
  const { paymentId, action, note } = body;

  if (!paymentId || !action) {
    return NextResponse.json(
      { error: "paymentId and action are required" },
      { status: 400 },
    );
  }

  if (!["VERIFY", "REJECT"].includes(action)) {
    return NextResponse.json(
      { error: "action must be VERIFY or REJECT" },
      { status: 400 },
    );
  }

  // Find the payment and verify it belongs to this restaurant
  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    include: {
      order: { select: { id: true, orderNo: true, restaurantId: true } },
    },
  });

  if (!payment || payment.order.restaurantId !== id) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  if (payment.status === "COMPLETED") {
    return NextResponse.json(
      { error: "Payment is already verified and completed" },
      { status: 400 },
    );
  }

  if (action === "VERIFY") {
    const updated = await db.payment.update({
      where: { id: paymentId },
      data: {
        status: "COMPLETED",
        verifiedBy: actorId,
        verifiedAt: new Date(),
        paidAt: new Date(),
      },
    });

    // Update bill paidVia with the actual payment method
    await db.bill.updateMany({
      where: { orderId: payment.orderId },
      data: { paidVia: payment.method },
    });

    logAudit({
      action: "BANK_PAYMENT_VERIFIED",
      entity: "Payment",
      entityId: paymentId,
      detail: `${payment.method} payment verified for order ${payment.order.orderNo}`,
      metadata: { orderId: payment.orderId, method: payment.method, proofUrl: payment.proofUrl },
      userId: actorId,
      restaurantId: id,
      ipAddress: getClientIp(req.headers),
    });

    return NextResponse.json({ success: true, payment: updated });
  }

  // REJECT
  const updated = await db.payment.update({
    where: { id: paymentId },
    data: {
      status: "FAILED",
      rejectionNote: note || "Bank transfer rejected by staff",
    },
  });

  logAudit({
    action: "BANK_PAYMENT_REJECTED",
    entity: "Payment",
    entityId: paymentId,
    detail: `${payment.method} payment rejected for order ${payment.order.orderNo}: ${note || "No reason provided"}`,
    metadata: { orderId: payment.orderId, method: payment.method, reason: note },
    userId: actorId,
    restaurantId: id,
    ipAddress: getClientIp(req.headers),
  });

  return NextResponse.json({ success: true, payment: updated });
}
