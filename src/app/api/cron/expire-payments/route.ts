import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { touchOrderUpdatedAt } from "@/lib/order-sync";

const GATEWAY_TIMEOUT_MINUTES = 30;
// Unpaid room reservations are held for 3 hours, then auto-released.
const RESERVE_HOLD_MINUTES = 180;

/**
 * GET /api/cron/expire-payments
 * Secured by CRON_SECRET bearer token (Vercel Cron sends this automatically).
 *
 * Expires stale digital payments:
 *  - ESEWA/KHALTI payments PENDING for > 30 minutes → EXPIRED
 *  - Cancels associated orders still in PENDING status
 *  - BANK payments are NOT auto-expired (biller decides)
 */
export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - GATEWAY_TIMEOUT_MINUTES * 60 * 1000);

  // Find stale gateway payments
  const stalePayments = await db.payment.findMany({
    where: {
      status: "PENDING",
      method: { in: ["ESEWA", "KHALTI"] },
      createdAt: { lt: cutoff },
    },
    select: {
      id: true,
      orderId: true,
      method: true,
      order: { select: { orderNo: true, status: true, restaurantId: true } },
    },
  });

  let expiredCount = 0;
  let cancelledCount = 0;

  for (const payment of stalePayments) {
    // Expire the payment
    await db.payment.update({
      where: { id: payment.id },
      data: { status: "EXPIRED" },
    });
    await touchOrderUpdatedAt(payment.orderId);
    expiredCount++;

    // Cancel the associated order if it's still PENDING
    if (payment.order.status === "PENDING") {
      await db.order.update({
        where: { id: payment.orderId },
        data: { status: "REJECTED", rejectReason: "Payment expired" },
      });
      cancelledCount++;
    }

    logAudit({
      action: "PAYMENT_EXPIRED",
      entity: "Payment",
      entityId: payment.id,
      detail: `${payment.method} payment expired after ${GATEWAY_TIMEOUT_MINUTES}min for order ${payment.order.orderNo}`,
      metadata: {
        orderId: payment.orderId,
        method: payment.method,
        orderCancelled: payment.order.status === "PENDING",
      },
      restaurantId: payment.order.restaurantId,
    });
  }

  // ── Release unpaid room reservations held longer than the hold window ──
  const reserveCutoff = new Date(Date.now() - RESERVE_HOLD_MINUTES * 60 * 1000);
  const staleHolds = await db.roomBooking.findMany({
    where: {
      status: "PENDING",
      advancePaid: false,
      paymentStatus: "UNPAID",
      createdAt: { lt: reserveCutoff },
    },
    select: { id: true, restaurantId: true, roomId: true },
  });

  let releasedHolds = 0;
  for (const hold of staleHolds) {
    await db.roomBooking.update({
      where: { id: hold.id },
      data: {
        status: "REJECTED",
        cancelledBy: "SYSTEM",
        cancelReason: "Reservation hold expired — payment not completed in time",
        cancelRequestedAt: new Date(),
      },
    });
    releasedHolds++;
    logAudit({
      action: "BOOKING_HOLD_EXPIRED",
      entity: "RoomBooking",
      entityId: hold.id,
      detail: `Unpaid room reservation released after ${RESERVE_HOLD_MINUTES}min`,
      metadata: { roomId: hold.roomId },
      restaurantId: hold.restaurantId,
    });
  }

  return NextResponse.json({
    success: true,
    expiredPayments: expiredCount,
    cancelledOrders: cancelledCount,
    releasedHolds,
    checkedAt: new Date().toISOString(),
  });
}
