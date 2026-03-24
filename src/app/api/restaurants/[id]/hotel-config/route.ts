import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { getStaffSession } from "@/lib/staff-auth";

async function canAccess(req: NextRequest, restaurantId: string) {
  const staff = await getStaffSession(req);
  if (staff && staff.restaurantId === restaurantId) return true;
  const user = await getOrCreateUser();
  if (!user) return false;
  const rest = await db.restaurant.findFirst({
    where: { id: restaurantId, ownerId: user.id },
  });
  return !!rest;
}

// GET /api/restaurants/[id]/hotel-config
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!(await canAccess(req, id))) {
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

// PATCH /api/restaurants/[id]/hotel-config
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  // Only owner can change this, not arbitrary staff
  const user = await getOrCreateUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rest = await db.restaurant.findFirst({
    where: { id, ownerId: user.id },
  });
  if (!rest) {
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
