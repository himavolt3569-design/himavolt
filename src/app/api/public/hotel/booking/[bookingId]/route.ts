import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notifyRestaurantBookings } from "@/lib/realtime";
import { notifyStaffBookingEvent } from "@/lib/notifications";
import { rateLimit, clientKey } from "@/lib/rate-limit";

// Only the fields the public confirmation page needs — never the guest's ID
// number/photo, address or payment-gateway transaction ids (those stay
// staff-only) since the booking id in the URL is the only access token.
const PUBLIC_BOOKING_SELECT = {
  id: true,
  guestName: true,
  guestPhone: true,
  guestEmail: true,
  adults: true,
  children: true,
  checkIn: true,
  checkOut: true,
  nights: true,
  totalPrice: true,
  advanceAmount: true,
  advancePaid: true,
  paymentStatus: true,
  paymentMethod: true,
  status: true,
  notes: true,
  receiptUrl: true,
  cancelReason: true,
  cancelRequestedAt: true,
  cancelledBy: true,
  refundStatus: true,
  roomServiceSelected: true,
} as const;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  const { bookingId } = await params;

  const booking = await db.roomBooking.findUnique({
    where: { id: bookingId },
    select: {
      ...PUBLIC_BOOKING_SELECT,
      room: {
        select: {
          roomNumber: true,
          name: true,
          type: true,
          floor: true,
          bedType: true,
          bedCount: true,
          imageUrls: true,
        },
      },
      restaurant: {
        select: {
          name: true,
          slug: true,
          imageUrl: true,
          phone: true,
          address: true,
          city: true,
          currency: true,
        },
      },
    },
  });

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  return NextResponse.json({ booking });
}

// PATCH — customer self-service on their own booking link. Limited to two safe
// actions: requesting a cancellation (with a reason; the hotel must accept) and
// attaching a payment receipt. Never confirms payment or forces cancellation —
// the booking id (a cuid) acts as the bearer token, matching the GET above.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  const { bookingId } = await params;

  // The booking id is the only access token here, so cap how often it can be
  // used to write/notify — stops an leaked link from spamming staff FCM /
  // Realtime / the (single-connection) prod DB.
  const limit = await rateLimit(clientKey(req, "booking-patch"), 60_000, 6);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const existing = await db.roomBooking.findUnique({ where: { id: bookingId } });
  if (!existing) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const action = body.action;
  const data: Record<string, unknown> = {};

  if (action === "cancel-request") {
    const reason = (body.reason ?? "").trim();
    if (!reason) {
      return NextResponse.json({ error: "A cancellation reason is required" }, { status: 400 });
    }
    if (["REJECTED", "CHECKED_OUT"].includes(existing.status)) {
      return NextResponse.json({ error: "This booking can no longer be cancelled" }, { status: 400 });
    }
    data.cancelReason = reason;
    data.cancelRequestedAt = new Date();
    data.cancelledBy = "CUSTOMER";
    // Status stays as-is — the hotel reviews and accepts the request.
  } else if (action === "receipt") {
    const receiptUrl = (body.receiptUrl ?? "").trim();
    if (!receiptUrl) {
      return NextResponse.json({ error: "Receipt image is required" }, { status: 400 });
    }
    let parsed: URL;
    try {
      parsed = new URL(receiptUrl);
    } catch {
      return NextResponse.json({ error: "Invalid receipt URL" }, { status: 400 });
    }
    if (parsed.protocol !== "https:") {
      return NextResponse.json({ error: "Receipt URL must be https" }, { status: 400 });
    }
    data.receiptUrl = receiptUrl;
    if (body.paymentMethod) data.paymentMethod = String(body.paymentMethod);
    // Leave paymentStatus UNPAID — staff verify the receipt and mark it paid.
  } else {
    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  }

  const booking = await db.roomBooking.update({
    where: { id: bookingId },
    data,
    select: PUBLIC_BOOKING_SELECT,
  });

  // Live-notify the hotel staff about the customer action.
  notifyRestaurantBookings(existing.restaurantId, { bookingId });
  if (action === "cancel-request") {
    void notifyStaffBookingEvent(
      existing.restaurantId,
      "CANCEL_REQUEST",
      "Cancellation Requested",
      `${existing.guestName} requested to cancel their booking`,
      bookingId,
    );
  } else if (action === "receipt") {
    void notifyStaffBookingEvent(
      existing.restaurantId,
      "RECEIPT_UPLOADED",
      "Payment Receipt Uploaded",
      `${existing.guestName} uploaded a payment receipt — please verify`,
      bookingId,
    );
  }

  return NextResponse.json({ booking });
}
