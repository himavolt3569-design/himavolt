import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getEsewaPaymentUrl } from "@/lib/payments/esewa";
import { initiateKhaltiPayment } from "@/lib/payments/khalti";
import { decryptIfPresent } from "@/lib/encryption";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { bookingId, method } = body;

  if (!bookingId || !method) {
    return NextResponse.json(
      { error: "bookingId and method are required" },
      { status: 400 },
    );
  }

  const booking = await db.roomBooking.findUnique({
    where: { id: bookingId },
    include: { restaurant: { select: { id: true, slug: true, currency: true } } },
  });

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  if (booking.paymentStatus === "PAID") {
    return NextResponse.json(
      { error: "Advance payment already completed" },
      { status: 400 },
    );
  }

  const paymentConfig = await db.paymentConfig.findUnique({
    where: { restaurantId: booking.restaurantId },
  });

  const amount = booking.advanceAmount;

  if (method === "CASH") {
    await db.roomBooking.update({
      where: { id: bookingId },
      data: { paymentMethod: "CASH", paymentStatus: "PAID", advancePaid: true, paidAt: new Date() },
    });
    return NextResponse.json({ success: true, method: "CASH" });
  }

  if (method === "ESEWA") {
    const merchantCode = decryptIfPresent(paymentConfig?.esewaMerchantCode);
    const secretKey = decryptIfPresent(paymentConfig?.esewaSecretKey);

    if (!merchantCode || !secretKey || !paymentConfig?.esewaEnabled) {
      return NextResponse.json(
        { error: "eSewa is not configured for this hotel" },
        { status: 400 },
      );
    }

    await db.roomBooking.update({
      where: { id: bookingId },
      data: { paymentMethod: "ESEWA", paymentStatus: "UNPAID" },
    });

    const esewaData = getEsewaPaymentUrl({
      orderId: bookingId,
      amount,
      taxAmount: 0,
      totalAmount: amount,
      merchantCode,
      secretKey,
      successUrl: `${APP_URL}/api/payments/room-booking/esewa/callback?bookingId=${bookingId}`,
      failureUrl: `${APP_URL}/api/payments/room-booking/esewa/callback?bookingId=${bookingId}&status=failed`,
    });

    return NextResponse.json({ success: true, method: "ESEWA", gateway: esewaData });
  }

  if (method === "KHALTI") {
    const secretKey = decryptIfPresent(paymentConfig?.khaltiSecretKey);

    if (!secretKey || !paymentConfig?.khaltiEnabled) {
      return NextResponse.json(
        { error: "Khalti is not configured for this hotel" },
        { status: 400 },
      );
    }

    const khaltiData = await initiateKhaltiPayment({
      orderId: bookingId,
      orderNo: `BKG-${bookingId.slice(-8).toUpperCase()}`,
      amount,
      customerName: booking.guestName,
      customerEmail: booking.guestEmail ?? undefined,
      customerPhone: booking.guestPhone ?? undefined,
      secretKey,
      returnUrl: `${APP_URL}/api/payments/room-booking/khalti/callback?bookingId=${bookingId}`,
    });

    await db.roomBooking.update({
      where: { id: bookingId },
      data: { paymentMethod: "KHALTI", paymentStatus: "UNPAID", pidx: khaltiData.pidx },
    });

    return NextResponse.json({
      success: true,
      method: "KHALTI",
      paymentUrl: khaltiData.paymentUrl,
    });
  }

  return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
}
