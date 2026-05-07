import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { unauthorized } from "@/lib/api-helpers";

/**
 * GET /api/admin/orders
 * All orders across all restaurants with filtering & pagination.
 */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin access required");

  const url = req.nextUrl;
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 30));
  const status = url.searchParams.get("status") || undefined;
  const type = url.searchParams.get("type") || undefined;
  const restaurantId = url.searchParams.get("restaurantId") || undefined;
  const search = url.searchParams.get("search") || undefined;
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const where: Record<string, unknown> = {};

  if (status) where.status = status;
  if (type) where.type = type;
  if (restaurantId) where.restaurantId = restaurantId;

  if (search) {
    where.OR = [
      { orderNo: { contains: search, mode: "insensitive" } },
      { restaurant: { name: { contains: search, mode: "insensitive" } } },
      { user: { name: { contains: search, mode: "insensitive" } } },
      { user: { email: { contains: search, mode: "insensitive" } } },
    ];
  }

  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }

  // Use explicit select to avoid pulling columns that may not exist in the
  // production database yet (e.g. isHeld, heldAt, couponId, couponDiscount,
  // isPrepaid, prepaidTokenId). This prevents "column does not exist" errors
  // caused by schema drift.
  const orderSelect = {
    id: true,
    orderNo: true,
    tableNo: true,
    roomNo: true,
    status: true,
    type: true,
    subtotal: true,
    tax: true,
    total: true,
    deliveryFee: true,
    deliveryAddress: true,
    note: true,
    estimatedTime: true,
    acceptedAt: true,
    preparingAt: true,
    readyAt: true,
    deliveredAt: true,
    createdAt: true,
    updatedAt: true,
    userId: true,
    restaurantId: true,
    items: { select: { id: true, name: true, quantity: true, price: true } },
    payment: { select: { method: true, status: true, paidAt: true, amount: true } },
    restaurant: { select: { id: true, name: true, slug: true, currency: true } },
    user: { select: { id: true, name: true, email: true, imageUrl: true } },
  };

  try {
    const [orders, total] = await Promise.all([
      db.order.findMany({
        where,
        select: orderSelect,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.order.count({ where }),
    ]);

    return NextResponse.json({
      orders,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("[Admin Orders GET]", err);

    // Fallback: try a minimal query without any potentially missing columns
    try {
      const offset = (page - 1) * limit;
      const [orders, total] = await Promise.all([
        db.$queryRaw<unknown[]>`
          SELECT o.id, o."orderNo", o."tableNo", o."roomNo", o.status, o.type,
                 o.subtotal, o.tax, o.total, o."deliveryFee", o."deliveryAddress",
                 o."createdAt", o."updatedAt", o."userId", o."restaurantId",
                 o."acceptedAt", o."preparingAt", o."readyAt", o."deliveredAt"
          FROM orders o
          ORDER BY o."createdAt" DESC
          LIMIT ${limit} OFFSET ${offset}
        `,
        db.order.count({ where: {} }),
      ]);

      // Enrich with relations via separate queries
      const enriched = await Promise.all(
        (orders as Array<Record<string, unknown>>).map(async (o) => {
          const [items, payment, restaurant, user] = await Promise.all([
            db.orderItem.findMany({
              where: { orderId: o.id as string },
              select: { id: true, name: true, quantity: true, price: true },
            }),
            db.payment.findFirst({
              where: { orderId: o.id as string },
              select: { method: true, status: true, paidAt: true, amount: true },
            }),
            db.restaurant.findUnique({
              where: { id: o.restaurantId as string },
              select: { id: true, name: true, slug: true, currency: true },
            }),
            o.userId
              ? db.user.findUnique({
                  where: { id: o.userId as string },
                  select: { id: true, name: true, email: true, imageUrl: true },
                })
              : null,
          ]);
          return { ...o, items, payment, restaurant, user };
        }),
      );

      return NextResponse.json({
        orders: enriched,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (fallbackErr) {
      console.error("[Admin Orders GET fallback]", fallbackErr);
      return NextResponse.json(
        { error: "Failed to fetch orders. Please ensure the database is up to date." },
        { status: 500 },
      );
    }
  }
}

/**
 * PATCH /api/admin/orders
 * Update an order's status (admin override).
 */
export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin access required");

  const { orderId, status } = await req.json();

  if (!orderId || !status) {
    return NextResponse.json({ error: "orderId and status required" }, { status: 400 });
  }

  const validStatuses = ["PENDING", "ACCEPTED", "PREPARING", "READY", "DELIVERED", "CANCELLED", "REJECTED"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const timestampField: Record<string, string> = {
    ACCEPTED: "acceptedAt",
    PREPARING: "preparingAt",
    READY: "readyAt",
    DELIVERED: "deliveredAt",
  };

  const updateData: Record<string, unknown> = { status };
  if (timestampField[status]) {
    updateData[timestampField[status]] = new Date();
  }

  const order = await db.order.update({
    where: { id: orderId },
    data: updateData,
    include: {
      restaurant: { select: { name: true, slug: true } },
      user: { select: { name: true, email: true } },
    },
  });

  return NextResponse.json(order);
}

/**
 * DELETE /api/admin/orders
 * Delete one or many orders and their children.
 */
export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin access required");

  const body = await req.json();
  const ids: string[] = body.ids ?? (body.orderId ? [body.orderId] : []);
  if (ids.length === 0) {
    return NextResponse.json({ error: "orderId or ids required" }, { status: 400 });
  }

  await db.$transaction([
    db.delivery.deleteMany({ where: { orderId: { in: ids } } }),
    db.payment.deleteMany({ where: { orderId: { in: ids } } }),
    db.bill.deleteMany({ where: { orderId: { in: ids } } }),
    db.tableSession.deleteMany({ where: { orderId: { in: ids } } }),
    db.orderItem.deleteMany({ where: { orderId: { in: ids } } }),
    db.order.deleteMany({ where: { id: { in: ids } } }),
  ]);

  return NextResponse.json({ success: true, deleted: ids.length });
}
