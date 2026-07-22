import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { unauthorized } from "@/lib/api-helpers";
import { logAudit, getClientIp } from "@/lib/audit";
import { hardwareListingAdminSchema } from "@/lib/validations";
import { newHardwareToken } from "@/lib/hardware";

export const dynamic = "force-dynamic";

/**
 * Hardware marketplace — master-admin listing management.
 *
 * GET  /api/admin/hardware            list every listing (any status),
 *                                     newest first, with a status filter.
 * POST /api/admin/hardware            create a PLATFORM listing (HimaVolt's own
 *                                     stock) — auto-approved, no commission.
 *
 * Third-party seller submissions arrive PENDING_REVIEW via the public route;
 * approve/reject/edit them through PATCH /api/admin/hardware/[id].
 */

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin access required");

  const status = req.nextUrl.searchParams.get("status");
  const where =
    status && ["PENDING_REVIEW", "APPROVED", "REJECTED", "ARCHIVED"].includes(status)
      ? { status: status as "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "ARCHIVED" }
      : {};

  const listings = await db.hardwareListing.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      settlements: { select: { amount: true } },
      orders: { select: { status: true, commissionAmount: true } },
    },
  });

  const products = listings.map((l) => {
    const confirmedCommission = l.orders
      .filter((o) => o.status === "CONFIRMED")
      .reduce((s, o) => s + o.commissionAmount, 0);
    const settled = l.settlements.reduce((s, x) => s + x.amount, 0);
    return {
      id: l.id,
      name: l.name,
      description: l.description,
      type: l.type,
      price: l.price,
      stock: l.stock,
      imageUrl: l.imageUrl ?? "",
      status: l.status,
      rejectionNote: l.rejectionNote,
      isPlatformListing: l.isPlatformListing,
      sellerName: l.sellerName,
      sellerPhone: l.sellerPhone,
      sellerEmail: l.sellerEmail,
      sellerPayoutNote: l.sellerPayoutNote ?? "",
      sellerPaymentQr: l.sellerPaymentQr ?? "",
      createdAt: l.createdAt,
      orderCount: l.orders.length,
      commissionOwed: Math.max(0, Math.round((confirmedCommission - settled) * 100) / 100),
    };
  });

  return NextResponse.json({ products });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin access required");

  const parsed = hardwareListingAdminSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid product" },
      { status: 400 },
    );
  }
  const d = parsed.data;

  const listing = await db.hardwareListing.create({
    data: {
      name: d.name,
      description: d.description,
      type: d.type,
      price: d.price,
      stock: d.stock,
      imageUrl: d.imageUrl || null,
      status: "APPROVED",
      isPlatformListing: true,
      sellerName: d.sellerName || "HimaVolt",
      sellerPhone: d.sellerPhone || "-",
      sellerPayoutNote: d.sellerPayoutNote || null,
      manageToken: newHardwareToken(),
    },
    select: { id: true },
  });

  logAudit({
    action: "HARDWARE_LISTING_APPROVED",
    entity: "HardwareListing",
    entityId: listing.id,
    detail: `Platform hardware listing "${d.name}" created`,
    userId: admin.id,
    ipAddress: getClientIp(req.headers),
  });

  return NextResponse.json({ ok: true, id: listing.id }, { status: 201 });
}
