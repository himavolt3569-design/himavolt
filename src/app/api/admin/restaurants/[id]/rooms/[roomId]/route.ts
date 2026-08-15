import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logAudit, getClientIp } from "@/lib/audit";
import {
  requireAdminForRestaurant,
  adminActorLabel,
  TENANT_MANAGE_PERMISSIONS,
} from "@/lib/admin-restaurant-guard";

type Params = { params: Promise<{ id: string; roomId: string }> };

/**
 * Master-admin edit/delete of one room. Mirrors the owner route at
 * /api/restaurants/[id]/rooms/[roomId], including the soft delete — a room with
 * booking history must stay resolvable, so `isActive: false` is the delete.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id, roomId } = await params;
  const guard = await requireAdminForRestaurant(req, id, TENANT_MANAGE_PERMISSIONS);
  if ("response" in guard) return guard.response;

  const existing = await db.room.findFirst({
    where: { id: roomId, restaurantId: id },
    select: { id: true, roomNumber: true },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "Room not found at this business" },
      { status: 404 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const {
    roomNumber, name, type, floor, price, maxGuests, description,
    amenities, offerings, locationNote, imageUrls, videoUrl,
    bedType, bedCount, isAvailable, sortOrder,
  } = body;

  // Recompute the QR target only when the room number actually changes, so the
  // stored link stays in sync without an extra query on every edit.
  let qrUrl: string | null | undefined;
  if (typeof roomNumber === "string" && roomNumber.trim() !== existing.roomNumber) {
    const trimmed = roomNumber.trim();
    if (!trimmed) {
      return NextResponse.json({ error: "Room number is required" }, { status: 400 });
    }
    const duplicate = await db.room.findUnique({
      where: { restaurantId_roomNumber: { restaurantId: id, roomNumber: trimmed } },
      select: { id: true },
    });
    if (duplicate) {
      return NextResponse.json(
        { error: `Room ${trimmed} already exists` },
        { status: 409 },
      );
    }
    qrUrl = guard.restaurant.slug
      ? `/hotel/${guard.restaurant.slug}/room/${encodeURIComponent(trimmed)}`
      : null;
  }

  const room = await db.room.update({
    where: { id: roomId },
    data: {
      ...(qrUrl !== undefined && { qrUrl }),
      ...(roomNumber !== undefined && { roomNumber: String(roomNumber).trim() }),
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

  logAudit({
    action: "ROOM_UPDATED",
    entity: "Room",
    entityId: roomId,
    detail: `Platform admin updated room ${existing.roomNumber} at "${guard.restaurant.name}"`,
    metadata: { by: adminActorLabel(guard.admin) },
    restaurantId: id,
    ipAddress: getClientIp(req.headers),
  });

  return NextResponse.json(room);
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { id, roomId } = await params;
  const guard = await requireAdminForRestaurant(req, id, TENANT_MANAGE_PERMISSIONS);
  if ("response" in guard) return guard.response;

  const existing = await db.room.findFirst({
    where: { id: roomId, restaurantId: id },
    select: { id: true, roomNumber: true },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "Room not found at this business" },
      { status: 404 },
    );
  }

  // A room with a live stay must not vanish from under the guest.
  const liveBooking = await db.roomBooking.findFirst({
    where: { roomId, status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] } },
    select: { id: true },
  });
  if (liveBooking) {
    return NextResponse.json(
      { error: "This room has an active booking. Resolve it before removing the room." },
      { status: 409 },
    );
  }

  await db.room.update({ where: { id: roomId }, data: { isActive: false } });

  logAudit({
    action: "ROOM_DELETED",
    entity: "Room",
    entityId: roomId,
    detail: `Platform admin removed room ${existing.roomNumber} from "${guard.restaurant.name}"`,
    metadata: { by: adminActorLabel(guard.admin), roomNumber: existing.roomNumber },
    restaurantId: id,
    ipAddress: getClientIp(req.headers),
  });

  return NextResponse.json({ success: true });
}
