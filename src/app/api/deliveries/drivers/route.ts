import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";

// GET /api/deliveries/drivers — List delivery drivers
export async function GET(req: NextRequest) {
  const user = await getOrCreateUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const onlineOnly = searchParams.get("online") === "true";

  const where: Record<string, unknown> = { isActive: true };
  if (onlineOnly) where.isOnline = true;

  const drivers = await db.deliveryDriver.findMany({
    where,
    orderBy: [{ isOnline: "desc" }, { rating: "desc" }],
  });

  return NextResponse.json({ drivers });
}

// POST /api/deliveries/drivers — Register a new driver
export async function POST(req: NextRequest) {
  const user = await getOrCreateUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, phone, email, vehicleType, vehicleNo, licenseNo, imageUrl } =
    body;

  if (!name || !phone) {
    return NextResponse.json(
      { error: "Name and phone are required" },
      { status: 400 },
    );
  }

  // Check if driver with this phone already exists
  const existing = await db.deliveryDriver.findUnique({ where: { phone } });
  if (existing) {
    return NextResponse.json(
      { error: "Driver with this phone already exists" },
      { status: 409 },
    );
  }

  const driver = await db.deliveryDriver.create({
    data: {
      name,
      phone,
      email: email || null,
      vehicleType: vehicleType || "BIKE",
      vehicleNo: vehicleNo || null,
      licenseNo: licenseNo || null,
      imageUrl: imageUrl || null,
    },
  });

  return NextResponse.json(driver, { status: 201 });
}
