import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { getStaffSession } from "@/lib/staff-auth";
import { notifyCustomerOrderUpdate } from "@/lib/notifications";
import { logAudit, getClientIp, type AuditAction } from "@/lib/audit";
import { z } from "zod";

const ORDER_STATUSES = ["ACCEPTED", "PREPARING", "READY", "DELIVERED", "CANCELLED", "REJECTED"] as const;

const updateOrderSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  estimatedTime: z.number().int().positive().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; orderId: string }> },
) {
  const { id, orderId } = await params;

  const order = await db.order.findFirst({
    where: { id: orderId, restaurantId: id },
    include: {
      items: { include: { menuItem: true } },
      user: { select: { name: true, email: true, phone: true } },
      payment: true,
      bill: true,
      restaurant: { select: { name: true } },
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
    // Fall back to Clerk owner auth
    const user = await getOrCreateUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const restaurant = await db.restaurant.findFirst({ where: { id, ownerId: user.id } });
    if (!restaurant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    actorId = user.id;
  }

  const parsed = updateOrderSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const { status, estimatedTime } = parsed.data;

  const timestamps: Record<string, Date> = {};
  if (status === "ACCEPTED") timestamps.acceptedAt = new Date();
  if (status === "PREPARING") timestamps.preparingAt = new Date();
  if (status === "READY") timestamps.readyAt = new Date();
  if (status === "DELIVERED") timestamps.deliveredAt = new Date();

  const order = await db.order.update({
    where: { id: orderId },
    data: {
      status,
      ...timestamps,
      ...(estimatedTime !== undefined ? { estimatedTime } : {}),
    },
    include: {
      items: true,
      payment: true,
      bill: true,
      restaurant: { select: { name: true } },
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
    if (status === "READY" && order.delivery.status === "PENDING") {
      // Order ready, delivery still pending — keep as pending for driver assignment
    }
    if (status === "DELIVERED") {
      await db.delivery.update({
        where: { orderId },
        data: { status: "DELIVERED", deliveredAt: new Date() },
      });
    }
    if (status === "CANCELLED" || status === "REJECTED") {
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

  if (status === "DELIVERED" && order.payment?.method === "CASH") {
    await db.payment.update({
      where: { orderId },
      data: { status: "COMPLETED", paidAt: new Date() },
    });
  }

  logAudit({
    action: `ORDER_${status}` as AuditAction,
    entity: "Order",
    entityId: orderId,
    detail: `Order ${order.orderNo} status changed to ${status}`,
    metadata: { orderNo: order.orderNo, status, estimatedTime },
    userId: actorId,
    restaurantId: id,
    ipAddress: getClientIp(req.headers),
  });

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

  return NextResponse.json(order);
}
