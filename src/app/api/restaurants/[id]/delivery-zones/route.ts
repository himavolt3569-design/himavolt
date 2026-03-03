import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";

// GET /api/restaurants/[id]/delivery-zones — List delivery zones for a restaurant
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const zones = await db.deliveryZone.findMany({
    where: { restaurantId: id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ zones });
}

// POST /api/restaurants/[id]/delivery-zones — Create a delivery zone
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getOrCreateUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify ownership
  const restaurant = await db.restaurant.findFirst({
    where: { id, ownerId: user.id },
  });
  if (!restaurant) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { name, baseFee, perKmFee, freeAbove, maxRadiusKm } = body;

  if (!name) {
    return NextResponse.json(
      { error: "Zone name is required" },
      { status: 400 },
    );
  }

  const zone = await db.deliveryZone.create({
    data: {
      name,
      baseFee: baseFee ?? 50,
      perKmFee: perKmFee ?? 15,
      freeAbove: freeAbove || null,
      maxRadiusKm: maxRadiusKm ?? 10,
      restaurantId: id,
    },
  });

  return NextResponse.json(zone, { status: 201 });
}
