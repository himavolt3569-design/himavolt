import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logAudit, getClientIp } from "@/lib/audit";
import {
  requireAdminForRestaurant,
  adminActorLabel,
  TENANT_MANAGE_PERMISSIONS,
} from "@/lib/admin-restaurant-guard";

type Params = { params: Promise<{ id: string; itemId: string }> };

/**
 * Master-admin edit/delete of a single dish. Mirrors the owner route at
 * /api/restaurants/[id]/menu/[itemId] but is guarded by the admin JWT, so the
 * hot owner/staff path stays untouched.
 *
 * Unlike the owner route, the item is re-read and checked against the
 * restaurant in the URL first: an admin can address any restaurant, so a
 * mismatched pair here would be a cross-tenant write with nothing to catch it.
 */

const ALLOWED_FIELDS = [
  "name",
  "description",
  "price",
  "imageUrl",
  "prepTime",
  "isVeg",
  "hasEgg",
  "hasOnionGarlic",
  "isAvailable",
  "badge",
  "tags",
  "categoryId",
  "sortOrder",
  "discount",
  "discountLabel",
  "isFeatured",
  "spiceLevel",
  "calories",
  "allergens",
  "isDrink",
  "drinkCategory",
  "stockEnabled",
  "stockQuantity",
  "bottleCount",
  "volumeMl",
];

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id, itemId } = await params;
  const guard = await requireAdminForRestaurant(req, id, TENANT_MANAGE_PERMISSIONS);
  if ("response" in guard) return guard.response;

  const existing = await db.menuItem.findFirst({
    where: { id: itemId, restaurantId: id },
    select: { id: true, name: true },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "Menu item not found for this business" },
      { status: 404 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  for (const key of ALLOWED_FIELDS) {
    if (body[key] !== undefined) data[key] = body[key];
  }

  if (typeof data.name === "string" && !data.name.trim()) {
    return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
  }
  if (data.price !== undefined) {
    const price = Number(data.price);
    if (!Number.isFinite(price) || price <= 0 || price > 1_000_000) {
      return NextResponse.json({ error: "Invalid price" }, { status: 400 });
    }
    data.price = price;
  }

  // Moving a dish between categories must stay inside this business.
  if (typeof data.categoryId === "string") {
    const category = await db.menuCategory.findFirst({
      where: { id: data.categoryId, restaurantId: id },
      select: { id: true },
    });
    if (!category) {
      return NextResponse.json(
        { error: "Category not found for this business" },
        { status: 400 },
      );
    }
  }

  if (body.sizes !== undefined) {
    await db.menuItemSize.deleteMany({ where: { menuItemId: itemId } });
    if (Array.isArray(body.sizes) && body.sizes.length) {
      await db.menuItemSize.createMany({
        data: body.sizes
          .slice(0, 10)
          .map((s: { label: string; grams?: string; priceAdd?: number }) => ({
            menuItemId: itemId,
            label: s.label,
            grams: s.grams ?? "",
            priceAdd: s.priceAdd ?? 0,
          })),
      });
    }
  }

  if (body.addOns !== undefined) {
    await db.menuItemAddOn.deleteMany({ where: { menuItemId: itemId } });
    if (Array.isArray(body.addOns) && body.addOns.length) {
      await db.menuItemAddOn.createMany({
        data: body.addOns
          .slice(0, 20)
          .map((a: { name: string; price?: number }) => ({
            menuItemId: itemId,
            name: a.name,
            price: a.price ?? 0,
          })),
      });
    }
  }

  const item = await db.menuItem.update({
    where: { id: itemId },
    data,
    include: { sizes: true, addOns: true, category: true },
  });

  logAudit({
    action: "MENU_ITEM_UPDATED",
    entity: "MenuItem",
    entityId: itemId,
    detail: `Platform admin updated menu item "${item.name}"`,
    metadata: { by: adminActorLabel(guard.admin), fields: Object.keys(data) },
    restaurantId: id,
    ipAddress: getClientIp(req.headers),
  });

  return NextResponse.json(item);
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { id, itemId } = await params;
  const guard = await requireAdminForRestaurant(req, id, TENANT_MANAGE_PERMISSIONS);
  if ("response" in guard) return guard.response;

  const existing = await db.menuItem.findFirst({
    where: { id: itemId, restaurantId: id },
    select: { id: true, name: true },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "Menu item not found for this business" },
      { status: 404 },
    );
  }

  await db.menuItem.delete({ where: { id: itemId } });

  logAudit({
    action: "MENU_ITEM_DELETED",
    entity: "MenuItem",
    entityId: itemId,
    detail: `Platform admin deleted menu item "${existing.name}"`,
    metadata: { by: adminActorLabel(guard.admin), name: existing.name },
    restaurantId: id,
    ipAddress: getClientIp(req.headers),
  });

  return NextResponse.json({ deleted: true });
}
