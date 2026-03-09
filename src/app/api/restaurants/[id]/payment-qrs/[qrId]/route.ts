import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { updatePaymentQRSchema } from "@/lib/validations";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; qrId: string }> },
) {
  const { id, qrId } = await params;
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

  const body = await req.json();
  const parsed = updatePaymentQRSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const existing = await db.paymentQR.findFirst({
    where: { id: qrId, restaurantId: id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Payment QR not found" }, { status: 404 });
  }

  const updated = await db.paymentQR.update({
    where: { id: qrId },
    data: parsed.data,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; qrId: string }> },
) {
  const { id, qrId } = await params;
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

  const existing = await db.paymentQR.findFirst({
    where: { id: qrId, restaurantId: id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Payment QR not found" }, { status: 404 });
  }

  await db.paymentQR.delete({ where: { id: qrId } });

  return NextResponse.json({ success: true });
}
