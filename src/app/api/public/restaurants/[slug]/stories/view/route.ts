import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Story id can contain anything cuid generates, but we still want to keep the
// cookie name in a known character set. Reject anything weird up front.
const STORY_ID_RE = /^[a-zA-Z0-9_-]{1,40}$/;

// POST /api/public/restaurants/[slug]/stories/view?id=xxx — Increment view count.
// Cookie-based dedupe so a single bot can't inflate viewCount by hammering
// this endpoint. Cookie expires after 12h, after which the same client can
// re-count once more for that story.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug: encodedSlug } = await params;
  const slug = decodeURIComponent(encodedSlug);
  const { searchParams } = new URL(req.url);
  const storyId = searchParams.get("id");

  if (!storyId || !STORY_ID_RE.test(storyId)) {
    return NextResponse.json(
      { error: "Missing or invalid id" },
      { status: 400 },
    );
  }

  // Verify the story belongs to this restaurant
  const restaurant = await db.restaurant.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!restaurant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const cookieName = `viewed_story_${storyId}`;
  const seen = req.cookies.get(cookieName);
  const res = NextResponse.json({ ok: true });

  if (seen) {
    // Already counted by this client recently; keep the response shape stable
    // so the caller can't tell whether the count incremented.
    return res;
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

  res.cookies.set({
    name: cookieName,
    value: "1",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 12 * 60 * 60, // 12h
  });
  return res;
}
