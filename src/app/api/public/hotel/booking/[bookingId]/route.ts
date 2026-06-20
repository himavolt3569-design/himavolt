import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  const { bookingId } = await params;

  const booking = await db.roomBooking.findUnique({
    where: { id: bookingId },
    include: {
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
    if (["CANCELLED", "CHECKED_OUT"].includes(existing.status)) {
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
    try {
      new URL(receiptUrl);
    } catch {
      return NextResponse.json({ error: "Invalid receipt URL" }, { status: 400 });
    }
    data.receiptUrl = receiptUrl;
    if (body.paymentMethod) data.paymentMethod = String(body.paymentMethod);
    // Leave paymentStatus UNPAID — staff verify the receipt and mark it paid.
  } else {
    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  }

  const booking = await db.roomBooking.update({ where: { id: bookingId }, data });
  return NextResponse.json({ booking });
}
