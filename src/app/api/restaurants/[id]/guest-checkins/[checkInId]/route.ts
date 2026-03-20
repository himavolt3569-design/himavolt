import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { getStaffSession } from "@/lib/staff-auth";

type Params = { params: Promise<{ id: string; checkInId: string }> };

async function canAccess(req: NextRequest, restaurantId: string) {
  const staffSession = await getStaffSession(req);
  if (staffSession && staffSession.restaurantId === restaurantId) return true;
  const user = await getOrCreateUser();
  if (!user) return false;
  const rest = await db.restaurant.findFirst({ where: { id: restaurantId, ownerId: user.id } });
  return !!rest;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id: restaurantId, checkInId } = await params;
  if (!(await canAccess(req, restaurantId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
  if (!(await canAccess(req, restaurantId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await db.guestCheckIn.delete({ where: { id: checkInId } });
  return NextResponse.json({ success: true });
}
