import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { searchParams } = new URL(req.url);
  const categorySlug = searchParams.get("category");
  const search = searchParams.get("q");

  const restaurant = await db.restaurant.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!restaurant) {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  }

  const where: Record<string, unknown> = {
    restaurantId: restaurant.id,
    isAvailable: true,
  };

  if (categorySlug) {
    const category = await db.menuCategory.findFirst({
      where: { restaurantId: restaurant.id, slug: categorySlug },
    });
    if (category) where.categoryId = category.id;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { tags: { has: search.toLowerCase() } },
    ];
  }

  const items = await db.menuItem.findMany({
    where,
    include: {
      sizes: true,
      addOns: true,
      category: { select: { name: true, slug: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { rating: "desc" }],
  });

  return NextResponse.json(items);
}
