import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";

/**
 * GET /api/me/loyalty
 * Return all loyalty accounts the logged-in customer has across restaurants.
 */
export async function GET() {
  try {
    const user = await getOrCreateUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accounts = await db.loyaltyAccount.findMany({
      where: { userId: user.id },
      orderBy: { points: "desc" },
      include: {
        restaurant: {
          select: {
            id: true,
            slug: true,
            name: true,
            imageUrl: true,
            currency: true,
            type: true,
          },
        },
      },
    });

    return NextResponse.json({ accounts });
  } catch (err) {
    console.error("[me loyalty list GET]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
