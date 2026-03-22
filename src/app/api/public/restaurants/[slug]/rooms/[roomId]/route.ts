import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ slug: string; roomId: string }> };

// GET /api/public/restaurants/[slug]/rooms/[roomId] — public single room detail
export async function GET(
  req: NextRequest,
  { params }: Params,
) {
  const { slug, roomId } = await params;

  const restaurant = await db.restaurant.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!restaurant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const room = await db.room.findFirst({
    where: {
      id: roomId,
      restaurantId: restaurant.id,
      isActive: true,
      isAvailable: true,
    },
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
  });

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  return NextResponse.json(room);
}
