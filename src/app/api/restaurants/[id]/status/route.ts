import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { getStaffSession } from "@/lib/staff-auth";

async function assertAccess(req: NextRequest, restaurantId: string) {
  // Staff belonging to the restaurant can update status
  const staff = await getStaffSession(req);
  if (staff?.restaurantId === restaurantId) return true;
  // Owner can also update
  const user = await getOrCreateUser();
  if (!user) return false;
  const r = await db.restaurant.findFirst({ where: { id: restaurantId, ownerId: user.id } });
  return !!r;
}

// GET /api/restaurants/[id]/status
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!(await assertAccess(req, id)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const restaurant = await db.restaurant.findUnique({
    where: { id },
    select: { isOpen: true, deliveryEnabled: true },
  });
  if (!restaurant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(restaurant);
}

// PATCH /api/restaurants/[id]/status
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!(await assertAccess(req, id)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.isOpen !== undefined) data.isOpen = Boolean(body.isOpen);
  if (body.deliveryEnabled !== undefined) data.deliveryEnabled = Boolean(body.deliveryEnabled);

  if (Object.keys(data).length === 0)
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });

  const restaurant = await db.restaurant.update({
    where: { id },
    data,
    select: { isOpen: true, deliveryEnabled: true },
  });

  return NextResponse.json(restaurant);
}
