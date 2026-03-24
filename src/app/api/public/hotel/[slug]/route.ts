import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const HOTEL_TYPES = ["HOTEL", "RESORT", "GUEST_HOUSE"];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

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
      wifiName: true,
      wifiPassword: true,
      currency: true,
      openingTime: true,
      closingTime: true,
      rating: true,
      hotelAdvanceType: true,
      hotelAdvanceValue: true,
      isActive: true,
      heroSlides: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true, imageUrl: true, title: true, subtitle: true },
      },
    },
  });

  if (!restaurant || !restaurant.isActive) {
    return NextResponse.json({ error: "Hotel not found" }, { status: 404 });
  }

  if (!HOTEL_TYPES.includes(restaurant.type)) {
    return NextResponse.json(
      { error: "This venue does not support room bookings" },
      { status: 400 },
    );
  }

  const rooms = await db.room.findMany({
    where: { restaurantId: restaurant.id, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { type: "asc" }, { roomNumber: "asc" }],
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
    },
  });

  // Check active bookings to mark availability
  const now = new Date();
  const activeBookingRoomIds = new Set(
    (
      await db.roomBooking.findMany({
        where: {
          restaurantId: restaurant.id,
          status: { in: ["CONFIRMED", "CHECKED_IN"] },
          checkIn: { lte: now },
          checkOut: { gte: now },
        },
        select: { roomId: true },
      })
    ).map((b) => b.roomId),
  );

  const roomsWithAvailability = rooms.map((r) => ({
    ...r,
    isAvailable: r.isAvailable && !activeBookingRoomIds.has(r.id),
  }));

  // Group rooms by type for easier rendering
  const grouped: Record<string, typeof roomsWithAvailability> = {};
  for (const room of roomsWithAvailability) {
    if (!grouped[room.type]) grouped[room.type] = [];
    grouped[room.type].push(room);
  }

  return NextResponse.json({ hotel: restaurant, rooms: roomsWithAvailability, grouped });
}
