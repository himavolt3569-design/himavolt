import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOwnerOrStaffManager } from "@/lib/access-control";
import { deliveryZoneSchema } from "@/lib/validations";

// GET /api/restaurants/[id]/delivery-zones — List delivery zones (owner or MANAGER+)
//
// This route was previously UNAUTHENTICATED: any caller could enumerate any
// restaurant's pricing by id. There is no RLS backstop, so the guard has to be
// here. The public checkout reads zones through
// /api/public/restaurants/[slug]/delivery-zones, which returns a deliberately
// narrower projection — it is not affected by this fix.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const access = await requireOwnerOrStaffManager(req, id);
  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const zones = await db.deliveryZone.findMany({
    where: { restaurantId: id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ zones });
}

// POST /api/restaurants/[id]/delivery-zones — Create a delivery zone (owner or MANAGER+)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const access = await requireOwnerOrStaffManager(req, id);
  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = deliveryZoneSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid delivery zone" },
      { status: 400 },
    );
  }

  const zone = await db.deliveryZone.create({
    data: { ...parsed.data, restaurantId: id },
  });

  return NextResponse.json(zone, { status: 201 });
}
