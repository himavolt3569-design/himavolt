import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  const { bookingId } = await params;

  const booking = await db.roomBooking.findUnique({
    where: { id: bookingId },
    include: {
      room: {
        select: {
          roomNumber: true,
          name: true,
          type: true,
          floor: true,
          bedType: true,
          bedCount: true,
          imageUrls: true,
        },
      },
      restaurant: {
        select: {
          name: true,
          slug: true,
          imageUrl: true,
          phone: true,
          address: true,
          city: true,
          currency: true,
        },
      },
    },
  });

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  return NextResponse.json({ booking });
}
