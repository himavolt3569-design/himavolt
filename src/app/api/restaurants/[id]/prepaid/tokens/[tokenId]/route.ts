import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string; tokenId: string }> };

/**
 * PATCH /api/restaurants/[id]/prepaid/tokens/[tokenId]
 * Mark a prepaid token as USED or EXPIRED.
 * Body: { status: "USED" | "EXPIRED" }
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id, tokenId } = await params;

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

    // Find the token scoped to this restaurant
    const token = await db.prepaidToken.findFirst({
      where: { id: tokenId, restaurantId: id },
    });
    if (!token) {
      return NextResponse.json(
        { error: "Token not found" },
        { status: 404 },
      );
    }

    // Only ACTIVE tokens can be transitioned
    if (token.status !== "ACTIVE") {
      return NextResponse.json(
        { error: `Token is already ${token.status.toLowerCase()}` },
        { status: 400 },
      );
    }

    const body = await req.json();
    const newStatus = body.status;

    if (!newStatus || !["USED", "EXPIRED"].includes(newStatus)) {
      return NextResponse.json(
        { error: "Status must be USED or EXPIRED" },
        { status: 400 },
      );
    }

    const updated = await db.prepaidToken.update({
      where: { id: tokenId },
      data: {
        status: newStatus,
        usedAt: newStatus === "USED" ? new Date() : undefined,
      },
      include: {
        order: {
          select: { id: true, orderNo: true, total: true, status: true },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[prepaid token PATCH]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
