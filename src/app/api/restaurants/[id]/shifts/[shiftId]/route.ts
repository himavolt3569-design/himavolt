import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { requireStaffForRestaurant } from "@/lib/staff-auth";
import { updateShiftSchema } from "@/lib/validations";

async function verifyAccess(req: NextRequest, restaurantId: string) {
  const user = await getAuthUser();
  if (user) {
    const restaurant = await db.restaurant.findFirst({
      where: { id: restaurantId, ownerId: user.id },
      select: { id: true },
    });
    if (restaurant) return { authorized: true };
  }

  const staff = await requireStaffForRestaurant(req, restaurantId);
  if (staff && ["MANAGER", "SUPER_ADMIN"].includes(staff.role)) {
    return { authorized: true };
  }

  return null;
}

// PATCH /api/restaurants/[id]/shifts/[shiftId] — Update a shift
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; shiftId: string }> },
) {
  const { id, shiftId } = await params;
  const access = await verifyAccess(req, id);
  if (!access) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await db.shift.findFirst({
    where: { id: shiftId, restaurantId: id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Shift not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateShiftSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.startTime !== undefined) updateData.startTime = parsed.data.startTime;
  if (parsed.data.endTime !== undefined) updateData.endTime = parsed.data.endTime;
  if (parsed.data.label !== undefined) updateData.label = parsed.data.label;
  if (parsed.data.actualEndTime !== undefined) {
    updateData.actualEndTime = new Date(parsed.data.actualEndTime);
  }

  const shift = await db.shift.update({
    where: { id: shiftId },
    data: updateData,
    include: {
      staff: {
        omit: { pin: true },
        include: { user: { select: { name: true, email: true } } },
      },
    },
  });

  return NextResponse.json(shift);
}

// DELETE /api/restaurants/[id]/shifts/[shiftId] — Delete a shift
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; shiftId: string }> },
) {
  const { id, shiftId } = await params;
  const access = await verifyAccess(req, id);
  if (!access) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await db.shift.findFirst({
    where: { id: shiftId, restaurantId: id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Shift not found" }, { status: 404 });
  }

  await db.shift.delete({ where: { id: shiftId } });
  return NextResponse.json({ deleted: true });
}
