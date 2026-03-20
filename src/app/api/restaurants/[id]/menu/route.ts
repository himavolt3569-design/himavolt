import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { logAudit, getClientIp } from "@/lib/audit";
import { getCurrencySymbol } from "@/lib/currency";

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
  });

  return NextResponse.json(items);
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
  const {
    name, description, price, imageUrl, prepTime,
    isVeg, hasEgg, hasOnionGarlic, badge, tags,
    categoryId, sizes, addOns,
    discount, discountLabel, isFeatured,
    spiceLevel, calories, allergens,
    isDrink, drinkCategory, stockEnabled, stockQuantity,
  } = body;

  if (!name || !price || !categoryId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

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
    detail: `Menu item "${name}" added (${getCurrencySymbol(restaurant.currency ?? "NPR")}${price})`,
    metadata: { name, price, categoryId },
    userId: user.id,
    restaurantId: id,
    ipAddress: getClientIp(req.headers),
  });

  return NextResponse.json(item, { status: 201 });
}
