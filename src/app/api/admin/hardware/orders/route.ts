import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { unauthorized } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/hardware/orders
 * Every hardware order across the marketplace, newest first, with an optional
 * ?status= filter. Used to review payment proofs and confirm sales.
 */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin("hardware.view");
  if (!admin) return unauthorized("Admin access required");

  const status = req.nextUrl.searchParams.get("status");
  const where =
    status && ["PENDING", "AWAITING_VERIFICATION", "CONFIRMED", "CANCELLED"].includes(status)
      ? { status: status as "PENDING" | "AWAITING_VERIFICATION" | "CONFIRMED" | "CANCELLED" }
      : {};

  const orders = await db.hardwareOrder.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      listing: {
        select: { name: true, type: true, isPlatformListing: true, sellerName: true },
      },
    },
  });

  return NextResponse.json({
    orders: orders.map((o) => ({
      id: o.id,
      quantity: o.quantity,
      unitPrice: o.unitPrice,
      total: o.total,
      commissionRate: o.commissionRate,
      commissionAmount: o.commissionAmount,
      status: o.status,
      buyerName: o.buyerName,
      buyerPhone: o.buyerPhone,
      buyerEmail: o.buyerEmail,
      shippingAddress: o.shippingAddress,
      proofUrl: o.proofUrl,
      rejectionNote: o.rejectionNote,
      createdAt: o.createdAt,
      listing: o.listing,
    })),
  });
}
