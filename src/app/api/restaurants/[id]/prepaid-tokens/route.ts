import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { getStaffSession } from "@/lib/staff-auth";

/**
 * GET /api/restaurants/[id]/prepaid-tokens
 * List prepaid tokens (staff / owner view).
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
    const status = searchParams.get("status"); // ACTIVE, USED, EXPIRED
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);

    const where: Record<string, unknown> = { restaurantId: id };
    if (status && ["ACTIVE", "USED", "EXPIRED"].includes(status)) {
      where.status = status;
    }

    const [tokens, total] = await Promise.all([
      db.prepaidToken.findMany({
        where,
        include: {
          order: {
            select: { id: true, orderNo: true, total: true, status: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      db.prepaidToken.count({ where }),
    ]);

    return NextResponse.json({ tokens, total, limit, offset });
  } catch (err) {
    console.error("[prepaid-tokens GET]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/restaurants/[id]/prepaid-tokens
 * Generate a new prepaid token after payment verification.
 * Body: { amount: number, orderId?: string }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Auth: owner or any staff member
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

    // Verify restaurant has prepaid enabled
    const restaurant = await db.restaurant.findUnique({
      where: { id },
      select: { prepaidEnabled: true },
    });
    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }
    if (!restaurant.prepaidEnabled) {
      return NextResponse.json(
        { error: "Prepaid mode is not enabled for this restaurant" },
        { status: 400 },
      );
    }

    const body = await req.json();
    const { amount, orderId } = body;

    if (typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { error: "A valid positive amount is required" },
        { status: 400 },
      );
    }

    // Create the token
    const token = await db.prepaidToken.create({
      data: {
        amount,
        restaurantId: id,
      },
    });

    // If an orderId is provided, link the token to the order
    if (orderId && typeof orderId === "string") {
      const order = await db.order.findFirst({
        where: { id: orderId, restaurantId: id },
      });
      if (order) {
        await db.order.update({
          where: { id: orderId },
          data: {
            isPrepaid: true,
            prepaidTokenId: token.id,
          },
        });
      }
    }

    return NextResponse.json(token, { status: 201 });
  } catch (err) {
    console.error("[prepaid-tokens POST]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
