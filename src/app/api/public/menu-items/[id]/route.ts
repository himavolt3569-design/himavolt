import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

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
          },
        },
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const commonInclude = {
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
        },
      },
    };

    // Get related items: same category, excluding current
    const related = await db.menuItem.findMany({
      where: {
        categoryId: item.categoryId,
        id: { not: item.id },
        isAvailable: true,
      },
      include: commonInclude,
      orderBy: [{ isFeatured: "desc" }, { rating: "desc" }],
      take: 8,
    });

    // Top rated items across the same restaurant
    const topRated = await db.menuItem.findMany({
      where: {
        restaurantId: item.restaurantId,
        id: { not: item.id },
        isAvailable: true,
        rating: { gte: 3.5 },
      },
      include: commonInclude,
      orderBy: { rating: "desc" },
      take: 6,
    });

    // Trending = featured or bestseller items
    const trending = await db.menuItem.findMany({
      where: {
        restaurantId: item.restaurantId,
        id: { not: item.id },
        isAvailable: true,
        OR: [{ isFeatured: true }, { badge: "Bestseller" }],
      },
      include: commonInclude,
      orderBy: { rating: "desc" },
      take: 6,
    });

    return NextResponse.json({
      item,
      related,
      topRated,
      trending,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch menu item" },
      { status: 500 },
    );
  }
}
