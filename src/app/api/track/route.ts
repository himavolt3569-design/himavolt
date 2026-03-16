import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("orderId");
  const orderNo = searchParams.get("orderNo");

  if (!orderId && !orderNo) {
    return NextResponse.json(
      { error: "orderId or orderNo is required" },
      { status: 400 }
    );
  }

  const order = await db.order.findFirst({
    where: orderId ? { id: orderId } : { orderNo: orderNo! },
    include: {
      items: true,
      payment: {
        select: { method: true, status: true, paidAt: true },
      },
      bill: true,
      restaurant: {
        select: { name: true, slug: true, address: true, phone: true, imageUrl: true, currency: true },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json(order);
}
