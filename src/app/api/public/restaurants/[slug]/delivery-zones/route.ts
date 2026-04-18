import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/public/restaurants/[slug]/delivery-zones
 * Returns active delivery zones so the checkout can validate the customer's
 * address and show the computed delivery fee before order submission.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;

    const restaurant = await db.restaurant.findUnique({
      where: { slug },
      select: { id: true, deliveryEnabled: true },
    });
    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    if (!restaurant.deliveryEnabled) {
      return NextResponse.json({ zones: [], deliveryEnabled: false });
    }

    const zones = await db.deliveryZone.findMany({
      where: { restaurantId: restaurant.id, isActive: true },
      select: {
        id: true,
        name: true,
        baseFee: true,
        perKmFee: true,
        freeAbove: true,
        maxRadiusKm: true,
      },
      orderBy: { maxRadiusKm: "asc" },
    });

    return NextResponse.json({ zones, deliveryEnabled: true });
  } catch (err) {
    console.error("[public delivery-zones GET]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
