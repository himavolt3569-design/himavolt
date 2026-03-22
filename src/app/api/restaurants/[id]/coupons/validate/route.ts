import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * POST /api/restaurants/[id]/coupons/validate
 * Validate a coupon code for a given order total.
 * Body: { code: string, orderTotal: number }
 * Returns the calculated discount amount or an error message.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const body = await req.json();
    const { code, orderTotal } = body;

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { error: "Coupon code is required" },
        { status: 400 },
      );
    }
    if (typeof orderTotal !== "number" || orderTotal <= 0) {
      return NextResponse.json(
        { error: "A valid order total is required" },
        { status: 400 },
      );
    }

    const coupon = await db.coupon.findUnique({
      where: {
        restaurantId_code: {
          restaurantId: id,
          code: code.trim().toUpperCase(),
        },
      },
    });

    if (!coupon) {
      return NextResponse.json(
        { error: "Invalid coupon code" },
        { status: 404 },
      );
    }

    // Check if coupon is active
    if (!coupon.isActive) {
      return NextResponse.json(
        { error: "This coupon is no longer active" },
        { status: 400 },
      );
    }

    // Check date validity
    const now = new Date();
    if (coupon.startsAt && now < coupon.startsAt) {
      return NextResponse.json(
        { error: "This coupon is not yet valid" },
        { status: 400 },
      );
    }
    if (coupon.expiresAt && now > coupon.expiresAt) {
      return NextResponse.json(
        { error: "This coupon has expired" },
        { status: 400 },
      );
    }

    // Check usage limit
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      return NextResponse.json(
        { error: "This coupon has reached its usage limit" },
        { status: 400 },
      );
    }

    // Check minimum order
    if (orderTotal < coupon.minOrder) {
      return NextResponse.json(
        { error: `Minimum order of ${coupon.minOrder} required for this coupon` },
        { status: 400 },
      );
    }

    // Calculate discount
    let discount: number;
    if (coupon.type === "PERCENTAGE") {
      discount = Math.round((orderTotal * coupon.value) / 100 * 100) / 100;
      // Apply max discount cap if set
      if (coupon.maxDiscount !== null && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    } else {
      // FIXED
      discount = coupon.value;
    }

    // Discount should never exceed order total
    if (discount > orderTotal) {
      discount = orderTotal;
    }

    return NextResponse.json({
      valid: true,
      couponId: coupon.id,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      discount,
      description: coupon.description,
    });
  } catch (err) {
    console.error("[coupon validate POST]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
