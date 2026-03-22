import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { getStaffSession } from "@/lib/staff-auth";

type Params = { params: Promise<{ id: string; roomId: string }> };

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

// GET /api/restaurants/[id]/rooms/[roomId] — get single room details
export async function GET(
  req: NextRequest,
  { params }: Params,
) {
  const { id, roomId } = await params;
  if (!(await canAccess(req, id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const room = await db.room.findFirst({
    where: { id: roomId, restaurantId: id, isActive: true },
    include: {
      bookings: {
        where: {
          status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] },
        },
        orderBy: { checkIn: "asc" },
        take: 10,
      },
    },
  });

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  return NextResponse.json(room);
}

// PATCH /api/restaurants/[id]/rooms/[roomId] — update room details
export async function PATCH(
  req: NextRequest,
  { params }: Params,
) {
  const { id, roomId } = await params;
  if (!(await canAccess(req, id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await db.room.findFirst({
    where: { id: roomId, restaurantId: id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
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
    isAvailable,
    sortOrder,
  } = body;

  // If changing room number, check for duplicates
  if (roomNumber && roomNumber.trim() !== existing.roomNumber) {
    const duplicate = await db.room.findUnique({
      where: {
        restaurantId_roomNumber: {
          restaurantId: id,
          roomNumber: roomNumber.trim(),
        },
      },
    });
    if (duplicate) {
      return NextResponse.json(
        { error: `Room ${roomNumber} already exists` },
        { status: 409 },
      );
    }
  }

  const room = await db.room.update({
    where: { id: roomId },
    data: {
      ...(roomNumber !== undefined && { roomNumber: roomNumber.trim() }),
      ...(name !== undefined && { name: name?.trim() || null }),
      ...(type !== undefined && { type }),
      ...(floor !== undefined && { floor }),
      ...(price !== undefined && { price }),
      ...(maxGuests !== undefined && { maxGuests }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(amenities !== undefined && { amenities }),
      ...(imageUrls !== undefined && { imageUrls }),
      ...(videoUrl !== undefined && { videoUrl: videoUrl?.trim() || null }),
      ...(isAvailable !== undefined && { isAvailable }),
      ...(sortOrder !== undefined && { sortOrder }),
    },
  });

  return NextResponse.json(room);
}

// DELETE /api/restaurants/[id]/rooms/[roomId] — soft-delete room
export async function DELETE(
  req: NextRequest,
  { params }: Params,
) {
  const { id, roomId } = await params;
  if (!(await canAccess(req, id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await db.room.findFirst({
    where: { id: roomId, restaurantId: id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  await db.room.update({
    where: { id: roomId },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true });
}
