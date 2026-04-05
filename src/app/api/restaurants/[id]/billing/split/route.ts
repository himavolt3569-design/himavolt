import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStaffForRestaurant } from "@/lib/staff-auth";
import { generateBill } from "@/lib/billing";
import { getAuthUser } from "@/lib/auth";
import { logAudit, getClientIp } from "@/lib/audit";
import { getCurrencySymbol } from "@/lib/currency";

async function verifyBillingAccess(req: NextRequest, restaurantId: string) {
  const staff = await requireStaffForRestaurant(req, restaurantId);
  if (staff && ["CASHIER", "MANAGER", "SUPER_ADMIN"].includes(staff.role)) {
    return { type: "staff" as const, id: staff.staffId };
  }

  const user = await getAuthUser();
  if (!user) return null;
  const restaurant = await db.restaurant.findUnique({
    where: { id: restaurantId },
    select: { ownerId: true },
  });
  if (!restaurant || restaurant.ownerId !== user.id) return null;
  return { type: "owner" as const, id: user.id };
}

// POST /api/restaurants/[id]/billing/split — Split payment across multiple methods
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const actor = await verifyBillingAccess(req, id);
  if (!actor) {
    return NextResponse.json(
      { error: "Unauthorized — Cashier/Manager access required" },
      { status: 401 },
    );
  }

  const body = await req.json();
  const { orderId, splits } = body;

  if (!orderId || !Array.isArray(splits) || splits.length < 2) {
    return NextResponse.json(
      { error: "orderId and splits (array of {method, amount}) with at least 2 entries are required" },
      { status: 400 },
    );
  }

  const validMethods = ["CASH", "ESEWA", "KHALTI", "BANK", "COUNTER", "DIRECT"];
  for (const split of splits) {
    if (!split.method || !validMethods.includes(split.method)) {
      return NextResponse.json({ error: `Invalid payment method: ${split.method}` }, { status: 400 });
    }
    if (typeof split.amount !== "number" || split.amount <= 0) {
      return NextResponse.json({ error: "Each split must have a positive amount" }, { status: 400 });
    }
  }

  // Verify the order belongs to this restaurant
  const order = await db.order.findFirst({
    where: { id: orderId, restaurantId: id },
    include: { bill: true, payment: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.payment?.status === "COMPLETED") {
    return NextResponse.json({ error: "Order already paid" }, { status: 400 });
  }

  // Generate bill if not exists
  let bill = order.bill;
  if (!bill) {
    bill = await generateBill(orderId);
  }

  const billTotal = bill.total;
  const splitTotal = splits.reduce((sum: number, s: { amount: number }) => sum + s.amount, 0);

  // Allow small rounding difference
  if (Math.abs(splitTotal - billTotal) > 1) {
    return NextResponse.json(
      { error: `Split amounts (${splitTotal}) do not match bill total (${billTotal})` },
      { status: 400 },
    );
  }

  const restaurant = await db.restaurant.findUnique({
    where: { id },
    select: { currency: true },
  });
  const currSym = getCurrencySymbol(restaurant?.currency ?? "NPR");

  // Create payment record with primary method and split details in metadata
  const primaryMethod = splits.reduce(
    (max: { method: string; amount: number }, s: { method: string; amount: number }) =>
      s.amount > max.amount ? s : max,
    splits[0],
  );

  const splitDescription = splits
    .map((s: { method: string; amount: number }) => `${s.method}: ${currSym}${Math.round(s.amount)}`)
    .join(" + ");

  try {
    // Upsert payment (update if pending, create if none)
    if (order.payment) {
      await db.payment.update({
        where: { id: order.payment.id },
        data: {
          method: primaryMethod.method,
          status: "COMPLETED",
          amount: billTotal,
          paidAt: new Date(),
          metadata: JSON.stringify({ splits, description: splitDescription }),
        },
      });
    } else {
      await db.payment.create({
        data: {
          orderId,
          method: primaryMethod.method,
          status: "COMPLETED",
          amount: billTotal,
          paidAt: new Date(),
          metadata: JSON.stringify({ splits, description: splitDescription }),
        },
      });
    }

    // Update bill paidVia
    await db.bill.update({
      where: { id: bill.id },
      data: { paidVia: `SPLIT: ${splitDescription}` },
    });

    // Auto-clear table session
    await db.tableSession.updateMany({
      where: { orderId, isActive: true },
      data: { isActive: false, endedAt: new Date() },
    });

    logAudit({
      action: "PAYMENT_COLLECTED",
      entity: "Payment",
      entityId: orderId,
      detail: `Split payment collected for order ${order.orderNo}: ${splitDescription}`,
      metadata: { splits, orderNo: order.orderNo, total: billTotal },
      userId: actor.id,
      restaurantId: id,
      ipAddress: getClientIp(req.headers),
    });

    return NextResponse.json({ success: true, paidVia: splitDescription });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to process split payment" },
      { status: 500 },
    );
  }
}
