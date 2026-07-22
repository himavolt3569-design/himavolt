import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { unauthorized } from "@/lib/api-helpers";
import { logAudit, getClientIp } from "@/lib/audit";
import type { AuditAction } from "@/lib/audit";

export const dynamic = "force-dynamic";

const STATUSES = ["PENDING_REVIEW", "APPROVED", "REJECTED", "ARCHIVED"] as const;
type Status = (typeof STATUSES)[number];

/**
 * PATCH /api/admin/hardware/[id]
 * Approve / reject / archive a listing and/or edit its editable fields.
 * DELETE /api/admin/hardware/[id]  — hard-delete a listing (orders block via
 * onDelete: Restrict, so a listing with orders cannot be deleted).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin access required");

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const existing = await db.hardwareListing.findUnique({
    where: { id },
    select: { id: true, name: true, status: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};

  // Status transition
  if (typeof body.status === "string" && STATUSES.includes(body.status as Status)) {
    data.status = body.status;
    data.rejectionNote =
      body.status === "REJECTED" && typeof body.rejectionNote === "string"
        ? body.rejectionNote.slice(0, 500)
        : null;
  }

  // Editable fields (all optional)
  const str = (v: unknown, max: number) =>
    typeof v === "string" ? v.trim().slice(0, max) : undefined;
  const num = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : undefined;
  };

  const name = str(body.name, 120);
  if (name) data.name = name;
  const description = str(body.description, 2000);
  if (description !== undefined) data.description = description;
  if (typeof body.type === "string" && ["Terminal", "Screen", "Printer", "Accessory"].includes(body.type))
    data.type = body.type;
  const price = num(body.price);
  if (price !== undefined) data.price = price;
  const stock = num(body.stock);
  if (stock !== undefined) data.stock = Math.round(stock);
  if (typeof body.imageUrl === "string") data.imageUrl = body.imageUrl.trim() || null;
  const payout = str(body.sellerPayoutNote, 500);
  if (payout !== undefined) data.sellerPayoutNote = payout;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const updated = await db.hardwareListing.update({
    where: { id },
    data,
    select: { id: true, status: true },
  });

  let action: AuditAction = "HARDWARE_LISTING_UPDATED";
  if (data.status === "APPROVED") action = "HARDWARE_LISTING_APPROVED";
  else if (data.status === "REJECTED") action = "HARDWARE_LISTING_REJECTED";

  logAudit({
    action,
    entity: "HardwareListing",
    entityId: id,
    detail: `Listing "${existing.name}" ${data.status ? `→ ${data.status}` : "edited"}`,
    userId: admin.id,
    ipAddress: getClientIp(req.headers),
  });

  return NextResponse.json({ ok: true, listing: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin access required");

  const { id } = await params;
  const orderCount = await db.hardwareOrder.count({ where: { listingId: id } });
  if (orderCount > 0) {
    return NextResponse.json(
      { error: "This listing has orders — archive it instead of deleting." },
      { status: 400 },
    );
  }

  await db.hardwareListing.delete({ where: { id } }).catch(() => {});

  logAudit({
    action: "HARDWARE_LISTING_UPDATED",
    entity: "HardwareListing",
    entityId: id,
    detail: "Listing deleted",
    userId: admin.id,
    ipAddress: getClientIp(req.headers),
  });

  return NextResponse.json({ ok: true });
}
