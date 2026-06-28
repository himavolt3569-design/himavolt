/**
 * POST /api/order-track/[trackToken]/cancel
 *
 * Public customer cancellation endpoint. The opaque `trackToken` is the sole
 * credential — the raw orderId is never accepted from the client and never
 * appears in the public URL.
 *
 * Allowed only while the order is still PENDING and not yet accepted/prepared
 * by the kitchen. Returns a descriptive 409 (not a 500) for non-cancellable
 * states so the tracking page can show a human-readable message.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { restoreStock } from "@/lib/stock";
import { notifyOrderChanged } from "@/lib/realtime";
import { logAudit, getClientIp } from "@/lib/audit";
import { sendNotificationToRestaurantStaff } from "@/lib/notifications";

type Params = { params: Promise<{ trackToken: string }> };

const NON_CANCELLABLE_KITCHEN = new Set(["ACCEPTED", "PREPARING", "READY", "SERVED"]);

export async function POST(req: NextRequest, { params }: Params) {
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
      restaurantId: true,
      items: { select: { menuItemId: true, quantity: true } },
      payment: { select: { status: true } },
    },
  });

  if (!order) {
    return NextResponse.json(
      { error: "Order not found or link has expired" },
      { status: 404 },
    );
  }

  // Terminal / already-cancelled states — not an error, just idempotent.
  if (order.status === "REJECTED") {
    return NextResponse.json({ success: true, status: "REJECTED" });
  }

  // Kitchen already past PENDING → customer cannot self-serve cancel.
  if (
    order.status !== "PENDING" ||
    NON_CANCELLABLE_KITCHEN.has(order.kitchenStatus ?? "")
  ) {
    return NextResponse.json(
      {
        error:
          "This order is already being prepared and can't be cancelled from here. Please contact staff.",
      },
      { status: 409 },
    );
  }

  // Paid orders cannot be self-serve cancelled.
  if (order.payment?.status === "COMPLETED") {
    return NextResponse.json(
      {
        error:
          "This order has already been paid and can't be cancelled. Please contact staff.",
      },
      { status: 409 },
    );
  }

  // Atomic flip: the PENDING guard means a concurrent retry sees count = 0 and
  // falls through to the idempotent "already REJECTED" return below.
  const flip = await db.order.updateMany({
    where: { id: order.id, status: "PENDING" },
    data: {
      status: "REJECTED",
      rejectReason: "Cancelled by customer",
      rejectedAt: new Date(),
    },
  });

  if (flip.count === 0) {
    // Concurrent request already moved the order — resolve current state.
    const current = await db.order.findUnique({
      where: { id: order.id },
      select: { status: true },
    });
    if (current?.status === "REJECTED") {
      return NextResponse.json({ success: true, status: "REJECTED" });
    }
    return NextResponse.json(
      {
        error:
          "Order status changed before cancellation could complete. Please contact staff.",
      },
      { status: 409 },
    );
  }

  // Side effects after commit — all non-fatal so a partial failure does not
  // roll back the already-committed cancellation.
  await Promise.all([
    db.payment
      .updateMany({
        where: {
          orderId: order.id,
          status: { in: ["PENDING", "AWAITING_VERIFICATION"] },
        },
        data: { status: "CANCELLED" },
      })
      .catch((err: unknown) =>
        console.error("[order-track/cancel] Payment cancel failed:", err),
      ),

    // Cancel unprinted KOT jobs so the printer doesn't fire after cancellation.
    db.printJob
      .updateMany({
        where: {
          orderId: order.id,
          type: "KOT",
          status: { in: ["PENDING", "RETRYING"] },
        },
        data: { status: "FAILED", lastError: "Order cancelled by customer" },
      })
      .catch((err: unknown) =>
        console.error("[order-track/cancel] PrintJob cancel failed:", err),
      ),

    restoreStock(order.items).catch((err: unknown) =>
      console.error("[order-track/cancel] Stock restore failed (non-fatal):", err),
    ),

    sendNotificationToRestaurantStaff(order.restaurantId, {
      title: "Order Cancelled",
      body: `Order #${order.orderNo} was cancelled by the customer`,
      data: {
        type: "ORDER_CANCELLED",
        orderId: order.id,
        orderNo: order.orderNo,
        restaurantId: order.restaurantId,
      },
    }).catch(() => {
      /* non-fatal */
    }),
  ]);

  logAudit({
    action: "ORDER_CANCELLED",
    entity: "Order",
    entityId: order.id,
    detail: `Order ${order.orderNo} cancelled by customer via tracking page`,
    restaurantId: order.restaurantId,
    ipAddress: getClientIp(req.headers),
  });

  notifyOrderChanged(order.id, order.restaurantId, {
    status: "REJECTED",
    reason: "customer-cancel",
  });

  return NextResponse.json({ success: true, status: "REJECTED" });
}
