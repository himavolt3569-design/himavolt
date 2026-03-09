import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyEsewaPayment } from "@/lib/payments/esewa";
import { decryptIfPresent } from "@/lib/encryption";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("orderId");
  const status = searchParams.get("status");
  const encodedData = searchParams.get("data");

  if (!orderId) {
    return NextResponse.redirect(`${APP_URL}?payment=error`);
  }

  if (status === "failed") {
    await db.payment.updateMany({
      where: { orderId, status: "PENDING" },
      data: { status: "FAILED" },
    });
    return NextResponse.redirect(`${APP_URL}/track/${orderId}?payment=failed`);
  }

  if (encodedData) {
    try {
      const decoded = JSON.parse(
        Buffer.from(encodedData, "base64").toString("utf-8"),
      );
      const transactionUuid = decoded.transaction_uuid;
      const totalAmount = parseFloat(decoded.total_amount);

      // Get restaurant's eSewa merchant code
      const order = await db.order.findUnique({
        where: { id: orderId },
        select: { restaurantId: true },
      });
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

  return NextResponse.redirect(`${APP_URL}/track/${orderId}?payment=failed`);
}
