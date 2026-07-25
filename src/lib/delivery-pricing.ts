/**
 * The ONLY producer of a delivery fee.
 *
 * Two rules, both non-negotiable:
 *
 * 1. **The server computes the fee.** It is never accepted from the client, for
 *    the same reason `createOrderSchema` refuses to accept item prices — a value
 *    the browser can choose is a value an attacker can choose.
 *
 * 2. **The result is snapshotted, never recomputed.** `DeliveryZone` is live
 *    configuration; a restaurant that raises its per-km rate next month must not
 *    retroactively change what last month's receipts say. Callers persist the
 *    whole `DeliveryQuote` onto the `Delivery` row at order time and read it back
 *    forever after. Nothing may re-price a historical order.
 *
 * Pure — no `db` import — so checkout, the quote endpoint and the order
 * transaction all reach the same number from the same inputs.
 */

import { haversineKm, isValidLatLng, type LatLng } from "./geo";

/** The `DeliveryZone` fields pricing depends on. */
export interface PricingZone {
  id: string;
  name: string;
  baseFee: number;
  perKmFee: number;
  freeAbove: number | null;
  maxRadiusKm: number;
  isActive: boolean;
}

export interface DeliveryQuote {
  /** Straight-line km, the figure every downstream calculation derives from. */
  distanceKm: number;
  baseFee: number;
  distanceFee: number;
  /** Positive number subtracted from base+distance (free-delivery threshold). */
  discount: number;
  finalFee: number;
  zoneId: string | null;
  zoneName: string | null;
  /** True when `freeAbove` waived the whole charge. */
  isFree: boolean;
}

export type QuoteFailure =
  | { ok: false; reason: "NO_COORDINATES" }
  | { ok: false; reason: "NO_ZONE" }
  | { ok: false; reason: "OUT_OF_RANGE"; distanceKm: number; maxKm: number };

export type QuoteResult = ({ ok: true } & DeliveryQuote) | QuoteFailure;

/** Round to paisa so a float artefact can never reach a receipt. */
const money = (n: number) => Math.round(n * 100) / 100;

/**
 * The applicable zone is the **narrowest active one that still reaches** the
 * drop-off. Zones are concentric rings, so picking the tightest fit gives the
 * customer the cheapest honest price rather than whichever row sorted first.
 */
export function selectZone(
  zones: PricingZone[],
  distanceKm: number,
): PricingZone | null {
  const covering = zones
    .filter((z) => z.isActive && distanceKm <= z.maxRadiusKm)
    .sort((a, b) => a.maxRadiusKm - b.maxRadiusKm);
  return covering[0] ?? null;
}

export interface QuoteInput {
  pickup: LatLng;
  dropoff: LatLng;
  zones: PricingZone[];
  /** Order subtotal, for the free-delivery threshold. */
  subtotal: number;
  /** Hard cap from `RestaurantCapability.deliveryRadiusKm`. */
  maxRadiusKm: number;
}

export function computeDeliveryFee(input: QuoteInput): QuoteResult {
  const { pickup, dropoff, zones, subtotal, maxRadiusKm } = input;

  if (
    !isValidLatLng(pickup.latitude, pickup.longitude) ||
    !isValidLatLng(dropoff.latitude, dropoff.longitude)
  ) {
    return { ok: false, reason: "NO_COORDINATES" };
  }

  const distanceKm = money(haversineKm(pickup, dropoff));

  // The capability radius is the outer boundary and is checked first: a zone
  // configured wider than the restaurant is willing to travel must not win.
  if (distanceKm > maxRadiusKm) {
    return { ok: false, reason: "OUT_OF_RANGE", distanceKm, maxKm: maxRadiusKm };
  }

  const zone = selectZone(zones, distanceKm);
  if (!zone) {
    return { ok: false, reason: "NO_ZONE" };
  }

  const baseFee = money(zone.baseFee);
  const distanceFee = money(zone.perKmFee * distanceKm);
  const gross = money(baseFee + distanceFee);

  const qualifiesFree =
    zone.freeAbove != null && zone.freeAbove > 0 && subtotal >= zone.freeAbove;
  const discount = qualifiesFree ? gross : 0;
  const finalFee = money(Math.max(0, gross - discount));

  return {
    ok: true,
    distanceKm,
    baseFee,
    distanceFee,
    discount,
    finalFee,
    zoneId: zone.id,
    zoneName: zone.name,
    isFree: finalFee === 0,
  };
}

/** Map a quote onto the `Delivery` snapshot columns. */
export function toDeliverySnapshot(quote: DeliveryQuote) {
  return {
    distanceKm: quote.distanceKm,
    baseFeeSnap: quote.baseFee,
    distanceFee: quote.distanceFee,
    discountSnap: quote.discount,
    finalFee: quote.finalFee,
    pricingZoneId: quote.zoneId,
    pricedAt: new Date(),
  };
}

/** Customer-facing explanation of why a quote failed. */
export function describeQuoteFailure(failure: QuoteFailure): string {
  switch (failure.reason) {
    case "NO_COORDINATES":
      return "Pick a delivery location on the map to see the delivery charge.";
    case "NO_ZONE":
      return "This restaurant has not set up delivery pricing yet.";
    case "OUT_OF_RANGE":
      return `That address is ${failure.distanceKm.toFixed(1)} km away — this restaurant delivers up to ${failure.maxKm} km.`;
  }
}
