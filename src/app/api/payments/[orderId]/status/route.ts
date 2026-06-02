import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { canAccessOrder } from "@/lib/order-access";

type Ctx = { params: Promise<{ orderId: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { orderId } = await ctx.params;

  if (!orderId) {
    return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
  }

  // Gate the same way as /track and /bill — payment method and transactionId
  // shouldn't be visible just because someone guesses the orderId.
  const lookup = await db.order.findUnique({
    where: { id: orderId },
    select: { id: true, userId: true, restaurantId: true },
  });
  if (!lookup) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }
  const allowed = await canAccessOrder(req, lookup);
  if (!allowed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payment = await db.payment.findUnique({
    where: { orderId },
    select: {
      status: true,
      method: true,
      transactionId: true,
      paidAt: true,
    },
  });

  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  return NextResponse.json({
    status: payment.status,
    method: payment.method,
    transactionId: payment.transactionId,
    paidAt: payment.paidAt,
  });
}
