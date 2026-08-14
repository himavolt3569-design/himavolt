import { db } from "./db";
import type { Prisma } from "@/generated/prisma";

/** Prisma client OR an interactive-transaction client. Lets billing/stock writes
 * run inside the order-create transaction (Phase 2.5c) or standalone. */
type DbClient = typeof db | Prisma.TransactionClient;

/** Fields needed to compute tax/service-charge — a structural subset of the
 * restaurant row, so callers that already hold the full row can pass it to
 * avoid a redundant query. */
type TaxConfigSource = {
  taxRate?: number | null;
  taxEnabled?: boolean | null;
  serviceChargeRate?: number | null;
  serviceChargeEnabled?: boolean | null;
};

/** Fetch tax & service charge config for a restaurant. Pass `preloaded` (e.g.
 * a restaurant row already fetched in the request) to skip the DB round-trip. */
export async function getTaxConfig(
  restaurantId: string,
  preloaded?: TaxConfigSource | null,
) {
  const r =
    preloaded ??
    (await db.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        taxRate: true,
        taxEnabled: true,
        serviceChargeRate: true,
        serviceChargeEnabled: true,
      },
    }));
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

export async function generateBill(
  orderId: string,
  opts?: {
    taxConfig?: Awaited<ReturnType<typeof getTaxConfig>>;
    restaurant?: TaxConfigSource | null;
    tx?: DbClient;
  },
) {
  const client = opts?.tx ?? db;
  const order = await client.order.findUnique({
    where: { id: orderId },
    // Only the columns used below — `items: true` and `restaurant: true` (the
    // whole restaurant row) were fetched but never referenced, on a path that
    // runs on every order-create and every item-add.
    select: {
      id: true,
      orderNo: true,
      subtotal: true,
      tax: true,
      total: true,
      deliveryFee: true,
      restaurantId: true,
      bill: true,
    },
  });

  if (!order) throw new Error("Order not found");

  // Reuse a config the caller already has (order POST holds the restaurant row)
  // instead of re-querying the restaurant here.
  const config =
    opts?.taxConfig ?? (await getTaxConfig(order.restaurantId, opts?.restaurant));
  const serviceCharge = config.serviceChargeEnabled
    ? Math.round(order.subtotal * (config.serviceChargeRate / 100) * 100) / 100
    : 0;
  // couponDiscount column may not exist yet (schema drift) — access safely
  const orderAny = order as Record<string, unknown>;
  const couponDiscount = typeof orderAny.couponDiscount === "number" ? orderAny.couponDiscount : 0;
  const total =
    Math.round(
      (order.subtotal + order.tax + serviceCharge + order.deliveryFee - couponDiscount) * 100,
    ) / 100;

  // Update existing bill with current order totals (e.g. after items are added)
  if (order.bill) {
    const updated = await client.bill.update({
      where: { orderId },
      data: {
        subtotal: order.subtotal,
        tax: order.tax,
        serviceCharge,
        discount: couponDiscount,
        total,
      },
    });
    return updated;
  }

  const billNo = `INV-${order.orderNo.replace("HH-", "")}`;

  const bill = await client.bill.create({
    data: {
      billNo,
      orderId,
      subtotal: order.subtotal,
      tax: order.tax,
      serviceCharge,
      discount: couponDiscount,
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
          restaurant: { select: { name: true, address: true, phone: true, currency: true, imageUrl: true, printCounterWidth: true, printShowFeedbackQR: true } },
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
  const [bill, order] = await Promise.all([
    db.bill.findUnique({ where: { orderId } }),
    db.order.findUnique({ where: { id: orderId }, select: { deliveryFee: true } }),
  ]);
  if (!bill) throw new Error("Bill not found");

  const deliveryFee = order?.deliveryFee ?? 0;
  // Discount only applies to food charges (subtotal + tax + service charge), not delivery fee
  const maxDiscount = bill.subtotal + bill.tax + bill.serviceCharge;
  const safeDiscount = Math.min(Math.max(0, discountAmount), maxDiscount);
  const newTotal =
    Math.round(
      (bill.subtotal + bill.tax + bill.serviceCharge + deliveryFee - safeDiscount) * 100,
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
  method: "CASH" | "ESEWA" | "KHALTI" | "BANK" | "COUNTER" | "DIRECT",
  transactionId?: string,
) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      total: true,
      payment: true,
      bill: true,
    },
  });

  if (!order) throw new Error("Order not found");

  // Idempotency: if already paid, return the existing payment instead of creating a duplicate
  if (order.payment?.status === "COMPLETED") {
    return order.payment;
  }

  // Use bill total if available (includes service charge), otherwise order total
  const amount = order.bill?.total ?? order.total;

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

  if (order.bill) {
    await db.bill.update({
      where: { orderId },
      data: { paidVia: method },
    });
  }

  return payment;
}

