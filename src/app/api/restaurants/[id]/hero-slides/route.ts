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

async function authorize(req: NextRequest, restaurantId: string) {
  const staff = await requireStaffForRestaurant(req, restaurantId);
  if (staff) return true;
  const owner = await verifyOwner(restaurantId);
  return !!owner;
}

// GET /api/restaurants/[id]/hero-slides — List all slides (active + inactive)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!(await authorize(req, id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const slides = await db.heroSlide.findMany({
    where: { restaurantId: id },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      imageUrl: true,
      title: true,
      subtitle: true,
      sortOrder: true,
      isActive: true,
      linkItemId: true,
      linkItem: {
        select: { id: true, name: true },
      },
      createdAt: true,
    },
  });

  return NextResponse.json({ slides });
}

// POST /api/restaurants/[id]/hero-slides — Create a new slide
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!(await authorize(req, id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { imageUrl, title, subtitle, linkItemId, sortOrder } = body;

  if (!imageUrl) {
    return NextResponse.json(
      { error: "imageUrl is required" },
      { status: 400 }
    );
  }

  // Default sortOrder: place after the last existing slide
  let order = sortOrder;
  if (order === undefined || order === null) {
    const last = await db.heroSlide.findFirst({
      where: { restaurantId: id },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    order = (last?.sortOrder ?? -1) + 1;
  }

  const slide = await db.heroSlide.create({
    data: {
      imageUrl,
      title: title || null,
      subtitle: subtitle || null,
      linkItemId: linkItemId || null,
      sortOrder: order,
      isActive: true,
      restaurantId: id,
    },
    select: {
      id: true,
      imageUrl: true,
      title: true,
      subtitle: true,
      sortOrder: true,
      isActive: true,
      linkItemId: true,
      linkItem: {
        select: { id: true, name: true },
      },
      createdAt: true,
    },
  });

  return NextResponse.json({ slide }, { status: 201 });
}

// PATCH /api/restaurants/[id]/hero-slides — Update a slide
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!(await authorize(req, id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { slideId, ...fields } = body;

  if (!slideId) {
    return NextResponse.json(
      { error: "slideId is required" },
      { status: 400 }
    );
  }

  // Verify the slide belongs to this restaurant
  const existing = await db.heroSlide.findFirst({
    where: { id: slideId, restaurantId: id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Slide not found" }, { status: 404 });
  }

  // Build update data — only allow known fields
  const updateData: Record<string, unknown> = {};
  if (fields.imageUrl !== undefined) updateData.imageUrl = fields.imageUrl;
  if (fields.title !== undefined) updateData.title = fields.title || null;
  if (fields.subtitle !== undefined) updateData.subtitle = fields.subtitle || null;
  if (fields.linkItemId !== undefined) updateData.linkItemId = fields.linkItemId || null;
  if (fields.sortOrder !== undefined) updateData.sortOrder = fields.sortOrder;
  if (fields.isActive !== undefined) updateData.isActive = fields.isActive;

  const slide = await db.heroSlide.update({
    where: { id: slideId },
    data: updateData,
    select: {
      id: true,
      imageUrl: true,
      title: true,
      subtitle: true,
      sortOrder: true,
      isActive: true,
      linkItemId: true,
      linkItem: {
        select: { id: true, name: true },
      },
      createdAt: true,
    },
  });

  return NextResponse.json({ slide });
}

// DELETE /api/restaurants/[id]/hero-slides — Delete a slide
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!(await authorize(req, id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const slideId = searchParams.get("slideId");

  if (!slideId) {
    return NextResponse.json(
      { error: "slideId is required" },
      { status: 400 }
    );
  }

  const slide = await db.heroSlide.findFirst({
    where: { id: slideId, restaurantId: id },
  });

  if (!slide) {
    return NextResponse.json({ error: "Slide not found" }, { status: 404 });
  }

  await db.heroSlide.delete({ where: { id: slideId } });

  return NextResponse.json({ success: true });
}
