import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getRestaurantAccess,
  requireOwnerOrStaffManager,
} from "@/lib/access-control";

// GET /api/restaurants/[id]/hotel-config (any staff or owner)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!(await getRestaurantAccess(req, id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const restaurant = await db.restaurant.findUnique({
    where: { id },
    select: {
      hotelAdvanceType: true,
      hotelAdvanceValue: true,
      currency: true,
    },
  });

  if (!restaurant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(restaurant);
}

// PATCH /api/restaurants/[id]/hotel-config — advance config (owner or manager)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!(await requireOwnerOrStaffManager(req, id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { hotelAdvanceType, hotelAdvanceValue } = body;

  if (hotelAdvanceType && !["PERCENTAGE", "FIXED"].includes(hotelAdvanceType)) {
    return NextResponse.json(
      { error: "hotelAdvanceType must be PERCENTAGE or FIXED" },
      { status: 400 },
    );
  }
  if (hotelAdvanceValue !== undefined && (isNaN(hotelAdvanceValue) || hotelAdvanceValue < 0)) {
    return NextResponse.json(
      { error: "hotelAdvanceValue must be a non-negative number" },
      { status: 400 },
    );
  }
  // Prevent percentage values over 100
  const effectiveType = hotelAdvanceType ?? (await db.restaurant.findUnique({ where: { id }, select: { hotelAdvanceType: true } }))?.hotelAdvanceType;
  if (effectiveType === "PERCENTAGE" && hotelAdvanceValue !== undefined && hotelAdvanceValue > 100) {
    return NextResponse.json(
      { error: "Percentage advance cannot exceed 100%" },
      { status: 400 },
    );
  }

  const updated = await db.restaurant.update({
    where: { id },
    data: {
      ...(hotelAdvanceType !== undefined && { hotelAdvanceType }),
      ...(hotelAdvanceValue !== undefined && { hotelAdvanceValue }),
    },
    select: { hotelAdvanceType: true, hotelAdvanceValue: true, currency: true },
  });

  return NextResponse.json(updated);
}
