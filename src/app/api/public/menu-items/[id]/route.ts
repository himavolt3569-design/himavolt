import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Menu data changes rarely. Cache for 60s on the edge with a 5-minute SWR
// window — combined with the Promise.all parallelism below this turns the
// 4-sequential-query stall (~10s on a cold pool) into a sub-second response.
export const revalidate = 60;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const item = await db.menuItem.findUnique({
      where: { id },
      include: {
        category: { select: { name: true, slug: true } },
        sizes: true,
        addOns: true,
        restaurant: {
          select: {
            id: true,
            name: true,
            slug: true,
            phone: true,
            address: true,
            imageUrl: true,
            currency: true,
          },
        },
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // Suggestion lists don't render restaurant address/phone — slim the
    // payload so we don't ship 3 × N copies of the parent restaurant.
    const suggestionInclude = {
      category: { select: { name: true, slug: true } },
      sizes: true,
      addOns: true,
      restaurant: {
        select: { id: true, name: true, slug: true, imageUrl: true },
      },
    };

    // Three sibling queries are independent — fan them out in parallel.
    const [related, topRated, trending] = await Promise.all([
      db.menuItem.findMany({
        where: {
          categoryId: item.categoryId,
          id: { not: item.id },
          isAvailable: true,
        },
        include: suggestionInclude,
        orderBy: [{ isFeatured: "desc" }, { rating: "desc" }],
        take: 8,
      }),
      db.menuItem.findMany({
        where: {
          restaurantId: item.restaurantId,
          id: { not: item.id },
          isAvailable: true,
          rating: { gte: 3.5 },
        },
        include: suggestionInclude,
        orderBy: { rating: "desc" },
        take: 6,
      }),
      db.menuItem.findMany({
        where: {
          restaurantId: item.restaurantId,
          id: { not: item.id },
          isAvailable: true,
          OR: [{ isFeatured: true }, { badge: "Bestseller" }],
        },
        include: suggestionInclude,
        orderBy: { rating: "desc" },
        take: 6,
      }),
    ]);

    return NextResponse.json(
      { item, related, topRated, trending },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch menu item" },
      { status: 500 },
    );
  }
}
