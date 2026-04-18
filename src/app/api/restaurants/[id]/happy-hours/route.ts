import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getRestaurantAccess,
  requireOwnerOrStaffManager,
} from "@/lib/access-control";

type Params = { params: Promise<{ id: string }> };

// GET /api/restaurants/[id]/happy-hours — list all configured happy hours
export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const access = await getRestaurantAccess(req, id);
  if (!access) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const happyHours = await db.happyHour.findMany({
    where: { restaurantId: id },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ happyHours });
}

// POST /api/restaurants/[id]/happy-hours — create a happy hour slot
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const access = await requireOwnerOrStaffManager(req, id);
  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const {
    name,
    days,
    startTime,
    endTime,
    discountType,
    discountValue,
    appliesToAll,
    itemIds,
  } = body;

  if (!name?.trim() || !startTime || !endTime) {
    return NextResponse.json(
      { error: "name, startTime, and endTime are required" },
      { status: 400 },
    );
  }

  const happyHour = await db.happyHour.create({
    data: {
      name: name.trim(),
      days: Array.isArray(days) ? days : [],
      startTime,
      endTime,
      discountType: discountType || "PERCENTAGE",
      discountValue: typeof discountValue === "number" ? discountValue : 0,
      appliesToAll: !!appliesToAll,
      restaurantId: id,
      items:
        Array.isArray(itemIds) && itemIds.length > 0
          ? {
              create: itemIds.map((menuItemId: string) => ({ menuItemId })),
            }
          : undefined,
    },
    include: { items: true },
  });

  return NextResponse.json(happyHour, { status: 201 });
}
