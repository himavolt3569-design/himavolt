/**
 * The single source of truth for "is this place open, and for what?".
 *
 * Every surface — public discovery, the menu page, checkout, the dashboard badge
 * — calls this. Nothing else compares a clock to a schedule. If you find yourself
 * writing `new Date().getHours()` or comparing `openingTime` strings, stop and
 * use this instead: the server runs UTC and Nepal is UTC+05:45, so hand-rolled
 * comparisons are wrong by 5h45m in production and right on a developer laptop.
 *
 * Pure by design (no `db` import) so it runs on the server, in the client, and in
 * the verification scripts. Callers fetch the rows; this resolves them.
 *
 * Precedence, highest first:
 *   1. `Restaurant.isOpen = false`  → manually closed, beats everything
 *   2. `RestaurantSpecialHours`     → date-specific override (holiday, event)
 *   3. `RestaurantHours`            → the weekly recurring schedule
 *   4. legacy `openingTime`/`closingTime` → only while a restaurant has no rows yet
 */

import {
  type HoursWindow,
  type LocalMoment,
  type ServiceTypeValue,
  type SpecialHoursWindow,
  buildUniformWeek,
  describeNextOpening,
  formatMinutes,
  isOpenAt,
  nextOpenAt,
  normaliseDateKey,
  parseTimeToMinutes,
  toLocalMoment,
  MINUTES_PER_DAY,
} from "./hours";

export type ClosedReason =
  | "OPEN"
  | "MANUALLY_CLOSED"
  | "SPECIAL_CLOSURE"
  | "OUTSIDE_HOURS"
  | "DELIVERY_CLOSED"
  | "PICKUP_CLOSED"
  | "NOT_OFFERED"
  | "NO_HOURS_SET";

export interface OperationalStatus {
  /** Dine-in, the headline "is this venue open" signal. */
  isOpen: boolean;
  deliveryOpen: boolean;
  pickupOpen: boolean;
  /** Wall clock the current dine-in window ends, e.g. `"21:30"`. */
  closesAt: string | null;
  /** Human string for the next dine-in opening, e.g. `"Opens at 5 PM"`. */
  nextOpening: string | null;
  reason: ClosedReason;
  /** Why delivery specifically is unavailable. `"OPEN"` when it is available. */
  deliveryReason: ClosedReason;
}

/** The restaurant fields this needs. Keep the `select` in callers this narrow. */
export interface OperationalRestaurant {
  isOpen: boolean;
  timezone?: string | null;
  /** Legacy fallback, used only when no `RestaurantHours` rows exist. */
  openingTime?: string | null;
  closingTime?: string | null;
  capability?: {
    dineInEnabled: boolean;
    deliveryEnabled: boolean;
    pickupEnabled: boolean;
  } | null;
  /** Legacy column, read only when there is no capability row yet. */
  deliveryEnabled?: boolean | null;
}

export const DEFAULT_TIMEZONE = "Asia/Kathmandu";

/**
 * Synthesise a week from the legacy two-string schedule so restaurants that
 * haven't been migrated still resolve sensibly. A legacy close time at or before
 * the open time is the old way of expressing "we run past midnight", so it is
 * carried into the overnight representation rather than treated as invalid.
 */
function legacyWeek(
  service: ServiceTypeValue,
  openingTime?: string | null,
  closingTime?: string | null,
): HoursWindow[] | null {
  const openMin = parseTimeToMinutes(openingTime ?? "");
  const rawClose = parseTimeToMinutes(closingTime ?? "");
  if (openMin == null || rawClose == null) return null;
  // These columns were never validated on write. An opening time outside a real
  // day would silently produce a window nothing ever matches, which reads as
  // "permanently closed" with no explanation — better to report NO_HOURS_SET.
  if (openMin >= MINUTES_PER_DAY || rawClose >= MINUTES_PER_DAY) return null;
  const closeMin = rawClose <= openMin ? rawClose + MINUTES_PER_DAY : rawClose;
  return buildUniformWeek(service, openMin, closeMin);
}

function hasRowsFor(rows: HoursWindow[], service: ServiceTypeValue): boolean {
  return rows.some((r) => r.serviceType === service);
}

/**
 * Resolve one service. Delivery and pickup deliberately fall back to the DINE_IN
 * schedule when they have no rows of their own — a venue that hasn't set separate
 * delivery hours means "same as when we're open", not "never".
 */
function resolveService(
  service: ServiceTypeValue,
  restaurant: OperationalRestaurant,
  weekly: HoursWindow[],
  special: SpecialHoursWindow[],
  // Resolved once by the caller — deriving it per service would repeat the most
  // expensive step in this file three times for every restaurant in a result set.
  moment: LocalMoment,
): { open: boolean; closesAtMin: number | null; reason: ClosedReason } {
  let rows = weekly;
  let effective = service;

  if (!hasRowsFor(weekly, service)) {
    if (service !== "DINE_IN" && hasRowsFor(weekly, "DINE_IN")) {
      effective = "DINE_IN";
    } else {
      const fallback = legacyWeek(
        service,
        restaurant.openingTime,
        restaurant.closingTime,
      );
      if (!fallback) {
        return { open: false, closesAtMin: null, reason: "NO_HOURS_SET" };
      }
      rows = fallback;
    }
  }

  const check = isOpenAt(moment, effective, rows, special);
  if (check.open) {
    return { open: true, closesAtMin: check.closesAtMin, reason: "OPEN" };
  }

  // Distinguish "closed for a holiday" from "outside normal hours" — the customer
  // deserves to know which, and the reason drives different copy.
  const closedToday = special.some(
    (s) =>
      normaliseDateKey(s.date) === moment.dateKey &&
      (s.serviceType === effective || s.serviceType == null) &&
      s.isClosed,
  );

  return {
    open: false,
    closesAtMin: null,
    reason: closedToday ? "SPECIAL_CLOSURE" : "OUTSIDE_HOURS",
  };
}

