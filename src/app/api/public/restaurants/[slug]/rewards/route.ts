import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/public/restaurants/[slug]/rewards
 * Returns active loyalty rewards + the restaurant's loyalty config.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;

    const restaurant = await db.restaurant.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const [config, rewards] = await Promise.all([
      db.loyaltyConfig.findUnique({
        where: { restaurantId: restaurant.id },
        select: { pointsPerCurrency: true, isActive: true, welcomeBonus: true },
      }),
      db.loyaltyReward.findMany({
        where: { restaurantId: restaurant.id, active: true },
        orderBy: [{ sortOrder: "asc" }, { pointsCost: "asc" }],
      }),
    ]);

    return NextResponse.json({
      loyaltyEnabled: config?.isActive ?? false,
      pointsPerCurrency: config?.pointsPerCurrency ?? 1,
      rewards,
    });
  } catch (err) {
    console.error("[public rewards GET]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
