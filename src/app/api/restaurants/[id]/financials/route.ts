import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify ownership
  const restaurant = await db.restaurant.findUnique({
    where: { id },
    select: { ownerId: true },
  });

  if (!restaurant || restaurant.ownerId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 1. Calculate Total Revenue from DELIVERED orders
  const orders = await db.order.findMany({
    where: {
      restaurantId: id,
      status: "DELIVERED",
    },
    select: {
      total: true,
      createdAt: true,
    },
  });

  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);

  // Revenue by time (Today, This Week, This Month)
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(now.getDate() - now.getDay());

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  let todayRevenue = 0;
  let weekRevenue = 0;
  let monthRevenue = 0;

  orders.forEach((order) => {
    const d = new Date(order.createdAt);
    if (d >= startOfDay) todayRevenue += order.total;
    if (d >= startOfWeek) weekRevenue += order.total;
    if (d >= startOfMonth) monthRevenue += order.total;
  });

  // 2. Calculate Inventory Cost
  const inventory = await db.inventoryItem.findMany({
    where: { restaurantId: id },
    select: { quantity: true, costPerUnit: true },
  });

  const totalInventoryCost = inventory.reduce(
    (sum, item) => sum + item.quantity * item.costPerUnit,
    0,
  );

  // Estimated Profit (Revenue - Sunk Inventory Cost)
  // For a basic MVP, this gives the owner a quick glance.
  const estimatedProfit = totalRevenue - totalInventoryCost;

  return NextResponse.json({
    totalRevenue,
    todayRevenue,
    weekRevenue,
    monthRevenue,
    totalInventoryCost,
    estimatedProfit,
    totalOrders: orders.length,
  });
}
