import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getRestaurantAccess,
  requireOwnerOrStaffBilling,
  requireOwnerOrStaffManager,
} from "@/lib/access-control";
import { notifyRestaurantBookings } from "@/lib/realtime";

type Params = { params: Promise<{ id: string; bookingId: string }> };

// GET /api/restaurants/[id]/bookings/[bookingId] — get booking details (any staff or owner)
export async function GET(
  req: NextRequest,
  { params }: Params,
) {
  const { id, bookingId } = await params;
  if (!(await getRestaurantAccess(req, id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const booking = await db.roomBooking.findFirst({
    where: { id: bookingId, restaurantId: id },
    include: {
      room: {
        select: {
          id: true,
          roomNumber: true,
          name: true,
          type: true,
          floor: true,
          price: true,
          amenities: true,
          imageUrls: true,
        },
      },
    },
  });

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  return NextResponse.json(booking);
}

// PATCH /api/restaurants/[id]/bookings/[bookingId] — update status / check-in / advance (owner or billing staff)
export async function PATCH(
  req: NextRequest,
  { params }: Params,
) {
  const { id, bookingId } = await params;
  if (!(await requireOwnerOrStaffBilling(req, id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await db.roomBooking.findFirst({
    where: { id: bookingId, restaurantId: id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const body = await req.json();
  const {
    status,
    advancePaid,
    advanceAmount,
    notes,
    paymentStatus,
    refundStatus,
    cancelReason,
    cancelledBy,
    receiptUrl,
  } = body;

  const VALID_STATUSES = [
    "PENDING",
    "CONFIRMED",
    "CHECKED_IN",
    "CHECKED_OUT",
    "CANCELLED",
  ];
  if (status && !VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400 },
    );
  }

  // When checking in, mark the room as unavailable; when checking out or cancelling, mark available
  if (status === "CHECKED_IN") {
    await db.room.update({
      where: { id: existing.roomId },
      data: { isAvailable: false },
    });
  } else if (status === "CHECKED_OUT" || status === "CANCELLED") {
    await db.room.update({
      where: { id: existing.roomId },
      data: { isAvailable: true },
    });
  }

  const data: Record<string, unknown> = {};
  if (status !== undefined) data.status = status;
  if (advanceAmount !== undefined) data.advanceAmount = advanceAmount;
  if (notes !== undefined) data.notes = notes?.trim() || null;
  if (receiptUrl !== undefined) data.receiptUrl = receiptUrl || null;
  if (paymentStatus !== undefined) data.paymentStatus = paymentStatus;
  if (refundStatus !== undefined) data.refundStatus = refundStatus;
  if (cancelReason !== undefined) data.cancelReason = cancelReason?.trim() || null;

  // Staff marks the advance as paid → confirm the reservation and record the
  // payment instantly so the room shows as paid/reserved in real time.
  if (advancePaid !== undefined) {
    data.advancePaid = advancePaid;
    if (advancePaid && !existing.advancePaid) {
      data.paymentStatus = "PAID";
      data.paidAt = new Date();
      if (existing.status === "PENDING") data.status = "CONFIRMED";
    }
  }

  // Cancelling: stamp who/why, and flag a refund when money had been collected.
  if (status === "CANCELLED") {
    data.cancelledBy = cancelledBy ?? "HOTEL";
    data.cancelRequestedAt = existing.cancelRequestedAt ?? new Date();
    const wasPaid = existing.paymentStatus === "PAID" || existing.advancePaid;
    if (wasPaid && refundStatus === undefined && existing.refundStatus === "NONE") {
      data.refundStatus = "REQUESTED";
    }
  }

  const booking = await db.roomBooking.update({
    where: { id: bookingId },
    data,
    include: {
      room: {
        select: { id: true, roomNumber: true, name: true, type: true, price: true },
      },
    },
  });

  // Wake other staff dashboards (and the bookings tab) instantly.
  notifyRestaurantBookings(id, { bookingId });

  return NextResponse.json(booking);
}

// DELETE /api/restaurants/[id]/bookings/[bookingId] — delete a booking (owner or manager)
export async function DELETE(
  req: NextRequest,
  { params }: Params,
) {
  const { id, bookingId } = await params;
  if (!(await requireOwnerOrStaffManager(req, id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await db.roomBooking.findFirst({
    where: { id: bookingId, restaurantId: id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  // If the booking was checked in, make the room available again
  if (existing.status === "CHECKED_IN") {
    await db.room.update({
      where: { id: existing.roomId },
      data: { isAvailable: true },
    });
  }

  await db.roomBooking.delete({ where: { id: bookingId } });

  return NextResponse.json({ success: true });
}
