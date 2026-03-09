import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyKhaltiPayment } from "@/lib/payments/khalti";
import { decryptIfPresent } from "@/lib/encryption";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("orderId");
  const pidx = searchParams.get("pidx");
  const khaltiStatus = searchParams.get("status");

  if (!orderId) {
    return NextResponse.redirect(`${APP_URL}?payment=error`);
  }

  if (khaltiStatus === "Completed" && pidx) {
    // Get restaurant's Khalti secret key
    const order = await db.order.findUnique({
      where: { id: orderId },
      select: { restaurantId: true },
    });
    const paymentConfig = order
      ? await db.paymentConfig.findUnique({
          where: { restaurantId: order.restaurantId },
        })
      : null;
    const secretKey = decryptIfPresent(paymentConfig?.khaltiSecretKey) || "";

    const verification = await verifyKhaltiPayment(pidx, secretKey);

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
      return NextResponse.redirect(
        `${APP_URL}/track/${orderId}?payment=success`,
      );
    }
  }

  await db.payment.updateMany({
    where: { orderId, status: "PENDING" },
    data: { status: "FAILED" },
  });

  return NextResponse.redirect(`${APP_URL}/track/${orderId}?payment=failed`);
}
