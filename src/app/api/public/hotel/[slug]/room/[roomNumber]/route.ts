import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const HOTEL_TYPES = ["HOTEL", "RESORT", "GUEST_HOUSE"];

/**
 * GET /api/public/hotel/[slug]/room/[roomNumber]
 *
 * Public single-room detail keyed by the room number printed on the QR card,
 * not the internal cuid. Returns enough context for /hotel/[slug]/room/[n] to
 * render full features without an extra round-trip for hotel info — and tells
 * the caller whether the room is currently free or already booked.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string; roomNumber: string }> },
) {
  const { slug: encodedSlug, roomNumber } = await params;
  const slug = decodeURIComponent(encodedSlug);

  if (!slug || !roomNumber) {
    return NextResponse.json(
      { error: "Missing slug/roomNumber" },
      { status: 400 },
    );
  }

  const restaurant = await db.restaurant.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      type: true,
      address: true,
      city: true,
      phone: true,
      imageUrl: true,
      coverUrl: true,
      currency: true,
      openingTime: true,
      closingTime: true,
      hotelAdvanceType: true,
      hotelAdvanceValue: true,
      isActive: true,
      wifiName: true,
      wifiPassword: true,
    },
  });

  if (!restaurant || !restaurant.isActive) {
    return NextResponse.json({ error: "Hotel not found" }, { status: 404 });
  }
  if (!HOTEL_TYPES.includes(restaurant.type)) {
    return NextResponse.json(
      { error: "This venue does not support rooms" },
      { status: 400 },
    );
  }

  const room = await db.room.findUnique({
    where: {
      restaurantId_roomNumber: {
        restaurantId: restaurant.id,
        roomNumber: roomNumber.trim(),
      },
    },
    select: {
      id: true,
      roomNumber: true,
      name: true,
      type: true,
      floor: true,
      price: true,
      maxGuests: true,
      bedType: true,
      bedCount: true,
      description: true,
      amenities: true,
      imageUrls: true,
      videoUrl: true,
      isAvailable: true,
      isActive: true,
    },
  });

  if (!room || !room.isActive) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  // Is the room booked right now? (Customer scanning the QR wants to know.)
  const now = new Date();
  const liveBooking = await db.roomBooking.findFirst({
    where: {
      roomId: room.id,
      status: { in: ["CONFIRMED", "CHECKED_IN"] },
      checkIn: { lte: now },
      checkOut: { gt: now },
    },
    select: { id: true, checkOut: true, status: true },
  });

  return NextResponse.json({
    hotel: restaurant,
    room: {
      ...room,
      // Override isAvailable with the live booking state — staff may have
      // toggled it independently, but live bookings always trump.
      isAvailable: room.isAvailable && !liveBooking,
    },
    liveBooking: liveBooking
      ? {
          until: liveBooking.checkOut.toISOString(),
          status: liveBooking.status,
        }
      : null,
  });
}
