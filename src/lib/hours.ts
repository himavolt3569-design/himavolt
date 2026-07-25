/**
 * Pure operating-hours maths. No `db` import, no `server-only` — safe on both
 * sides so the settings editor and the public site share one implementation.
 *
 * Two rules govern this whole file:
 *
 * 1. **Minutes from midnight, never Date arithmetic.** A day is 0–1439. A window
 *    that runs past midnight carries `closeMin > 1440` (18:00–02:00 is
 *    1080 → 1560). One row, no splitting, no timezone drift mid-window.
 *
 * 2. **Never read the server clock for a restaurant's local time.** Vercel runs
 *    UTC; Nepal is UTC+05:45. `new Date().getHours()` is wrong by 5h45m in
 *    production. Everything here resolves through `Intl.DateTimeFormat` with the
 *    restaurant's own IANA timezone.
 */

export const MINUTES_PER_DAY = 1440;

/** 0 = Sunday … 6 = Saturday. Nepal's week starts Sunday. */
export const DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const DAY_LABELS_SHORT = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;

export type ServiceTypeValue = "DINE_IN" | "DELIVERY" | "PICKUP";

/** One weekly recurring window. Mirrors the `RestaurantHours` row shape. */
export interface HoursWindow {
  serviceType: ServiceTypeValue;
  dayOfWeek: number;
  isClosed: boolean;
  openMin: number;
  closeMin: number;
}

/** One date-specific override. Mirrors the `RestaurantSpecialHours` row shape. */
export interface SpecialHoursWindow {
  /** Calendar date in the restaurant's timezone. */
  date: Date | string;
  /** null = applies to every service type. */
  serviceType: ServiceTypeValue | null;
  isClosed: boolean;
  openMin: number | null;
  closeMin: number | null;
  reason?: string | null;
}

/** A calendar instant resolved into one restaurant's local timezone. */
export interface LocalMoment {
  /** 0 = Sunday … 6 = Saturday, local. */
  dayOfWeek: number;
  /** Minutes from local midnight, 0–1439. */
  minutes: number;
  /** `YYYY-MM-DD` in local time — the key for special-hours lookup. */
  dateKey: string;
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  weekday: "short",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
};

/**
 * Constructing an `Intl.DateTimeFormat` is expensive — measurably so, and this
 * runs once per service per restaurant. A proximity search returning 20 results
 * would otherwise build ~80 formatters per request. There are a handful of
 * timezones in practice, so cache them by identifier.
 */
const formatterCache = new Map<string, Intl.DateTimeFormat>();

/**
 * Bound the cache. `timezone` is a plain database column, so a bad migration or
 * a future unvalidated write path could feed unbounded distinct strings into a
 * module-level Map that lives for the lifetime of the server process. There are
 * ~400 IANA zones in total; anything past this is not real data.
 */
const MAX_CACHED_FORMATTERS = 64;

function getFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = formatterCache.get(timeZone);
  if (cached) return cached;

  let fmt: Intl.DateTimeFormat;
  try {
    fmt = new Intl.DateTimeFormat("en-US", { ...FORMAT_OPTIONS, timeZone });
  } catch {
    // An unrecognised identifier must not throw inside a request path.
    fmt = new Intl.DateTimeFormat("en-US", { ...FORMAT_OPTIONS, timeZone: "UTC" });
  }
  if (formatterCache.size >= MAX_CACHED_FORMATTERS) formatterCache.clear();
  formatterCache.set(timeZone, fmt);
  return fmt;
}

/**
 * Resolve an instant into a restaurant's local wall-clock.
 *
 * `Intl.DateTimeFormat` is the only mechanism that gets a 45-minute offset right
 * without shipping a timezone database.
 */
