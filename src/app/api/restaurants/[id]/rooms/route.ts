import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getRestaurantAccess,
  requireOwnerOrStaffManager,
} from "@/lib/access-control";

type Params = { params: Promise<{ id: string }> };

// GET /api/restaurants/[id]/rooms — list all rooms for a restaurant (any staff or owner)
export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const access = await getRestaurantAccess(req, id);
  if (!access) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const available = searchParams.get("available");

  const where: Record<string, unknown> = { restaurantId: id, isActive: true };
  if (type) where.type = type;
  if (available === "true") where.isAvailable = true;
  if (available === "false") where.isAvailable = false;

  // Prod runs a 1-connection Prisma pool and the Hotel Hub polls this endpoint.
  // Degrade gracefully on transient pool/DB errors with a 503 instead of letting
  // them surface as a raw 500 — mirrors the /tables endpoint.
  try {
    const rooms = await db.room.findMany({
      where,
      include: {
        _count: { select: { bookings: true } },
      },
      orderBy: [{ sortOrder: "asc" }, { roomNumber: "asc" }],
    });

    return NextResponse.json(rooms);
  } catch (err) {
    console.error("[rooms] GET failed", err);
    return NextResponse.json(
      { error: "Could not load rooms. Please try again." },
      { status: 503 },
    );
  }
}

// POST /api/restaurants/[id]/rooms — create a new room (owner or MANAGER+)
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const access = await requireOwnerOrStaffManager(req, id);
  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const {
    roomNumber,
    name,
    type,
    floor,
    price,
    maxGuests,
    description,
    amenities,
    imageUrls,
    videoUrl,
    bedType,
    bedCount,
    sortOrder,
  } = body;

  if (!roomNumber?.trim()) {
    return NextResponse.json(
      { error: "Room number is required" },
      { status: 400 },
    );
  }

  const trimmedRoomNumber = roomNumber.trim();

  // Check for duplicate room number in this restaurant
  const existing = await db.room.findUnique({
    where: { restaurantId_roomNumber: { restaurantId: id, roomNumber: trimmedRoomNumber } },
  });
  if (existing) {
    return NextResponse.json(
      { error: `Room ${roomNumber} already exists` },
      { status: 409 },
    );
  }

  // Build a stable, restaurant-specific QR target. Stored as a relative path so
  // it stays correct across domains/previews; the client prefixes the origin.
  // Uniqueness is guaranteed by slug (one per restaurant) + room number.
  const restaurant = await db.restaurant.findUnique({
    where: { id },
    select: { slug: true },
  });
  const qrUrl = restaurant?.slug
    ? `/hotel/${restaurant.slug}/room/${encodeURIComponent(trimmedRoomNumber)}`
    : null;

  const room = await db.room.create({
    data: {
      roomNumber: trimmedRoomNumber,
      name: name?.trim() || null,
      type: type || "STANDARD",
      floor: floor ?? 1,
      price: price ?? 0,
      maxGuests: maxGuests ?? 2,
      description: description?.trim() || null,
      amenities: amenities ?? [],
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
