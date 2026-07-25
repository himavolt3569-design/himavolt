import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { boundingBox, haversineKm, isValidLatLng } from "@/lib/geo";
import { getRestaurantOperationalStatus } from "@/lib/operational-status";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/audit";
import type { HoursWindow, SpecialHoursWindow } from "@/lib/hours";
import { z } from "zod";

/**
 * Instant search across everything a customer can order or book.
 *
 * Returns three separate groups rather than one blended list, because "momo"
 * means different things depending on what the person wants: a dish to add to a
 * basket, a shop to browse, or a hotel to book. Blending them forces the reader
 * to work out which is which from the row itself.
 *
 * Ranking is proximity-first within each group when coordinates are supplied.
 * A perfect name match 40km away is a worse answer than a near match round the
 * corner, because you cannot eat the far one.
 */

const searchSchema = z.object({
  q: z.string().trim().min(1).max(80),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  radiusKm: z.number().min(1).max(50).default(25),
  limitPerGroup: z.number().int().min(1).max(10).default(5),
});

const HOTEL_TYPES = ["HOTEL", "RESORT", "GUEST_HOUSE"];

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers) ?? "unknown";
  // Fires on every keystroke pause, so the ceiling is higher than the other
  // public endpoints while still capping a runaway client.
  const limited = await rateLimit(`search:${ip}`, 60_000, 120);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests." },
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

  const parsed = searchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { dishes: [], shops: [], hotels: [] },
      { status: 200 },
    );
  }

  const { q, latitude, longitude, radiusKm, limitPerGroup } = parsed.data;
  const hasOrigin = isValidLatLng(latitude, longitude);
  const origin = hasOrigin
    ? { latitude: latitude as number, longitude: longitude as number }
    : null;
  const box = origin ? boundingBox(origin, radiusKm) : null;

  const geoWhere = box
    ? {
        latitude: { gte: box.minLat, lte: box.maxLat },
        longitude: { gte: box.minLng, lte: box.maxLng },
      }
    : {};

  const contains = { contains: q, mode: "insensitive" as const };

  try {
    // Pulled wider than we return, so the proximity sort below has something to
    // choose from rather than ranking whatever the database happened to emit.
    const OVERFETCH = 40;

    const [dishRows, venueRows] = await Promise.all([
      db.menuItem.findMany({
        where: {
          isAvailable: true,
          OR: [{ name: contains }, { description: contains }],
          restaurant: { isActive: true, isOpen: true, ...geoWhere },
        },
        select: {
          id: true,
          name: true,
          price: true,
          discount: true,
          imageUrl: true,
          isDrink: true,
          isVeg: true,
          restaurant: {
            select: {
              name: true,
              slug: true,
              currency: true,
              latitude: true,
              longitude: true,
            },
          },
        },
        take: OVERFETCH,
      }),

      db.restaurant.findMany({
        where: {
          isActive: true,
          isOpen: true,
          ...geoWhere,
          OR: [{ name: contains }, { address: contains }, { city: contains }],
        },
        select: {
          id: true,
          name: true,
          slug: true,
          type: true,
          address: true,
          city: true,
          imageUrl: true,
          coverUrl: true,
          rating: true,
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
        },
        take: OVERFETCH,
      }),
    ]);

    const distanceTo = (lat: unknown, lng: unknown): number | null => {
      if (!origin || !isValidLatLng(lat as number, lng as number)) return null;
      return (
        Math.round(
          haversineKm(origin, {
            latitude: lat as number,
            longitude: lng as number,
          }) * 100,
        ) / 100
      );
    };

    /** Exact and prefix matches outrank a hit buried mid-string. */
    const nameScore = (name: string) => {
      const n = name.toLowerCase();
      const needle = q.toLowerCase();
      if (n === needle) return 0;
      if (n.startsWith(needle)) return 1;
      return 2;
    };

    const byRelevanceThenDistance = <T extends { name: string; distanceKm: number | null }>(
      a: T,
      b: T,
    ) => {
      const s = nameScore(a.name) - nameScore(b.name);
      if (s !== 0) return s;
      if (a.distanceKm == null || b.distanceKm == null) return 0;
      return a.distanceKm - b.distanceKm;
    };

    const dishes = dishRows
      .map((d) => ({
        id: d.id,
        name: d.name,
        price: d.price,
        finalPrice:
          d.discount > 0
            ? Math.round(d.price * (1 - d.discount / 100) * 100) / 100
            : d.price,
        discount: d.discount,
        imageUrl: d.imageUrl,
        isDrink: d.isDrink,
        isVeg: d.isVeg,
        restaurantName: d.restaurant.name,
        slug: d.restaurant.slug,
        currency: d.restaurant.currency,
        distanceKm: distanceTo(d.restaurant.latitude, d.restaurant.longitude),
      }))
      .filter((d) => !origin || d.distanceKm == null || d.distanceKm <= radiusKm)
      .sort(byRelevanceThenDistance)
      .slice(0, limitPerGroup);

    const now = new Date();
    const venues = venueRows
      .map((r) => {
        const status = getRestaurantOperationalStatus(
          r,
          r.hours as HoursWindow[],
          r.specialHours as SpecialHoursWindow[],
          now,
        );
        return {
          id: r.id,
          name: r.name,
          slug: r.slug,
          type: r.type,
          address: r.address,
          city: r.city,
          image: r.coverUrl ?? r.imageUrl,
          rating: r.rating,
          isOpen: status.isOpen || status.deliveryOpen,
          nextOpening: status.nextOpening,
          distanceKm: distanceTo(r.latitude, r.longitude),
        };
      })
      .filter((r) => !origin || r.distanceKm == null || r.distanceKm <= radiusKm)
      .sort(byRelevanceThenDistance);

    // Split by what the venue is, so a customer looking for a bed is not shown
    // a burger place and vice versa.
    const hotels = venues
      .filter((v) => HOTEL_TYPES.includes(v.type))
      .slice(0, limitPerGroup);
    const shops = venues
      .filter((v) => !HOTEL_TYPES.includes(v.type))
      .slice(0, limitPerGroup);

    return NextResponse.json(
      { dishes, shops, hotels, query: q },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[api/public/search]", err);
    return NextResponse.json({ error: "Search failed." }, { status: 503 });
  }
}
