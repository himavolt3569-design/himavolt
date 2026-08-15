import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { unauthorized } from "@/lib/api-helpers";
import { logAudit, getClientIp } from "@/lib/audit";
import { hardwareSettlementSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/hardware/commission/settle
 * Records that a seller has paid HimaVolt some (or all) of the commission they
 * owe on a listing. Reduces the computed "owed" figure on the ledger.
 */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin("hardware.payout");
  if (!admin) return unauthorized("Admin access required");

  const parsed = hardwareSettlementSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }
  const { listingId, amount, note } = parsed.data;

  const listing = await db.hardwareListing.findUnique({
    where: { id: listingId },
    select: { id: true, name: true },
  });
  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  const settlement = await db.hardwareCommissionSettlement.create({
    data: { listingId, amount, note: note ?? null },
    select: { id: true },
  });

  logAudit({
    action: "HARDWARE_COMMISSION_SETTLED",
    entity: "HardwareListing",
    entityId: listingId,
    detail: `Commission settlement of ${amount} recorded for "${listing.name}"`,
    metadata: { settlementId: settlement.id, note },
    userId: admin.id,
    ipAddress: getClientIp(req.headers),
  });

  return NextResponse.json({ ok: true, id: settlement.id }, { status: 201 });
}
