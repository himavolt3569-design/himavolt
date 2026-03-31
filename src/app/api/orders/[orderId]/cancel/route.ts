import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;

  // Try to get the authenticated user (optional — guests can also cancel by knowing the orderId)
  let userId: string | undefined;
  try {
    const user = await getOrCreateUser();
    if (user) userId = user.id;
  } catch {
    // guest
  }

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // If the order has a userId, ensure the caller is that user
  if (order.userId && userId !== order.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Only allow cancellation of PENDING orders (before kitchen has started)
  if (order.status !== "PENDING") {
    return NextResponse.json(
      { error: "Order cannot be cancelled — it is already being prepared or completed" },
      { status: 400 }
    );
  }

  // Cancel the order
  await db.order.update({
    where: { id: orderId },
    data: { status: "CANCELLED" },
  });

  // Restore stock (ingredient-based + drink direct stock)
  for (const item of order.items) {
    if (!item.menuItemId) continue;

    // Restore ingredient inventory
    const ingredients = await db.menuItemIngredient.findMany({
      where: { menuItemId: item.menuItemId },
    });
    for (const ing of ingredients) {
      await db.inventoryItem.update({
        where: { id: ing.inventoryItemId },
        data: { quantity: { increment: ing.quantityUsed * item.quantity } },
      });
      const dependents = await db.menuItemIngredient.findMany({
        where: { inventoryItemId: ing.inventoryItemId },
      });
      for (const dep of dependents) {
        await db.menuItem.update({
          where: { id: dep.menuItemId },
          data: { isAvailable: true },
        });
      }
    }

    // Restore drink stock
    const menuItem = await db.menuItem.findUnique({
      where: { id: item.menuItemId },
      select: { isDrink: true, stockEnabled: true },
    });
    if (menuItem?.isDrink && menuItem.stockEnabled) {
      await db.menuItem.update({
        where: { id: item.menuItemId },
        data: { stockQuantity: { increment: item.quantity } },
      });
    }
  }

  return NextResponse.json({ success: true, orderId, status: "CANCELLED" });
}
