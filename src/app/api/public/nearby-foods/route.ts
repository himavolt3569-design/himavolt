import { NextRequest, NextResponse } from "next/server";
import { findNearbyRestaurants } from "@/lib/discovery/find-nearby";
import { nearbySearchSchema } from "@/lib/validations";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers) ?? "unknown";
  const limited = await rateLimit(`nearby-foods:${ip}`, 60_000, 60);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds || 60) } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = nearbySearchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid search" }, { status: 400 });
  }

  try {
    const restaurants = await findNearbyRestaurants(parsed.data);
    const restaurantIds = restaurants.map(r => r.id);

    if (restaurantIds.length === 0) {
      return NextResponse.json({ items: [] });
    }

    const menuItems = await db.menuItem.findMany({
      where: {
        restaurantId: { in: restaurantIds },
        isAvailable: true,
        imageUrl: { not: null },
        NOT: [
          { name: { contains: "dew", mode: "insensitive" } },
          { name: { contains: "coke", mode: "insensitive" } },
          { name: { contains: "pepsi", mode: "insensitive" } },
          { name: { contains: "fanta", mode: "insensitive" } },
          { name: { contains: "sprite", mode: "insensitive" } },
          { category: { name: { contains: "drink", mode: "insensitive" } } },
          { category: { name: { contains: "beverage", mode: "insensitive" } } }
        ]
      },
      take: 12, // Limit to 12 food items for the horizontal rail
      orderBy: [
        { isFeatured: 'desc' },
        { rating: 'desc' }
      ],
      select: {
        id: true,
        name: true,
        price: true,
        imageUrl: true,
        restaurant: {
          select: { name: true, slug: true }
        }
      }
    });

    return NextResponse.json(
      { items: menuItems },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("[api/public/nearby-foods]", err);
    return NextResponse.json({ error: "Could not fetch nearby foods." }, { status: 503 });
  }
}
