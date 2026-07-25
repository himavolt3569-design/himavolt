import "server-only";

import { db } from "@/lib/db";
import { boundingBox, haversineKm, estimateEtaMins, isValidLatLng } from "@/lib/geo";
import {
  getRestaurantOperationalStatus,
  type OperationalStatus,
} from "@/lib/operational-status";
import type { HoursWindow, SpecialHoursWindow } from "@/lib/hours";

/**
 * Proximity search over restaurants.
 *
 * The one place geometry lives. Pages and routes call this and never touch
 * coordinates themselves, so replacing the implementation with PostGIS later is
 * a single-file change with no frontend churn.
 *
 * Strategy: a bounding-box prefilter over the indexed `[latitude, longitude]`
 * pair, then an exact haversine pass over the survivors. The box is cheap and
 * index-friendly; the haversine discards its corners. This comfortably handles
 * tens of thousands of rows — well past the size this dataset will reach — and
 * needs no database extension, which matters because schema changes here are
 * opt-in per deploy with no staging database to rehearse on.
 */

export type NearbyKind = "all" | "food" | "drinks";

export interface NearbyQuery {
  latitude: number;
  longitude: number;
  radiusKm: number;
  kind?: NearbyKind;
  openNow?: boolean;
  deliveryOnly?: boolean;
  limit?: number;
}

export interface NearbyRestaurant {
  id: string;
  name: string;
  slug: string;
  type: string;
  address: string;
  city: string;
  imageUrl: string | null;
  coverUrl: string | null;
  rating: number;
  totalOrders: number;
  distanceKm: number;
  /** Whether this restaurant will actually deliver that far. */
  deliversHere: boolean;
  etaMins: number | null;
  /** Cheapest possible charge — base fee of the narrowest covering zone. */
  fromDeliveryFee: number | null;
  status: OperationalStatus;
  hasDrinks: boolean;
}

/** Hard ceiling regardless of what the caller asks for. */
const MAX_RADIUS_KM = 25;
/** Cap on rows pulled from the box before distance filtering. */
const CANDIDATE_LIMIT = 300;

export async function findNearbyRestaurants(
  query: NearbyQuery,
): Promise<NearbyRestaurant[]> {
  const {
    latitude,
    longitude,
    kind = "all",
    openNow = false,
    deliveryOnly = true,
    limit = 20,
  } = query;

  if (!isValidLatLng(latitude, longitude)) return [];

  const radiusKm = Math.min(Math.max(query.radiusKm, 0.5), MAX_RADIUS_KM);
  const origin = { latitude, longitude };
  const box = boundingBox(origin, radiusKm);

  const candidates = await db.restaurant.findMany({
    where: {
      isActive: true,
      isOpen: true,
      latitude: { gte: box.minLat, lte: box.maxLat },
      longitude: { gte: box.minLng, lte: box.maxLng },
      ...(deliveryOnly
        ? {
            // Capability row is the source of truth; the legacy column is the
            // fallback for restaurants not yet backfilled.
            OR: [
              { capability: { deliveryEnabled: true } },
              { capability: null, deliveryEnabled: true },
            ],
          }
        : {}),
      ...(kind === "drinks"
        ? { menuItems: { some: { isDrink: true, isAvailable: true } } }
        : {}),
      ...(kind === "food"
        ? { menuItems: { some: { isDrink: false, isAvailable: true } } }
        : {}),
    },
    // Explicit and narrow: this response is public, so nothing about the owner,
    // staff, payment config or internal flags may leak into it.
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
      totalOrders: true,
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
        // Only today and tomorrow can affect an "open now" answer, including an
        // overnight window that began yesterday.
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
        orderBy: { maxRadiusKm: "asc" },
        select: { baseFee: true, perKmFee: true, maxRadiusKm: true, freeAbove: true },
      },
      _count: {
        select: { menuItems: { where: { isDrink: true, isAvailable: true } } },
      },
    },
    take: CANDIDATE_LIMIT,
  });

  const now = new Date();
  const results: NearbyRestaurant[] = [];

  for (const r of candidates) {
    if (!isValidLatLng(r.latitude, r.longitude)) continue;

    const distanceKm = haversineKm(origin, {
      latitude: r.latitude as number,
      longitude: r.longitude as number,
    });
    // The box is a square; this trims it back to a circle.
    if (distanceKm > radiusKm) continue;

    const status = getRestaurantOperationalStatus(
      r,
      r.hours as HoursWindow[],
      r.specialHours as SpecialHoursWindow[],
      now,
    );

    if (openNow && !(deliveryOnly ? status.deliveryOpen : status.isOpen)) continue;

    const maxKm = r.capability?.deliveryRadiusKm ?? 5;
    const deliversHere = distanceKm <= maxKm;

    // Cheapest covering zone, purely for the "from Rs X" label. The binding
    // price is always computed server-side at checkout from the real distance.
    const zone = r.deliveryZones.find((z) => distanceKm <= z.maxRadiusKm) ?? null;

    results.push({
      id: r.id,
      name: r.name,
      slug: r.slug,
      type: r.type,
      address: r.address,
      city: r.city,
      imageUrl: r.imageUrl,
      coverUrl: r.coverUrl,
      rating: r.rating,
      totalOrders: r.totalOrders,
      distanceKm: Math.round(distanceKm * 100) / 100,
      deliversHere,
      etaMins: deliversHere
        ? estimateEtaMins(distanceKm, r.capability?.deliveryPrepMins ?? 30)
        : null,
      fromDeliveryFee: zone
        ? Math.round((zone.baseFee + zone.perKmFee * distanceKm) * 100) / 100
        : null,
      status,
      hasDrinks: r._count.menuItems > 0,
    });
  }

  // Places that will actually deliver to this address come first; distance
  // breaks the tie. A closer restaurant that refuses the trip is not a better
  // result than a slightly further one that accepts it.
  results.sort((a, b) => {
    if (a.deliversHere !== b.deliversHere) return a.deliversHere ? -1 : 1;
    return a.distanceKm - b.distanceKm;
  });

  return results.slice(0, limit);
}
