import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { unauthorized } from "@/lib/api-helpers";
import { logAudit, getClientIp } from "@/lib/audit";

/**
 * Master-admin category creation on behalf of a business. Mirrors the owner
 * route at /api/restaurants/[id]/categories (slug + sortOrder logic) but is
 * guarded by requireAdmin().
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin access required");

  const { id } = await params;

  const restaurant = await db.restaurant.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!restaurant) {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  }

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
      detail: `Master admin added category "${name}"`,
      metadata: { by: "master_admin", name },
      restaurantId: id,
      ipAddress: getClientIp(req.headers),
    });

    return NextResponse.json({ ...category, children: [] }, { status: 201 });
  } catch (err) {
    console.error("[Admin Categories POST]", err);
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}
