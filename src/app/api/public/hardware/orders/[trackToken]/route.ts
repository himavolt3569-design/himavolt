import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { toPublicOrder } from "@/lib/hardware";

export const dynamic = "force-dynamic";

/**
 * GET /api/public/hardware/orders/[trackToken]
 * A buyer's account-less order status, keyed by the opaque `trackToken`.
 * Includes the seller's payout instructions so the buyer knows where to pay.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ trackToken: string }> },
) {
  const { trackToken } = await params;
  if (!trackToken || trackToken.length < 16) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const order = await db.hardwareOrder.findUnique({
    where: { trackToken },
    include: {
      listing: {
        select: {
          name: true,
          type: true,
          imageUrl: true,
          sellerName: true,
          sellerPhone: true,
          sellerPayoutNote: true,
          sellerPaymentQr: true,
        },
      },
    },
  });
  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ order: toPublicOrder(order, order.listing) });
}
