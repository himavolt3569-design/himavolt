"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { decryptIfPresent } from "@/lib/encryption";

const schema = z.object({
  roomId: z.string().min(1),
  restaurantId: z.string().min(1),
  checkIn: z.string().min(1),
  checkOut: z.string().min(1),
  adults: z.number().int().min(1).max(20),
  guestFirstName: z.string().min(1, "First name is required"),
  guestLastName: z.string().min(1, "Last name is required"),
  guestEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
  guestPhone: z.string().min(7, "Phone number is required"),
  notes: z.string().optional(),
  paymentMethod: z.enum(["ESEWA", "KHALTI", "BANK", "CASH"]),
  totalPrice: z.number().positive(),
});

export type BookingInput = z.infer<typeof schema>;
export type BookingResult =
  | { bookingId: string; method: string }
  | { error: string };

export async function createHotelBooking(raw: unknown): Promise<BookingResult> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const data = parsed.data;
  const checkInDate = new Date(data.checkIn);
  const checkOutDate = new Date(data.checkOut);

  if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
    return { error: "Invalid dates provided." };
  }
  if (checkInDate >= checkOutDate) {
    return { error: "Check-out must be after check-in." };
  }

  const nights = Math.ceil(
    (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  // Verify room is still active and fetch advance config in one query
  const room = await db.room.findUnique({
    where: { id: data.roomId },
    select: {
      isActive: true,
      isAvailable: true,
      restaurant: {
        select: { hotelAdvanceType: true, hotelAdvanceValue: true },
      },
    },
  });
  if (!room?.isActive || !room?.isAvailable) {
    return { error: "This room is no longer available." };
  }

  // Concurrency guard: find any overlapping active booking for this room
  const conflict = await db.roomBooking.findFirst({
    where: {
      roomId: data.roomId,
      status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] },
      // Overlap condition: existing.checkIn < newCheckOut AND existing.checkOut > newCheckIn
      checkIn: { lt: checkOutDate },
      checkOut: { gt: checkInDate },
    },
    select: { id: true },
  });

  if (conflict) {
    return {
      error:
        "This room was just booked for your selected dates. Please go back and choose different dates.",
    };
  }

  const isPayAtHotel = data.paymentMethod === "CASH";

  // Reject unconfigured online gateways *before* creating anything. Without
  // this, a booking gets created (holding the room), the later payment-init
  // call 400s because the hotel never set up eSewa/Khalti, and the guest is
  // left staring at a dead form while their own booking blocks a retry.
  if (data.paymentMethod === "ESEWA" || data.paymentMethod === "KHALTI") {
    const paymentConfig = await db.paymentConfig.findUnique({
      where: { restaurantId: data.restaurantId },
      select: {
        esewaEnabled: true,
        esewaMerchantCode: true,
        esewaSecretKey: true,
        khaltiEnabled: true,
        khaltiSecretKey: true,
      },
    });
    if (data.paymentMethod === "ESEWA") {
      const merchantCode = decryptIfPresent(paymentConfig?.esewaMerchantCode);
      const secretKey = decryptIfPresent(paymentConfig?.esewaSecretKey);
      if (!merchantCode || !secretKey || !paymentConfig?.esewaEnabled) {
        return { error: "eSewa is not set up for this hotel yet. Please choose another payment method." };
      }
    } else {
      const secretKey = decryptIfPresent(paymentConfig?.khaltiSecretKey);
      if (!secretKey || !paymentConfig?.khaltiEnabled) {
        return { error: "Khalti is not set up for this hotel yet. Please choose another payment method." };
      }
    }
  }

  // Compute advance amount from the hotel's configured advance policy
  let advanceAmount = 0;
  if (!isPayAtHotel) {
    const { hotelAdvanceType, hotelAdvanceValue } = room.restaurant;
    advanceAmount =
      hotelAdvanceType === "FIXED"
        ? hotelAdvanceValue
        : Math.round((data.totalPrice * hotelAdvanceValue) / 100);
    // Never exceed total price
    advanceAmount = Math.min(advanceAmount, data.totalPrice);
  }

  const booking = await db.roomBooking.create({
    data: {
      roomId: data.roomId,
      restaurantId: data.restaurantId,
      guestName: `${data.guestFirstName} ${data.guestLastName}`.trim(),
      guestEmail: data.guestEmail || null,
      guestPhone: data.guestPhone,
      notes: data.notes || null,
      adults: data.adults,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      nights,
      totalPrice: data.totalPrice,
      advanceAmount,
      paymentMethod: data.paymentMethod,
      // CASH = confirmed immediately (pay on arrival); others = PENDING until gateway callback
      status: isPayAtHotel ? "CONFIRMED" : "PENDING",
      paymentStatus: "UNPAID",
      advancePaid: false,
    },
    select: { id: true },
  });

  return { bookingId: booking.id, method: data.paymentMethod };
}
