import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logAudit, getClientIp } from "@/lib/audit";

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

  // Find the payment for this order
  const payment = await db.payment.findUnique({
    where: { orderId },
    select: {
      id: true,
      method: true,
      status: true,
      proofUrl: true,
      order: { select: { orderNo: true, restaurantId: true, userId: true } },
    },
  });

  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  if (payment.method !== "BANK") {
    return NextResponse.json(
      { error: "Proof upload is only available for bank transfer payments" },
      { status: 400 },
    );
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
