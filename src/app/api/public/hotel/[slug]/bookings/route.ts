import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { rateLimit, clientKey } from "@/lib/rate-limit";

const HOTEL_TYPES = ["HOTEL", "RESORT", "GUEST_HOUSE"];

const phoneRe = /^\d{7,15}$/; // tolerant — international guests, but no garbage
const dateRe = /^\d{4}-\d{2}-\d{2}(T.*)?$/;

const bookingSchema = z.object({
  roomId: z.string().min(1),
  guestName: z.string().trim().min(1).max(80),
  guestPhone: z
    .string()
    .trim()
    .regex(phoneRe, "Phone must be 7–15 digits")
    .optional()
    .nullable(),
  guestEmail: z.string().email().max(120).optional().nullable(),
  guestAddress: z.string().trim().max(200).optional().nullable(),
  guestIdType: z
    .enum([
      "CITIZENSHIP",
      "PASSPORT",
      "DRIVING_LICENSE",
      "NATIONAL_ID",
      "OTHER",
    ])
    .optional()
    .nullable(),
  guestIdNumber: z.string().trim().max(50).optional().nullable(),
  guestIdImageUrl: z.string().url().max(500).optional().nullable(),
  adults: z.number().int().min(1).max(20).default(1),
  children: z.number().int().min(0).max(20).default(0),
  checkIn: z.string().regex(dateRe, "checkIn must be YYYY-MM-DD"),
  checkOut: z.string().regex(dateRe, "checkOut must be YYYY-MM-DD"),
  roomServiceSelected: z.boolean().optional().default(false),
  notes: z.string().trim().max(500).optional().nullable(),
});

/**
 * POST /api/public/hotel/[slug]/bookings
 * Customer-facing room booking. Server-validated, rate-limited, server-derived
 * userId. Replaces the deleted /api/public/restaurants/[slug]/bookings POST
 * which was a less-correct duplicate.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  // 5 booking attempts per hour per IP — enough for legitimate retry but
  // keeps a bot from blocking every room across every hotel.
  const limit = await rateLimit(clientKey(req, "hotel-booking"), 60 * 60_000, 5);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many booking attempts. Try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
  }

  const { slug: encodedSlug } = await params;
  const slug = decodeURIComponent(encodedSlug);
  const raw = await req.json().catch(() => null);
  const parsed = bookingSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const restaurant = await db.restaurant.findUnique({
    where: { slug },
    select: {
      id: true,
      type: true,
      isActive: true,
      hotelAdvanceType: true,
      hotelAdvanceValue: true,
      roomServiceEnabled: true,
      roomServiceCharge: true,
    },
  });

  if (!restaurant || !restaurant.isActive) {
    return NextResponse.json({ error: "Hotel not found" }, { status: 404 });
  }
  if (!HOTEL_TYPES.includes(restaurant.type)) {
    return NextResponse.json(
      { error: "Room bookings not supported for this venue" },
      { status: 400 },
    );
  }

  const room = await db.room.findFirst({
    where: { id: data.roomId, restaurantId: restaurant.id, isActive: true },
  });
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  // Capacity check — don't accept a booking for more guests than the room fits.
  const partySize = data.adults + data.children;
  if (partySize > room.maxGuests) {
    return NextResponse.json(
      {
        error: `This room fits up to ${room.maxGuests} guest${room.maxGuests === 1 ? "" : "s"}; your booking has ${partySize}.`,
      },
      { status: 400 },
    );
  }

  const checkInDate = new Date(data.checkIn);
  const checkOutDate = new Date(data.checkOut);
  if (
    Number.isNaN(checkInDate.getTime()) ||
    Number.isNaN(checkOutDate.getTime())
  ) {
    return NextResponse.json({ error: "Invalid date(s)" }, { status: 400 });
  }
  if (checkInDate >= checkOutDate) {
    return NextResponse.json(
      { error: "Check-out must be after check-in" },
      { status: 400 },
    );
  }
  // No bookings starting in the past.
  const todayFloor = new Date();
  todayFloor.setUTCHours(0, 0, 0, 0);
  if (checkInDate < todayFloor) {
    return NextResponse.json(
      { error: "Check-in must be today or later" },
      { status: 400 },
    );
  }

  // Treat unpaid PENDING holds older than the 3h window as already expired so a
  // stale reservation never blocks a new booking before the cron releases it.
  const holdCutoff = new Date(Date.now() - 180 * 60 * 1000);
  const conflict = await db.roomBooking.findFirst({
    where: {
      roomId: data.roomId,
      AND: [
        { checkIn: { lt: checkOutDate } },
        { checkOut: { gt: checkInDate } },
        {
          OR: [
            { status: { in: ["CONFIRMED", "CHECKED_IN"] } },
            { status: "PENDING", createdAt: { gte: holdCutoff } },
          ],
        },
      ],
    },
  });
  if (conflict) {
    return NextResponse.json(
      { error: "Room is not available for the selected dates" },
      { status: 409 },
    );
  }

  const nights = Math.max(
    1,
    Math.ceil(
      (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24),
    ),
  );
  const roomCharge = room.price * nights;
  const wantsRoomService = data.roomServiceSelected && restaurant.roomServiceEnabled;
  const serviceCharge = wantsRoomService ? restaurant.roomServiceCharge || 0 : 0;
  const totalPrice = Math.round((roomCharge + serviceCharge) * 100) / 100;

  const advanceAmount =
    restaurant.hotelAdvanceType === "PERCENTAGE"
      ? Math.round((totalPrice * restaurant.hotelAdvanceValue) / 100)
      : restaurant.hotelAdvanceValue;

  // Server-derive userId from auth — never trust the client to claim a
  // user. Falls back to anonymous (null) for guest bookings.
  let userId: string | null = null;
  try {
    const user = await getOrCreateUser();
    if (user) userId = user.id;
  } catch {
    // anonymous booking — fine
  }

  const booking = await db.roomBooking.create({
    data: {
      roomId: data.roomId,
      restaurantId: restaurant.id,
      guestName: data.guestName,
      guestPhone: data.guestPhone ?? null,
      guestEmail: data.guestEmail ?? null,
      guestAddress: data.guestAddress ?? null,
      guestIdType: data.guestIdType ?? null,
      guestIdNumber: data.guestIdNumber ?? null,
      guestIdImageUrl: data.guestIdImageUrl ?? null,
      adults: data.adults,
      children: data.children,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      nights,
      totalPrice,
      roomServiceSelected: wantsRoomService,
      advanceAmount,
      advancePaid: false,
      paymentStatus: "UNPAID",
      status: "PENDING",
      notes: data.notes ?? null,
      userId,
    },
    include: {
      room: { select: { roomNumber: true, name: true, type: true } },
    },
  });

  return NextResponse.json({ booking }, { status: 201 });
}
