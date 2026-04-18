import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getRestaurantAccess } from "@/lib/access-control";

type Params = { params: Promise<{ id: string }> };

// GET /api/restaurants/[id]/reservations — list reservations (staff/owner view)
export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const access = await getRestaurantAccess(req, id);
  if (!access) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const fromDate = searchParams.get("from");

  const where: Record<string, unknown> = { restaurantId: id };
  if (status) where.status = status;
  if (fromDate) where.date = { gte: new Date(fromDate) };

  const reservations = await db.reservation.findMany({
    where,
    orderBy: [{ date: "asc" }, { timeSlot: "asc" }],
    take: 200,
  });

  return NextResponse.json({ reservations });
}

// POST /api/restaurants/[id]/reservations — create (staff can manually book for walk-ins/phone)
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const access = await getRestaurantAccess(req, id);
  if (!access) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    guestName,
    phone,
    email,
    partySize,
    date,
    timeSlot,
    tablePreference,
    specialRequests,
  } = body;

  if (!guestName?.trim() || !phone?.trim() || !date || !timeSlot) {
    return NextResponse.json(
      { error: "guestName, phone, date, and timeSlot are required" },
      { status: 400 },
    );
  }

  const reservation = await db.reservation.create({
    data: {
      guestName: guestName.trim(),
      phone: phone.trim(),
      email: email?.trim() || null,
      partySize: typeof partySize === "number" ? partySize : 2,
      date: new Date(date),
      timeSlot,
      tablePreference: tablePreference?.trim() || null,
      specialRequests: specialRequests?.trim() || null,
      restaurantId: id,
      status: "CONFIRMED", // staff-created reservations default to confirmed
    },
  });

  return NextResponse.json(reservation, { status: 201 });
}
