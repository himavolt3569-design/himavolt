import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { unauthorized } from "@/lib/api-helpers";
import { logAudit, getClientIp } from "@/lib/audit";
import { hardwarePayoutMethodSchema } from "@/lib/validations";
import { readPayoutMethod, writePayoutMethod } from "@/lib/hardware";

export const dynamic = "force-dynamic";

/**
 * GET/PATCH /api/admin/hardware/payout
 * The platform's own "how commissions get paid to me" method — a single
 * site_settings JSON blob (mirrors the gateway-settings pattern). This is the
 * account/identifier the master admin gives sellers to remit their 5%.
 */
export async function GET() {
  const admin = await requireAdmin("hardware.payout");
  if (!admin) return unauthorized("Admin access required");
  return NextResponse.json({ payout: await readPayoutMethod() });
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin("hardware.payout");
  if (!admin) return unauthorized("Admin access required");

  const parsed = hardwarePayoutMethodSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  await writePayoutMethod(parsed.data);

  logAudit({
    action: "HARDWARE_COMMISSION_SETTLED",
    entity: "SiteSetting",
    entityId: "hardware_commission_payout",
    detail: "Hardware commission payout method updated",
    userId: admin.id,
    ipAddress: getClientIp(req.headers),
  });

  return NextResponse.json({ ok: true, payout: parsed.data });
}
