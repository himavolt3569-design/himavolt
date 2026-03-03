import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify ownership or admin access
  const restaurant = await db.restaurant.findUnique({
    where: { id },
    select: { ownerId: true },
  });

  if (!restaurant || restaurant.ownerId !== userId) {
    // Alternatively check if user is a SUPER_ADMIN staff member, but owner is fine for now
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const logs = await db.staffAttendance.findMany({
    where: {
      staff: {
        restaurantId: id,
      },
    },
    include: {
      staff: {
        include: {
          user: {
            select: { name: true, imageUrl: true },
          },
        },
      },
    },
    orderBy: {
      date: "desc",
    },
    take: 100, // Limit to recent 100 for performance
  });

  return NextResponse.json(logs);
}
