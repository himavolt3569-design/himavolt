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

// GET /api/restaurants/[id]/rooms — list all rooms for a restaurant
export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  if (!(await canAccess(req, id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const available = searchParams.get("available");

  const where: Record<string, unknown> = { restaurantId: id, isActive: true };
  if (type) where.type = type;
  if (available === "true") where.isAvailable = true;
  if (available === "false") where.isAvailable = false;

  const rooms = await db.room.findMany({
    where,
    include: {
      _count: { select: { bookings: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { roomNumber: "asc" }],
  });

  return NextResponse.json(rooms);
}

// POST /api/restaurants/[id]/rooms — create a new room
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  if (!(await canAccess(req, id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    sortOrder,
  } = body;

  if (!roomNumber?.trim()) {
    return NextResponse.json(
      { error: "Room number is required" },
      { status: 400 },
    );
  }

  // Check for duplicate room number in this restaurant
  const existing = await db.room.findUnique({
    where: { restaurantId_roomNumber: { restaurantId: id, roomNumber: roomNumber.trim() } },
  });
  if (existing) {
    return NextResponse.json(
      { error: `Room ${roomNumber} already exists` },
      { status: 409 },
    );
  }

  const room = await db.room.create({
    data: {
      roomNumber: roomNumber.trim(),
      name: name?.trim() || null,
      type: type || "STANDARD",
      floor: floor ?? 1,
      price: price ?? 0,
      maxGuests: maxGuests ?? 2,
      description: description?.trim() || null,
      amenities: amenities ?? [],
      imageUrls: imageUrls ?? [],
      videoUrl: videoUrl?.trim() || null,
      sortOrder: sortOrder ?? 0,
      restaurantId: id,
    },
  });

  return NextResponse.json(room, { status: 201 });
}
