import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { logAudit, getClientIp } from "@/lib/audit";
import { getCurrencySymbol } from "@/lib/currency";
import { getStaffSession } from "@/lib/staff-auth";
import { z } from "zod";

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
  sizes: z.array(z.object({
    label: z.string().min(1).max(50),
    grams: z.string().max(20),
    priceAdd: z.number().min(0).max(1_000_000),
  })).max(10).optional(),
  addOns: z.array(z.object({
    name: z.string().min(1).max(100),
    price: z.number().min(0).max(1_000_000),
  })).max(20).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get("categoryId");

  const where: Record<string, unknown> = { restaurantId: id };
  if (categoryId) where.categoryId = categoryId;
  const isDrinkParam = searchParams.get("isDrink");
  if (isDrinkParam === "true") where.isDrink = true;
  if (isDrinkParam === "false") where.isDrink = false;

  const items = await db.menuItem.findMany({
    where,
    include: {
      sizes: true,
      addOns: true,
      category: true,
    },
    orderBy: { sortOrder: "asc" },
    take: 500,
  });

  return NextResponse.json(items, {
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let userIdForAudit = "STAFF";
  let currency = "NPR";
  const staff = await getStaffSession(req);
  let authorized = staff?.restaurantId === id;

  if (staff) {
    userIdForAudit = staff.userId || `staff-${staff.staffId}`;
    const r = await db.restaurant.findUnique({ where: { id }, select: { currency: true } });
    if (r) currency = r.currency ?? "NPR";
  } else {
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
    authorized = true;
    userIdForAudit = user.id;
    currency = restaurant.currency ?? "NPR";
  }

  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = menuItemSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid menu item data" },
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
      restaurantId: id,
      categoryId,
      sizes: sizes?.length
        ? { createMany: { data: sizes } }
        : undefined,
      addOns: addOns?.length
        ? { createMany: { data: addOns } }
        : undefined,
    },
    include: { sizes: true, addOns: true, category: true },
  });

  logAudit({
    action: "MENU_ITEM_CREATED",
    entity: "MenuItem",
    entityId: item.id,
    detail: `Menu item "${name}" added (${getCurrencySymbol(currency)}${price})`,
    metadata: { name, price, categoryId },
    userId: userIdForAudit,
    restaurantId: id,
    ipAddress: getClientIp(req.headers),
  });

  return NextResponse.json(item, { status: 201 });
}
