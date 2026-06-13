import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOwnerOrStaffBilling } from "@/lib/access-control";

type Params = { params: Promise<{ id: string; checkInId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id: restaurantId, checkInId } = await params;
  if (!(await requireOwnerOrStaffBilling(req, restaurantId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Ensure the check-in belongs to this restaurant before mutating it.
  const existing = await db.guestCheckIn.findFirst({
    where: { id: checkInId, restaurantId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Check-in not found" }, { status: 404 });
  }

  const body = await req.json();
  const allowedFields = [
    "guestName", "phone", "email", "idType", "idNumber", "idImageUrl",
    "address", "dob", "nationality", "roomNo", "adults", "children",
    "notes", "status", "checkOutAt",
  ];

  const data: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (body[key] !== undefined) data[key] = body[key];
  }

  // Auto-set checkOutAt when status changes to CHECKED_OUT
  if (data.status === "CHECKED_OUT" && !data.checkOutAt) {
    data.checkOutAt = new Date();
  }

  const updated = await db.guestCheckIn.update({
    where: { id: checkInId },
    data,
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { id: restaurantId, checkInId } = await params;
  if (!(await requireOwnerOrStaffBilling(req, restaurantId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Scope the delete to this restaurant so a foreign id can't be removed.
  const { count } = await db.guestCheckIn.deleteMany({
    where: { id: checkInId, restaurantId },
  });
  if (count === 0) {
    return NextResponse.json({ error: "Check-in not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
