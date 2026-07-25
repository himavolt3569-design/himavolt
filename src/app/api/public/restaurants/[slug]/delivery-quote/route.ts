import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { computeDeliveryFee, describeQuoteFailure } from "@/lib/delivery-pricing";
import { estimateEtaMins, isValidLatLng } from "@/lib/geo";
import { getRestaurantOperationalStatus } from "@/lib/operational-status";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/audit";
import type { HoursWindow, SpecialHoursWindow } from "@/lib/hours";
import { z } from "zod";

/**
 * What will delivery to this address cost, and can they even deliver there?
 *
 * Shown before checkout so a customer is never surprised at the last step. The
 * number here is advisory — the binding fee is recomputed inside the order
 * transaction from the same module, so a stale or tampered quote cannot become
 * the charged amount.
 */

const quoteSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  subtotal: z.number().min(0).max(10_000_000).default(0),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const ip = getClientIp(req.headers) ?? "unknown";
  const limited = await rateLimit(`quote:${ip}`, 60_000, 60);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSeconds || 60) },
      },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = quoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid address" },
      { status: 400 },
    );
  }

  try {
    const restaurant = await db.restaurant.findUnique({
      where: { slug },
      select: {
        id: true,
        latitude: true,
        longitude: true,
        isOpen: true,
        timezone: true,
        openingTime: true,
        closingTime: true,
        deliveryEnabled: true,
        capability: {
          select: {
            dineInEnabled: true,
            deliveryEnabled: true,
            pickupEnabled: true,
            deliveryRadiusKm: true,
            deliveryPrepMins: true,
            codEnabled: true,
            codMaxAmount: true,
          },
        },
        hours: {
          select: {
            serviceType: true,
            dayOfWeek: true,
            isClosed: true,
            openMin: true,
            closeMin: true,
          },
        },
        specialHours: {
          where: {
            date: {
              gte: new Date(Date.now() - 2 * 86_400_000),
              lte: new Date(Date.now() + 2 * 86_400_000),
            },
          },
          select: {
            date: true,
            serviceType: true,
            isClosed: true,
            openMin: true,
            closeMin: true,
          },
        },
        deliveryZones: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            baseFee: true,
            perKmFee: true,
            freeAbove: true,
            maxRadiusKm: true,
            isActive: true,
          },
        },
      },
    });

    if (!restaurant) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const deliveryOffered =
      restaurant.capability?.deliveryEnabled ?? restaurant.deliveryEnabled;
    if (!deliveryOffered) {
      return NextResponse.json(
        { ok: false, reason: "NOT_OFFERED", message: "This restaurant does not deliver." },
        { status: 200 },
      );
    }

    if (!isValidLatLng(restaurant.latitude, restaurant.longitude)) {
      return NextResponse.json(
        {
          ok: false,
          reason: "NO_COORDINATES",
          message: "This restaurant has not set its location yet.",
        },
        { status: 200 },
      );
    }

    const status = getRestaurantOperationalStatus(
      restaurant,
      restaurant.hours as HoursWindow[],
      restaurant.specialHours as SpecialHoursWindow[],
    );

    const quote = computeDeliveryFee({
      pickup: {
        latitude: restaurant.latitude as number,
        longitude: restaurant.longitude as number,
      },
      dropoff: { latitude: parsed.data.latitude, longitude: parsed.data.longitude },
      zones: restaurant.deliveryZones,
      subtotal: parsed.data.subtotal,
      maxRadiusKm: restaurant.capability?.deliveryRadiusKm ?? 5,
    });

    if (!quote.ok) {
      return NextResponse.json(
        { ok: false, reason: quote.reason, message: describeQuoteFailure(quote) },
        { status: 200 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        distanceKm: quote.distanceKm,
        fee: quote.finalFee,
        baseFee: quote.baseFee,
        distanceFee: quote.distanceFee,
        discount: quote.discount,
        isFree: quote.isFree,
        zoneName: quote.zoneName,
        etaMins: estimateEtaMins(
          quote.distanceKm,
          restaurant.capability?.deliveryPrepMins ?? 30,
        ),
        deliveryOpen: status.deliveryOpen,
        deliveryReason: status.deliveryReason,
        nextOpening: status.nextOpening,
        cod: {
          enabled: restaurant.capability?.codEnabled ?? false,
          maxAmount: restaurant.capability?.codMaxAmount ?? 0,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[api/public/delivery-quote]", err);
    return NextResponse.json(
      { error: "Could not calculate delivery." },
      { status: 503 },
    );
  }
}
