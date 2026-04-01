import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { unauthorized } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin access required");

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const restaurantId = searchParams.get("restaurantId");
  const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10), 500);
  const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (restaurantId) where.restaurantId = restaurantId;

  const [bookings, total] = await Promise.all([
    db.roomBooking.findMany({
      where,
      include: {
        room: {
          select: { roomNumber: true, name: true, type: true },
        },
        restaurant: {
          select: { id: true, name: true, slug: true, currency: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    db.roomBooking.count({ where }),
  ]);

  return NextResponse.json({ bookings, total, limit, offset });
}

/**
 * DELETE /api/admin/bookings
 * Permanently delete a room booking.
 */
export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin access required");

  const body = await req.json();
  const ids: string[] = body.ids ?? (body.bookingId ? [body.bookingId] : []);
  if (ids.length === 0) {
    return NextResponse.json({ error: "bookingId or ids required" }, { status: 400 });
  }

  await db.roomBooking.deleteMany({ where: { id: { in: ids } } });

  return NextResponse.json({ success: true, deleted: ids.length });
}
