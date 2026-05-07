import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { rateLimit, clientKey } from "@/lib/rate-limit";

const reservationSchema = z.object({
  guestName: z.string().trim().min(1).max(60),
  // 10-digit phone matching the rest of the codebase.
  phone: z
    .string()
    .trim()
    .length(10, "Phone must be exactly 10 digits")
    .regex(/^\d{10}$/),
  email: z.string().email().max(120).optional().nullable(),
  partySize: z.number().int().min(1).max(50),
  // YYYY-MM-DD; must be today or later.
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  // HH:MM on 30-minute boundaries — same shape as the published TIME_SLOTS list.
  timeSlot: z.string().regex(/^([01]\d|2[0-3]):(00|30)$/, "Invalid timeSlot"),
  tablePreference: z.string().max(200).optional().nullable(),
  specialRequests: z.string().max(500).optional().nullable(),
});

/**
 * POST /api/public/restaurants/[slug]/reservations
 * Customer-facing: submit a reservation request. Starts in PENDING status.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug: encodedSlug } = await params;
    const slug = decodeURIComponent(encodedSlug);

    // 5 reservations per hour per IP — enough for legitimate group bookings,
    // tight enough to stop a spammer filling every slot for every date.
    const limit = await rateLimit(clientKey(req, "reservations"), 60 * 60_000, 5);
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many reservation requests. Try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(limit.retryAfterSeconds) },
        },
      );
    }

    const restaurant = await db.restaurant.findUnique({
      where: { slug },
      select: { id: true, type: true },
    });
    if (!restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 },
      );
    }

    const raw = await req.json().catch(() => null);
    const parsed = reservationSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 },
      );
    }
    const data = parsed.data;

    // Don't allow reservations for past dates. Compare in UTC at the day floor.
    const reservationDate = new Date(`${data.date}T00:00:00.000Z`);
    if (Number.isNaN(reservationDate.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }
    const todayFloor = new Date();
    todayFloor.setUTCHours(0, 0, 0, 0);
    if (reservationDate.getTime() < todayFloor.getTime()) {
      return NextResponse.json(
        { error: "Reservation date must be today or later" },
        { status: 400 },
      );
    }

    const reservation = await db.reservation.create({
      data: {
        guestName: data.guestName,
        phone: data.phone,
        email: data.email?.trim() || null,
        partySize: data.partySize,
        date: reservationDate,
        timeSlot: data.timeSlot,
        tablePreference: data.tablePreference?.trim() || null,
        specialRequests: data.specialRequests?.trim() || null,
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
    const { slug: encodedSlug } = await params;
    const slug = decodeURIComponent(encodedSlug);
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
      select: {
        id: true,
        openingTime: true,
        closingTime: true,
        tableCount: true,
      },
    });
    if (!restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 },
      );
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
