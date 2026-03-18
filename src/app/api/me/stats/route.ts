import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [orderCount, spentAgg, ratingCount, topRestaurants] = await Promise.all([
    db.order.count({ where: { userId: user.id } }),
    db.order.aggregate({
      where: { userId: user.id, status: "DELIVERED" },
      _sum: { total: true },
    }),
    db.menuItemRating.count({ where: { userId: user.id } }),
    db.order.groupBy({
      by: ["restaurantId"],
      where: { userId: user.id },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 1,
    }),
  ]);

  let favoriteRestaurant: { name: string; imageUrl: string | null } | null = null;
  if (topRestaurants.length > 0) {
    favoriteRestaurant = await db.restaurant.findUnique({
      where: { id: topRestaurants[0].restaurantId },
      select: { name: true, imageUrl: true },
    });
  }

  return NextResponse.json({
    totalOrders: orderCount,
    totalSpent: spentAgg._sum.total ?? 0,
    ratingsGiven: ratingCount,
    favoriteRestaurant,
  });
}
