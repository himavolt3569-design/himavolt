import { NextRequest, NextResponse } from "next/server";
import { collectPayment } from "@/lib/billing";
import { db } from "@/lib/db";
import { requireStaffForRestaurant } from "@/lib/staff-auth";
import { logAudit, getClientIp } from "@/lib/audit";
import { getCurrencySymbol } from "@/lib/currency";
import { getAuthUser } from "@/lib/auth";
import { touchOrderUpdatedAt } from "@/lib/order-sync";
import { STAFF_BILLING_ROLES } from "@/lib/staff-roles";
import { notifyKitchenNewOrder } from "@/lib/notifications";
import { notifyOrderChanged } from "@/lib/realtime";
import { endTableSession } from "@/lib/table-session";

async function verifyStaffAccess(req: NextRequest, restaurantId: string) {
  const staff = await requireStaffForRestaurant(req, restaurantId);
  if (!staff) return null;
  if (!(STAFF_BILLING_ROLES as readonly string[]).includes(staff.role))
    return null;
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
  const { orderId, method, transactionId, amountPaid, customerName, customerPhone, note } = body;

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

  // Optional partial collection: remainder is recorded as dues (CreditEntry).
  if (amountPaid !== undefined) {
    if (typeof amountPaid !== "number" || !Number.isFinite(amountPaid) || amountPaid <= 0) {
      return NextResponse.json(
        { error: "amountPaid must be a positive number" },
        { status: 400 },
      );
    }
  }

  // Verify the order belongs to this restaurant
  const [order, restaurantForCurrency] = await Promise.all([
    db.order.findFirst({
      where: { id: orderId, restaurantId: id },
      include: { bill: { select: { total: true } } },
    }),
    db.restaurant.findUnique({ where: { id }, select: { currency: true } }),
  ]);
  const currSym = getCurrencySymbol(restaurantForCurrency?.currency ?? "NPR");

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Dues need someone to chase: partial collections must name the customer.
  const billTotal = order.bill?.total ?? order.total;
  const isPartial = typeof amountPaid === "number" && amountPaid < billTotal - 0.01;
  if (isPartial && !customerName && !customerPhone) {
    return NextResponse.json(
      { error: "Partial payment requires a customer name or phone so the dues can be settled later" },
      { status: 400 },
    );
  }

  try {
    const payment = await collectPayment(
      orderId,
      method,
      transactionId,
      typeof amountPaid === "number"
        ? { amountPaid, customerName, customerPhone, note }
        : undefined,
    );

    // Touch order so SSE streams detect the payment change
    await touchOrderUpdatedAt(orderId);

    // Instant realtime push to the customer's track page + staff feeds, so the
    // paid state reflects immediately instead of waiting for the SSE poll.
    notifyOrderChanged(orderId, id, { payment: payment.status });

    // Auto-clear the table session so the next customer gets a fresh start.
    // Shared helper handles the delete-inactive-first dance required by the
    // @@unique([restaurantId, tableNo, isActive]) constraint and never throws.
    const sessionResult = await endTableSession(id, { orderId });
    if (sessionResult.error) {
      logAudit({
        action: "TABLE_CLEAR_FAILED",
        entity: "TableSession",
        entityId: orderId,
        detail: `Table session not cleared after payment: ${sessionResult.error}`,
        userId: actorId,
        restaurantId: id,
        ipAddress: getClientIp(req.headers),
      });
    }

    // Tag the order with the staff who collected payment (for shift attribution)
    // Only set if not already attributed (customer-placed orders have null processedByStaffId)
    if (staff?.staffId) {
      db.order
        .updateMany({
          where: { id: orderId, processedByStaffId: null },
          data: { processedByStaffId: staff.staffId },
        })
        .catch(() => {});
    }

    // Payment collected → order is now visible in Live Orders.
    // Notify the kitchen so staff hears the new-order sound.
    if (order.status === "PENDING") {
      const restaurant = await db.restaurant.findUnique({
        where: { id },
        select: { currency: true },
      });
      notifyKitchenNewOrder(
        id,
        order.orderNo,
        order.total,
        order.tableNo,
        restaurant?.currency ?? "NPR",
      ).catch((err: unknown) => {
        console.error("[Billing Collect] Kitchen notification failed:", err);
      });
    }

    logAudit({
      action: "PAYMENT_COLLECTED",
      entity: "Payment",
      entityId: orderId,
      detail:
        payment.status === "PARTIALLY_PAID"
          ? `Partial payment collected via ${method} for order ${order.orderNo} (${currSym}${payment.amount} of ${currSym}${billTotal} — remainder recorded as dues)`
          : `Payment collected via ${method} for order ${order.orderNo} (${currSym}${payment.amount})`,
      metadata: {
        method,
        orderNo: order.orderNo,
        amount: payment.amount,
        transactionId,
        ...(payment.status === "PARTIALLY_PAID"
          ? { duesAmount: Math.round((billTotal - payment.amount) * 100) / 100 }
          : {}),
      },
      userId: actorId,
      restaurantId: id,
      ipAddress: getClientIp(req.headers),
    });

    return NextResponse.json({ success: true, payment });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Failed to collect payment",
      },
      { status: 500 },
    );
  }
}
