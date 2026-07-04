import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { requireStaffForRestaurant } from "@/lib/staff-auth";

type Params = { params: Promise<{ id: string; itemId: string }> };

/** Set or update a timed offer on a menu item */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id, itemId } = await params;

  // Allow both owner and staff
  const user = await getOrCreateUser();
  const staff = await requireStaffForRestaurant(req, id);

  if (!user && !staff) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify ownership or staff membership
  if (user && !staff) {
    const restaurant = await db.restaurant.findFirst({
      where: { id, ownerId: user.id },
    });
    if (!restaurant) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const body = await req.json();
  const { discount, discountLabel, durationMinutes } = body;

  if (typeof discount !== "number" || discount < 0 || discount > 100) {
    return NextResponse.json(
      { error: "Discount must be between 0 and 100" },
      { status: 400 }
    );
  }

  if (typeof durationMinutes !== "number" || durationMinutes <= 0) {
    return NextResponse.json(
      { error: "Duration must be a positive number" },
      { status: 400 }
    );
  }

  // Scope the item to THIS restaurant — menu item ids are public, so guard against
  // setting an offer on another restaurant's item (cross-tenant IDOR).
  const owned = await db.menuItem.findFirst({
    where: { id: itemId, restaurantId: id },
    select: { id: true },
  });
  if (!owned) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + durationMinutes * 60 * 1000);

  const item = await db.menuItem.update({
    where: { id: itemId },
    data: {
      discount,
      discountLabel: discountLabel || `${discount}% OFF`,
      offerStartedAt: now,
      offerExpiresAt: expiresAt,
    },
  });

  return NextResponse.json(item);
}

/** Clear the offer on a menu item */
export async function DELETE(req: NextRequest, { params }: Params) {
  const { id, itemId } = await params;

  const user = await getOrCreateUser();
  const staff = await requireStaffForRestaurant(req, id);

  if (!user && !staff) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user && !staff) {
    const restaurant = await db.restaurant.findFirst({
      where: { id, ownerId: user.id },
    });
    if (!restaurant) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Scope the item to THIS restaurant before clearing its offer (cross-tenant IDOR).
  const owned = await db.menuItem.findFirst({
    where: { id: itemId, restaurantId: id },
    select: { id: true },
  });
  if (!owned) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const item = await db.menuItem.update({
    where: { id: itemId },
    data: {
      discount: 0,
      discountLabel: null,
      offerStartedAt: null,
      offerExpiresAt: null,
    },
  });

  return NextResponse.json(item);
}
