import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/public/restaurants/[slug]/stories/view?id=xxx — Increment view count
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const { searchParams } = new URL(req.url);
  const storyId = searchParams.get("id");

  if (!storyId) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  // Verify the story belongs to this restaurant
  const restaurant = await db.restaurant.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!restaurant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await db.story.updateMany({
      where: {
        id: storyId,
        restaurantId: restaurant.id,
      },
      data: {
        viewCount: { increment: 1 },
      },
    });
  } catch {
    // silently fail if story doesn't exist
  }

  return NextResponse.json({ ok: true });
}
