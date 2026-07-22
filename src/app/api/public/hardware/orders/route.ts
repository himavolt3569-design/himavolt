import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logAudit, getClientIp } from "@/lib/audit";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { hardwareOrderCreateSchema } from "@/lib/validations";
import { newHardwareToken, computeOrderTotals } from "@/lib/hardware";

export const dynamic = "force-dynamic";

/**
 * POST /api/public/hardware/orders
 * A buyer places an order against an APPROVED listing — no account needed.
 * The server derives unit price / total / commission from the LISTING row; the
 * client never sends price (same rule as restaurant order creation). Returns
 * an opaque `trackToken` for the buyer's status page.
 */
export async function POST(req: NextRequest) {
  const rl = await rateLimit(clientKey(req, "hw-order"), 15 * 60_000, 10);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before trying again." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  const parsed = hardwareOrderCreateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid order" },
      { status: 400 },
    );
  }
  const d = parsed.data;

  const listing = await db.hardwareListing.findUnique({
    where: { id: d.listingId },
    select: { id: true, name: true, price: true, stock: true, status: true, isPlatformListing: true },
  });
  if (!listing || listing.status !== "APPROVED") {
    return NextResponse.json({ error: "This product is not available." }, { status: 404 });
  }
  if (listing.stock > 0 && d.quantity > listing.stock) {
    return NextResponse.json(
      { error: `Only ${listing.stock} in stock.` },
      { status: 400 },
    );
  }

  const totals = computeOrderTotals(listing, d.quantity);
  const trackToken = newHardwareToken();

  const order = await db.hardwareOrder.create({
    data: {
      listingId: listing.id,
      quantity: d.quantity,
      unitPrice: totals.unitPrice,
      total: totals.total,
      commissionRate: totals.commissionRate,
      commissionAmount: totals.commissionAmount,
      buyerName: d.buyerName,
      buyerPhone: d.buyerPhone,
      buyerEmail: d.buyerEmail || null,
      shippingAddress: d.shippingAddress,
      status: "PENDING",
      trackToken,
    },
    select: { id: true },
  });

  logAudit({
    action: "HARDWARE_ORDER_PLACED",
    entity: "HardwareOrder",
    entityId: order.id,
    detail: `Order for ${d.quantity}× "${listing.name}" by ${d.buyerName}`,
    metadata: { total: totals.total, commissionAmount: totals.commissionAmount },
    ipAddress: getClientIp(req.headers),
  });

  return NextResponse.json({ ok: true, trackToken }, { status: 201 });
}
