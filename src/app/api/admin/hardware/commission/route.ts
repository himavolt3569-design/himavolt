import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { unauthorized } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * GET /api/admin/hardware/commission
 * Per-seller-listing commission ledger: owed (confirmed-order commissions minus
 * settlements) and settled to date, plus platform totals. Only third-party
 * listings owe commission — platform listings are excluded.
 */
export async function GET() {
  const admin = await requireAdmin("hardware.payout");
  if (!admin) return unauthorized("Admin access required");

  const listings = await db.hardwareListing.findMany({
    where: { isPlatformListing: false },
    orderBy: { createdAt: "desc" },
    include: {
      orders: { where: { status: "CONFIRMED" }, select: { commissionAmount: true } },
      settlements: { select: { amount: true } },
    },
  });

  let totalOwed = 0;
  let totalSettled = 0;

  const rows = listings
    .map((l) => {
      const confirmedCommission = l.orders.reduce((s, o) => s + o.commissionAmount, 0);
      const settled = l.settlements.reduce((s, x) => s + x.amount, 0);
      const owed = Math.max(0, round(confirmedCommission - settled));
      totalOwed += owed;
      totalSettled += settled;
      return {
        listingId: l.id,
        name: l.name,
        sellerName: l.sellerName,
        sellerPhone: l.sellerPhone,
        confirmedOrders: l.orders.length,
        commissionEarned: round(confirmedCommission),
        settled: round(settled),
        owed,
      };
    })
    // Surface listings that have any commission activity first.
    .filter((r) => r.commissionEarned > 0 || r.settled > 0)
    .sort((a, b) => b.owed - a.owed);

  return NextResponse.json({
    rows,
    totals: { owed: round(totalOwed), settled: round(totalSettled) },
  });
}
