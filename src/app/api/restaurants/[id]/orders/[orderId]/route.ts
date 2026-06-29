import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { getStaffSession } from "@/lib/staff-auth";
import {
  notifyCustomerOrderUpdate,
  notifyCounterOrderReady,
} from "@/lib/notifications";
import { logAudit, getClientIp, type AuditAction } from "@/lib/audit";
import { notifyOrderChanged } from "@/lib/realtime";
import { canAcceptOrder } from "@/lib/payment-gate";
import { z } from "zod";
import { restoreStock } from "@/lib/stock";

const ORDER_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "REJECTED",
] as const;

const updateOrderSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  rejectReason: z.string().max(255).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; orderId: string }> },
) {
  const { id, orderId } = await params;

  const order = await db.order.findFirst({
    where: { id: orderId, restaurantId: id },
    select: {
      id: true,
      orderNo: true,
      tableNo: true,
      roomNo: true,
      guestName: true,
      status: true,
      type: true,
      subtotal: true,
      tax: true,
      total: true,
      note: true,
      
      deliveryAddress: true,
      deliveryLat: true,
      deliveryLng: true,
      deliveryPhone: true,
      deliveryNote: true,
      deliveryFee: true,
      acceptedAt: true,
      
      
      
      createdAt: true,
      updatedAt: true,
      userId: true,
      restaurantId: true,
      items: { include: { menuItem: true } },
      user: { select: { name: true, email: true, phone: true } },
      payment: true,
      bill: true,
      restaurant: { select: { name: true, currency: true } },
      delivery: {
        include: {
          driver: {
            select: {
              name: true,
              phone: true,
              vehicleType: true,
              vehicleNo: true,
              currentLat: true,
              currentLng: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(order);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; orderId: string }> },
) {
  const { id, orderId } = await params;

  // Staff JWT auth (kitchen/billing staff)
  const staff = await getStaffSession(req);
  let actorId: string | undefined;

  if (staff && staff.restaurantId === id) {
    actorId = staff.userId || staff.staffId;
  } else {
    // Fall back to owner auth
    const user = await getOrCreateUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const restaurant = await db.restaurant.findFirst({
      where: { id, ownerId: user.id },
    });
    if (!restaurant)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    actorId = user.id;
  }

  const parsed = updateOrderSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }
  const { status, rejectReason } = parsed.data;

  // ── Payment Gate: block ACCEPTED if digital payment not completed ──
  if (status === "ACCEPTED") {
    const gate = await canAcceptOrder(orderId);
    if (!gate.allowed) {
      logAudit({
        action: "PAYMENT_GATE_BLOCKED",
        entity: "Order",
        entityId: orderId,
        detail: gate.reason || "Payment not completed",
        metadata: {
          paymentMethod: gate.paymentMethod,
          paymentStatus: gate.paymentStatus,
          attemptedStatus: status,
        },
        userId: actorId,
        restaurantId: id,
        ipAddress: getClientIp(req.headers),
      });
      return NextResponse.json(
        { error: gate.reason || "Payment must be completed before accepting this order" },
        { status: 402 },
      );
    }
  }

  const timestamps: Record<string, Date> = {};
  if (status === "ACCEPTED") timestamps.acceptedAt = new Date();

  const order = await db.order.update({
    where: { id: orderId },
    data: {
      status,
      ...timestamps,
      ...(rejectReason !== undefined ? { rejectReason } : {}),
      items: status === "ACCEPTED" ? {
        updateMany: {
          where: { kitchenStatus: "PENDING" },
          data: { kitchenStatus: "ACCEPTED" }
        }
      } : undefined,
    },
    select: {
      id: true,
      orderNo: true,
      tableNo: true,
      status: true,
      type: true,
      subtotal: true,
      tax: true,
      total: true,
      note: true,
      
      deliveryFee: true,
      createdAt: true,
      userId: true,
      restaurantId: true,
      items: true,
      payment: true,
      bill: true,
      restaurant: { select: { name: true, currency: true } },
      delivery: {
        include: {
          driver: {
            select: {
              name: true,
              phone: true,
              vehicleType: true,
              vehicleNo: true,
            },
          },
        },
      },
    },
  });

  // Auto-update delivery status when order status changes
  if (order.delivery) {
    if (status === "ACCEPTED" && order.delivery.status === "PENDING") {
      // Order ready, delivery still pending — keep as pending for driver assignment
    }
    if (status === "ACCEPTED") {
      await db.delivery.update({
        where: { orderId },
        data: { status: "DELIVERED", deliveredAt: new Date() },
      });
    }
    if (status === "REJECTED") {
      await db.delivery.update({
        where: { orderId },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancelReason: `Order ${status.toLowerCase()}`,
        },
      });
    }
  }

  // Restore stock, cancel payments, and cancel unprinted KOT jobs when rejected (non-fatal)
  if (status === "REJECTED") {
    const orderWithItems = await db.order.findUnique({
      where: { id: orderId },
      select: { id: true, items: { select: { menuItemId: true, quantity: true } } },
    });
    if (orderWithItems) {
      restoreStock(orderWithItems.items).catch((err) =>
        console.error("[Orders PATCH] Stock restore failed (non-fatal):", err),
      );
    }

    // Cancel pending payments
    db.payment
      .updateMany({
        where: { orderId, status: { in: ["PENDING", "AWAITING_VERIFICATION"] } },
        data: { status: "FAILED", rejectionNote: `Order rejected by staff` },
      })
      .catch((err) =>
        console.error("[Orders PATCH] Payment cleanup failed (non-fatal):", err),
      );

    // Cancel unprinted KOT jobs so the printer doesn't fire after rejection
    db.printJob
      .updateMany({
        where: { orderId, type: "KOT", status: { in: ["PENDING", "RETRYING"] } },
        data: { status: "FAILED", lastError: "Order rejected by staff" },
      })
      .catch((err) =>
        console.error("[Orders PATCH] PrintJob cancel failed (non-fatal):", err),
      );
  }

  logAudit({
    action: `ORDER_${status}` as AuditAction,
    entity: "Order",
    entityId: orderId,
    detail: `Order ${order.orderNo} status changed to ${status}`,
    metadata: { orderNo: order.orderNo, status, rejectReason },
    userId: actorId,
    restaurantId: id,
    ipAddress: getClientIp(req.headers),
  });

  // Notify counter staff when order is ready for pickup/serving
  if (status === "ACCEPTED") {
    notifyCounterOrderReady(id, order.orderNo, order.tableNo).catch(
      (err: unknown) => {
        console.error("[Orders] Failed to send counter notification:", err);
      },
    );
  }

  if (order.userId) {
    notifyCustomerOrderUpdate(
      order.userId,
      order.orderNo,
      status,
      order.restaurant.name,
    ).catch((err: unknown) => {
      console.error("[Orders] Failed to send customer notification:", err);
    });
  }

  // Push the status change to the customer tracker + dashboard over WebSocket.
  notifyOrderChanged(orderId, id, { status });

  return NextResponse.json(order);
}
