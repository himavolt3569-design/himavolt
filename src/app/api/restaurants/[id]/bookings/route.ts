import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { getStaffSession } from "@/lib/staff-auth";

type Params = { params: Promise<{ id: string }> };

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

// GET /api/restaurants/[id]/bookings — list all bookings
export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  if (!(await canAccess(req, id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const roomId = searchParams.get("roomId");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
  const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);

  const where: Record<string, unknown> = { restaurantId: id };
  if (status) where.status = status;
  if (roomId) where.roomId = roomId;

  const [bookings, total] = await Promise.all([
    db.roomBooking.findMany({
      where,
      include: {
        room: {
          select: { id: true, roomNumber: true, name: true, type: true, price: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    db.roomBooking.count({ where }),
  ]);

  return NextResponse.json({ bookings, total, limit, offset });
}

// POST /api/restaurants/[id]/bookings — create a booking (staff-created)
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  if (!(await canAccess(req, id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    roomId,
    guestName,
    guestPhone,
    guestEmail,
    guestAddress,
    guestIdType,
    guestIdNumber,
    adults,
    children,
    checkIn,
    checkOut,
    notes,
    advanceAmount,
    advancePaid,
    status: bookingStatus,
  } = body;

  if (!roomId || !guestName?.trim() || !checkIn || !checkOut) {
    return NextResponse.json(
      { error: "roomId, guestName, checkIn, and checkOut are required" },
      { status: 400 },
    );
  }

  // Verify the room belongs to this restaurant
  const room = await db.room.findFirst({
    where: { id: roomId, restaurantId: id, isActive: true },
  });
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);

  if (checkOutDate <= checkInDate) {
    return NextResponse.json(
      { error: "Check-out must be after check-in" },
      { status: 400 },
    );
  }

  // Check for overlapping bookings on the same room
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
      { error: "Room is already booked for the selected dates" },
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

  const booking = await db.roomBooking.create({
    data: {
      guestName: guestName.trim(),
      guestPhone: guestPhone?.trim() || null,
      guestEmail: guestEmail?.trim() || null,
      guestAddress: guestAddress?.trim() || null,
      guestIdType: guestIdType || null,
      guestIdNumber: guestIdNumber?.trim() || null,
      adults: adults ?? 1,
      children: children ?? 0,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      nights,
      totalPrice,
      advanceAmount: advanceAmount ?? 0,
      advancePaid: advancePaid ?? false,
      status: bookingStatus || "CONFIRMED",
      notes: notes?.trim() || null,
      roomId,
      restaurantId: id,
    },
    include: {
      room: {
        select: { id: true, roomNumber: true, name: true, type: true, price: true },
      },
    },
  });

  return NextResponse.json(booking, { status: 201 });
}
