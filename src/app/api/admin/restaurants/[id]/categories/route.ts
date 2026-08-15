import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logAudit, getClientIp } from "@/lib/audit";
import {
  requireAdminForRestaurant,
  adminActorLabel,
  TENANT_VIEW_PERMISSIONS,
  TENANT_MANAGE_PERMISSIONS,
} from "@/lib/admin-restaurant-guard";

type Params = { params: Promise<{ id: string }> };

/**
 * Master-admin menu categories on behalf of a business. Mirrors the owner route
 * at /api/restaurants/[id]/categories — same request shapes, including the
 * confirm-first DELETE — but guarded by the admin JWT and tenant scope.
 */

/** GET — the category tree, newest sort order first. */
export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const guard = await requireAdminForRestaurant(req, id, TENANT_VIEW_PERMISSIONS);
  if ("response" in guard) return guard.response;

  const categories = await db.menuCategory.findMany({
    where: { restaurantId: id },
    include: { _count: { select: { items: true } } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(categories, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const guard = await requireAdminForRestaurant(req, id, TENANT_MANAGE_PERMISSIONS);
  if ("response" in guard) return guard.response;

  const body = await req.json().catch(() => ({}));
  const name: string | undefined = typeof body.name === "string" ? body.name.trim() : undefined;
  const parentId: string | undefined = body.parentId || undefined;
  const icon: string | undefined = body.icon || undefined;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (name.length > 100) {
    return NextResponse.json({ error: "Name too long" }, { status: 400 });
  }

  try {
    let slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (parentId) {
      const parent = await db.menuCategory.findFirst({
        where: { id: parentId, restaurantId: id },
      });
      if (parent) slug = `${parent.slug}--${slug}`;
    }

    const existing = await db.menuCategory.findUnique({
      where: { restaurantId_slug: { restaurantId: id, slug } },
    });
    if (existing) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

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

    logAudit({
      action: "CATEGORY_CREATED",
      entity: "MenuCategory",
      entityId: category.id,
      detail: `Platform admin added category "${name}"`,
      metadata: { by: adminActorLabel(guard.admin), name },
      restaurantId: id,
      ipAddress: getClientIp(req.headers),
    });

    return NextResponse.json({ ...category, children: [] }, { status: 201 });
  } catch (err) {
    console.error("[Admin Categories POST]", err);
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}

/** PATCH — rename a category. `categoryId` travels in the body, as on the owner route. */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const guard = await requireAdminForRestaurant(req, id, TENANT_MANAGE_PERMISSIONS);
  if ("response" in guard) return guard.response;

  const body = await req.json().catch(() => ({}));
  const categoryId: string | undefined = body.categoryId;
  const name: string | undefined =
    typeof body.name === "string" ? body.name.trim() : undefined;

  if (!categoryId || !name) {
    return NextResponse.json(
      { error: "categoryId and name are required" },
      { status: 400 },
    );
  }
  if (name.length > 100) {
    return NextResponse.json({ error: "Name too long" }, { status: 400 });
  }

  // Scoped update — a category can never be renamed by id across tenants.
  const result = await db.menuCategory.updateMany({
    where: { id: categoryId, restaurantId: id },
    data: { name },
  });
  if (result.count === 0) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  const category = await db.menuCategory.findUnique({
    where: { id: categoryId },
    include: { _count: { select: { items: true } } },
  });

  logAudit({
    action: "CATEGORY_UPDATED",
    entity: "MenuCategory",
    entityId: categoryId,
    detail: `Platform admin renamed a category to "${name}"`,
    metadata: { by: adminActorLabel(guard.admin), name },
    restaurantId: id,
    ipAddress: getClientIp(req.headers),
  });

  return NextResponse.json(category);
}

/**
 * DELETE — two-step, like the owner route: without `?confirm=true` it reports
 * what would be destroyed (a category delete cascades to its dishes and
 * sub-categories) and writes nothing.
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const guard = await requireAdminForRestaurant(req, id, TENANT_MANAGE_PERMISSIONS);
  if ("response" in guard) return guard.response;

  const body = await req.json().catch(() => ({}));
  const categoryId: string | undefined = body.categoryId;
  if (!categoryId) {
    return NextResponse.json({ error: "categoryId is required" }, { status: 400 });
  }

  const category = await db.menuCategory.findFirst({
    where: { id: categoryId, restaurantId: id },
    select: { id: true, name: true },
  });
  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  const collectDescendants = async (catId: string): Promise<string[]> => {
    const children = await db.menuCategory.findMany({
      where: { parentId: catId },
      select: { id: true },
    });
    const childIds = children.map((c) => c.id);
    const deeper = (
      await Promise.all(childIds.map((cid) => collectDescendants(cid)))
    ).flat();
    return [...childIds, ...deeper];
  };

  const descendantIds = await collectDescendants(categoryId);
  const itemCount = await db.menuItem.count({
    where: { categoryId: { in: [categoryId, ...descendantIds] } },
  });

  if (req.nextUrl.searchParams.get("confirm") !== "true") {
    return NextResponse.json({
      willDelete: { items: itemCount, subcategories: descendantIds.length },
      categoryId,
      name: category.name,
    });
  }

  await db.menuCategory.delete({ where: { id: categoryId } });

  logAudit({
    action: "CATEGORY_DELETED",
    entity: "MenuCategory",
    entityId: categoryId,
    detail: `Platform admin deleted category "${category.name}" (${itemCount} dishes, ${descendantIds.length} sub-categories)`,
    metadata: {
      by: adminActorLabel(guard.admin),
      name: category.name,
      items: itemCount,
      subcategories: descendantIds.length,
    },
    restaurantId: id,
    ipAddress: getClientIp(req.headers),
  });

  return NextResponse.json({
    success: true,
    deleted: { items: itemCount, subcategories: descendantIds.length },
  });
}
