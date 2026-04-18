import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOwnerOrStaffManager } from "@/lib/access-control";

type Params = { params: Promise<{ id: string }> };

// POST /api/restaurants/[id]/loyalty/rewards — create a reward
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const access = await requireOwnerOrStaffManager(req, id);
  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { name, description, pointsCost, imageUrl, sortOrder } = body;

  if (!name?.trim() || typeof pointsCost !== "number" || pointsCost <= 0) {
    return NextResponse.json(
      { error: "name and a positive pointsCost are required" },
      { status: 400 },
    );
  }

  const reward = await db.loyaltyReward.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      pointsCost,
      imageUrl: imageUrl?.trim() || null,
      sortOrder: sortOrder ?? 0,
      restaurantId: id,
    },
  });

  return NextResponse.json(reward, { status: 201 });
}
