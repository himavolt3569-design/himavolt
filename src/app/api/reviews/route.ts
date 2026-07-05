import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { z } from "zod";

const schema = z.object({
  restaurantId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be signed in to leave a review." }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { restaurantId, rating, comment } = parsed.data;

  // Ensure the property exists
  const restaurant = await db.restaurant.findUnique({
    where: { id: restaurantId },
    select: { id: true, showReviews: true },
  });
  if (!restaurant) {
    return NextResponse.json({ error: "Property not found." }, { status: 404 });
  }
  if (!restaurant.showReviews) {
    return NextResponse.json({ error: "Reviews are disabled for this property." }, { status: 403 });
  }

  // One review per user per property — upsert
  const existing = await db.review.findFirst({
    where: { restaurantId, userId: user.id },
    select: { id: true },
  });

  const review = existing
    ? await db.review.update({
        where: { id: existing.id },
        data: { rating, comment: comment || null },
        include: { user: { select: { name: true, email: true, imageUrl: true } } },
      })
    : await db.review.create({
        data: { restaurantId, userId: user.id, rating, comment: comment || null },
        include: { user: { select: { name: true, email: true, imageUrl: true } } },
      });

  // Recompute hotel average rating
  const agg = await db.review.aggregate({
    where: { restaurantId },
    _avg: { rating: true },
    _count: true,
  });
  await db.restaurant.update({
    where: { id: restaurantId },
    data: { rating: Math.round((agg._avg.rating ?? 0) * 100) / 100 },
  });

  return NextResponse.json({ review });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const restaurantId = searchParams.get("restaurantId");
  if (!restaurantId) {
    return NextResponse.json({ error: "restaurantId required" }, { status: 400 });
  }

  const reviews = await db.review.findMany({
    where: { restaurantId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { user: { select: { name: true, email: true, imageUrl: true } } },
  });

  return NextResponse.json({ reviews });
}
