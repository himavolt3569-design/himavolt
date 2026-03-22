import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { getStaffSession } from "@/lib/staff-auth";

type Params = { params: Promise<{ id: string; bookingId: string }> };

async function canAccess(req: NextRequest, restaurantId: string) {
  const staff = await getStaffSession(req);
  if (staff && staff.restaurantId === restaurantId) return true;
  const user = await getOrCreateUser();
  if (!user) return false;
  const rest = await db.restaurant.findFirst({
    where: { id: restaurantId, ownerId: user.id },
  });
  return !!rest;
}

// GET /api/restaurants/[id]/bookings/[bookingId] — get booking details
export async function GET(
  req: NextRequest,
  { params }: Params,
) {
  const { id, bookingId } = await params;
  if (!(await canAccess(req, id))) {
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

// PATCH /api/restaurants/[id]/bookings/[bookingId] — update booking status / advance payment
export async function PATCH(
  req: NextRequest,
  { params }: Params,
) {
  const { id, bookingId } = await params;
  if (!(await canAccess(req, id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await db.roomBooking.findFirst({
    where: { id: bookingId, restaurantId: id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const body = await req.json();
  const { status, advancePaid, advanceAmount, notes } = body;

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

  const booking = await db.roomBooking.update({
    where: { id: bookingId },
    data: {
      ...(status !== undefined && { status }),
      ...(advancePaid !== undefined && { advancePaid }),
      ...(advanceAmount !== undefined && { advanceAmount }),
      ...(notes !== undefined && { notes: notes?.trim() || null }),
    },
    include: {
      room: {
        select: { id: true, roomNumber: true, name: true, type: true, price: true },
      },
    },
  });

  return NextResponse.json(booking);
}

// DELETE /api/restaurants/[id]/bookings/[bookingId] — delete a booking
export async function DELETE(
  req: NextRequest,
  { params }: Params,
) {
  const { id, bookingId } = await params;
  if (!(await canAccess(req, id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
