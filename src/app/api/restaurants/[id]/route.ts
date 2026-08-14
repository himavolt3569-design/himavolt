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
      staff: { omit: { pin: true }, include: { user: true } },
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
    // Coordinates were captured at signup and then frozen forever — a venue that
    // moved, or was pinned slightly wrong, had no way to correct it. They matter
    // now that proximity search and delivery pricing both derive from them.
    "latitude", "longitude",
    "imageUrl", "coverUrl", "isActive", "tableCount", "openingTime", "closingTime",
    "wifiName", "wifiPassword",
    "counterPayEnabled", "directPayEnabled", "prepaidEnabled",
    "taxEnabled", "taxRate",
    "hotelAdvanceType", "hotelAdvanceValue",
    "roomServiceEnabled", "roomServiceCharge",
  ];

  const data: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (body[key] !== undefined) data[key] = body[key];
  }

  // Coordinates drive delivery radius checks and fee calculation, so a malformed
  // pair must be rejected rather than stored and silently mis-pricing orders.
  for (const [key, min, max] of [
    ["latitude", -90, 90],
    ["longitude", -180, 180],
  ] as const) {
    if (data[key] === undefined) continue;
    const n = Number(data[key]);
    if (!Number.isFinite(n) || n < min || n > max) {
      return NextResponse.json(
        { error: `Invalid ${key}` },
        { status: 400 },
      );
    }
    data[key] = n;
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
