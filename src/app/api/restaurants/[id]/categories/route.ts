import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { getStaffSession } from "@/lib/staff-auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // Get all categories (flat) with item counts
    const allCats = await db.menuCategory.findMany({
      where: { restaurantId: id },
      include: { _count: { select: { items: true } } },
      orderBy: { sortOrder: "asc" },
    });

    // Build hierarchy: top-level cats with children nested
    const topLevel = allCats.filter((c) => !c.parentId);
    const result = topLevel.map((cat) => ({
      ...cat,
      children: allCats
        .filter((c) => c.parentId === cat.id)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error("[Categories GET]", err);
    return NextResponse.json(
      { error: "Failed to load categories", detail: String(err) },
      { status: 500 },
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getOrCreateUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const restaurant = await db.restaurant.findFirst({
    where: { id, ownerId: user.id },
  });
  if (!restaurant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const name: string = body.name;
  const parentId: string | undefined = body.parentId;
  const icon: string | undefined = body.icon;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  try {
    // Build slug
    let slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (parentId) {
      const parent = await db.menuCategory.findUnique({ where: { id: parentId } });
      if (parent) slug = `${parent.slug}--${slug}`;
    }

    // Ensure unique slug
    const existing = await db.menuCategory.findUnique({
      where: { restaurantId_slug: { restaurantId: id, slug } },
    });
    if (existing) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    // Get max sort order among siblings
    const siblings = await db.menuCategory.findMany({
      where: parentId
        ? { restaurantId: id, parentId }
        : { restaurantId: id, parentId: null },
      select: { sortOrder: true },
      orderBy: { sortOrder: "desc" },
      take: 1,
    });
    const nextSort = (siblings[0]?.sortOrder ?? 0) + 1;

    const category = await db.menuCategory.create({
      data: {
        name,
        slug,
        icon: icon || null,
        sortOrder: nextSort,
        restaurantId: id,
        parentId: parentId || null,
      },
      include: { _count: { select: { items: true } } },
    });

    return NextResponse.json({ ...category, children: [] }, { status: 201 });
  } catch (err) {
    console.error("[Categories POST]", err);
    return NextResponse.json(
      { error: "Failed to create category", detail: String(err) },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Accept staff JWT or owner session
  const staff = await getStaffSession(req);
  let authorized = staff?.restaurantId === id;
  if (!authorized) {
    const user = await getOrCreateUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const restaurant = await db.restaurant.findFirst({ where: { id, ownerId: user.id } });
    if (!restaurant) return NextResponse.json({ error: "Not found" }, { status: 404 });
    authorized = true;
  }

  const body = await req.json().catch(() => ({}));
  const categoryId: string | undefined = body.categoryId;
  if (!categoryId) {
    return NextResponse.json({ error: "categoryId is required" }, { status: 400 });
  }

  try {
    const category = await db.menuCategory.findFirst({
      where: { id: categoryId, restaurantId: id },
      include: {
        _count: { select: { items: true, children: true } },
      },
    });
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    // Count all items in this category and all its descendants
    const getAllDescendantIds = async (catId: string): Promise<string[]> => {
      const children = await db.menuCategory.findMany({
        where: { parentId: catId },
        select: { id: true },
      });
      const childIds = children.map((c) => c.id);
      const grandchildIds = (
        await Promise.all(childIds.map((cid) => getAllDescendantIds(cid)))
      ).flat();
      return [...childIds, ...grandchildIds];
    };

    const descendantIds = await getAllDescendantIds(categoryId);
    const allCatIds = [categoryId, ...descendantIds];

    const itemCount = await db.menuItem.count({
      where: { categoryId: { in: allCatIds } },
    });
    const subcategoryCount = descendantIds.length;

    // If confirm=true in query, actually delete
    const { searchParams } = new URL(req.url);
    if (searchParams.get("confirm") !== "true") {
      return NextResponse.json({
        willDelete: { items: itemCount, subcategories: subcategoryCount },
        categoryId,
        name: category.name,
      });
    }

    await db.menuCategory.delete({ where: { id: categoryId } });

    return NextResponse.json({
      success: true,
      deleted: { items: itemCount, subcategories: subcategoryCount },
    });
  } catch (err) {
    console.error("[Categories DELETE]", err);
    return NextResponse.json(
      { error: "Failed to delete category", detail: String(err) },
      { status: 500 },
    );
  }
}
