import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Ctx = { params: Promise<{ orderId: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { orderId } = await ctx.params;

  if (!orderId) {
    return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
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
