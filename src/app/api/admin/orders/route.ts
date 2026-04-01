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

  const [orders, total] = await Promise.all([
    db.order.findMany({
      where,
      include: {
        items: { select: { id: true, name: true, quantity: true, price: true } },
        payment: { select: { method: true, status: true, paidAt: true, amount: true } },
        restaurant: { select: { id: true, name: true, slug: true, currency: true } },
        user: { select: { id: true, name: true, email: true, imageUrl: true } },
      },
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
