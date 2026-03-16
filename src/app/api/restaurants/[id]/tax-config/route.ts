import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStaffForRestaurant } from "@/lib/staff-auth";
import { getAuthUser } from "@/lib/auth";

async function verifyAccess(req: NextRequest, restaurantId: string) {
  // Try staff auth first
  const staff = await requireStaffForRestaurant(req, restaurantId);
  if (staff) return { type: "staff" as const, id: staff.staffId };

  // Fallback: owner auth
  const user = await getAuthUser();
  if (!user) return null;
  const restaurant = await db.restaurant.findUnique({
    where: { id: restaurantId },
    select: { ownerId: true },
  });
  if (!restaurant || restaurant.ownerId !== user.id) return null;
  return { type: "owner" as const, id: user.id };
}

// GET /api/restaurants/[id]/tax-config
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const actor = await verifyAccess(req, id);
  if (!actor)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const restaurant = await db.restaurant.findUnique({
    where: { id },
    select: {
      currency: true,
      taxRate: true,
      taxEnabled: true,
      serviceChargeRate: true,
      serviceChargeEnabled: true,
    },
  });

  if (!restaurant)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(restaurant);
}

// PUT /api/restaurants/[id]/tax-config
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const actor = await verifyAccess(req, id);
  if (!actor)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { currency, taxRate, taxEnabled, serviceChargeRate, serviceChargeEnabled } = body;

  const VALID_CURRENCIES = ["NPR", "INR", "USD"];
  const data: Record<string, unknown> = {};
  if (typeof currency === "string" && VALID_CURRENCIES.includes(currency))
    data.currency = currency;
  if (typeof taxRate === "number" && taxRate >= 0 && taxRate <= 100)
    data.taxRate = taxRate;
  if (typeof taxEnabled === "boolean") data.taxEnabled = taxEnabled;
  if (
    typeof serviceChargeRate === "number" &&
    serviceChargeRate >= 0 &&
    serviceChargeRate <= 100
  )
    data.serviceChargeRate = serviceChargeRate;
  if (typeof serviceChargeEnabled === "boolean")
    data.serviceChargeEnabled = serviceChargeEnabled;

  if (Object.keys(data).length === 0)
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });

  const updated = await db.restaurant.update({
    where: { id },
    data,
    select: {
      currency: true,
      taxRate: true,
      taxEnabled: true,
      serviceChargeRate: true,
      serviceChargeEnabled: true,
    },
  });

  return NextResponse.json(updated);
}
