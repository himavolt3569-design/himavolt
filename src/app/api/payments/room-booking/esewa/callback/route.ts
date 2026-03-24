import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyEsewaPayment } from "@/lib/payments/esewa";
import { decryptIfPresent } from "@/lib/encryption";

function getAppUrl(req: NextRequest): string {
  return process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const bookingId = searchParams.get("bookingId");
  const status = searchParams.get("status");
  const encodedData = searchParams.get("data");
  const APP_URL = getAppUrl(req);

  if (!bookingId) {
    return NextResponse.redirect(`${APP_URL}?payment=error`);
  }

  const redirectBase = `${APP_URL}/hotel/booking/${bookingId}`;

  if (status === "failed") {
    await db.roomBooking.updateMany({
      where: { id: bookingId, paymentStatus: "UNPAID" },
      data: { paymentStatus: "FAILED" },
    });
    return NextResponse.redirect(`${redirectBase}?payment=failed`);
  }

  if (encodedData) {
    try {
      const decoded = JSON.parse(
        Buffer.from(encodedData, "base64").toString("utf-8"),
      );
      const transactionUuid = decoded.transaction_uuid;
      const totalAmount = parseFloat(decoded.total_amount);

      const booking = await db.roomBooking.findUnique({
        where: { id: bookingId },
        select: { restaurantId: true },
      });
      const paymentConfig = booking
        ? await db.paymentConfig.findUnique({
            where: { restaurantId: booking.restaurantId },
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
        await db.roomBooking.updateMany({
          where: { id: bookingId, paymentStatus: "UNPAID" },
          data: {
            paymentStatus: "PAID",
            advancePaid: true,
            transactionId: verification.transactionId,
            refId: transactionUuid,
            paidAt: new Date(),
            status: "CONFIRMED",
          },
        });
        return NextResponse.redirect(`${redirectBase}?payment=success`);
      }
    } catch {
      // verification failed
    }
  }

  await db.roomBooking.updateMany({
    where: { id: bookingId, paymentStatus: "UNPAID" },
    data: { paymentStatus: "FAILED" },
  });

  return NextResponse.redirect(`${redirectBase}?payment=failed`);
}