// Explicit select for order fields to avoid pulling columns that may not exist
// in the production database (e.g. isHeld, heldAt, couponId, couponDiscount,
// isPrepaid, prepaidTokenId). Prevents "column does not exist" errors.
const SAFE_ORDER_SELECT = {
  id: true,
  orderNo: true,
  tableNo: true,
  roomNo: true,
  status: true,
  type: true,
  subtotal: true,
  tax: true,
  total: true,
  note: true,
  
  deliveryAddress: true,
  deliveryFee: true,
  acceptedAt: true,
  
  
  
  createdAt: true,
  updatedAt: true,
  userId: true,
  restaurantId: true,
} as const;

export async function getOrdersForBilling(
  restaurantId: string,
  filter?: string,
) {
  const where: Record<string, unknown> = { restaurantId };

  // Default: limit to last 24h to keep lists manageable
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  if (filter === "unpaid") {
    where.OR = [
      { payment: { is: null } },
      { payment: { status: { not: "COMPLETED" } } },
    ];
    where.status = { notIn: ["REJECTED", "REJECTED"] };
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
    select: {
      ...SAFE_ORDER_SELECT,
      // Project only the item columns the billing list actually renders —
      // `items: true` hydrated every column of every line item (500-1500 rows
      // per request on a busy list), the single heaviest part of this read.
      items: { select: { id: true, name: true, quantity: true, price: true, addOns: true } },
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
      status: { notIn: ["REJECTED"] },
    },
    select: {
      id: true,
      status: true,
      total: true,
      // Only the fields the aggregation below reads — avoids hydrating full
      // payment/bill rows for every order of the day just to sum scalars.
      payment: { select: { status: true, method: true } },
      bill: { select: { total: true, discount: true } },
    },
  });

  const totalOrders = orders.length;
  const completedOrders = orders.filter((o) => o.status === "ACCEPTED").length;
  const paidOrders = orders.filter(
    (o) => o.payment?.status === "COMPLETED",
  ).length;
  const unpaidOrders = orders.filter(
    (o) => !o.payment || o.payment.status !== "COMPLETED",
  ).length;

  const totalRevenue = orders
    .filter((o) => o.payment?.status === "COMPLETED")
    .reduce((sum, o) => sum + (o.bill?.total ?? o.total), 0);

  const CASH_METHODS = ["CASH"];
  const DIGITAL_METHODS = ["ESEWA", "KHALTI"];
  const COUNTER_METHODS = ["COUNTER", "DIRECT", "BANK"];

  const cashRevenue = orders
    .filter(
      (o) => o.payment?.status === "COMPLETED" && CASH_METHODS.includes(o.payment.method),
    )
    .reduce((sum, o) => sum + (o.bill?.total ?? o.total), 0);

  const digitalRevenue = orders
    .filter(
      (o) => o.payment?.status === "COMPLETED" && DIGITAL_METHODS.includes(o.payment.method),
    )
    .reduce((sum, o) => sum + (o.bill?.total ?? o.total), 0);

  const counterRevenue = orders
    .filter(
      (o) => o.payment?.status === "COMPLETED" && COUNTER_METHODS.includes(o.payment.method),
    )
    .reduce((sum, o) => sum + (o.bill?.total ?? o.total), 0);

  // onlineRevenue = digital (eSewa/Khalti) for backward compat
  const onlineRevenue = digitalRevenue;

  const pendingAmount = orders
    .filter((o) => !o.payment || o.payment.status !== "COMPLETED")
    .reduce((sum, o) => sum + (o.bill?.total ?? o.total), 0);

  const totalDiscount = orders
    .filter((o) => o.bill)
    .reduce((sum, o) => sum + (o.bill?.discount ?? 0), 0);

  // Per-method breakdown
  const byMethod: Record<string, number> = {};
  for (const o of orders) {
    if (o.payment?.status === "COMPLETED") {
      const m = o.payment.method;
      byMethod[m] = (byMethod[m] ?? 0) + (o.bill?.total ?? o.total);
    }
  }

  return {
    totalOrders,
    completedOrders,
    paidOrders,
    unpaidOrders,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    cashRevenue: Math.round(cashRevenue * 100) / 100,
    digitalRevenue: Math.round(digitalRevenue * 100) / 100,
    counterRevenue: Math.round(counterRevenue * 100) / 100,
    onlineRevenue: Math.round(onlineRevenue * 100) / 100,
    pendingAmount: Math.round(pendingAmount * 100) / 100,
    totalDiscount: Math.round(totalDiscount * 100) / 100,
    byMethod: Object.fromEntries(
      Object.entries(byMethod).map(([k, v]) => [k, Math.round(v * 100) / 100])
    ),
  };
}
