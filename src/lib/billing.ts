import { db } from "./db";

/** Fetch tax & service charge config for a restaurant */
export async function getTaxConfig(restaurantId: string) {
  const r = await db.restaurant.findUnique({
    where: { id: restaurantId },
    select: {
      taxRate: true,
      taxEnabled: true,
      serviceChargeRate: true,
      serviceChargeEnabled: true,
    },
  });
  return {
    taxRate: r?.taxEnabled ? (r.taxRate ?? 13) : 0,
    serviceChargeRate: r?.serviceChargeEnabled
      ? (r.serviceChargeRate ?? 10)
      : 0,
    taxEnabled: r?.taxEnabled ?? true,
    serviceChargeEnabled: r?.serviceChargeEnabled ?? true,
    taxPct: r?.taxRate ?? 13,
    scPct: r?.serviceChargeRate ?? 10,
  };
}

export async function generateBill(orderId: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: true, restaurant: true, bill: true },
  });

  if (!order) throw new Error("Order not found");
  if (order.bill) return order.bill;

  const billNo = `INV-${order.orderNo.replace("HH-", "")}`;
  const config = await getTaxConfig(order.restaurantId);
  const serviceCharge = config.serviceChargeEnabled
    ? Math.round(order.subtotal * (config.serviceChargeRate / 100) * 100) / 100
    : 0;
  const total =
    Math.round((order.subtotal + order.tax + serviceCharge) * 100) / 100;

  const bill = await db.bill.create({
    data: {
      billNo,
      orderId,
      subtotal: order.subtotal,
      tax: order.tax,
      serviceCharge,
      discount: 0,
      total,
    },
  });

  return bill;
}

export async function getBillByOrderId(orderId: string) {
  return db.bill.findUnique({
    where: { orderId },
    include: {
      order: {
        include: {
          items: true,
          restaurant: { select: { name: true, address: true, phone: true, currency: true } },
          user: { select: { name: true, email: true, phone: true } },
          payment: true,
        },
      },
    },
  });
}

export async function applyDiscount(
  orderId: string,
  discountAmount: number,
  reason?: string,
) {
  const bill = await db.bill.findUnique({ where: { orderId } });
  if (!bill) throw new Error("Bill not found");

  const maxDiscount = bill.subtotal + bill.tax + bill.serviceCharge;
  const safeDiscount = Math.min(Math.max(0, discountAmount), maxDiscount);
  const newTotal =
    Math.round(
      (bill.subtotal + bill.tax + bill.serviceCharge - safeDiscount) * 100,
    ) / 100;

  const updated = await db.bill.update({
    where: { orderId },
    data: {
      discount: safeDiscount,
      total: newTotal,
      paidVia: reason ? `Discount: ${reason}` : bill.paidVia,
    },
  });

  return updated;
}

export async function collectPayment(
  orderId: string,
  method: "CASH" | "ESEWA" | "KHALTI" | "BANK",
  transactionId?: string,
) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { payment: true, bill: true },
  });

  if (!order) throw new Error("Order not found");

  // Use bill total if available (includes service charge), otherwise order total
  const amount = order.bill?.total ?? order.total;

  // Upsert payment record
  const payment = await db.payment.upsert({
    where: { orderId },
    update: {
      method,
      status: "COMPLETED",
      amount,
      transactionId: transactionId || null,
      paidAt: new Date(),
    },
    create: {
      orderId,
      method,
      status: "COMPLETED",
      amount,
      transactionId: transactionId || null,
      paidAt: new Date(),
    },
  });

  // Update bill paidVia
  if (order.bill) {
    await db.bill.update({
      where: { orderId },
      data: { paidVia: method },
    });
  }

  return payment;
}

export async function getOrdersForBilling(
  restaurantId: string,
  filter?: string,
) {
  const where: Record<string, unknown> = { restaurantId };

  // Default: limit to last 24h to keep lists manageable
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  if (filter === "unpaid") {
    where.OR = [
      { payment: null },
      { payment: { status: { not: "COMPLETED" } } },
    ];
    where.status = { notIn: ["CANCELLED", "REJECTED"] };
  } else if (filter === "paid") {
    where.payment = { status: "COMPLETED" };
    where.createdAt = { gte: last24h };
  } else if (filter === "today") {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    where.createdAt = { gte: startOfDay };
  } else {
    where.createdAt = { gte: last24h };
  }

  return db.order.findMany({
    where,
    include: {
      items: true,
      user: { select: { name: true, email: true, phone: true } },
      payment: true,
      bill: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function getDailySummary(restaurantId: string) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const orders = await db.order.findMany({
    where: {
      restaurantId,
      createdAt: { gte: startOfDay },
      status: { notIn: ["CANCELLED", "REJECTED"] },
    },
    include: { payment: true, bill: true },
  });

  const totalOrders = orders.length;
  const completedOrders = orders.filter((o) => o.status === "DELIVERED").length;
  const paidOrders = orders.filter(
    (o) => o.payment?.status === "COMPLETED",
  ).length;
  const unpaidOrders = orders.filter(
    (o) => !o.payment || o.payment.status !== "COMPLETED",
  ).length;

  const totalRevenue = orders
    .filter((o) => o.payment?.status === "COMPLETED")
    .reduce((sum, o) => sum + (o.bill?.total ?? o.total), 0);

  const cashRevenue = orders
    .filter(
      (o) => o.payment?.status === "COMPLETED" && o.payment.method === "CASH",
    )
    .reduce((sum, o) => sum + (o.bill?.total ?? o.total), 0);

  const onlineRevenue = orders
    .filter(
      (o) => o.payment?.status === "COMPLETED" && o.payment.method !== "CASH",
    )
    .reduce((sum, o) => sum + (o.bill?.total ?? o.total), 0);

  const pendingAmount = orders
    .filter((o) => !o.payment || o.payment.status !== "COMPLETED")
    .filter((o) => o.status !== "CANCELLED" && o.status !== "REJECTED")
    .reduce((sum, o) => sum + (o.bill?.total ?? o.total), 0);

  const totalDiscount = orders
    .filter((o) => o.bill)
    .reduce((sum, o) => sum + (o.bill?.discount ?? 0), 0);

  return {
    totalOrders,
    completedOrders,
    paidOrders,
    unpaidOrders,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    cashRevenue: Math.round(cashRevenue * 100) / 100,
    onlineRevenue: Math.round(onlineRevenue * 100) / 100,
    pendingAmount: Math.round(pendingAmount * 100) / 100,
    totalDiscount: Math.round(totalDiscount * 100) / 100,
  };
}
