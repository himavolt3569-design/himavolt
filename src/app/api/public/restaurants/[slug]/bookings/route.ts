import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";

// POST /api/public/restaurants/[slug]/bookings — customer self-books a room
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const restaurant = await db.restaurant.findUnique({
    where: { slug },
  });
  if (!restaurant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const {
    roomId,
    guestName,
    guestPhone,
    guestEmail,
    guestAddress,
    checkIn,
    checkOut,
    adults,
    children,
    notes,
  } = body;

  if (!roomId || !guestName?.trim() || !checkIn || !checkOut) {
    return NextResponse.json(
      { error: "roomId, guestName, checkIn, and checkOut are required" },
      { status: 400 },
    );
  }

  // Verify the room belongs to this restaurant and is bookable
  const room = await db.room.findFirst({
    where: {
      id: roomId,
      restaurantId: restaurant.id,
      isActive: true,
      isAvailable: true,
    },
  });
  if (!room) {
    return NextResponse.json(
      { error: "Room not found or unavailable" },
      { status: 404 },
    );
  }

  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);

  if (
    isNaN(checkInDate.getTime()) ||
    isNaN(checkOutDate.getTime()) ||
    checkOutDate <= checkInDate
  ) {
    return NextResponse.json(
      { error: "Invalid date range — check-out must be after check-in" },
      { status: 400 },
    );
  }

  // Check for overlapping bookings
  const overlap = await db.roomBooking.findFirst({
    where: {
      roomId,
      status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] },
      checkIn: { lt: checkOutDate },
      checkOut: { gt: checkInDate },
    },
  });
  if (overlap) {
    return NextResponse.json(
      { error: "Room is not available for the selected dates" },
      { status: 409 },
    );
  }

  const nights = Math.max(
    1,
    Math.ceil(
      (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24),
    ),
  );
  const totalPrice = nights * room.price;

  // Optionally link to authenticated user
  let userId: string | null = null;
  try {
    const user = await getOrCreateUser();
    if (user) userId = user.id;
  } catch {
    // Guest booking — no user session
  }

  const booking = await db.roomBooking.create({
    data: {
      guestName: guestName.trim(),
      guestPhone: guestPhone?.trim() || null,
      guestEmail: guestEmail?.trim() || null,
      guestAddress: guestAddress?.trim() || null,
      adults: adults ?? 1,
      children: children ?? 0,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      nights,
      totalPrice,
      advanceAmount: 0,
      advancePaid: false,
      status: "PENDING",
      notes: notes?.trim() || null,
      roomId,
      restaurantId: restaurant.id,
      userId,
    },
    include: {
      room: {
        select: { id: true, roomNumber: true, name: true, type: true, price: true },
      },
    },
  });

  return NextResponse.json(booking, { status: 201 });
}
