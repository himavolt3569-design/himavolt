import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";

export async function GET() {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bookings = await db.roomBooking.findMany({
    where: { userId: user.id },
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
          city: true,
          currency: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(bookings);
}
