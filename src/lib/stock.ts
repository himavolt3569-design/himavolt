import { db } from "./db";

interface OrderedItem {
  menuItemId?: string | null;
  quantity: number;
}

/**
 * Batch-deduct stock for all items in an order.
 * Replaces O(items × ingredients) sequential queries with ~5-7 total queries.
 * Non-fatal — callers should wrap in try/catch.
 */
export async function deductStock(items: OrderedItem[]): Promise<void> {
  const menuItemIds = items.filter((i) => i.menuItemId).map((i) => i.menuItemId as string);
  if (menuItemIds.length === 0) return;

  // 1. Fetch drink metadata for all items at once
  const menuMeta = await db.menuItem.findMany({
    where: { id: { in: menuItemIds } },
    select: { id: true, isDrink: true, stockEnabled: true, stockQuantity: true },
  });
  const metaMap = new Map(menuMeta.map((m) => [m.id, m]));

  // 2. Deduct drink stock in parallel
  const drinkUpdates: Promise<unknown>[] = [];
  for (const item of items) {
    if (!item.menuItemId) continue;
    const meta = metaMap.get(item.menuItemId);
    if (meta?.isDrink && meta.stockEnabled) {
      const newQty = Math.max(0, (meta.stockQuantity ?? 0) - item.quantity);
      drinkUpdates.push(
        db.menuItem.update({
          where: { id: item.menuItemId },
          data: { stockQuantity: newQty, ...(newQty <= 0 ? { isAvailable: false } : {}) },
        }),
      );
    }
  }
  await Promise.all(drinkUpdates);

  // 3. Fetch all ingredient links for all items in one query
  const allIngredients = await db.menuItemIngredient.findMany({
    where: { menuItemId: { in: menuItemIds } },
    include: { inventoryItem: { select: { id: true, quantity: true } } },
  });

  if (allIngredients.length === 0) return;

  // 4. Compute net deduction per inventory item across all ordered items
  const deductionMap = new Map<string, number>(); // inventoryItemId → total deduction
  for (const item of items) {
    if (!item.menuItemId) continue;
    for (const ing of allIngredients.filter((a) => a.menuItemId === item.menuItemId)) {
      const prev = deductionMap.get(ing.inventoryItemId) ?? 0;
      deductionMap.set(ing.inventoryItemId, prev + ing.quantityUsed * item.quantity);
    }
  }

  // 5. Apply all inventory updates in parallel; track which go to zero
  const currentQtyMap = new Map<string, number>();
  for (const ing of allIngredients) {
    if (!currentQtyMap.has(ing.inventoryItemId)) {
      currentQtyMap.set(ing.inventoryItemId, ing.inventoryItem.quantity ?? 0);
    }
  }

  const inventoryUpdates: Promise<{ id: string; quantity: number }>[] = [];
  for (const [inventoryItemId, deduction] of deductionMap.entries()) {
    const current = currentQtyMap.get(inventoryItemId) ?? 0;
    const newQty = Math.max(0, current - deduction);
    inventoryUpdates.push(
      db.inventoryItem.update({
        where: { id: inventoryItemId },
        data: { quantity: newQty },
        select: { id: true, quantity: true },
      }),
    );
  }
  const updatedInventory = await Promise.all(inventoryUpdates);

  // 6. Find depleted inventory items
  const depletedIds = updatedInventory.filter((i) => i.quantity <= 0).map((i) => i.id);
  if (depletedIds.length === 0) return;

  // 7. Find all menu items that depend on depleted inventory — one query
  const dependents = await db.menuItemIngredient.findMany({
    where: { inventoryItemId: { in: depletedIds } },
    select: { menuItemId: true },
  });
  const affectedMenuItemIds = [...new Set(dependents.map((d) => d.menuItemId))];
  if (affectedMenuItemIds.length === 0) return;

  // 8. Mark all affected menu items unavailable — one query
  await db.menuItem.updateMany({
    where: { id: { in: affectedMenuItemIds } },
    data: { isAvailable: false },
  });
}

/**
 * Batch-restore stock when an order is cancelled or rejected.
 * Replaces O(items × ingredients) sequential queries with ~4-5 total queries.
 * Non-fatal — callers should wrap in try/catch.
 */
export async function restoreStock(items: OrderedItem[]): Promise<void> {
  const menuItemIds = items.filter((i) => i.menuItemId).map((i) => i.menuItemId as string);
  if (menuItemIds.length === 0) return;

  // 1. Restore drink stock in parallel
  const drinkMeta = await db.menuItem.findMany({
    where: { id: { in: menuItemIds }, isDrink: true, stockEnabled: true },
    select: { id: true },
  });
  const drinkIds = new Set(drinkMeta.map((m) => m.id));
  const drinkRestores: Promise<unknown>[] = [];
  for (const item of items) {
    if (item.menuItemId && drinkIds.has(item.menuItemId)) {
      drinkRestores.push(
        db.menuItem.update({
          where: { id: item.menuItemId },
          data: { stockQuantity: { increment: item.quantity } },
        }),
      );
    }
  }
  await Promise.all(drinkRestores);

  // 2. Fetch all ingredient links in one query
  const allIngredients = await db.menuItemIngredient.findMany({
    where: { menuItemId: { in: menuItemIds } },
    select: { menuItemId: true, inventoryItemId: true, quantityUsed: true },
  });
  if (allIngredients.length === 0) return;

  // 3. Compute net restoration per inventory item
  const restoreMap = new Map<string, number>();
  for (const item of items) {
    if (!item.menuItemId) continue;
    for (const ing of allIngredients.filter((a) => a.menuItemId === item.menuItemId)) {
      const prev = restoreMap.get(ing.inventoryItemId) ?? 0;
      restoreMap.set(ing.inventoryItemId, prev + ing.quantityUsed * item.quantity);
    }
  }

  // 4. Apply all inventory restores in parallel
  await Promise.all(
    [...restoreMap.entries()].map(([inventoryItemId, amount]) =>
      db.inventoryItem.update({
        where: { id: inventoryItemId },
        data: { quantity: { increment: amount } },
      }),
    ),
  );

  // 5. Re-enable all menu items that use any of the restored inventory items
  const inventoryIds = [...restoreMap.keys()];
  const dependents = await db.menuItemIngredient.findMany({
    where: { inventoryItemId: { in: inventoryIds } },
    select: { menuItemId: true },
  });
  const affectedIds = [...new Set(dependents.map((d) => d.menuItemId))];
  if (affectedIds.length > 0) {
    await db.menuItem.updateMany({
      where: { id: { in: affectedIds } },
      data: { isAvailable: true },
    });
  }
}
