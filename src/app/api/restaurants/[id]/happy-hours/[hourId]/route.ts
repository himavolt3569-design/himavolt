import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOwnerOrStaffManager } from "@/lib/access-control";

type Params = { params: Promise<{ id: string; hourId: string }> };

// PATCH /api/restaurants/[id]/happy-hours/[hourId] — update a happy hour
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id, hourId } = await params;
  const access = await requireOwnerOrStaffManager(req, id);
  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await db.happyHour.findFirst({
    where: { id: hourId, restaurantId: id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const {
    name,
    days,
    startTime,
    endTime,
    discountType,
    discountValue,
    isActive,
    appliesToAll,
    itemIds,
  } = body;

  const updated = await db.happyHour.update({
    where: { id: hourId },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(days !== undefined && { days: Array.isArray(days) ? days : [] }),
      ...(startTime !== undefined && { startTime }),
      ...(endTime !== undefined && { endTime }),
      ...(discountType !== undefined && { discountType }),
      ...(discountValue !== undefined && { discountValue }),
      ...(isActive !== undefined && { isActive }),
      ...(appliesToAll !== undefined && { appliesToAll }),
    },
  });

  if (Array.isArray(itemIds)) {
    await db.happyHourItem.deleteMany({ where: { happyHourId: hourId } });
    if (itemIds.length > 0) {
      await db.happyHourItem.createMany({
        data: itemIds.map((menuItemId: string) => ({
          happyHourId: hourId,
          menuItemId,
        })),
      });
    }
  }

  const full = await db.happyHour.findUnique({
    where: { id: hourId },
    include: { items: true },
  });

  return NextResponse.json(full);
}

// DELETE /api/restaurants/[id]/happy-hours/[hourId]
export async function DELETE(req: NextRequest, { params }: Params) {
  const { id, hourId } = await params;
  const access = await requireOwnerOrStaffManager(req, id);
  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await db.happyHour.findFirst({
    where: { id: hourId, restaurantId: id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.happyHour.delete({ where: { id: hourId } });
  return NextResponse.json({ success: true });
}

// PUT not used; keep PATCH semantics
export const dynamic = "force-dynamic";
