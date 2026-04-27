import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const HOTEL_TYPES = ["HOTEL", "RESORT", "GUEST_HOUSE"];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug: encodedSlug } = await params;
  const slug = decodeURIComponent(encodedSlug);
  const { searchParams } = new URL(req.url);
  const checkInParam = searchParams.get("checkIn");
  const checkOutParam = searchParams.get("checkOut");

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

  // Determine the availability window:
  //   - If caller passed checkIn/checkOut, we reflect availability for that range
  //     (treating any booking that overlaps the range as a conflict).
  //   - Otherwise, default to "right now" (legacy behaviour).
  const now = new Date();
  let windowStart = now;
  let windowEnd = now;
  if (checkInParam && checkOutParam) {
    const ci = new Date(checkInParam);
    const co = new Date(checkOutParam);
    if (!isNaN(ci.getTime()) && !isNaN(co.getTime()) && ci < co) {
      windowStart = ci;
      windowEnd = co;
    }
  }

  const conflictingBookings = await db.roomBooking.findMany({
    where: {
      restaurantId: restaurant.id,
      status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] },
      AND: [{ checkIn: { lt: windowEnd } }, { checkOut: { gt: windowStart } }],
    },
    select: { roomId: true },
  });
  const busyRoomIds = new Set(conflictingBookings.map((b) => b.roomId));

  const roomsWithAvailability = rooms.map((r) => ({
    ...r,
    isAvailable: r.isAvailable && !busyRoomIds.has(r.id),
  }));

  // Group rooms by type for easier rendering
  const grouped: Record<string, typeof roomsWithAvailability> = {};
  for (const room of roomsWithAvailability) {
    if (!grouped[room.type]) grouped[room.type] = [];
    grouped[room.type].push(room);
  }

  return NextResponse.json({
    hotel: restaurant,
    rooms: roomsWithAvailability,
    grouped,
  });
}
