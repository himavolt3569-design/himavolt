import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logAudit, getClientIp } from "@/lib/audit";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { hardwareProofSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

/**
 * POST /api/public/hardware/orders/[trackToken]/proof
 * The buyer paid the seller directly and uploads a payment-proof URL. Moves the
 * order to AWAITING_VERIFICATION for the master admin to confirm. Possession of
 * the opaque trackToken is the authorisation (same model as order-track).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ trackToken: string }> },
) {
  const rl = await rateLimit(clientKey(req, "hw-proof"), 15 * 60_000, 10);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before trying again." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  const { trackToken } = await params;
  const parsed = hardwareProofSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const order = await db.hardwareOrder.findUnique({
    where: { trackToken },
    select: { id: true, status: true },
  });
  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (order.status === "CONFIRMED") {
    return NextResponse.json({ error: "This order is already confirmed." }, { status: 400 });
  }
  if (order.status === "CANCELLED") {
    return NextResponse.json({ error: "This order was cancelled." }, { status: 400 });
  }

  const updated = await db.hardwareOrder.update({
    where: { id: order.id },
    data: {
      proofUrl: parsed.data.proofUrl,
      proofUploadedAt: new Date(),
      status: "AWAITING_VERIFICATION",
    },
    select: { id: true, status: true, proofUrl: true, proofUploadedAt: true },
  });

  logAudit({
    action: "HARDWARE_ORDER_PROOF_UPLOADED",
    entity: "HardwareOrder",
    entityId: order.id,
    detail: "Buyer uploaded hardware-order payment proof",
    metadata: { proofUrl: parsed.data.proofUrl },
    ipAddress: getClientIp(req.headers),
  });

  return NextResponse.json({ ok: true, order: updated });
}
