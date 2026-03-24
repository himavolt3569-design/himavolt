import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyKhaltiPayment } from "@/lib/payments/khalti";
import { decryptIfPresent } from "@/lib/encryption";

function getAppUrl(req: NextRequest): string {
  return process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const bookingId = searchParams.get("bookingId");
  const pidx = searchParams.get("pidx");
  const txnId = searchParams.get("transaction_id");
  const khaltiStatus = searchParams.get("status");
  const APP_URL = getAppUrl(req);

  if (!bookingId) {
    return NextResponse.redirect(`${APP_URL}?payment=error`);
  }

  const redirectBase = `${APP_URL}/hotel/booking/${bookingId}`;

  if (khaltiStatus === "Cancelled" || khaltiStatus === "Failed") {
    await db.roomBooking.updateMany({
      where: { id: bookingId, paymentStatus: "UNPAID" },
      data: { paymentStatus: "FAILED" },
    });
    return NextResponse.redirect(`${redirectBase}?payment=failed`);
  }

  if (pidx) {
    const booking = await db.roomBooking.findUnique({
      where: { id: bookingId },
      select: { restaurantId: true },
    });
    const paymentConfig = booking
      ? await db.paymentConfig.findUnique({
          where: { restaurantId: booking.restaurantId },
        })
      : null;
    const secretKey = decryptIfPresent(paymentConfig?.khaltiSecretKey);

    if (secretKey) {
      const verification = await verifyKhaltiPayment(pidx, secretKey);
      if (verification) {
        await db.roomBooking.updateMany({
          where: { id: bookingId, paymentStatus: "UNPAID" },
          data: {
            paymentStatus: "PAID",
            advancePaid: true,
            transactionId: verification.transactionId || txnId || null,
            pidx,
            paidAt: new Date(),
            status: "CONFIRMED",
          },
        });
        return NextResponse.redirect(`${redirectBase}?payment=success`);
      }
    }
  }

  await db.roomBooking.updateMany({
    where: { id: bookingId, paymentStatus: "UNPAID" },
    data: { paymentStatus: "FAILED" },
  });

  return NextResponse.redirect(`${redirectBase}?payment=failed`);
}
