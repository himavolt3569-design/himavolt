import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { logAudit, getClientIp } from "@/lib/audit";
import { sendNotificationToRestaurantStaff } from "@/lib/notifications";
import { canAccessOrder } from "@/lib/order-access";
import { restoreStock } from "@/lib/stock";
import { notifyOrderChanged } from "@/lib/realtime";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Same gate as /track and /bill: signed-in owner, restaurant staff, or the
  // track cookie issued at order POST. Previously anyone with the orderId
  // could cancel a guest order — vandalism vector.
  const allowed = await canAccessOrder(req, {
    id: order.id,
    userId: order.userId,
    restaurantId: order.restaurantId,
  });
  if (!allowed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only allow cancellation of PENDING orders (before kitchen has started)
  if (order.status !== "PENDING") {
    return NextResponse.json(
      { error: "Order cannot be cancelled — it is already being prepared or completed" },
      { status: 400 }
    );
  }

  // Atomic flip + payment cancel. We use updateMany with the PENDING guard so
  // a concurrent retry can't double-restock: the second call sees count = 0
  // and skips the stock restore step.
  const flip = await db.order.updateMany({
    where: { id: orderId, status: "PENDING" },
    data: { status: "CANCELLED" },
  });

  if (flip.count === 0) {
    // Someone else already moved the order out of PENDING — nothing to do.
    return NextResponse.json({ success: true, orderId, status: "CANCELLED" });
  }

  // Cancel any pending/awaiting-verification payments and restore stock in
  // parallel. Both are non-fatal — losing them doesn't undo the cancellation.
  await Promise.all([
    db.payment.updateMany({
      where: { orderId, status: { in: ["PENDING", "AWAITING_VERIFICATION"] } },
      data: { status: "CANCELLED" },
    }),
    restoreStock(order.items).catch((err: unknown) => {
      console.error("[Orders cancel] restoreStock failed:", err);
    }),
  ]);

  // Resolve the actor (best-effort) for the audit log.
  let actorUserId: string | undefined;
  try {
    const user = await getOrCreateUser();
    if (user) actorUserId = user.id;
  } catch {
    // guest cancel via track cookie
  }

  // Notify kitchen staff about the cancellation
  sendNotificationToRestaurantStaff(order.restaurantId, {
    title: "Order Cancelled",
    body: `Order #${order.orderNo} cancelled by customer`,
    data: {
      type: "ORDER_CANCELLED",
      orderId,
      orderNo: order.orderNo,
      restaurantId: order.restaurantId,
    },
  }).catch(() => { /* non-fatal */ });

  // Audit log
  logAudit({
    action: "ORDER_CANCELLED",
    entity: "Order",
    entityId: orderId,
    detail: `Order ${order.orderNo} cancelled by customer`,
    userId: actorUserId,
    restaurantId: order.restaurantId,
    ipAddress: getClientIp(req.headers),
  });

  notifyOrderChanged(orderId, order.restaurantId, { status: "CANCELLED" });

  return NextResponse.json({ success: true, orderId, status: "CANCELLED" });
}
