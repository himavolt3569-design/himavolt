import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/public/restaurants/[slug]/specials
 * Returns featured/daily-special menu items for the "Today's Specials" ribbon
 * on the customer menu page.
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

    const items = await db.menuItem.findMany({
      where: {
        restaurantId: restaurant.id,
        isAvailable: true,
        OR: [
          { isFeatured: true },
          { badge: { in: ["Daily Special", "Today's Special", "Special"] } },
        ],
      },
      include: {
        sizes: true,
        addOns: true,
        category: { select: { id: true, name: true, slug: true } },
      },
      orderBy: [{ sortOrder: "asc" }, { rating: "desc" }],
      take: 12,
    });

    return NextResponse.json({ specials: items });
  } catch (err) {
    console.error("[public specials GET]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
