import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const reviews = await db.review.findMany({
    where: { userId: user.id },
    include: {
      restaurant: {
        select: { id: true, name: true, imageUrl: true, slug: true, type: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(reviews);
}

export async function POST(req: NextRequest) {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { restaurantId, rating, comment } = body as {
    restaurantId?: string;
    rating?: number;
    comment?: string;
  };

  if (!restaurantId || !rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Invalid review data" }, { status: 400 });
  }

  // Verify user has a delivered order from this restaurant
  const hasOrdered = await db.order.findFirst({
    where: { userId: user.id, restaurantId, status: "DELIVERED" },
  });
  if (!hasOrdered) {
    return NextResponse.json(
      { error: "You can only review restaurants you have ordered from" },
      { status: 403 }
    );
  }

  // Upsert: one review per (user, restaurant)
  const existing = await db.review.findFirst({
    where: { userId: user.id, restaurantId },
  });

  let result;
  if (existing) {
    result = await db.review.update({
      where: { id: existing.id },
      data: { rating, comment: comment ?? null },
    });
  } else {
    result = await db.review.create({
      data: { userId: user.id, restaurantId, rating, comment: comment ?? null },
    });
  }

  // Recompute restaurant's average rating
  const avg = await db.review.aggregate({
    where: { restaurantId },
    _avg: { rating: true },
  });
  await db.restaurant.update({
    where: { id: restaurantId },
    data: { rating: avg._avg.rating ?? 0 },
  });

  return NextResponse.json(result);
}
