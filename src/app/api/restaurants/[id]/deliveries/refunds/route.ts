import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOwnerOrStaffBilling } from "@/lib/access-control";
import { logAudit } from "@/lib/audit";
import { notifyOrderChanged } from "@/lib/realtime";
import { z } from "zod";

/**
 * Refunds owed on delivery orders.
 *
 * There is no automated refund API for eSewa or Khalti in this integration, so
 * this is deliberately a manual, audited workflow rather than a button that
 * pretends money moved. The states are honest:
 *
 *   COMPLETED  →  REFUND_PENDING  →  REFUNDED
 *                 (owed, visible)    (operator paid it back and said so)
 *
 * Marking something REFUNDED is a claim by a human that they sent the money. It
 * is therefore restricted to owner/billing roles and always written to the audit
 * log with who said it.
 */

const REFUNDABLE_STATUSES = ["CANCELLED", "FAILED", "RETURNED"] as const;

// GET — orders that were paid, then didn't get delivered
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const access = await requireOwnerOrStaffBilling(req, id);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const rows = await db.delivery.findMany({
      where: {
        order: { restaurantId: id },
        status: { in: [...REFUNDABLE_STATUSES] },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: {
        id: true,
        status: true,
        cancelReason: true,
        updatedAt: true,
        order: {
          select: {
            id: true,
            orderNo: true,
            total: true,
            guestName: true,
            deliveryPhone: true,
            payment: {
              select: {
                id: true,
                method: true,
                status: true,
                amount: true,
                paidAt: true,
              },
            },
          },
        },
      },
    });

    const refunds = rows
      .filter(
        (r) =>
          r.order.payment &&
          ["COMPLETED", "REFUND_PENDING"].includes(r.order.payment.status),
      )
      .map((r) => ({
        deliveryId: r.id,
        deliveryStatus: r.status,
        reason: r.cancelReason,
        failedAt: r.updatedAt,
        orderId: r.order.id,
        orderNo: r.order.orderNo,
        amount: r.order.payment!.amount,
        method: r.order.payment!.method,
        paymentStatus: r.order.payment!.status,
        customer: r.order.guestName,
        phone: r.order.deliveryPhone,
      }));

    return NextResponse.json({
      refunds,
      totalOwed: refunds
        .filter((r) => r.paymentStatus !== "REFUNDED")
        .reduce((s, r) => s + r.amount, 0),
    });
  } catch (err) {
    console.error("[refunds] GET failed", err);
    return NextResponse.json(
      { error: "Could not load refunds." },
      { status: 503 },
    );
  }
}

const markSchema = z.object({
  orderId: z.string().min(1),
  to: z.enum(["REFUND_PENDING", "REFUNDED"]),
  note: z.string().trim().max(300).optional(),
});

// PATCH — move a refund along
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const access = await requireOwnerOrStaffBilling(req, id);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = markSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }
  const { orderId, to, note } = parsed.data;

  try {
    // Tenant scope in the filter — an order id alone would let one restaurant
    // rewrite another's payment records.
    const order = await db.order.findFirst({
      where: { id: orderId, restaurantId: id },
      select: {
        id: true,
        orderNo: true,
        payment: { select: { id: true, status: true, amount: true } },
      },
    });
    if (!order?.payment) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Only forward: COMPLETED → REFUND_PENDING → REFUNDED. Refusing to move
    // backwards keeps the audit trail meaningful.
    const legal =
      (to === "REFUND_PENDING" && order.payment.status === "COMPLETED") ||
      (to === "REFUNDED" && order.payment.status === "REFUND_PENDING");
    if (!legal) {
      return NextResponse.json(
        {
          error: `Cannot move a ${order.payment.status.toLowerCase()} payment to ${to.toLowerCase()}.`,
        },
        { status: 409 },
      );
    }

    await db.payment.update({
      where: { id: order.payment.id },
      data: {
        status: to,
        ...(note ? { rejectionNote: note } : {}),
      },
    });

    logAudit({
      action: to === "REFUNDED" ? "BOOKING_REFUNDED" : "PAYMENT_FAILED",
      entity: "Payment",
      entityId: order.payment.id,
      detail: `Order #${order.orderNo} marked ${to}${note ? ` — ${note}` : ""}`,
      metadata: { orderId: order.id, amount: order.payment.amount, to },
      restaurantId: id,
      userId: access.kind === "owner" ? access.userId : undefined,
    });

    notifyOrderChanged(order.id, id, { payment: to });

    return NextResponse.json({ ok: true, status: to });
  } catch (err) {
    console.error("[refunds] PATCH failed", err);
    return NextResponse.json(
      { error: "Could not update the refund." },
      { status: 503 },
    );
  }
}
