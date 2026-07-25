/**
 * Distance maths for proximity discovery and delivery pricing.
 *
 * Deliberately plain arithmetic rather than PostGIS or `earthdistance`: both
 * require a database extension, and schema changes here are opt-in per deploy
 * (`ADDITIVE_SCHEMA_SYNC`) with no staging database to rehearse on. A bounding
 * box over the indexed `[latitude, longitude]` pair, followed by an exact
 * haversine pass over the survivors, is accurate to within metres and stays fast
 * well past the size this dataset will reach.
 *
 * When it does outgrow this, only `findNearbyRestaurants` changes — no caller
 * touches these functions directly.
 */

/** Mean Earth radius (km). */
const EARTH_RADIUS_KM = 6371;

/**
 * Straight-line distance overstates how far a rider actually travels. 1.3 is the
 * conventional urban road-network multiplier and matches Kathmandu's grid
 * reasonably well. Replace with real routing (self-hosted OSRM) if ETA accuracy
 * ever becomes a complaint — the public OSRM demo server is not for production.
 */
export const ROAD_FACTOR = 1.3;

/** Average city delivery speed on a bike, km/h. Conservative on purpose. */
export const AVG_SPEED_KMH = 20;

export interface LatLng {
  latitude: number;
  longitude: number;
}

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in km. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

/**
 * A lat/lng rectangle guaranteed to contain every point within `radiusKm`.
 *
 * Intentionally generous — it is a cheap index-friendly prefilter, and the exact
 * haversine pass discards the corners afterwards. Longitude degrees shrink with
 * latitude, hence the `cos` term; it is clamped so a near-polar query cannot
 * divide by ~0 and produce an infinite span.
 *
 * KNOWN LIMITATION: the box clamps at ±180 rather than wrapping, so a search
 * centred within `radiusKm` of the antimeridian returns a truncated set. Nepal
 * sits at ~85°E, so this cannot be hit in practice; handle it if the platform
 * ever operates near the date line.
 */
export function boundingBox(center: LatLng, radiusKm: number): BoundingBox {
  const latDelta = radiusKm / 111.32;
  const cos = Math.cos(toRad(center.latitude));
  const lngDelta = radiusKm / (111.32 * Math.max(0.01, Math.abs(cos)));

  return {
    minLat: Math.max(-90, center.latitude - latDelta),
    maxLat: Math.min(90, center.latitude + latDelta),
    minLng: Math.max(-180, center.longitude - lngDelta),
    maxLng: Math.min(180, center.longitude + lngDelta),
  };
}

/** Estimated road distance in km — what a rider covers, not the crow's flight. */
export function roadDistanceKm(straightLineKm: number): number {
  return straightLineKm * ROAD_FACTOR;
}

/**
 * Customer-facing ETA in minutes: kitchen time plus travel time.
 * Rounded up to the nearest 5 so the UI reads as an estimate, not a promise.
 */
export function estimateEtaMins(straightLineKm: number, prepMins: number): number {
  const travelMins = (roadDistanceKm(straightLineKm) / AVG_SPEED_KMH) * 60;
  return Math.max(5, Math.ceil((prepMins + travelMins) / 5) * 5);
}

/** True when coordinates are present and inside the valid range. */
export function isValidLatLng(
  lat: number | null | undefined,
  lng: number | null | undefined,
): boolean {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    // (0, 0) is in the Atlantic; it is always a bug, never a Nepali restaurant.
    !(lat === 0 && lng === 0)
  );
}

/** `"1.2 km"` / `"450 m"`. */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}
