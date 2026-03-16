import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStaffForRestaurant } from "@/lib/staff-auth";
import { getAuthUser } from "@/lib/auth";

async function verifyOwner(restaurantId: string) {
  const user = await getAuthUser();
  if (!user) return null;
  const restaurant = await db.restaurant.findUnique({
    where: { id: restaurantId },
    select: { ownerId: true },
  });
  if (!restaurant || restaurant.ownerId !== user.id) return null;
  return user.id;
}

// GET /api/restaurants/[id]/stories — List all stories (staff/owner)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const staff = await requireStaffForRestaurant(req, id);
  if (!staff) {
    const owner = await verifyOwner(id);
    if (!owner) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const stories = await db.story.findMany({
    where: { restaurantId: id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      type: true,
      mediaUrl: true,
      caption: true,
      isActive: true,
      expiresAt: true,
      viewCount: true,
      createdAt: true,
      staff: {
        select: {
          user: { select: { name: true, imageUrl: true } },
          role: true,
        },
      },
    },
  });

  return NextResponse.json({
    stories: stories.map((s) => ({
      id: s.id,
      type: s.type === "VIDEO" ? "video" : "image",
      mediaUrl: s.mediaUrl,
      caption: s.caption,
      isActive: s.isActive,
      isExpired: new Date(s.expiresAt) < new Date(),
      expiresAt: s.expiresAt.toISOString(),
      viewCount: s.viewCount,
      createdAt: s.createdAt.toISOString(),
      postedBy: s.staff?.user?.name ?? "Owner",
      postedByAvatar: s.staff?.user?.imageUrl ?? null,
      postedByRole: s.staff?.role ?? "OWNER",
    })),
  });
}

// POST /api/restaurants/[id]/stories — Create a new story
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const staff = await requireStaffForRestaurant(req, id);
  let staffId: string | null = null;

  if (!staff) {
    const owner = await verifyOwner(id);
    if (!owner) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else {
    staffId = staff.staffId;
  }

  const body = await req.json();
  const { mediaUrl, type, caption, durationHours } = body;

  if (!mediaUrl) {
    return NextResponse.json(
      { error: "mediaUrl is required" },
      { status: 400 },
    );
  }

  const storyType = type === "video" ? "VIDEO" : "IMAGE";
  const hours = durationHours ?? 24;
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

  const story = await db.story.create({
    data: {
      type: storyType,
      mediaUrl,
      caption: caption || null,
      expiresAt,
      restaurantId: id,
      staffId,
    },
    select: {
      id: true,
      type: true,
      mediaUrl: true,
      caption: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ story }, { status: 201 });
}

// DELETE /api/restaurants/[id]/stories — Delete a story
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const staff = await requireStaffForRestaurant(req, id);
  if (!staff) {
    const owner = await verifyOwner(id);
    if (!owner) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const { searchParams } = new URL(req.url);
  const storyId = searchParams.get("storyId");

  if (!storyId) {
    return NextResponse.json({ error: "storyId is required" }, { status: 400 });
  }

  // Verify the story belongs to this restaurant
  const story = await db.story.findFirst({
    where: { id: storyId, restaurantId: id },
  });

  if (!story) {
    return NextResponse.json({ error: "Story not found" }, { status: 404 });
  }

  await db.story.delete({ where: { id: storyId } });

  return NextResponse.json({ success: true });
}
