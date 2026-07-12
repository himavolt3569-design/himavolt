import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getRestaurantAccess,
  requireOwnerOrStaffManager,
} from "@/lib/access-control";

type Params = { params: Promise<{ id: string; roomId: string }> };

// GET /api/restaurants/[id]/rooms/[roomId] — get single room details
export async function GET(req: NextRequest, { params }: Params) {
  const { id, roomId } = await params;
  const access = await getRestaurantAccess(req, id);
  if (!access) {
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

// PATCH /api/restaurants/[id]/rooms/[roomId] — update room details (owner or MANAGER+)
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id, roomId } = await params;
  const access = await requireOwnerOrStaffManager(req, id);
  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
    offerings,
    locationNote,
    imageUrls,
    videoUrl,
    bedType,
    bedCount,
    isAvailable,
    sortOrder,
  } = body;

  // Recompute the QR target only when the room number actually changes, so the
  // stored unique link stays in sync without an extra query on every edit.
  let qrUrl: string | null | undefined;
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
    const restaurant = await db.restaurant.findUnique({
      where: { id },
      select: { slug: true },
    });
    qrUrl = restaurant?.slug
      ? `/hotel/${restaurant.slug}/room/${encodeURIComponent(roomNumber.trim())}`
      : null;
  }

  const room = await db.room.update({
    where: { id: roomId },
    data: {
      ...(qrUrl !== undefined && { qrUrl }),
      ...(roomNumber !== undefined && { roomNumber: roomNumber.trim() }),
      ...(name !== undefined && { name: name?.trim() || null }),
      ...(type !== undefined && { type }),
      ...(floor !== undefined && { floor: String(floor) }),
      ...(price !== undefined && { price }),
      ...(maxGuests !== undefined && { maxGuests }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(amenities !== undefined && { amenities }),
      ...(offerings !== undefined && { offerings }),
      ...(locationNote !== undefined && { locationNote: locationNote?.trim() || null }),
      ...(imageUrls !== undefined && { imageUrls }),
      ...(videoUrl !== undefined && { videoUrl: videoUrl?.trim() || null }),
      ...(bedType !== undefined && { bedType: bedType?.trim() || null }),
      ...(bedCount !== undefined && { bedCount }),
      ...(isAvailable !== undefined && { isAvailable }),
      ...(sortOrder !== undefined && { sortOrder }),
    },
  });

  return NextResponse.json(room);
}

// DELETE /api/restaurants/[id]/rooms/[roomId] — soft-delete room (owner or MANAGER+)
export async function DELETE(req: NextRequest, { params }: Params) {
  const { id, roomId } = await params;
  const access = await requireOwnerOrStaffManager(req, id);
  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
