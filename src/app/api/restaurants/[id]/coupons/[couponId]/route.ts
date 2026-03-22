import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { getStaffSession } from "@/lib/staff-auth";

type Params = { params: Promise<{ id: string; couponId: string }> };

/**
 * Verify the caller is either the restaurant owner or a MANAGER+ staff member.
 * Returns { authorized: true } or a NextResponse error.
 */
async function authorizeManagerOrOwner(req: NextRequest, restaurantId: string) {
  const staff = await getStaffSession(req);
  if (staff && staff.restaurantId === restaurantId) {
    const managerRoles = ["SUPER_ADMIN", "MANAGER"];
    if (!managerRoles.includes(staff.role)) {
      return { authorized: false as const, response: NextResponse.json({ error: "Insufficient permissions" }, { status: 403 }) };
    }
    return { authorized: true as const };
  }

  const user = await getOrCreateUser();
  if (!user) {
    return { authorized: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const restaurant = await db.restaurant.findFirst({
    where: { id: restaurantId, ownerId: user.id },
  });
  if (!restaurant) {
    return { authorized: false as const, response: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }
  return { authorized: true as const };
}

/**
 * PATCH /api/restaurants/[id]/coupons/[couponId]
 * Update a coupon (toggle active, edit fields).
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id, couponId } = await params;
    const auth = await authorizeManagerOrOwner(req, id);
    if (!auth.authorized) return auth.response;

    const coupon = await db.coupon.findFirst({
      where: { id: couponId, restaurantId: id },
    });
    if (!coupon) {
      return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
    }

    const body = await req.json();
    const updateData: Record<string, unknown> = {};

    if (typeof body.isActive === "boolean") updateData.isActive = body.isActive;
    if (typeof body.description === "string") updateData.description = body.description || null;
    if (typeof body.value === "number" && body.value > 0) updateData.value = body.value;
    if (typeof body.type === "string" && ["PERCENTAGE", "FIXED"].includes(body.type)) updateData.type = body.type;
    if (typeof body.minOrder === "number") updateData.minOrder = body.minOrder;
    if (body.maxDiscount !== undefined) updateData.maxDiscount = typeof body.maxDiscount === "number" ? body.maxDiscount : null;
    if (body.maxUses !== undefined) updateData.maxUses = typeof body.maxUses === "number" ? body.maxUses : null;
    if (body.startsAt !== undefined) updateData.startsAt = body.startsAt ? new Date(body.startsAt) : new Date();
    if (body.expiresAt !== undefined) updateData.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;

    if (body.code && typeof body.code === "string") {
      const normalizedCode = body.code.trim().toUpperCase();
      if (normalizedCode !== coupon.code) {
        const duplicate = await db.coupon.findUnique({
          where: { restaurantId_code: { restaurantId: id, code: normalizedCode } },
        });
        if (duplicate) {
          return NextResponse.json({ error: "A coupon with this code already exists" }, { status: 409 });
        }
        updateData.code = normalizedCode;
      }
    }

    // Validate percentage cap
    const finalType = (updateData.type as string) ?? coupon.type;
    const finalValue = (updateData.value as number) ?? coupon.value;
    if (finalType === "PERCENTAGE" && finalValue > 100) {
      return NextResponse.json({ error: "Percentage value cannot exceed 100" }, { status: 400 });
    }

    const updated = await db.coupon.update({
      where: { id: couponId },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[coupon PATCH]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/restaurants/[id]/coupons/[couponId]
 * Delete a coupon.
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { id, couponId } = await params;
    const auth = await authorizeManagerOrOwner(req, id);
    if (!auth.authorized) return auth.response;

    const coupon = await db.coupon.findFirst({
      where: { id: couponId, restaurantId: id },
    });
    if (!coupon) {
      return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
    }

    await db.coupon.delete({ where: { id: couponId } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[coupon DELETE]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
