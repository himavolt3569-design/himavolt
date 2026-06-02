import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyKhaltiPayment } from "@/lib/payments/khalti";
import { decryptIfPresent } from "@/lib/encryption";
import { touchOrderUpdatedAt } from "@/lib/order-sync";
import { sendNotificationToRestaurantStaff } from "@/lib/notifications";

async function logWebhook(
  event: string,
  orderId: string | null,
  rawPayload: string,
  httpStatus: number,
  idempotencyKey?: string,
) {
  try {
    await db.webhookLog.create({
      data: { gateway: "KHALTI", event, orderId, rawPayload, httpStatus, idempotencyKey },
    });
  } catch {
    // Non-fatal: don't break payment processing if logging fails
  }
}

export async function GET(req: NextRequest) {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("orderId");
  const pidx = searchParams.get("pidx");
  const khaltiStatus = searchParams.get("status");
  const rawPayload = JSON.stringify(Object.fromEntries(searchParams.entries()));

  if (!orderId) {
    await logWebhook("payment.error", null, rawPayload, 302);
    return NextResponse.redirect(`${APP_URL}?payment=error`);
  }

  // User explicitly cancelled — redirect without marking FAILED so they can retry
  if (khaltiStatus === "User canceled") {
    await logWebhook("payment.cancelled", orderId, rawPayload, 302);
    return NextResponse.redirect(`${APP_URL}/track/${orderId}?payment=cancelled`);
  }

  if (khaltiStatus === "Completed" && pidx) {
    // Idempotency: check if this webhook was already processed
    const existing = await db.webhookLog.findUnique({
      where: { idempotencyKey: pidx },
    });
    if (existing) {
      return NextResponse.redirect(
        `${APP_URL}/track/${orderId}?payment=success`,
      );
    }

    // Get order + payment row for amount verification
    const order = await db.order.findUnique({
      where: { id: orderId },
      select: {
        restaurantId: true,
        orderNo: true,
        total: true,
        payment: { select: { amount: true } },
      },
    });
    const paymentConfig = order
      ? await db.paymentConfig.findUnique({
          where: { restaurantId: order.restaurantId },
        })
      : null;
    const secretKey = decryptIfPresent(paymentConfig?.khaltiSecretKey) || "";

    const verification = await verifyKhaltiPayment(pidx, secretKey);

    // Server-side amount check against the gateway-verified amount.
    // Rejects forged callbacks or replay with a different order.
    const expectedAmount = order?.payment?.amount ?? order?.total ?? null;
    if (
      verification &&
      (expectedAmount == null ||
        Math.abs(verification.amount - expectedAmount) > 0.01)
    ) {
      await logWebhook("payment.amount_mismatch", orderId, rawPayload, 302, pidx);
      await db.payment.updateMany({
        where: { orderId, status: "PENDING" },
        data: { status: "FAILED" },
      });
      return NextResponse.redirect(`${APP_URL}/track/${orderId}?payment=failed`);
    }

    if (verification) {
      await db.payment.updateMany({
        where: { orderId, status: "PENDING" },
        data: {
          status: "COMPLETED",
          transactionId: verification.transactionId,
          pidx,
          paidAt: new Date(),
        },
      });
      await touchOrderUpdatedAt(orderId);
      await logWebhook("payment.success", orderId, rawPayload, 302, pidx);

      // Notify kitchen that payment is confirmed
      if (order) {
        sendNotificationToRestaurantStaff(order.restaurantId, {
          title: "Payment Confirmed",
          body: `Order #${order.orderNo} — Khalti payment verified`,
          data: { type: "PAYMENT_CONFIRMED", orderId, restaurantId: order.restaurantId },
        }).catch(() => { /* non-fatal */ });
      }

      return NextResponse.redirect(
        `${APP_URL}/track/${orderId}?payment=success`,
      );
    }
  }

  // Only mark as FAILED for explicit failure or failed verification
  if (khaltiStatus === "Expired" || khaltiStatus === "Failed" || (khaltiStatus === "Completed" && pidx)) {
    await db.payment.updateMany({
      where: { orderId, status: "PENDING" },
      data: { status: "FAILED" },
    });
    await touchOrderUpdatedAt(orderId);
  }

  await logWebhook("payment.failed", orderId, rawPayload, 302);
  return NextResponse.redirect(`${APP_URL}/track/${orderId}?payment=failed`);
}
