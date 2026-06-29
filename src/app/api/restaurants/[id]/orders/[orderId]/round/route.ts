import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { getStaffSession } from "@/lib/staff-auth";
import { logAudit, getClientIp, type AuditAction } from "@/lib/audit";
import { notifyOrderChanged } from "@/lib/realtime";
import { canAcceptOrder } from "@/lib/payment-gate";
import { restoreStock } from "@/lib/stock";
import { z } from "zod";

/**
 * Per-round accept/reject. A running-bill order grows in "rounds" (the initial
 * order + each add-on batch); all items in a batch share a `createdAt`. This
 * endpoint actions ONE round's items so staff can accept/reject a newly-added
 * round without disturbing earlier (already-prepared) rounds.
 *
 * - ACCEPT: flips the round's items to ACCEPTED. If this is the order's first
 *   round and the order is still PENDING, it's the order's initial acceptance —
 *   enforce the payment gate and move the whole order to ACCEPTED.
 * - REJECT: flips the round's items to REJECTED and restores their stock. Only
 *   when the round IS the whole (still-pending) order does the order itself move
 *   to REJECTED — an add-on round reject leaves the rest of the order intact.
 */

const schema = z.object({
  roundAt: z.string(), // ISO timestamp identifying the round (item batch)
  action: z.enum(["ACCEPT", "REJECT"]),
  reason: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; orderId: string }> },
) {
  const { id, orderId } = await params;

  // Auth — staff of this restaurant, or the owner (mirrors [orderId] PATCH).
  const staff = await getStaffSession(req);
  let actorId: string | undefined;
  if (staff && staff.restaurantId === id) {
    actorId = staff.userId || staff.staffId;
  } else {
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

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const { roundAt, action, reason } = parsed.data;
  const roundMs = new Date(roundAt).getTime();
  if (Number.isNaN(roundMs)) {
    return NextResponse.json({ error: "Invalid roundAt" }, { status: 400 });
  }

  const order = await db.order.findFirst({
    where: { id: orderId, restaurantId: id },
    select: {
      id: true,
      orderNo: true,
      status: true,
      items: {
        select: {
          id: true,
          menuItemId: true,
          quantity: true,
          createdAt: true,
        },
      },
    },
  });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Use a 1000ms window because stringified ISO dates can lose sub-millisecond
  // precision when bouncing through the DB and JSON APIs.
  const roundItems = order.items.filter(
    (it) => Math.abs(it.createdAt.getTime() - roundMs) < 1000,
  );
  if (roundItems.length === 0) {
    return NextResponse.json(
      { 
        error: "Round not found", 
        debug: {
          requestedRoundMs: roundMs,
          requestedRoundAt: roundAt,
          availableRounds: order.items.map(it => it.createdAt.getTime())
        }
      }, 
      { status: 404 }
    );
  }
  const roundItemIds = roundItems.map((it) => it.id);

  // Is this the order's earliest round? That round maps onto the whole-order
  // lifecycle (initial accept/reject); later rounds are add-ons.
  const earliestMs = order.items.reduce(
    (min, it) => Math.min(min, it.createdAt.getTime()),
    Number.POSITIVE_INFINITY,
  );
  const isFirstRound = Math.abs(roundMs - earliestMs) < 1000;
  const isWholeOrder = roundItems.length === order.items.length;

  if (action === "ACCEPT") {
    if (isFirstRound && order.status === "PENDING") {
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
          },
          userId: actorId,
          restaurantId: id,
          ipAddress: getClientIp(req.headers),
        });
        return NextResponse.json(
          {
            error:
              gate.reason ||
              "Payment must be completed before accepting this order",
          },
          { status: 402 },
        );
      }
      await db.order.update({
        where: { id: orderId },
        data: {
          status: "ACCEPTED",
          acceptedAt: new Date(),
          items: {
            updateMany: {
              where: { id: { in: roundItemIds } },
              data: { kitchenStatus: "ACCEPTED" },
            },
          },
        },
      });
    } else {
      await db.orderItem.updateMany({
        where: { id: { in: roundItemIds } },
        data: { kitchenStatus: "ACCEPTED" },
      });
    }
    logAudit({
      action: "ORDER_ACCEPTED" as AuditAction,
      entity: "Order",
      entityId: orderId,
      detail: `Accepted round (${roundItems.length} items) of order ${order.orderNo}`,
      metadata: { orderNo: order.orderNo, roundAt, items: roundItems.length },
      userId: actorId,
      restaurantId: id,
      ipAddress: getClientIp(req.headers),
    });
  } else {
    await db.orderItem.updateMany({
      where: { id: { in: roundItemIds } },
      data: { 
        kitchenStatus: "REJECTED",
        rejectedReason: reason || "No reason provided" 
      },
    });
    // Restore stock for just this round's items (non-fatal).
    restoreStock(
      roundItems.map((it) => ({ menuItemId: it.menuItemId, quantity: it.quantity })),
    ).catch((err) =>
      console.error("[Round PATCH] Stock restore failed (non-fatal):", err),
    );
    // Only when the round IS the whole still-pending order does the order
    // itself get rejected — an add-on round reject leaves the order active.
    if (isWholeOrder && order.status === "PENDING") {
      await db.order.update({
        where: { id: orderId },
        data: { 
          status: "REJECTED",
          rejectReason: reason || "No reason provided",
        },
      });
      db.payment
        .updateMany({
          where: {
            orderId,
            status: { in: ["PENDING", "AWAITING_VERIFICATION"] },
          },
          data: { status: "FAILED", rejectionNote: "Order rejected by staff" },
        })
        .catch((err) =>
          console.error("[Round PATCH] Payment cleanup failed (non-fatal):", err),
        );
    }
    logAudit({
      action: "ORDER_REJECTED" as AuditAction,
      entity: "Order",
      entityId: orderId,
      detail: `Rejected round (${roundItems.length} items) of order ${order.orderNo}`,
      metadata: { orderNo: order.orderNo, roundAt, items: roundItems.length },
      userId: actorId,
      restaurantId: id,
      ipAddress: getClientIp(req.headers),
    });
  }

  notifyOrderChanged(orderId, id, {
    reason: action === "ACCEPT" ? "round-accepted" : "round-rejected",
  });

  const updated = await db.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNo: true,
      status: true,
      tableNo: true,
      items: {
        select: {
          id: true,
          name: true,
          quantity: true,
          price: true,
          kitchenStatus: true,
          createdAt: true,
        },
      },
    },
  });
  
  return NextResponse.json(updated);
}
