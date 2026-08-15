import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { unauthorized } from "@/lib/api-helpers";
import { logAudit, getClientIp } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/hardware/orders/[id]
 * Master admin confirms a hardware order (payment verified → commission now
 * owed) or cancels it. Body: { action: "confirm" | "cancel", note?: string }.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin("hardware.manage");
  if (!admin) return unauthorized("Admin access required");

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { action?: string; note?: string };
  const action = body.action;
  if (action !== "confirm" && action !== "cancel") {
    return NextResponse.json({ error: "action must be 'confirm' or 'cancel'" }, { status: 400 });
  }

  const order = await db.hardwareOrder.findUnique({
    where: { id },
    select: { id: true, status: true, commissionAmount: true },
  });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  if (order.status === "CONFIRMED" && action === "confirm") {
    return NextResponse.json({ error: "Order is already confirmed." }, { status: 400 });
  }

  const updated = await db.hardwareOrder.update({
    where: { id },
    data:
      action === "confirm"
        ? { status: "CONFIRMED", verifiedAt: new Date(), rejectionNote: null }
        : {
            status: "CANCELLED",
            rejectionNote: typeof body.note === "string" ? body.note.slice(0, 300) : null,
          },
    select: { id: true, status: true },
  });

  logAudit({
    action: action === "confirm" ? "HARDWARE_ORDER_CONFIRMED" : "HARDWARE_ORDER_CANCELLED",
    entity: "HardwareOrder",
    entityId: id,
    detail:
      action === "confirm"
        ? `Hardware order confirmed — commission ${order.commissionAmount} owed`
        : "Hardware order cancelled",
    userId: admin.id,
    ipAddress: getClientIp(req.headers),
  });

  return NextResponse.json({ ok: true, order: updated });
}
