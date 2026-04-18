import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/public/restaurants/[slug]/coupons
 * List active, non-expired, non-exhausted coupons for customer discovery.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;

    const restaurant = await db.restaurant.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const now = new Date();
    const coupons = await db.coupon.findMany({
      where: {
        restaurantId: restaurant.id,
        isActive: true,
        startsAt: { lte: now },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: {
        id: true,
        code: true,
        description: true,
        type: true,
        value: true,
        minOrder: true,
        maxDiscount: true,
        maxUses: true,
        usedCount: true,
        expiresAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const available = coupons.filter(
      (c) => c.maxUses === null || c.usedCount < c.maxUses,
    );

    return NextResponse.json({ coupons: available });
  } catch (err) {
    console.error("[public coupons GET]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
