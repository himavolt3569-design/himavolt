import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { getStaffSession } from "@/lib/staff-auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id, itemId } = await params;
  const staff = await getStaffSession(req);
  let authorized = staff?.restaurantId === id;

  if (!authorized) {
    const user = await getOrCreateUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const restaurant = await db.restaurant.findFirst({ where: { id, ownerId: user.id } });
    if (!restaurant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    authorized = true;
  }

  // Scope the target item to THIS restaurant. Menu item IDs are exposed via the
  // public menu API, so without this a caller authorised for restaurant A could
  // edit an item belonging to restaurant B by passing its id (cross-tenant IDOR).
  const owned = await db.menuItem.findFirst({
    where: { id: itemId, restaurantId: id },
    select: { id: true },
  });
  if (!owned) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const body = await req.json();
  const allowedFields = [
    "name", "description", "price", "imageUrl", "prepTime",
    "isVeg", "hasEgg", "hasOnionGarlic", "isAvailable",
    "badge", "tags", "categoryId", "sortOrder",
    "discount", "discountLabel", "isFeatured",
    "spiceLevel", "calories", "allergens",
    "isDrink", "drinkCategory", "stockEnabled", "stockQuantity",
    "bottleCount", "volumeMl",
  ];

  const data: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (body[key] !== undefined) data[key] = body[key];
  }

  try {
    if (body.sizes !== undefined) {
      await db.menuItemSize.deleteMany({ where: { menuItemId: itemId } });
      if (body.sizes?.length) {
        await db.menuItemSize.createMany({
          data: body.sizes.map((s: { label: string; grams: string; priceAdd: number }) => ({
            menuItemId: itemId,
            label: s.label,
            grams: s.grams,
            priceAdd: s.priceAdd ?? 0,
          })),
        });
      }
    }

    if (body.addOns !== undefined) {
      await db.menuItemAddOn.deleteMany({ where: { menuItemId: itemId } });
      if (body.addOns?.length) {
        await db.menuItemAddOn.createMany({
          data: body.addOns.map((a: { name: string; price: number }) => ({
            menuItemId: itemId,
            name: a.name,
            price: a.price,
          })),
        });
      }
    }

    const item = await db.menuItem.update({
      where: { id: itemId },
      data,
      include: { sizes: true, addOns: true, category: true },
    });

    return NextResponse.json(item);
  } catch (err: any) {
    if (err?.code === "P2025") {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }
    console.error("[menu item] PATCH failed", err);
    return NextResponse.json(
      { error: "Could not save changes. Please try again." },
      { status: 503 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id, itemId } = await params;
  const staff = await getStaffSession(req);
  let authorized = staff?.restaurantId === id;

  if (!authorized) {
    const user = await getOrCreateUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const restaurant = await db.restaurant.findFirst({ where: { id, ownerId: user.id } });
    if (!restaurant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    authorized = true;
  }

  // Scope the delete to THIS restaurant so a caller authorised for one restaurant
  // can't delete another restaurant's menu item by id (cross-tenant IDOR).
  const owned = await db.menuItem.findFirst({
    where: { id: itemId, restaurantId: id },
    select: { id: true },
  });
  if (!owned) {
    // Already gone / not ours — report success so an optimistic client that
    // already removed the row doesn't roll it back.
    return NextResponse.json({ deleted: true });
  }

  try {
    await db.menuItem.delete({ where: { id: itemId } });
    return NextResponse.json({ deleted: true });
  } catch (err: any) {
    if (err?.code === "P2025") {
      // Already gone — treat as success so the client doesn't roll back a
      // deletion that in fact already happened.
      return NextResponse.json({ deleted: true });
    }
    console.error("[menu item] DELETE failed", err);
    return NextResponse.json(
      { error: "Could not delete item. Please try again." },
      { status: 503 },
    );
  }
}
