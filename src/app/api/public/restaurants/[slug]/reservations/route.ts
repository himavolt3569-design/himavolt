import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * POST /api/public/restaurants/[slug]/reservations
 * Customer-facing: submit a reservation request. Starts in PENDING status.
 * Body: { guestName, phone, email?, partySize, date, timeSlot, tablePreference?, specialRequests? }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;

    const restaurant = await db.restaurant.findUnique({
      where: { slug },
      select: { id: true, type: true },
    });
    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
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

    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    const reservation = await db.reservation.create({
      data: {
        guestName: guestName.trim(),
        phone: phone.trim(),
        email: email?.trim() || null,
        partySize: typeof partySize === "number" ? partySize : 2,
        date: parsedDate,
        timeSlot,
        tablePreference: tablePreference?.trim() || null,
        specialRequests: specialRequests?.trim() || null,
        restaurantId: restaurant.id,
        status: "PENDING",
      },
    });

    return NextResponse.json(reservation, { status: 201 });
  } catch (err) {
    console.error("[public reservations POST]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/public/restaurants/[slug]/reservations/availability?date=YYYY-MM-DD
 * Would check available slots. For now returns a default slot grid and
 * already-booked slots for the date.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date");
    if (!dateStr) {
      return NextResponse.json(
        { error: "date query param is required" },
        { status: 400 },
      );
    }
    const restaurant = await db.restaurant.findUnique({
      where: { slug },
      select: { id: true, openingTime: true, closingTime: true, tableCount: true },
    });
    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const start = new Date(dateStr);
    const end = new Date(dateStr);
    end.setHours(23, 59, 59);

    const taken = await db.reservation.findMany({
      where: {
        restaurantId: restaurant.id,
        status: { in: ["PENDING", "CONFIRMED", "SEATED"] },
        date: { gte: start, lte: end },
      },
      select: { timeSlot: true, partySize: true },
    });

    const bookedSlots: Record<string, number> = {};
    for (const t of taken) {
      bookedSlots[t.timeSlot] = (bookedSlots[t.timeSlot] || 0) + 1;
    }

    return NextResponse.json({
      openingTime: restaurant.openingTime,
      closingTime: restaurant.closingTime,
      tableCount: restaurant.tableCount,
      bookedSlots,
    });
  } catch (err) {
    console.error("[public reservations GET]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
