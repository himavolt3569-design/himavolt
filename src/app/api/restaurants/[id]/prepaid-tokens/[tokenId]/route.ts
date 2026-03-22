import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { getStaffSession } from "@/lib/staff-auth";

type Params = { params: Promise<{ id: string; tokenId: string }> };

/**
 * PATCH /api/restaurants/[id]/prepaid-tokens/[tokenId]
 * Mark a prepaid token as USED (staff verifies at counter).
 * Body: { status: "USED" | "EXPIRED" }
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id, tokenId } = await params;

    // Auth: owner or any staff member for this restaurant
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

    const token = await db.prepaidToken.findFirst({
      where: { id: tokenId, restaurantId: id },
    });
    if (!token) {
      return NextResponse.json({ error: "Token not found" }, { status: 404 });
    }

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
    console.error("[prepaid-token PATCH]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
