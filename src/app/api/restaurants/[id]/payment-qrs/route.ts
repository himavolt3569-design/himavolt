import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { createPaymentQRSchema } from "@/lib/validations";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const qrs = await db.paymentQR.findMany({
    where: { restaurantId: id },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json(qrs);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
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
  const parsed = createPaymentQRSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const maxSort = await db.paymentQR.aggregate({
    where: { restaurantId: id },
    _max: { sortOrder: true },
  });

  const qr = await db.paymentQR.create({
    data: {
      label: parsed.data.label,
      imageUrl: parsed.data.imageUrl,
      sortOrder: parsed.data.sortOrder ?? (maxSort._max.sortOrder ?? 0) + 1,
      restaurantId: id,
    },
  });

  return NextResponse.json(qr, { status: 201 });
}
