import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const restaurant = await db.restaurant.findUnique({
    where: { slug },
    select: { id: true, currency: true },
  });

  if (!restaurant) {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  }

  const [config, items] = await Promise.all([
    db.displayCounterConfig.findUnique({
      where: { restaurantId: restaurant.id },
    }),
    db.displayCounterItem.findMany({
      where: { restaurantId: restaurant.id },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  // If display counter is not enabled, return empty
  if (!config?.isEnabled) {
    return NextResponse.json({ enabled: false, items: [], currency: restaurant.currency });
  }

  // Filter out sold-out items if auto-hide is on
  const visibleItems = config.autoHideSoldOut
    ? items.filter((i) => i.status !== "sold-out")
    : items;

  return NextResponse.json({
    enabled: true,
    currency: restaurant.currency,
    items: visibleItems.map((i) => ({
      id: i.id,
      name: i.name,
      category: i.category,
      price: i.showPrice ? i.price : null,
      status: i.status,
      imageUrl: i.imageUrl,
    })),
  });
}
