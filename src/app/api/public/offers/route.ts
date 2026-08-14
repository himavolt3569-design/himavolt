import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { boundingBox, haversineKm, isValidLatLng } from "@/lib/geo";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/audit";
import { z } from "zod";

/**
 * Actual discounted dishes, not restaurants.
 *
 * The old offers page listed venues with decorative "60% OFF" badges hardcoded
 * in the client, which promised a discount the checkout would never apply. This
 * returns real `MenuItem` rows whose discount is genuinely live right now, so
 * the price shown here is the price charged.
 *
 * A discount counts as live when `discount > 0` AND, if an offer window is set,
 * we are inside it. An expired offer left on an item must not resurface.
 */

const offersSchema = z.object({
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  radiusKm: z.number().min(0.5).max(50).default(25),
  kind: z.enum(["all", "food", "drinks"]).default("all"),
  limit: z.number().int().min(1).max(60).default(30),
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers) ?? "unknown";
  const limited = await rateLimit(`offers:${ip}`, 60_000, 60);
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

  const parsed = offersSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { latitude, longitude, radiusKm, kind, limit } = parsed.data;

  const hasOrigin = isValidLatLng(latitude, longitude);
  const box = hasOrigin
    ? boundingBox({ latitude: latitude!, longitude: longitude! }, radiusKm)
    : null;

  const now = new Date();

  try {
    const items = await db.menuItem.findMany({
      where: {
        isAvailable: true,
        discount: { gt: 0 },
        // An offer window is optional. When one exists it must contain now, so
        // a finished promotion cannot keep advertising itself.
        AND: [
          { OR: [{ offerStartedAt: null }, { offerStartedAt: { lte: now } }] },
          { OR: [{ offerExpiresAt: null }, { offerExpiresAt: { gte: now } }] },
        ],
        ...(kind === "drinks" ? { isDrink: true } : {}),
        ...(kind === "food" ? { isDrink: false } : {}),
        restaurant: {
          isActive: true,
          isOpen: true,
          ...(box
            ? {
                latitude: { gte: box.minLat, lte: box.maxLat },
                longitude: { gte: box.minLng, lte: box.maxLng },
              }
            : {}),
        },
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        discount: true,
        discountLabel: true,
        imageUrl: true,
        rating: true,
        isVeg: true,
        isDrink: true,
        offerExpiresAt: true,
        restaurant: {
          select: {
            id: true,
            name: true,
            slug: true,
            type: true,
            currency: true,
            latitude: true,
            longitude: true,
            coverUrl: true,
          },
        },
      },
      orderBy: { discount: "desc" },
      take: 200,
    });

    const offers = items
      .map((it) => {
        const distanceKm =
          hasOrigin &&
          isValidLatLng(it.restaurant.latitude, it.restaurant.longitude)
            ? haversineKm(
                { latitude: latitude!, longitude: longitude! },
                {
                  latitude: it.restaurant.latitude as number,
                  longitude: it.restaurant.longitude as number,
                },
              )
            : null;

        // Prices are derived here, once, so the card cannot compute a different
        // number from the one the order path will charge.
        const finalPrice =
          Math.round(it.price * (1 - it.discount / 100) * 100) / 100;

        return {
          id: it.id,
          name: it.name,
          description: it.description,
          originalPrice: it.price,
          finalPrice,
          discount: it.discount,
          discountLabel: it.discountLabel,
          saving: Math.round((it.price - finalPrice) * 100) / 100,
          imageUrl: it.imageUrl,
          rating: it.rating,
          isVeg: it.isVeg,
          isDrink: it.isDrink,
          endsAt: it.offerExpiresAt,
          restaurant: {
            name: it.restaurant.name,
            slug: it.restaurant.slug,
            type: it.restaurant.type,
            currency: it.restaurant.currency,
            coverUrl: it.restaurant.coverUrl,
          },
          distanceKm:
            distanceKm != null ? Math.round(distanceKm * 100) / 100 : null,
        };
      })
      // Trim the square box back to a circle.
      .filter((o) => !hasOrigin || o.distanceKm == null || o.distanceKm <= radiusKm)
      .slice(0, limit);

    return NextResponse.json(
      { offers, count: offers.length },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[api/public/offers]", err);
    return NextResponse.json(
      { error: "Could not load offers." },
      { status: 503 },
    );
  }
}
