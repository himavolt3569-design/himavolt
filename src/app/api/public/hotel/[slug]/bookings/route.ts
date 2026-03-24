import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const HOTEL_TYPES = ["HOTEL", "RESORT", "GUEST_HOUSE"];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const body = await req.json();

  const {
    roomId,
    guestName,
    guestPhone,
    guestEmail,
    guestAddress,
    guestIdType,
    guestIdNumber,
    adults = 1,
    children = 0,
    checkIn,
    checkOut,
    notes,
    userId,
  } = body;

  if (!roomId || !guestName || !checkIn || !checkOut) {
    return NextResponse.json(
      { error: "roomId, guestName, checkIn, checkOut are required" },
      { status: 400 },
    );
  }

  const restaurant = await db.restaurant.findUnique({
    where: { slug },
    select: {
      id: true,
      type: true,
      isActive: true,
      hotelAdvanceType: true,
      hotelAdvanceValue: true,
    },
  });

  if (!restaurant || !restaurant.isActive) {
    return NextResponse.json({ error: "Hotel not found" }, { status: 404 });
  }
  if (!HOTEL_TYPES.includes(restaurant.type)) {
    return NextResponse.json({ error: "Room bookings not supported" }, { status: 400 });
  }

  const room = await db.room.findFirst({
    where: { id: roomId, restaurantId: restaurant.id, isActive: true },
  });
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  if (checkInDate >= checkOutDate) {
    return NextResponse.json(
      { error: "Check-out must be after check-in" },
      { status: 400 },
    );
  }

  // Check for conflicting bookings
  const conflict = await db.roomBooking.findFirst({
    where: {
      roomId,
      status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] },
      AND: [
        { checkIn: { lt: checkOutDate } },
        { checkOut: { gt: checkInDate } },
      ],
    },
  });
  if (conflict) {
    return NextResponse.json(
      { error: "Room is not available for the selected dates" },
      { status: 409 },
    );
  }

  const nights = Math.max(
    1,
    Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)),
  );
  const totalPrice = room.price * nights;

  let advanceAmount = 0;
  if (restaurant.hotelAdvanceType === "PERCENTAGE") {
    advanceAmount = Math.round((totalPrice * restaurant.hotelAdvanceValue) / 100);
  } else {
    advanceAmount = restaurant.hotelAdvanceValue;
  }

  const booking = await db.roomBooking.create({
    data: {
      roomId,
      restaurantId: restaurant.id,
      guestName,
      guestPhone: guestPhone ?? null,
      guestEmail: guestEmail ?? null,
      guestAddress: guestAddress ?? null,
      guestIdType: guestIdType ?? null,
      guestIdNumber: guestIdNumber ?? null,
      adults,
      children,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      nights,
      totalPrice,
      advanceAmount,
      advancePaid: false,
      paymentStatus: "UNPAID",
      status: "PENDING",
      notes: notes ?? null,
      userId: userId ?? null,
    },
    include: {
      room: { select: { roomNumber: true, name: true, type: true } },
    },
  });

  return NextResponse.json({ booking }, { status: 201 });
}
