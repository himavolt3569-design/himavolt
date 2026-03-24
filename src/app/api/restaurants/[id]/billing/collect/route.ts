import { NextRequest, NextResponse } from "next/server";
import { collectPayment } from "@/lib/billing";
import { db } from "@/lib/db";
import { requireStaffForRestaurant } from "@/lib/staff-auth";
import { logAudit, getClientIp } from "@/lib/audit";
import { getCurrencySymbol } from "@/lib/currency";
import { getAuthUser } from "@/lib/auth";

async function verifyStaffAccess(req: NextRequest, restaurantId: string) {
  const staff = await requireStaffForRestaurant(req, restaurantId);
  if (!staff) return null;
  if (!["CASHIER", "MANAGER", "SUPER_ADMIN"].includes(staff.role)) return null;
  return staff;
}

// POST /api/restaurants/[id]/billing/collect — Collect payment for an order
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const staff = await verifyStaffAccess(req, id);
  let actorId = staff?.staffId;

  if (!staff) {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized — Cashier/Manager access required" },
        { status: 401 },
      );
    }
    const restaurant = await db.restaurant.findUnique({
      where: { id },
      select: { ownerId: true },
    });
    if (!restaurant || restaurant.ownerId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    actorId = user.id;
  }

  const body = await req.json();
  const { orderId, method, transactionId } = body;

  if (!orderId || !method) {
    return NextResponse.json(
      { error: "orderId and method are required" },
      { status: 400 },
    );
  }

  const validMethods = ["CASH", "ESEWA", "KHALTI", "BANK", "COUNTER", "DIRECT"];
  if (!validMethods.includes(method)) {
    return NextResponse.json(
      { error: "Invalid payment method" },
      { status: 400 },
    );
  }

  // Verify the order belongs to this restaurant
  const [order, restaurantForCurrency] = await Promise.all([
    db.order.findFirst({ where: { id: orderId, restaurantId: id } }),
    db.restaurant.findUnique({ where: { id }, select: { currency: true } }),
  ]);
  const currSym = getCurrencySymbol(restaurantForCurrency?.currency ?? "NPR");

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  try {
    const payment = await collectPayment(orderId, method, transactionId);

    // Auto-clear the table session so the next customer gets a fresh start
    await db.tableSession.updateMany({
      where: { orderId, isActive: true },
      data: { isActive: false, endedAt: new Date() },
    });

    logAudit({
      action: "PAYMENT_COLLECTED",
      entity: "Payment",
      entityId: orderId,
      detail: `Payment collected via ${method} for order ${order.orderNo} (${currSym}${payment.amount})`,
      metadata: {
        method,
        orderNo: order.orderNo,
        amount: payment.amount,
        transactionId,
      },
      userId: actorId,
      restaurantId: id,
      ipAddress: getClientIp(req.headers),
    });

    return NextResponse.json({ success: true, payment });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to collect payment",
      },
      { status: 500 },
    );
  }
}
