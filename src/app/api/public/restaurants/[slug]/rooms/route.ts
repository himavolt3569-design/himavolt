import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/public/restaurants/[slug]/rooms — list available rooms (customer-facing)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const restaurant = await db.restaurant.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!restaurant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const checkInParam = searchParams.get("checkIn");
  const checkOutParam = searchParams.get("checkOut");

  const where: Record<string, unknown> = {
    restaurantId: restaurant.id,
    isActive: true,
    isAvailable: true,
  };
  if (type) where.type = type;

  const rooms = await db.room.findMany({
    where,
    select: {
      id: true,
      roomNumber: true,
      name: true,
      type: true,
      floor: true,
      price: true,
      maxGuests: true,
      description: true,
      amenities: true,
      imageUrls: true,
      videoUrl: true,
      isAvailable: true,
    },
    orderBy: [{ sortOrder: "asc" }, { price: "asc" }],
  });

  // If date range provided, filter out rooms with overlapping bookings
  if (checkInParam && checkOutParam) {
    const checkIn = new Date(checkInParam);
    const checkOut = new Date(checkOutParam);

    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime()) || checkOut <= checkIn) {
      return NextResponse.json(
        { error: "Invalid date range" },
        { status: 400 },
      );
    }

    const overlappingBookings = await db.roomBooking.findMany({
      where: {
        restaurantId: restaurant.id,
        status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] },
        checkIn: { lt: checkOut },
        checkOut: { gt: checkIn },
      },
      select: { roomId: true },
    });

    const bookedRoomIds = new Set(overlappingBookings.map((b) => b.roomId));
    const availableRooms = rooms.filter((r) => !bookedRoomIds.has(r.id));

    return NextResponse.json(availableRooms);
  }

  return NextResponse.json(rooms);
}
