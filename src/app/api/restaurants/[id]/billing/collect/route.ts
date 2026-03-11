import { NextRequest, NextResponse } from "next/server";
import { collectPayment } from "@/lib/billing";
import { db } from "@/lib/db";
import { requireStaffForRestaurant } from "@/lib/staff-auth";
import { logAudit, getClientIp } from "@/lib/audit";

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
    // Fallback: allow restaurant owner via Clerk auth
    try {
      const { auth } = await import("@clerk/nextjs/server");
      const { userId } = await auth();
      if (!userId) {
        return NextResponse.json(
          { error: "Unauthorized — Cashier/Manager access required" },
          { status: 401 },
        );
      }
      const restaurant = await db.restaurant.findUnique({
        where: { id },
        select: { ownerId: true },
      });
      if (!restaurant || restaurant.ownerId !== userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      actorId = userId;
    } catch {
      return NextResponse.json(
        { error: "Unauthorized — Cashier/Manager access required" },
        { status: 401 },
      );
    }
  }

  const body = await req.json();
  const { orderId, method, transactionId } = body;

  if (!orderId || !method) {
    return NextResponse.json(
      { error: "orderId and method are required" },
      { status: 400 },
    );
  }

  const validMethods = ["CASH", "ESEWA", "KHALTI", "BANK"];
  if (!validMethods.includes(method)) {
    return NextResponse.json(
      { error: "Invalid payment method" },
      { status: 400 },
    );
  }

  // Verify the order belongs to this restaurant
  const order = await db.order.findFirst({
    where: { id: orderId, restaurantId: id },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  try {
    const payment = await collectPayment(orderId, method, transactionId);

    logAudit({
      action: "PAYMENT_COLLECTED",
      entity: "Payment",
      entityId: orderId,
      detail: `Payment collected via ${method} for order ${order.orderNo} (Rs.${order.total})`,
      metadata: {
        method,
        orderNo: order.orderNo,
        amount: order.total,
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
