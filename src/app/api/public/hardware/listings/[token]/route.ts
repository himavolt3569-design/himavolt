import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/public/hardware/listings/[token]
 * A seller's account-less status view of their own listing, keyed by the
 * opaque `manageToken` returned at submission time. Includes the listing's
 * orders and the running commission the seller owes HimaVolt.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!token || token.length < 16) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const listing = await db.hardwareListing.findUnique({
    where: { manageToken: token },
    include: {
      orders: { orderBy: { createdAt: "desc" } },
      settlements: true,
    },
  });
  if (!listing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const confirmedCommission = listing.orders
    .filter((o) => o.status === "CONFIRMED")
    .reduce((sum, o) => sum + o.commissionAmount, 0);
  const settled = listing.settlements.reduce((sum, s) => sum + s.amount, 0);
  const commissionOwed = Math.max(0, Math.round((confirmedCommission - settled) * 100) / 100);

  return NextResponse.json({
    listing: {
      id: listing.id,
      name: listing.name,
      description: listing.description,
      type: listing.type,
      price: listing.price,
      stock: listing.stock,
      imageUrl: listing.imageUrl ?? "",
      status: listing.status,
      rejectionNote: listing.rejectionNote,
      sellerName: listing.sellerName,
      sellerPayoutNote: listing.sellerPayoutNote ?? "",
      sellerPaymentQr: listing.sellerPaymentQr ?? "",
      createdAt: listing.createdAt,
    },
    orders: listing.orders.map((o) => ({
      id: o.id,
      quantity: o.quantity,
      total: o.total,
      commissionAmount: o.commissionAmount,
      status: o.status,
      buyerName: o.buyerName,
      buyerPhone: o.buyerPhone,
      shippingAddress: o.shippingAddress,
      createdAt: o.createdAt,
    })),
    commission: {
      rate: listing.isPlatformListing ? 0 : 5,
      owed: commissionOwed,
      settled: Math.round(settled * 100) / 100,
    },
  });
}
