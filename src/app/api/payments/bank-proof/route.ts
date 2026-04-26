import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logAudit, getClientIp } from "@/lib/audit";
import { sendNotificationToRestaurantStaff } from "@/lib/notifications";
import { touchOrderUpdatedAt } from "@/lib/order-sync";
import { canAccessOrder } from "@/lib/order-access";

/**
 * POST /api/payments/bank-proof
 * Customer uploads bank transfer proof (screenshot URL) for a pending bank payment.
 *
 * Body: { orderId: string, proofUrl: string }
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { orderId, proofUrl } = body;

  if (!orderId || !proofUrl) {
    return NextResponse.json(
      { error: "orderId and proofUrl are required" },
      { status: 400 },
    );
  }

  // Validate proofUrl: must be an absolute https URL ≤ 500 chars. Reject
  // javascript:/data: and other tricks before we even hit the DB.
  if (typeof proofUrl !== "string" || proofUrl.length > 500) {
    return NextResponse.json(
      { error: "proofUrl must be a string up to 500 characters" },
      { status: 400 },
    );
  }
  try {
    const u = new URL(proofUrl);
    if (u.protocol !== "https:" && u.protocol !== "http:") {
      return NextResponse.json(
        { error: "proofUrl must be an http(s) URL" },
        { status: 400 },
      );
    }
  } catch {
    return NextResponse.json(
      { error: "proofUrl is not a valid URL" },
      { status: 400 },
    );
  }

  // Find the payment for this order
  const payment = await db.payment.findUnique({
    where: { orderId },
    select: {
      id: true,
      method: true,
      status: true,
      proofUrl: true,
      order: { select: { id: true, orderNo: true, restaurantId: true, userId: true } },
    },
  });

  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  // Only the order's owner / a track-cookie holder / restaurant staff can
  // attach proof. Previously anyone with the orderId could pollute the
  // verification queue.
  const allowed = await canAccessOrder(req, {
    id: payment.order.id,
    userId: payment.order.userId,
    restaurantId: payment.order.restaurantId,
  });
  if (!allowed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (payment.status === "COMPLETED") {
    return NextResponse.json(
      { error: "Payment is already completed" },
      { status: 400 },
    );
  }

  if (payment.status !== "PENDING" && payment.status !== "AWAITING_VERIFICATION") {
    return NextResponse.json(
      { error: `Cannot upload proof for payment with status ${payment.status}` },
      { status: 400 },
    );
  }

  // Update payment with proof and transition to AWAITING_VERIFICATION
  const updated = await db.payment.update({
    where: { id: payment.id },
    data: {
      proofUrl,
      proofUploadedAt: new Date(),
      status: "AWAITING_VERIFICATION",
    },
  });

  // Touch order so SSE streams detect the payment change
  await touchOrderUpdatedAt(orderId);

  logAudit({
    action: "BANK_PROOF_UPLOADED",
    entity: "Payment",
    entityId: payment.id,
    detail: `Bank transfer proof uploaded for order ${payment.order.orderNo}`,
    metadata: { orderId, proofUrl },
    userId: payment.order.userId ?? undefined,
    restaurantId: payment.order.restaurantId,
    ipAddress: getClientIp(req.headers),
  });

  // Notify all staff + owner that proof was uploaded and needs verification
  sendNotificationToRestaurantStaff(payment.order.restaurantId, {
    title: "Payment Proof Uploaded",
    body: `Order #${payment.order.orderNo} — Customer uploaded payment proof. Please verify in Billing.`,
    data: {
      type: "PROOF_UPLOADED",
      orderNo: payment.order.orderNo,
      orderId,
      restaurantId: payment.order.restaurantId,
    },
  }).catch(() => { /* non-fatal */ });

  return NextResponse.json({
    success: true,
    payment: {
      id: updated.id,
      status: updated.status,
      proofUrl: updated.proofUrl,
      proofUploadedAt: updated.proofUploadedAt,
    },
  });
}
