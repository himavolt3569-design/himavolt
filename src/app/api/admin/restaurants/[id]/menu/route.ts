import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logAudit, getClientIp } from "@/lib/audit";
import { getCurrencySymbol } from "@/lib/currency";
import {
  requireAdminForRestaurant,
  adminActorLabel,
  TENANT_VIEW_PERMISSIONS,
  TENANT_MANAGE_PERMISSIONS,
} from "@/lib/admin-restaurant-guard";
import { z } from "zod";

/**
 * Master-admin menu list/creation on behalf of a business. Mirrors the owner
 * route at /api/restaurants/[id]/menu but is guarded by the admin JWT so the
 * hot owner/staff path stays untouched.
 */

const menuItemSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  price: z.number().positive().max(1_000_000),
  imageUrl: z.string().url().max(500).optional().nullable(),
  prepTime: z.string().max(50).optional(),
  isVeg: z.boolean().optional(),
  hasEgg: z.boolean().optional(),
  hasOnionGarlic: z.boolean().optional(),
  badge: z.string().max(50).optional().nullable(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  categoryId: z.string().min(1).max(100),
  discount: z.number().min(0).max(100).optional(),
  discountLabel: z.string().max(100).optional().nullable(),
  isFeatured: z.boolean().optional(),
  spiceLevel: z.number().int().min(0).max(5).optional(),
  calories: z.number().int().min(0).max(10_000).optional().nullable(),
  allergens: z.array(z.string().max(50)).max(20).optional(),
  isDrink: z.boolean().optional(),
  drinkCategory: z.string().max(50).optional().nullable(),
  stockEnabled: z.boolean().optional(),
  stockQuantity: z.number().int().min(0).max(100_000).optional(),
  bottleCount: z.number().int().min(0).max(1_000_000).optional().nullable(),
  volumeMl: z.number().int().min(0).max(1_000_000).optional().nullable(),
  sizes: z
    .array(
      z.object({
        label: z.string().min(1).max(50),
        grams: z.string().max(20),
        priceAdd: z.number().min(0).max(1_000_000),
      }),
    )
    .max(10)
    .optional(),
  addOns: z
    .array(
      z.object({
        name: z.string().min(1).max(100),
        price: z.number().min(0).max(1_000_000),
      }),
    )
    .max(20)
    .optional(),
});

/**
 * GET — the full catalogue for the management console. The owner-facing
 * /api/restaurants/[id]/menu is public (it powers the guest menu) and therefore
 * hides unavailable dishes; support needs to see and fix those too, so this one
 * returns everything.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const guard = await requireAdminForRestaurant(req, id, TENANT_VIEW_PERMISSIONS);
  if ("response" in guard) return guard.response;

  const items = await db.menuItem.findMany({
    where: { restaurantId: id },
    include: { sizes: true, addOns: true, category: { select: { id: true, name: true } } },
    orderBy: [{ categoryId: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    take: 2000,
  });

  return NextResponse.json(items, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const guard = await requireAdminForRestaurant(req, id, TENANT_MANAGE_PERMISSIONS);
  if ("response" in guard) return guard.response;

  const currency = guard.restaurant.currency ?? "NPR";

  const parsed = menuItemSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid menu item data" },
      { status: 400 },
    );
  }

  // Make sure the target category belongs to this restaurant (no cross-tenant writes).
  const category = await db.menuCategory.findFirst({
    where: { id: parsed.data.categoryId, restaurantId: id },
    select: { id: true },
  });
  if (!category) {
    return NextResponse.json(
      { error: "Category not found for this business" },
      { status: 400 },
    );
  }

  const {
    name, description, price, imageUrl, prepTime,
    isVeg, hasEgg, hasOnionGarlic, badge, tags,
    categoryId, sizes, addOns,
    discount, discountLabel, isFeatured,
    spiceLevel, calories, allergens,
    isDrink, drinkCategory, stockEnabled, stockQuantity,
    bottleCount, volumeMl,
  } = parsed.data;

  const item = await db.menuItem.create({
    data: {
      name,
      description: description || "",
      price,
      imageUrl,
      prepTime: prepTime || "15-20 min",
      isVeg: isVeg ?? false,
      hasEgg: hasEgg ?? false,
      hasOnionGarlic: hasOnionGarlic ?? true,
      badge,
      tags: tags || [],
      discount: discount ?? 0,
      discountLabel: discountLabel ?? null,
      isFeatured: isFeatured ?? false,
      spiceLevel: spiceLevel ?? 0,
      calories: calories ?? null,
      allergens: allergens ?? [],
      isDrink: isDrink ?? false,
      drinkCategory: drinkCategory ?? null,
      stockEnabled: stockEnabled ?? false,
      stockQuantity: stockQuantity ?? 0,
      bottleCount: bottleCount ?? null,
      volumeMl: volumeMl ?? null,
      restaurantId: id,
      categoryId,
      sizes: sizes?.length ? { createMany: { data: sizes } } : undefined,
      addOns: addOns?.length ? { createMany: { data: addOns } } : undefined,
    },
    include: { sizes: true, addOns: true, category: true },
  });

  logAudit({
    action: "MENU_ITEM_CREATED",
    entity: "MenuItem",
    entityId: item.id,
    detail: `Platform admin added menu item "${name}" (${getCurrencySymbol(currency)}${price})`,
    metadata: { by: adminActorLabel(guard.admin), name, price, categoryId },
    restaurantId: id,
    ipAddress: getClientIp(req.headers),
  });

  return NextResponse.json(item, { status: 201 });
}
