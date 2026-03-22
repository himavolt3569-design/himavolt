import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { getStaffSession } from "@/lib/staff-auth";

/**
 * GET /api/restaurants/[id]/prepaid-config
 * Get prepaid / counter-pay / direct-pay configuration.
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

    const restaurant = await db.restaurant.findUnique({
      where: { id },
      select: {
        prepaidEnabled: true,
        counterPayEnabled: true,
        directPayEnabled: true,
      },
    });

    if (!restaurant) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(restaurant);
  } catch (err) {
    console.error("[prepaid-config GET]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/restaurants/[id]/prepaid-config
 * Update prepaid / counter-pay / direct-pay settings.
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
    const updateData: Record<string, unknown> = {};

    if (typeof body.prepaidEnabled === "boolean") {
      updateData.prepaidEnabled = body.prepaidEnabled;
    }
    if (typeof body.counterPayEnabled === "boolean") {
      updateData.counterPayEnabled = body.counterPayEnabled;
    }
    if (typeof body.directPayEnabled === "boolean") {
      updateData.directPayEnabled = body.directPayEnabled;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 },
      );
    }

    const updated = await db.restaurant.update({
      where: { id },
      data: updateData,
      select: {
        prepaidEnabled: true,
        counterPayEnabled: true,
        directPayEnabled: true,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[prepaid-config POST]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
