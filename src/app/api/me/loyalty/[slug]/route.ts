import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";

/**
 * GET /api/me/loyalty/[slug]
 * Return the logged-in customer's loyalty account at this restaurant.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const user = await getOrCreateUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { slug } = await params;
    const restaurant = await db.restaurant.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const account = await db.loyaltyAccount.findUnique({
      where: {
        userId_restaurantId: {
          userId: user.id,
          restaurantId: restaurant.id,
        },
      },
    });

    return NextResponse.json({
      account: account ?? {
        points: 0,
        tier: "BRONZE",
        totalSpent: 0,
      },
    });
  } catch (err) {
    console.error("[me loyalty GET]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