/**
 * @param at Defaults to now. Pass an explicit instant in tests and previews —
 *           never mutate the system clock to exercise a schedule.
 */
export function getRestaurantOperationalStatus(
  restaurant: OperationalRestaurant,
  weekly: HoursWindow[] = [],
  special: SpecialHoursWindow[] = [],
  at: Date = new Date(),
): OperationalStatus {
  const tz = restaurant.timezone || DEFAULT_TIMEZONE;
  const moment = toLocalMoment(at, tz);

  const cap = restaurant.capability;
  const dineInOffered = cap ? cap.dineInEnabled : true;
  const deliveryOffered = cap
    ? cap.deliveryEnabled
    : Boolean(restaurant.deliveryEnabled);
  const pickupOffered = cap ? cap.pickupEnabled : false;

  // Scanning forward for the next opening walks up to 8 days of rules, so it is
  // only run when there is actually something to say — i.e. when closed.
  const dineInRows = hasRowsFor(weekly, "DINE_IN")
    ? weekly
    : (legacyWeek("DINE_IN", restaurant.openingTime, restaurant.closingTime) ??
       weekly);
  const computeNextOpening = () =>
    describeNextOpening(nextOpenAt(moment, "DINE_IN", dineInRows, special));

  // The manual override short-circuits everything. A venue that flips itself
  // closed is closed, whatever the schedule says.
  if (!restaurant.isOpen) {
    return {
      isOpen: false,
      deliveryOpen: false,
      pickupOpen: false,
      closesAt: null,
      nextOpening: computeNextOpening(),
      reason: "MANUALLY_CLOSED",
      deliveryReason: "MANUALLY_CLOSED",
    };
  }

  const dineIn = dineInOffered
    ? resolveService("DINE_IN", restaurant, weekly, special, moment)
    : { open: false, closesAtMin: null, reason: "NOT_OFFERED" as ClosedReason };

  const delivery = deliveryOffered
    ? resolveService("DELIVERY", restaurant, weekly, special, moment)
    : { open: false, closesAtMin: null, reason: "NOT_OFFERED" as ClosedReason };

  const pickup = pickupOffered
    ? resolveService("PICKUP", restaurant, weekly, special, moment)
    : { open: false, closesAtMin: null, reason: "NOT_OFFERED" as ClosedReason };

  return {
    isOpen: dineIn.open,
    deliveryOpen: delivery.open,
    pickupOpen: pickup.open,
    closesAt: dineIn.closesAtMin != null ? formatMinutes(dineIn.closesAtMin) : null,
    // Null while open — "when do you next open" only has meaning when shut.
    nextOpening: dineIn.open ? null : computeNextOpening(),
    reason: dineIn.reason,
    // `DELIVERY_CLOSED` specifically means "we deliver, just not right now" —
    // distinct from not offering delivery at all.
    deliveryReason:
      delivery.reason === "OUTSIDE_HOURS" ? "DELIVERY_CLOSED" : delivery.reason,
  };
}

/**
 * Does this restaurant have a schedule we can actually resolve?
 *
 * The gate on enabling delivery, and the reason it is deliberately NOT just
 * "count the `RestaurantHours` rows": until the per-day editor ships and the
 * backfill runs, every restaurant has zero rows. Counting rows alone would 409
 * every delivery toggle in production and point owners at a screen that does not
 * exist yet. A valid legacy `openingTime`/`closingTime` pair is a known schedule
 * — coarser, but known — so it satisfies the gate.
 *
 * What it still catches: a restaurant whose legacy columns are unparseable, and
 * (once the editor ships) one that has explicitly cleared its hours.
 */
export function hasResolvableSchedule(
  restaurant: Pick<OperationalRestaurant, "openingTime" | "closingTime">,
  weeklyRowCount: number,
): boolean {
  if (weeklyRowCount > 0) return true;
  return legacyWeek("DINE_IN", restaurant.openingTime, restaurant.closingTime) !== null;
}

/** Customer-facing one-liner for a closed venue. */
export function describeStatus(status: OperationalStatus): string {
  if (status.isOpen) {
    return status.closesAt ? `Open until ${status.closesAt}` : "Open";
  }
  switch (status.reason) {
    case "MANUALLY_CLOSED":
      return "Temporarily closed";
    case "SPECIAL_CLOSURE":
      return status.nextOpening ?? "Closed today";
    case "NO_HOURS_SET":
      return "Hours not set";
    default:
      return status.nextOpening ?? "Closed";
  }
}
