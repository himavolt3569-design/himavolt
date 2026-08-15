import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logAudit, getClientIp } from "@/lib/audit";
import {
  requireAdminForRestaurant,
  adminActorLabel,
  TENANT_VIEW_PERMISSIONS,
  TENANT_MANAGE_PERMISSIONS,
} from "@/lib/admin-restaurant-guard";

type Params = { params: Promise<{ id: string }> };

/**
 * Master-admin room read/create on behalf of a hotel. Mirrors the owner route
 * at /api/restaurants/[id]/rooms but guarded by the admin JWT and tenant scope.
 * Returns a bare array — the products tab and the management console both read
 * it that way.
 */

export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const guard = await requireAdminForRestaurant(req, id, TENANT_VIEW_PERMISSIONS);
  if ("response" in guard) return guard.response;

  try {
    const rooms = await db.room.findMany({
      where: { restaurantId: id, isActive: true },
      include: { _count: { select: { bookings: true } } },
      orderBy: [{ sortOrder: "asc" }, { roomNumber: "asc" }],
    });
    return NextResponse.json(rooms, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[Admin rooms] GET failed", err);
    return NextResponse.json(
      { error: "Could not load rooms. Please try again." },
      { status: 503 },
    );
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const guard = await requireAdminForRestaurant(req, id, TENANT_MANAGE_PERMISSIONS);
  if ("response" in guard) return guard.response;

  const body = await req.json().catch(() => ({}));
  const {
    roomNumber, name, type, floor, price, maxGuests, description,
    amenities, offerings, locationNote, imageUrls, videoUrl,
    bedType, bedCount, sortOrder,
  } = body;

  if (!roomNumber?.trim()) {
    return NextResponse.json({ error: "Room number is required" }, { status: 400 });
  }
  const trimmedRoomNumber = roomNumber.trim();

  const existing = await db.room.findUnique({
    where: { restaurantId_roomNumber: { restaurantId: id, roomNumber: trimmedRoomNumber } },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ error: `Room ${trimmedRoomNumber} already exists` }, { status: 409 });
  }

  const qrUrl = guard.restaurant.slug
    ? `/hotel/${guard.restaurant.slug}/room/${encodeURIComponent(trimmedRoomNumber)}`
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

  logAudit({
    action: "ROOM_CREATED",
    entity: "Room",
    entityId: room.id,
    detail: `Platform admin added room ${trimmedRoomNumber} to "${guard.restaurant.name}"`,
    metadata: { by: adminActorLabel(guard.admin), roomNumber: trimmedRoomNumber },
    restaurantId: id,
    ipAddress: getClientIp(req.headers),
  });

  return NextResponse.json(room, { status: 201 });
}