export function toLocalMoment(at: Date, timeZone: string): LocalMoment {
  const parts = getFormatter(timeZone).formatToParts(at);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";

  const hour = parseInt(get("hour"), 10);
  const minute = parseInt(get("minute"), 10);

  return {
    // `hourCycle: h23` renders midnight as 00, so no 24→0 correction is needed.
    dayOfWeek: WEEKDAY_INDEX[get("weekday")] ?? 0,
    minutes: hour * 60 + minute,
    dateKey: `${get("year")}-${get("month")}-${get("day")}`,
  };
}

/** `"18:30"` → 1110. Returns null on anything malformed. */
export function parseTimeToMinutes(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
  if (h < 0 || h > 47 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

/** 1560 → `"02:00"`. Wraps past midnight so the label reads as a wall clock. */
export function formatMinutes(total: number): string {
  const wrapped = ((total % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** 1110 → `"6:30 PM"`. For customer-facing copy. */
export function formatMinutes12h(total: number): string {
  const wrapped = ((total % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const h24 = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  const suffix = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return m === 0
    ? `${h12} ${suffix}`
    : `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** True when the window runs past midnight into the following day. */
export function isOvernight(w: { openMin: number; closeMin: number }): boolean {
  return w.closeMin > MINUTES_PER_DAY;
}

/** Structural validity of a single window, independent of any restaurant. */
export function isValidWindow(openMin: number, closeMin: number): boolean {
  if (!Number.isInteger(openMin) || !Number.isInteger(closeMin)) return false;
  if (openMin < 0 || openMin >= MINUTES_PER_DAY) return false;
  if (closeMin <= openMin) return false;
  // A window may not exceed 24h; 2880 allows an 00:00 open closing at 24:00 next day.
  if (closeMin > MINUTES_PER_DAY * 2) return false;
  return closeMin - openMin <= MINUTES_PER_DAY;
}

const dayBefore = (d: number) => (d + 6) % 7;

/** Shift a `YYYY-MM-DD` key by whole days without touching timezones. */
function shiftDateKey(dateKey: string, deltaDays: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

/**
 * A `RestaurantSpecialHours.date` reduced to a `YYYY-MM-DD` key.
 *
 * Exported because every special-hours comparison must use exactly this rule —
 * an inline reimplementation elsewhere is how the two drift apart.
 */
export function normaliseDateKey(value: Date | string): string {
  if (typeof value === "string") return value.slice(0, 10);
  // `@db.Date` comes back as a UTC-midnight Date; read the UTC parts so a
  // negative-offset runtime can't roll it to the previous day.
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}-${String(value.getUTCDate()).padStart(2, "0")}`;
}

/**
 * The effective window for one service on one local date.
 *
 * Special hours override the weekly schedule entirely — a service-specific
 * override beats a blanket one, and either beats the recurring row.
 */
function resolveWindowForDate(
  dateKey: string,
  dayOfWeek: number,
  service: ServiceTypeValue,
  weekly: HoursWindow[],
  special: SpecialHoursWindow[],
): { isClosed: boolean; openMin: number; closeMin: number } | null {
  const onDate = special.filter((s) => normaliseDateKey(s.date) === dateKey);
  const override =
    onDate.find((s) => s.serviceType === service) ??
    onDate.find((s) => s.serviceType == null);

  if (override) {
    if (override.isClosed || override.openMin == null || override.closeMin == null) {
      return { isClosed: true, openMin: 0, closeMin: 0 };
    }
    return {
      isClosed: false,
      openMin: override.openMin,
      closeMin: override.closeMin,
    };
  }

  const row = weekly.find(
    (w) => w.serviceType === service && w.dayOfWeek === dayOfWeek,
  );
  if (!row) return null;
  if (row.isClosed) return { isClosed: true, openMin: 0, closeMin: 0 };
  return { isClosed: false, openMin: row.openMin, closeMin: row.closeMin };
}

export interface OpenCheck {
  open: boolean;
  /** Local minutes at which the current window ends. Null when closed. */
  closesAtMin: number | null;
  /** True when the open window began on the previous calendar day. */
  fromPreviousDay: boolean;
}

/**
 * Is this service open at `moment`?
 *
 * Checks two windows, and this is the part naive implementations get wrong:
 * today's own window, **and** yesterday's window if it spilled past midnight.
 * At 00:30 on Saturday a bar that opened 18:00 Friday is still open — but
 * Saturday's row says nothing about it.
 */
export function isOpenAt(
  moment: LocalMoment,
  service: ServiceTypeValue,
  weekly: HoursWindow[],
  special: SpecialHoursWindow[] = [],
): OpenCheck {
  const yKey = shiftDateKey(moment.dateKey, -1);
  const yesterday = resolveWindowForDate(
    yKey,
    dayBefore(moment.dayOfWeek),
    service,
    weekly,
    special,
  );
  if (yesterday && !yesterday.isClosed && isOvernight(yesterday)) {
    // Re-express "now" on yesterday's clock: 00:30 today is minute 1470 of yesterday.
    const carried = moment.minutes + MINUTES_PER_DAY;
    if (carried >= yesterday.openMin && carried < yesterday.closeMin) {
      return {
        open: true,
        closesAtMin: yesterday.closeMin - MINUTES_PER_DAY,
        fromPreviousDay: true,
      };
    }
  }

  const today = resolveWindowForDate(
    moment.dateKey,
    moment.dayOfWeek,
    service,
    weekly,
    special,
  );
  if (today && !today.isClosed) {
    if (moment.minutes >= today.openMin && moment.minutes < today.closeMin) {
      return {
        open: true,
        closesAtMin: today.closeMin,
        fromPreviousDay: false,
      };
    }
  }

  return { open: false, closesAtMin: null, fromPreviousDay: false };
}

export interface NextOpening {
  /** Days ahead: 0 = later today, 1 = tomorrow, … */
  daysAhead: number;
  dayOfWeek: number;
  openMin: number;
}

/**
 * The next moment this service opens, scanning up to 8 days ahead (8 so a venue
 * open only on the current weekday is still found a week out).
 * Returns null when no window exists at all.
 */
export function nextOpenAt(
  moment: LocalMoment,
  service: ServiceTypeValue,
  weekly: HoursWindow[],
  special: SpecialHoursWindow[] = [],
): NextOpening | null {
  for (let offset = 0; offset <= 8; offset++) {
    const dateKey = shiftDateKey(moment.dateKey, offset);
    const dow = (moment.dayOfWeek + offset) % 7;
    const win = resolveWindowForDate(dateKey, dow, service, weekly, special);
    if (!win || win.isClosed) continue;
    // Today only counts if the opening is still ahead of us.
    if (offset === 0 && win.openMin <= moment.minutes) continue;
    return { daysAhead: offset, dayOfWeek: dow, openMin: win.openMin };
  }
  return null;
}

/** `"Opens at 5 PM"` / `"Opens Monday at 9 AM"`. Null when never opening. */
export function describeNextOpening(next: NextOpening | null): string | null {
  if (!next) return null;
  const time = formatMinutes12h(next.openMin);
  if (next.daysAhead === 0) return `Opens at ${time}`;
  if (next.daysAhead === 1) return `Opens tomorrow at ${time}`;
  return `Opens ${DAY_LABELS[next.dayOfWeek]} at ${time}`;
}

/** `"9:00 AM – 2:00 AM"` for one window, or `"Closed"`. */
export function formatWindow(w: {
  isClosed: boolean;
  openMin: number;
  closeMin: number;
}): string {
  if (w.isClosed) return "Closed";
  const suffix = isOvernight(w) ? " (next day)" : "";
  return `${formatMinutes12h(w.openMin)} – ${formatMinutes12h(w.closeMin)}${suffix}`;
}

/** Seven rows for one service, defaulted to the same window every day. */
export function buildUniformWeek(
  serviceType: ServiceTypeValue,
  openMin: number,
  closeMin: number,
): HoursWindow[] {
  return Array.from({ length: 7 }, (_, dayOfWeek) => ({
    serviceType,
    dayOfWeek,
    isClosed: false,
    openMin,
    closeMin,
  }));
}
