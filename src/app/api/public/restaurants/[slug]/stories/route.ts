import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/public/restaurants/[slug]/stories — Get active stories for customers
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const restaurant = await db.restaurant.findUnique({
    where: { slug },
    select: { id: true, name: true, imageUrl: true },
  });

  if (!restaurant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const now = new Date();

  const stories = await db.story.findMany({
    where: {
      restaurantId: restaurant.id,
      isActive: true,
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      type: true,
      mediaUrl: true,
      caption: true,
      viewCount: true,
      createdAt: true,
      staff: {
        select: {
          user: {
            select: { name: true, imageUrl: true },
          },
          role: true,
        },
      },
    },
  });

  return NextResponse.json({
    restaurant: {
      id: restaurant.id,
      name: restaurant.name,
      avatar: restaurant.imageUrl,
    },
    stories: stories.map((s) => ({
      id: s.id,
      type: s.type === "VIDEO" ? "video" : "image",
      src: s.mediaUrl,
      caption: s.caption,
      viewCount: s.viewCount,
      createdAt: s.createdAt.toISOString(),
      postedBy: s.staff?.user?.name ?? restaurant.name,
      postedByRole: s.staff?.role ?? "OWNER",
    })),
  });
}
