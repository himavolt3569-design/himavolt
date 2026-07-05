import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getRestaurantAccess,
  requireOwnerOrStaffBilling,
} from "@/lib/access-control";
import { notifyRestaurantBookings } from "@/lib/realtime";
import { syncRoomAvailabilityForStatus } from "@/lib/room-availability";

type Params = { params: Promise<{ id: string }> };

// GET /api/restaurants/[id]/bookings — list all bookings (any staff or owner)
export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  if (!(await getRestaurantAccess(req, id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const roomId = searchParams.get("roomId");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
  const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);

  const where: Record<string, unknown> = { restaurantId: id };
  // Front Desk needs "CONFIRMED,CHECKED_IN" in one call (arrivals + in-house)
  // rather than one request per status.
  if (status) {
    const statuses = status.split(",").map((s) => s.trim()).filter(Boolean);
    where.status = statuses.length > 1 ? { in: statuses } : statuses[0];
  }
  if (roomId) where.roomId = roomId;

  // Sequential transaction — prod DB pool = 1 connection; Promise.all would deadlock
  const [bookings, total] = await db.$transaction([
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

// POST /api/restaurants/[id]/bookings — create a booking (owner or billing staff)
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  if (!(await requireOwnerOrStaffBilling(req, id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

  const resolvedStatus = bookingStatus || "CONFIRMED";
  const { guestIdImageUrl } = body;

  const booking = await db.roomBooking.create({
    data: {
      guestName: guestName.trim(),
      guestPhone: guestPhone?.trim() || null,
      guestEmail: guestEmail?.trim() || null,
      guestAddress: guestAddress?.trim() || null,
      guestIdType: guestIdType || null,
      guestIdNumber: guestIdNumber?.trim() || null,
      guestIdImageUrl: guestIdImageUrl || null,
      adults: adults ?? 1,
      children: children ?? 0,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      nights,
      totalPrice,
      advanceAmount: advanceAmount ?? 0,
      advancePaid: advancePaid ?? false,
      status: resolvedStatus,
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

  // A walk-in created directly as CHECKED_IN (Front Desk) must flip the room's
  // availability immediately — same rule the PATCH transition uses.
  await syncRoomAvailabilityForStatus(roomId, resolvedStatus);
  notifyRestaurantBookings(id, { bookingId: booking.id });

  return NextResponse.json(booking, { status: 201 });
}
