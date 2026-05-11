import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rateLimit, clientKey } from "@/lib/rate-limit";

/**
 * POST /api/public/restaurants/[slug]/coupons/validate
 * Validate a coupon code for an order. The server recomputes the subtotal
 * from the menu — clients can no longer claim an inflated `orderTotal` to
 * pretend they qualify for a coupon they don't.
 *
 * Body: { code: string, items: { menuItemId: string, quantity: number }[] }
 *   (legacy `orderTotal` numeric is accepted as a fallback but ignored when
 *    `items` is present.)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const rl = await rateLimit(clientKey(req, "coupon:validate"), 15 * 60_000, 20);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many coupon attempts. Please wait." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
      );
    }

    const { slug: encodedSlug } = await params;
    const slug = decodeURIComponent(encodedSlug);

    const restaurant = await db.restaurant.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 },
      );
    }

    const body = await req.json();
    const { code, items } = body as {
      code?: unknown;
      items?: unknown;
    };

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { error: "Coupon code is required" },
        { status: 400 },
      );
    }

    // Recompute the subtotal from the menu. Any item without a valid
    // menuItemId or any unknown id is rejected — we won't trust client prices.
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "items[] is required to validate a coupon" },
        { status: 400 },
      );
    }
    type Line = { menuItemId: string; quantity: number };
    const lines: Line[] = [];
    for (const raw of items as unknown[]) {
      if (!raw || typeof raw !== "object") continue;
      const r = raw as Record<string, unknown>;
      if (typeof r.menuItemId !== "string") continue;
      if (
        typeof r.quantity !== "number" ||
        !Number.isInteger(r.quantity) ||
        r.quantity <= 0
      )
        continue;
      lines.push({
        menuItemId: r.menuItemId,
        quantity: Math.min(r.quantity, 99),
      });
    }
    if (lines.length === 0) {
      return NextResponse.json(
        { error: "items[] must contain {menuItemId, quantity}" },
        { status: 400 },
      );
    }

    const ids = Array.from(new Set(lines.map((l) => l.menuItemId)));
    const menu = await db.menuItem.findMany({
      where: { id: { in: ids }, restaurantId: restaurant.id },
      select: { id: true, price: true, discount: true },
    });
    const priceMap = new Map(
      menu.map((m) => [
        m.id,
        m.discount > 0
          ? Math.round(m.price * (1 - m.discount / 100) * 100) / 100
          : m.price,
      ]),
    );
    let subtotal = 0;
    for (const line of lines) {
      const p = priceMap.get(line.menuItemId);
      if (p === undefined) {
        return NextResponse.json(
          {
            error: `Menu item ${line.menuItemId} not found in this restaurant`,
          },
          { status: 400 },
        );
      }
      subtotal += p * line.quantity;
    }
    subtotal = Math.round(subtotal * 100) / 100;

    const coupon = await db.coupon.findUnique({
      where: {
        restaurantId_code: {
          restaurantId: restaurant.id,
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

    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      return NextResponse.json(
        { error: "This coupon has reached its usage limit" },
        { status: 400 },
      );
    }

    if (subtotal < coupon.minOrder) {
      return NextResponse.json(
        {
          error: `Minimum order of ${coupon.minOrder} required for this coupon`,
        },
        { status: 400 },
      );
    }

    let discount: number;
    if (coupon.type === "PERCENTAGE") {
      discount = Math.round(((subtotal * coupon.value) / 100) * 100) / 100;
      // Apply max discount cap if set
      if (coupon.maxDiscount !== null && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    } else {
      discount = coupon.value;
    }

    // Discount should never exceed the (server-computed) subtotal
    if (discount > subtotal) {
      discount = subtotal;
    }

    return NextResponse.json({
      valid: true,
      couponId: coupon.id,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      subtotal,
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
