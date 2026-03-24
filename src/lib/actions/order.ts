"use server";

import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { generateBill, getTaxConfig } from "@/lib/billing";
import { revalidatePath } from "next/cache";

export async function placeOrder(data: {
  restaurantId: string;
  tableNo?: number;
  items: {
    name: string;
    quantity: number;
    price: number;
    menuItemId?: string;
  }[];
  note?: string;
  type?: "DINE_IN" | "DELIVERY" | "TAKEAWAY";
  deliveryAddress?: string;
  deliveryPhone?: string;
  deliveryLat?: number;
  deliveryLng?: number;
  deliveryNote?: string;
}) {
  let userId: string | null = null;
  try {
    const user = await getOrCreateUser();
    if (user) userId = user.id;
  } catch {
    // guest order
  }

  const orderType = data.type || "DINE_IN";

  const subtotal = data.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const taxCfg = await getTaxConfig(data.restaurantId);
  const tax = taxCfg.taxEnabled
    ? Math.round(subtotal * (taxCfg.taxRate / 100) * 100) / 100
    : 0;

  // Calculate delivery fee
  let deliveryFee = 0;
  if (orderType === "DELIVERY") {
    const zone = await db.deliveryZone.findFirst({
      where: { restaurantId: data.restaurantId, isActive: true },
    });
    deliveryFee = zone?.baseFee ?? 50;
    if (zone?.freeAbove && subtotal >= zone.freeAbove) deliveryFee = 0;
  }

  const total = subtotal + tax + deliveryFee;
  const orderNo = `HH-${Date.now().toString(36).toUpperCase()}`;

  const order = await db.order.create({
    data: {
      orderNo,
      tableNo: orderType === "DINE_IN" ? data.tableNo || null : null,
      subtotal,
      tax,
      total,
      note: data.note || null,
      type: orderType,
      restaurantId: data.restaurantId,
      userId,
      deliveryAddress:
        orderType === "DELIVERY" ? data.deliveryAddress || null : null,
      deliveryLat: orderType === "DELIVERY" ? data.deliveryLat || null : null,
      deliveryLng: orderType === "DELIVERY" ? data.deliveryLng || null : null,
      deliveryPhone:
        orderType === "DELIVERY" ? data.deliveryPhone || null : null,
      deliveryNote: orderType === "DELIVERY" ? data.deliveryNote || null : null,
      deliveryFee,
      items: {
        createMany: {
          data: data.items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            menuItemId: item.menuItemId || null,
          })),
        },
      },
    },
    include: { items: true },
  });

  // Deduct stock for drink items with stock tracking enabled
  const drinkItemIds = data.items
    .filter((i) => i.menuItemId)
    .map((i) => i.menuItemId as string);

  if (drinkItemIds.length > 0) {
    const drinkMenuItems = await db.menuItem.findMany({
      where: { id: { in: drinkItemIds }, isDrink: true, stockEnabled: true },
      select: { id: true, stockQuantity: true },
    });

    for (const drinkMenuItem of drinkMenuItems) {
      const orderedItem = data.items.find((i) => i.menuItemId === drinkMenuItem.id);
      if (!orderedItem) continue;
      const newQty = Math.max(0, drinkMenuItem.stockQuantity - orderedItem.quantity);
      await db.menuItem.update({
        where: { id: drinkMenuItem.id },
        data: { stockQuantity: newQty },
      });
    }
  }

  // Deduct ingredient-based stock (inventoryItems)
  for (const item of data.items) {
    if (!item.menuItemId) continue;
    const ingredients = await db.menuItemIngredient.findMany({
      where: { menuItemId: item.menuItemId },
      include: { inventoryItem: true },
    });
    for (const ing of ingredients) {
      const deductAmount = ing.quantityUsed * item.quantity;
      const newQty = Math.max(0, (ing.inventoryItem.quantity ?? 0) - deductAmount);
      const updatedInv = await db.inventoryItem.update({
        where: { id: ing.inventoryItemId },
        data: { quantity: newQty },
      });
      if (updatedInv.quantity <= 0) {
        const dependents = await db.menuItemIngredient.findMany({
          where: { inventoryItemId: ing.inventoryItemId },
        });
        for (const dep of dependents) {
          await db.menuItem.update({
            where: { id: dep.menuItemId },
            data: { isAvailable: false },
          });
        }
      }
    }
  }

  // Create Delivery record for delivery orders
  if (orderType === "DELIVERY") {
    await db.delivery.create({
      data: {
        orderId: order.id,
        status: "PENDING",
        dropoffLat: data.deliveryLat || null,
        dropoffLng: data.deliveryLng || null,
        fee: deliveryFee,
      },
    });
  }

  // Generate bill for the order
  await generateBill(order.id);

  await db.restaurant.update({
    where: { id: data.restaurantId },
    data: { totalOrders: { increment: 1 } },
  });

  revalidatePath("/dashboard");
  return order;
}

export async function updateOrderStatus(
  orderId: string,
  status:
    | "ACCEPTED"
    | "PREPARING"
    | "READY"
    | "DELIVERED"
    | "CANCELLED"
    | "REJECTED",
) {
  const user = await getOrCreateUser();
  if (!user) throw new Error("Unauthorized");

  // Set timestamps for each status transition
  const timestamps: Record<string, Date> = {};
  if (status === "ACCEPTED") timestamps.acceptedAt = new Date();
  if (status === "PREPARING") timestamps.preparingAt = new Date();
  if (status === "READY") timestamps.readyAt = new Date();
  if (status === "DELIVERED") timestamps.deliveredAt = new Date();

  const order = await db.order.update({
    where: { id: orderId },
    data: { status, ...timestamps },
    include: { items: true, payment: true },
  });

  // NOTE: Payment completion is handled explicitly by the biller.
  // Online payments (ESEWA/KHALTI/BANK) are completed at checkout.
  // Offline payments (CASH/COUNTER/DIRECT) remain PENDING until the
  // cashier collects payment at the counter.

  revalidatePath("/dashboard");
  return order;
}

export async function getRestaurantOrders(
  restaurantId: string,
  options?: { status?: string; limit?: number; offset?: number },
) {
  const where: Record<string, unknown> = { restaurantId };
  if (options?.status) where.status = options.status;

  const [orders, total] = await Promise.all([
    db.order.findMany({
      where,
      include: {
        items: true,
        user: { select: { name: true, email: true, phone: true } },
        delivery: {
          include: {
            driver: { select: { name: true, phone: true, vehicleType: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    }),
    db.order.count({ where }),
  ]);

  return { orders, total };
}

export async function getMyOrders() {
  const user = await getOrCreateUser();
  if (!user) return [];

  return db.order.findMany({
    where: { userId: user.id },
    include: {
      items: true,
      restaurant: { select: { name: true, slug: true, imageUrl: true } },
      delivery: {
        include: {
          driver: { select: { name: true, phone: true, vehicleType: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}
