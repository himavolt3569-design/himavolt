import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getOrCreateUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const restaurant = await db.restaurant.findFirst({
    where: { id, ownerId: user.id },
    include: {
      staff: { include: { user: true } },
      categories: { orderBy: { sortOrder: "asc" } },
      _count: { select: { orders: true, menuItems: true } },
    },
  });

  if (!restaurant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(restaurant);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getOrCreateUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await db.restaurant.findFirst({
    where: { id, ownerId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const allowedFields = [
    "name", "phone", "countryCode", "type", "address", "city",
    "imageUrl", "coverUrl", "isActive", "tableCount", "openingTime", "closingTime",
    "wifiName", "wifiPassword",
    "counterPayEnabled", "directPayEnabled", "prepaidEnabled",
    "taxEnabled", "taxRate",
  ];

  const data: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (body[key] !== undefined) data[key] = body[key];
  }

  const restaurant = await db.restaurant.update({
    where: { id },
    data,
  });

  return NextResponse.json(restaurant);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getOrCreateUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await db.restaurant.findFirst({
    where: { id, ownerId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.restaurant.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
