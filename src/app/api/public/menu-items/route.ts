import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/public/menu-items
 * Fetch available menu items across all active restaurants.
 * Query params:
 *   - category: filter by category name (case-insensitive)
 *   - q: search by name, description, or tags
 *   - limit: max items to return (default 60)
 *   - offset: pagination offset (default 0)
 *   - veg: "true" to filter vegetarian only
 *   - maxPrice: max price filter
 *   - minRating: minimum rating filter
 *   - featured: "true" to filter featured items only
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const search = searchParams.get("q");
  const limit = Math.min(parseInt(searchParams.get("limit") || "60"), 120);
  const offset = parseInt(searchParams.get("offset") || "0");
  const veg = searchParams.get("veg");
  const maxPrice = searchParams.get("maxPrice");
  const minRating = searchParams.get("minRating");
  const featured = searchParams.get("featured");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {
    isAvailable: true,
    restaurant: { isActive: true },
  };

  if (category && category !== "All") {
    where.category = {
      name: { equals: category, mode: "insensitive" },
    };
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { tags: { has: search.toLowerCase() } },
    ];
  }

  if (veg === "true") {
    where.isVeg = true;
  }

  if (maxPrice) {
    where.price = { lte: parseFloat(maxPrice) };
  }

  if (minRating) {
    where.rating = { gte: parseFloat(minRating) };
  }

  if (featured === "true") {
    where.isFeatured = true;
  }

  const [items, total] = await Promise.all([
    db.menuItem.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, slug: true, icon: true } },
        restaurant: { select: { id: true, name: true, slug: true, imageUrl: true, currency: true } },
      },
      orderBy: [{ isFeatured: "desc" }, { rating: "desc" }, { sortOrder: "asc" }],
      take: limit,
      skip: offset,
    }),
    db.menuItem.count({ where }),
  ]);

  return NextResponse.json({ items, total });
}
