import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { requireStaffForRestaurant } from "@/lib/staff-auth";

/**
 * Authenticate via staff JWT OR Clerk owner session.
 */
async function authorise(req: NextRequest, restaurantId: string) {
  const staff = await requireStaffForRestaurant(req, restaurantId);
  if (staff) return true;

  const user = await getOrCreateUser();
  if (!user) return false;
  const owns = await db.restaurant.findFirst({
    where: { id: restaurantId, ownerId: user.id },
    select: { id: true },
  });
  return !!owns;
}

// GET — list all ingredient mappings for a menu item
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const { id, itemId } = await params;

  if (!(await authorise(req, id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ingredients = await db.menuItemIngredient.findMany({
    where: { menuItemId: itemId },
    include: {
      inventoryItem: {
        select: { id: true, name: true, unit: true, quantity: true },
      },
    },
    orderBy: { inventoryItem: { name: "asc" } },
  });

  return NextResponse.json(ingredients);
}

// POST — add/upsert ingredient link
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const { id, itemId } = await params;

  if (!(await authorise(req, id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { inventoryItemId, quantityUsed } = body;

  if (!inventoryItemId || typeof quantityUsed !== "number" || quantityUsed <= 0) {
    return NextResponse.json(
      { error: "inventoryItemId and quantityUsed (> 0) are required" },
      { status: 400 },
    );
  }

  // Verify the inventory item belongs to this restaurant
  const inventoryItem = await db.inventoryItem.findFirst({
    where: { id: inventoryItemId, restaurantId: id },
  });
  if (!inventoryItem) {
    return NextResponse.json(
      { error: "Inventory item not found in this restaurant" },
      { status: 404 },
    );
  }

  // Verify the menu item belongs to this restaurant
  const menuItem = await db.menuItem.findFirst({
    where: { id: itemId, restaurantId: id },
  });
  if (!menuItem) {
    return NextResponse.json(
      { error: "Menu item not found in this restaurant" },
      { status: 404 },
    );
  }

  const ingredient = await db.menuItemIngredient.upsert({
    where: {
      menuItemId_inventoryItemId: {
        menuItemId: itemId,
        inventoryItemId,
      },
    },
    update: { quantityUsed },
    create: {
      menuItemId: itemId,
      inventoryItemId,
      quantityUsed,
    },
    include: {
      inventoryItem: {
        select: { id: true, name: true, unit: true, quantity: true },
      },
    },
  });

  return NextResponse.json(ingredient, { status: 201 });
}

// DELETE — remove ingredient link
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const { id, itemId } = await params;

  if (!(await authorise(req, id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const ingredientId = searchParams.get("ingredientId");

  let inventoryItemId: string | null = null;

  // Try query param first
  if (ingredientId) {
    // ingredientId is the MenuItemIngredient record ID
    const record = await db.menuItemIngredient.findFirst({
      where: { id: ingredientId, menuItemId: itemId },
    });
    if (!record) {
      return NextResponse.json(
        { error: "Ingredient mapping not found" },
        { status: 404 },
      );
    }
    await db.menuItemIngredient.delete({ where: { id: ingredientId } });
    return NextResponse.json({ deleted: true });
  }

  // Try body
  try {
    const body = await req.json();
    inventoryItemId = body.inventoryItemId ?? null;
  } catch {
    // no body
  }

  if (inventoryItemId) {
    const record = await db.menuItemIngredient.findUnique({
      where: {
        menuItemId_inventoryItemId: {
          menuItemId: itemId,
          inventoryItemId,
        },
      },
    });
    if (!record) {
      return NextResponse.json(
        { error: "Ingredient mapping not found" },
        { status: 404 },
      );
    }
    await db.menuItemIngredient.delete({ where: { id: record.id } });
    return NextResponse.json({ deleted: true });
  }

  return NextResponse.json(
    { error: "Provide ingredientId query param or inventoryItemId in body" },
    { status: 400 },
  );
}
