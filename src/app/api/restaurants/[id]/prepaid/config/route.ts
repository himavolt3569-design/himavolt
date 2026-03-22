import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/restaurants/[id]/prepaid/config
 * Get the prepaidEnabled flag for a restaurant.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const restaurant = await db.restaurant.findUnique({
      where: { id },
      select: { id: true, prepaidEnabled: true },
    });

    if (!restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      prepaidEnabled: restaurant.prepaidEnabled,
    });
  } catch (err) {
    console.error("[prepaid config GET]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/restaurants/[id]/prepaid/config
 * Toggle prepaidEnabled on the restaurant.
 * Body: { prepaidEnabled: boolean }
 */
export async function PATCH(
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

    const body = await req.json();

    if (typeof body.prepaidEnabled !== "boolean") {
      return NextResponse.json(
        { error: "prepaidEnabled must be a boolean" },
        { status: 400 },
      );
    }

    const updated = await db.restaurant.update({
      where: { id },
      data: { prepaidEnabled: body.prepaidEnabled },
      select: { id: true, prepaidEnabled: true },
    });

    return NextResponse.json({
      prepaidEnabled: updated.prepaidEnabled,
    });
  } catch (err) {
    console.error("[prepaid config PATCH]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
