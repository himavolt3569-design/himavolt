import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOwnerOrStaffManager } from "@/lib/access-control";

type Params = { params: Promise<{ id: string; rewardId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id, rewardId } = await params;
  const access = await requireOwnerOrStaffManager(req, id);
  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await db.loyaltyReward.findFirst({
    where: { id: rewardId, restaurantId: id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const { name, description, pointsCost, active, imageUrl, sortOrder } = body;

  const updated = await db.loyaltyReward.update({
    where: { id: rewardId },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(description !== undefined && {
        description: description?.trim() || null,
      }),
      ...(pointsCost !== undefined && { pointsCost }),
      ...(active !== undefined && { active }),
      ...(imageUrl !== undefined && { imageUrl: imageUrl?.trim() || null }),
      ...(sortOrder !== undefined && { sortOrder }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { id, rewardId } = await params;
  const access = await requireOwnerOrStaffManager(req, id);
  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await db.loyaltyReward.findFirst({
    where: { id: rewardId, restaurantId: id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.loyaltyReward.delete({ where: { id: rewardId } });
  return NextResponse.json({ success: true });
}
