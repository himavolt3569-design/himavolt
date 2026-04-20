import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyEsewaPayment } from "@/lib/payments/esewa";
import { decryptIfPresent } from "@/lib/encryption";
import { touchOrderUpdatedAt } from "@/lib/order-sync";
import { sendNotificationToRestaurantStaff } from "@/lib/notifications";

// Derive the app origin from the incoming request so redirects always
// point to the correct domain regardless of deployment environment.
function getAppUrl(req: NextRequest): string {
  return process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
}

async function logWebhook(
  event: string,
  orderId: string | null,
  rawPayload: string,
  httpStatus: number,
  idempotencyKey?: string,
) {
  try {
    await db.webhookLog.create({
      data: { gateway: "ESEWA", event, orderId, rawPayload, httpStatus, idempotencyKey },
    });
  } catch {
    // Non-fatal: don't break payment processing if logging fails
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("orderId");
  const status = searchParams.get("status");
  const encodedData = searchParams.get("data");
  const rawPayload = JSON.stringify(Object.fromEntries(searchParams.entries()));

  const APP_URL = getAppUrl(req);

  if (!orderId) {
    await logWebhook("payment.error", null, rawPayload, 302);
    return NextResponse.redirect(`${APP_URL}?payment=error`);
  }

  if (status === "failed") {
    await db.payment.updateMany({
      where: { orderId, status: "PENDING" },
      data: { status: "FAILED" },
    });
    await touchOrderUpdatedAt(orderId);
    await logWebhook("payment.failed", orderId, rawPayload, 302);
    return NextResponse.redirect(`${APP_URL}/track/${orderId}?payment=failed`);
  }

  if (encodedData) {
    try {
      const decoded = JSON.parse(
        Buffer.from(encodedData, "base64").toString("utf-8"),
      );
      const transactionUuid = decoded.transaction_uuid as string;
      const totalAmount = parseFloat(decoded.total_amount);

      // Idempotency: check if this webhook was already processed
      if (transactionUuid) {
        const existing = await db.webhookLog.findUnique({
          where: { idempotencyKey: transactionUuid },
        });
        if (existing) {
          // Already processed — redirect without reprocessing
          return NextResponse.redirect(
            `${APP_URL}/track/${orderId}?payment=success`,
          );
        }
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

      // Server-side amount check: reject if callback amount doesn't match
      // what we recorded when creating the order. Tolerance of 0.01 covers
      // rounding between paisa and rupees.
      const expectedAmount = order?.payment?.amount ?? order?.total ?? null;
      if (expectedAmount == null || Math.abs(totalAmount - expectedAmount) > 0.01) {
        await logWebhook(
          "payment.amount_mismatch",
          orderId,
          rawPayload,
          302,
          transactionUuid,
        );
        await db.payment.updateMany({
          where: { orderId, status: "PENDING" },
          data: { status: "FAILED" },
        });
        return NextResponse.redirect(`${APP_URL}/track/${orderId}?payment=failed`);
      }

      const paymentConfig = order
        ? await db.paymentConfig.findUnique({
            where: { restaurantId: order.restaurantId },
          })
        : null;
      const merchantCode =
        decryptIfPresent(paymentConfig?.esewaMerchantCode) || "";

      const verification = await verifyEsewaPayment(
        transactionUuid,
        totalAmount,
        merchantCode,
      );

      if (verification) {
        await db.payment.updateMany({
          where: { orderId, status: "PENDING" },
          data: {
            status: "COMPLETED",
            transactionId: verification.transactionId,
            refId: transactionUuid,
            paidAt: new Date(),
          },
        });
        await touchOrderUpdatedAt(orderId);
        await logWebhook("payment.success", orderId, rawPayload, 302, transactionUuid);

        // Notify kitchen that payment is confirmed
        if (order) {
          sendNotificationToRestaurantStaff(order.restaurantId, {
            title: "Payment Confirmed",
            body: `Order #${order.orderNo} — eSewa payment verified`,
            data: { type: "PAYMENT_CONFIRMED", orderId, restaurantId: order.restaurantId },
          }).catch(() => { /* non-fatal */ });
        }

        return NextResponse.redirect(
          `${APP_URL}/track/${orderId}?payment=success`,
        );
      }
    } catch {
      // verification failed
    }
  }

  await db.payment.updateMany({
    where: { orderId, status: "PENDING" },
    data: { status: "FAILED" },
  });
  await logWebhook("payment.failed", orderId, rawPayload, 302);

  return NextResponse.redirect(`${APP_URL}/track/${orderId}?payment=failed`);
}
