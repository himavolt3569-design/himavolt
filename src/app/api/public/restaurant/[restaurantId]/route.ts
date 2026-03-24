import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/** GET /api/public/restaurant/[restaurantId] — minimal public info by ID */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ restaurantId: string }> }) {
  const { restaurantId } = await params;

  const restaurant = await db.restaurant.findUnique({
    where: { id: restaurantId },
    select: { id: true, name: true, slug: true, imageUrl: true },
  });

  if (!restaurant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ restaurant });
}
