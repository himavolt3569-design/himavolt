import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOwnerOrStaffManager } from "@/lib/access-control";
import { deliveryZoneSchema } from "@/lib/validations";

/**
 * Edit or remove one delivery zone.
 *
 * Every query carries BOTH the zone id and `restaurantId`. An id on its own
 * would let one restaurant rewrite another's pricing — there is no RLS backstop
 * in this database, so the scope has to be in the `where`.
 */

// PATCH /api/restaurants/[id]/delivery-zones/[zoneId]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; zoneId: string }> },
) {
  const { id, zoneId } = await params;
  const access = await requireOwnerOrStaffManager(req, id);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = deliveryZoneSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid delivery zone" },
      { status: 400 },
    );
  }

  const data = { ...parsed.data } as Record<string, unknown>;
  if (typeof body === "object" && body !== null && "isActive" in body) {
    data.isActive = Boolean((body as { isActive: unknown }).isActive);
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  try {
    const { count } = await db.deliveryZone.updateMany({
      where: { id: zoneId, restaurantId: id },
      data,
    });
    if (count === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const zone = await db.deliveryZone.findFirst({
      where: { id: zoneId, restaurantId: id },
    });
    return NextResponse.json(zone);
  } catch (err) {
    console.error("[delivery-zones] PATCH failed", err);
    return NextResponse.json(
      { error: "Could not save the zone. Please try again." },
      { status: 503 },
    );
  }
}

// DELETE /api/restaurants/[id]/delivery-zones/[zoneId]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; zoneId: string }> },
) {
  const { id, zoneId } = await params;
  const access = await requireOwnerOrStaffManager(req, id);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { count } = await db.deliveryZone.deleteMany({
      where: { id: zoneId, restaurantId: id },
    });
    if (count === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    // Historical orders keep their own frozen copy of the fee on the Delivery
    // row, so deleting a zone never rewrites what a past customer was charged.
    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error("[delivery-zones] DELETE failed", err);
    return NextResponse.json(
      { error: "Could not remove the zone. Please try again." },
      { status: 503 },
    );
  }
}
