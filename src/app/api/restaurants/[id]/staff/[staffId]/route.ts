import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; staffId: string }> }
) {
  const { id, staffId } = await params;
  const user = await getOrCreateUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const restaurant = await db.restaurant.findFirst({
    where: { id, ownerId: user.id },
  });
  if (!restaurant) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.role !== undefined) data.role = body.role;
  if (body.pin !== undefined) data.pin = body.pin;
  if (body.isActive !== undefined) data.isActive = body.isActive;

  const member = await db.staffMember.update({
    where: { id: staffId },
    data,
    include: { user: { select: { name: true, email: true, phone: true, imageUrl: true } } },
  });

  return NextResponse.json(member);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; staffId: string }> }
) {
  const { id, staffId } = await params;
  const user = await getOrCreateUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const restaurant = await db.restaurant.findFirst({
    where: { id, ownerId: user.id },
  });
  if (!restaurant) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.staffMember.delete({ where: { id: staffId } });
  return NextResponse.json({ deleted: true });
}
