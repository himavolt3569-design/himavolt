import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { unauthorized } from "@/lib/api-helpers";

type Params = { params: Promise<{ id: string }> };

/**
 * Master-admin room read/create on behalf of a hotel. Mirrors the owner route
 * at /api/restaurants/[id]/rooms but guarded by requireAdmin().
 */

export async function GET(_req: NextRequest, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin access required");

  const { id } = await params;
  try {
    const rooms = await db.room.findMany({
      where: { restaurantId: id, isActive: true },
      include: { _count: { select: { bookings: true } } },
      orderBy: [{ sortOrder: "asc" }, { roomNumber: "asc" }],
    });
    return NextResponse.json(rooms);
  } catch (err) {
    console.error("[Admin rooms] GET failed", err);
    return NextResponse.json(
      { error: "Could not load rooms. Please try again." },
      { status: 503 },
    );
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin access required");

  const { id } = await params;

  const restaurant = await db.restaurant.findUnique({
    where: { id },
    select: { id: true, slug: true },
  });
  if (!restaurant) {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const {
    roomNumber,
    name,
    type,
    floor,
    price,
    maxGuests,
    description,
    amenities,
    offerings,
    locationNote,
    imageUrls,
    videoUrl,
    bedType,
    bedCount,
    sortOrder,
  } = body;

  if (!roomNumber?.trim()) {
    return NextResponse.json({ error: "Room number is required" }, { status: 400 });
  }
  const trimmedRoomNumber = roomNumber.trim();

  const existing = await db.room.findUnique({
    where: { restaurantId_roomNumber: { restaurantId: id, roomNumber: trimmedRoomNumber } },
  });
  if (existing) {
    return NextResponse.json({ error: `Room ${roomNumber} already exists` }, { status: 409 });
  }

  const qrUrl = restaurant.slug
    ? `/hotel/${restaurant.slug}/room/${encodeURIComponent(trimmedRoomNumber)}`
    : null;

  const room = await db.room.create({
    data: {
      roomNumber: trimmedRoomNumber,
      name: name?.trim() || null,
      type: type || "STANDARD",
      floor: floor !== undefined ? String(floor) : "1",
      price: price ?? 0,
      maxGuests: maxGuests ?? 2,
      description: description?.trim() || null,
      amenities: amenities ?? [],
      offerings: offerings ?? [],
      locationNote: locationNote?.trim() || null,
      imageUrls: imageUrls ?? [],
      videoUrl: videoUrl?.trim() || null,
      bedType: bedType?.trim() || null,
      bedCount: bedCount ?? 1,
      sortOrder: sortOrder ?? 0,
      qrUrl,
      restaurantId: id,
    },
  });

  return NextResponse.json(room, { status: 201 });
}
