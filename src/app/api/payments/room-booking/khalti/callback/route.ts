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
      select: { restaurantId: true, advanceAmount: true, pidx: true },
    });

    // Bind the gateway reference to THIS booking: initiate stored the pidx,
    // so a completed pidx from another booking can't be replayed here.
    if (!booking || (booking.pidx && booking.pidx !== pidx)) {
      await db.roomBooking.updateMany({
        where: { id: bookingId, paymentStatus: "UNPAID" },
        data: { paymentStatus: "FAILED" },
      });
      return NextResponse.redirect(`${redirectBase}?payment=failed`);
    }

    const paymentConfig = await db.paymentConfig.findUnique({
      where: { restaurantId: booking.restaurantId },
    });
    const secretKey = decryptIfPresent(paymentConfig?.khaltiSecretKey);

    if (!secretKey) {
      // Missing/undecryptable secret → verification cannot succeed. Loud.
      console.error(
        `[room-booking khalti.callback] payment.config_missing — secret key empty for restaurant ${booking.restaurantId} (booking ${bookingId})`,
      );
    }

    if (secretKey) {
      const verification = await verifyKhaltiPayment(pidx, secretKey);
      // Gateway-verified amount must match the advance recorded at booking.
      if (
        verification &&
        Math.abs(verification.amount - booking.advanceAmount) > 0.01
      ) {
        await db.roomBooking.updateMany({
          where: { id: bookingId, paymentStatus: "UNPAID" },
          data: { paymentStatus: "FAILED" },
        });
        return NextResponse.redirect(`${redirectBase}?payment=failed`);
      }
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
