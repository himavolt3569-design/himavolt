import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id, itemId } = await params;
  const user = await getOrCreateUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const restaurant = await db.restaurant.findFirst({
    where: { id, ownerId: user.id },
  });
  if (!restaurant) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const allowedFields = [
    "name", "description", "price", "imageUrl", "prepTime",
    "isVeg", "hasEgg", "hasOnionGarlic", "isAvailable",
    "badge", "tags", "categoryId", "sortOrder",
    "discount", "discountLabel", "isFeatured",
    "spiceLevel", "calories", "allergens",
  ];

  const data: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (body[key] !== undefined) data[key] = body[key];
  }

  // Handle sizes replacement
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

  // Handle addOns replacement
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
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id, itemId } = await params;
  const user = await getOrCreateUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const restaurant = await db.restaurant.findFirst({
    where: { id, ownerId: user.id },
  });
  if (!restaurant) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.menuItem.delete({ where: { id: itemId } });
  return NextResponse.json({ deleted: true });
}
