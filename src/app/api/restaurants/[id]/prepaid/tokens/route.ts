import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/restaurants/[id]/prepaid/tokens
 * List prepaid tokens for a restaurant with optional status filter and pagination.
 * Query params: status=ACTIVE|USED|EXPIRED, limit=50, offset=0
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Verify restaurant exists
    const restaurant = await db.restaurant.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 },
      );
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "50", 10),
      100,
    );
    const offset = Math.max(
      parseInt(searchParams.get("offset") || "0", 10),
      0,
    );

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
    console.error("[prepaid tokens GET]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
