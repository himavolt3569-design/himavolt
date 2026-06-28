/**
 * GET /api/order-track/[trackToken]
 *
 * Public endpoint — the opaque `trackToken` IS the auth credential. No login
 * required. Returns order data for the customer tracking page. The raw `orderId`
 * is included in the response (needed for realtime subscription) but is never
 * part of the public URL.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ trackToken: string }> },
) {
  const { trackToken } = await params;
  if (!trackToken || trackToken.length < 10) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const order = await db.order.findUnique({
    where: { trackToken },
    select: {
      id: true,
      orderNo: true,
      status: true,
      kitchenStatus: true,
      rejectReason: true,
      tableNo: true,
      roomNo: true,
      guestName: true,
      type: true,
      note: true,
      subtotal: true,
      tax: true,
      total: true,
      sourceType: true,
      createdAt: true,
      acceptedAt: true,
      rejectedAt: true,
      items: {
        select: {
          id: true,
          name: true,
          quantity: true,
          price: true,
          addOns: true,
          kitchenStatus: true,
          rejectedReason: true,
          prepTimeSnapshot: true,
          menuItem: {
            select: { imageUrl: true, prepTime: true },
          },
        },
        orderBy: { id: "asc" },
      },
      restaurant: {
        select: {
          name: true,
          slug: true,
          currency: true,
          address: true,
          phone: true,
        },
      },
      payment: { select: { status: true, method: true } },
      bill: { select: { total: true } },
    },
  });

  if (!order) {
    return NextResponse.json(
      { error: "Order not found or link has expired" },
      { status: 404 },
    );
  }

  return NextResponse.json(order);
}
