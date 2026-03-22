import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { getStaffSession } from "@/lib/staff-auth";

/**
 * GET /api/restaurants/[id]/coupons
 * List all coupons for a restaurant (owner or staff auth).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Accept staff JWT or owner session
    const staff = await getStaffSession(req);
    if (!staff || staff.restaurantId !== id) {
      const user = await getOrCreateUser();
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const restaurant = await db.restaurant.findFirst({
        where: { id, ownerId: user.id },
      });
      if (!restaurant) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
    }

    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get("active") === "1";

    const where: Record<string, unknown> = { restaurantId: id };
    if (activeOnly) where.isActive = true;

    const coupons = await db.coupon.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(coupons);
  } catch (err) {
    console.error("[coupons GET]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/restaurants/[id]/coupons
 * Create a new coupon (owner or MANAGER+ staff).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Auth: owner or MANAGER+ staff
    let isAuthorized = false;
    const staff = await getStaffSession(req);
    if (staff && staff.restaurantId === id) {
      const managerRoles = ["SUPER_ADMIN", "MANAGER"];
      if (!managerRoles.includes(staff.role)) {
        return NextResponse.json(
          { error: "Insufficient permissions" },
          { status: 403 },
        );
      }
      isAuthorized = true;
    }

    if (!isAuthorized) {
      const user = await getOrCreateUser();
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const restaurant = await db.restaurant.findFirst({
        where: { id, ownerId: user.id },
      });
      if (!restaurant) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
    }

    const body = await req.json();
    const { code, description, type, value, minOrder, maxDiscount, maxUses, startsAt, expiresAt } = body;

    // Validation
    if (!code || typeof code !== "string" || code.trim().length === 0) {
      return NextResponse.json({ error: "Coupon code is required" }, { status: 400 });
    }
    if (!type || !["PERCENTAGE", "FIXED"].includes(type)) {
      return NextResponse.json({ error: "Type must be PERCENTAGE or FIXED" }, { status: 400 });
    }
    if (typeof value !== "number" || value <= 0) {
      return NextResponse.json({ error: "Value must be a positive number" }, { status: 400 });
    }
    if (type === "PERCENTAGE" && value > 100) {
      return NextResponse.json({ error: "Percentage value cannot exceed 100" }, { status: 400 });
    }

    // Check for duplicate code within the restaurant
    const existing = await db.coupon.findUnique({
      where: { restaurantId_code: { restaurantId: id, code: code.trim().toUpperCase() } },
    });
    if (existing) {
      return NextResponse.json({ error: "A coupon with this code already exists" }, { status: 409 });
    }

    const coupon = await db.coupon.create({
      data: {
        code: code.trim().toUpperCase(),
        description: description || null,
        type,
        value,
        minOrder: typeof minOrder === "number" ? minOrder : 0,
        maxDiscount: typeof maxDiscount === "number" ? maxDiscount : null,
        maxUses: typeof maxUses === "number" ? maxUses : null,
        startsAt: startsAt ? new Date(startsAt) : new Date(),
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        restaurantId: id,
      },
    });

    return NextResponse.json(coupon, { status: 201 });
  } catch (err) {
    console.error("[coupons POST]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
