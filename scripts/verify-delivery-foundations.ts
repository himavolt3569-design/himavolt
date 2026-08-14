/**
 * Verification for the Phase 0 delivery foundations.
 *
 * There is no test runner configured in this project, so this is a plain script
 * that exercises the pure modules and exits non-zero on failure. It touches NO
 * database — deliberately, because the local .env points at the live production
 * database and every write there is real customer data.
 *
 * Run:  npm run verify:delivery
 */

import {
  buildUniformWeek,
  formatMinutes,
  formatMinutes12h,
  isOpenAt,
  isValidWindow,
  nextOpenAt,
  parseTimeToMinutes,
  toLocalMoment,
  type HoursWindow,
  type SpecialHoursWindow,
} from "../src/lib/hours";
import {
  describeStatus,
  getRestaurantOperationalStatus,
  hasResolvableSchedule,
} from "../src/lib/operational-status";
import { boundingBox, estimateEtaMins, haversineKm, isValidLatLng } from "../src/lib/geo";
import { computeDeliveryFee, selectZone, type PricingZone } from "../src/lib/delivery-pricing";
import {
  allowedTransitions,
  canTransition,
  isTerminal,
} from "../src/lib/delivery/transitions";
import { stationForItem } from "../src/lib/orders/kitchen-status";

let passed = 0;
const failures: string[] = [];

function check(name: string, condition: boolean, detail?: string) {
  if (condition) {
    passed++;
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function near(actual: number, expected: number, tolerance: number): boolean {
  return Math.abs(actual - expected) <= tolerance;
}

const KATHMANDU = "Asia/Kathmandu";

/* ── hours.ts ─────────────────────────────────────────────────────── */

// Nepal is UTC+05:45 — the offset that breaks naive implementations. 18:30 UTC
// is 00:15 the NEXT day locally, so both the date and the weekday roll over.
{
  const at = new Date("2026-07-25T18:30:00Z");
  const local = toLocalMoment(at, KATHMANDU);
  check("nepal offset: minutes", local.minutes === 15, `got ${local.minutes}, want 15`);
  check(
    "nepal offset: date rolls to next day",
    local.dateKey === "2026-07-26",
    `got ${local.dateKey}, want 2026-07-26`,
  );

  const utc = toLocalMoment(at, "UTC");
  check(
    "nepal offset differs from server UTC",
    utc.dateKey === "2026-07-25" && utc.minutes === 18 * 60 + 30,
    `UTC gave ${utc.dateKey} ${utc.minutes}`,
  );
}

// Midnight must read as minute 0, not 1440 (the h23/h24 hourCycle trap).
{
  const local = toLocalMoment(new Date("2026-07-25T18:15:00Z"), KATHMANDU);
  check("midnight is minute 0", local.minutes === 0, `got ${local.minutes}`);
}

check("parse 18:30", parseTimeToMinutes("18:30") === 1110);
check("parse rejects junk", parseTimeToMinutes("25:99") === null);
check("format 1560 wraps to 02:00", formatMinutes(1560) === "02:00");
check("format12h 1110", formatMinutes12h(1110) === "6:30 PM");
check("format12h noon", formatMinutes12h(720) === "12 PM");
check("format12h midnight", formatMinutes12h(0) === "12 AM");

check("valid window", isValidWindow(1080, 1560));
check("window rejects close <= open", !isValidWindow(600, 600));
check("window rejects >24h span", !isValidWindow(0, 1441));

// A bar open 18:00–02:00. `closeMin` 1560 encodes the overnight spill in one row.
const barWeek: HoursWindow[] = buildUniformWeek("DINE_IN", 1080, 1560);

{
  // 20:00 Saturday — inside the window that opened the same evening.
  const moment = { dayOfWeek: 6, minutes: 1200, dateKey: "2026-07-25" };
  const r = isOpenAt(moment, "DINE_IN", barWeek);
  check("overnight: open at 20:00", r.open && !r.fromPreviousDay);
}
{
  // 00:30 Sunday — STILL open from Saturday. Sunday's own row says nothing about
  // this; only the yesterday-spill check catches it. This is the case naive
  // `open <= now <= close` implementations get wrong.
  const moment = { dayOfWeek: 0, minutes: 30, dateKey: "2026-07-26" };
  const r = isOpenAt(moment, "DINE_IN", barWeek);
  check("overnight: still open at 00:30 from yesterday", r.open && r.fromPreviousDay);
  check("overnight: closesAt wraps to 120", r.closesAtMin === 120, `got ${r.closesAtMin}`);
}
{
  // 03:00 Sunday — yesterday's window ended at 02:00, today's starts at 18:00.
  const moment = { dayOfWeek: 0, minutes: 180, dateKey: "2026-07-26" };
  check("overnight: closed at 03:00", !isOpenAt(moment, "DINE_IN", barWeek).open);
}
{
  // Exactly at open is OPEN; exactly at close is CLOSED (half-open interval).
  const openMoment = { dayOfWeek: 6, minutes: 1080, dateKey: "2026-07-25" };
  check("boundary: exactly at open is open", isOpenAt(openMoment, "DINE_IN", barWeek).open);

  const dayWeek = buildUniformWeek("DINE_IN", 540, 1380); // 09:00–23:00
  const closeMoment = { dayOfWeek: 6, minutes: 1380, dateKey: "2026-07-25" };
  check("boundary: exactly at close is closed", !isOpenAt(closeMoment, "DINE_IN", dayWeek).open);
}
{
  // Closed Tuesdays — the case the legacy two-string model cannot express at all.
  const week = buildUniformWeek("DINE_IN", 540, 1380).map((w) =>
    w.dayOfWeek === 2 ? { ...w, isClosed: true } : w,
  );
  const tuesday = { dayOfWeek: 2, minutes: 720, dateKey: "2026-07-28" };
  const wednesday = { dayOfWeek: 3, minutes: 720, dateKey: "2026-07-29" };
  check("closed day: Tuesday shut", !isOpenAt(tuesday, "DINE_IN", week).open);
  check("closed day: Wednesday open", isOpenAt(wednesday, "DINE_IN", week).open);
}
{
  // A special-date closure must beat the weekly rule.
  const week = buildUniformWeek("DINE_IN", 540, 1380);
  const special: SpecialHoursWindow[] = [
    { date: "2026-07-25", serviceType: "ALL", isClosed: true, openMin: null, closeMin: null, reason: "Holiday" },
  ];
  const moment = { dayOfWeek: 6, minutes: 720, dateKey: "2026-07-25" };
  check("special: closure beats weekly rule", !isOpenAt(moment, "DINE_IN", week, special).open);
  check("special: normal day unaffected", isOpenAt({ ...moment, dateKey: "2026-07-26", dayOfWeek: 0 }, "DINE_IN", week, special).open);
}
{
  // A service-specific override must beat a blanket one.
  const week = buildUniformWeek("DELIVERY", 540, 1380);
  const special: SpecialHoursWindow[] = [
    { date: "2026-07-25", serviceType: "ALL", isClosed: true, openMin: null, closeMin: null },
    { date: "2026-07-25", serviceType: "DELIVERY", isClosed: false, openMin: 600, closeMin: 780 },
  ];
  const inside = { dayOfWeek: 6, minutes: 700, dateKey: "2026-07-25" };
  const outside = { dayOfWeek: 6, minutes: 900, dateKey: "2026-07-25" };
  check("special: service override beats blanket", isOpenAt(inside, "DELIVERY", week, special).open);
  check("special: service override bounds respected", !isOpenAt(outside, "DELIVERY", week, special).open);
}
{
  // PRODUCTION PATH: Prisma returns `@db.Date` as a UTC-midnight Date object, not
  // a string. The string form above is only what a JSON client sends, so this is
  // the path that actually runs in the app.
  const week = buildUniformWeek("DINE_IN", 540, 1380);
  const special: SpecialHoursWindow[] = [
    {
      date: new Date(Date.UTC(2026, 6, 25)),
      serviceType: "ALL",
      isClosed: true,
      openMin: null,
      closeMin: null,
      reason: "Dashain",
    },
  ];
  const onHoliday = { dayOfWeek: 6, minutes: 720, dateKey: "2026-07-25" };
  const nextDay = { dayOfWeek: 0, minutes: 720, dateKey: "2026-07-26" };
  check("special: Date object closure honoured", !isOpenAt(onHoliday, "DINE_IN", week, special).open);
  check("special: Date object does not leak to next day", isOpenAt(nextDay, "DINE_IN", week, special).open);
}
{
  // A 24-hour venue: openMin 0, closeMin 1440 is a full day and NOT overnight.
  const week = buildUniformWeek("DINE_IN", 0, 1440);
  check("24h: open at 03:00", isOpenAt({ dayOfWeek: 3, minutes: 180, dateKey: "2026-07-29" }, "DINE_IN", week).open);
  check("24h: open at 23:59", isOpenAt({ dayOfWeek: 3, minutes: 1439, dateKey: "2026-07-29" }, "DINE_IN", week).open);
  check("24h: window is valid", isValidWindow(0, 1440));
}
{
  const week = buildUniformWeek("DINE_IN", 1080, 1560);
  const beforeOpen = { dayOfWeek: 6, minutes: 600, dateKey: "2026-07-25" };
  const next = nextOpenAt(beforeOpen, "DINE_IN", week);
  check("nextOpen: later today", next?.daysAhead === 0 && next?.openMin === 1080);

  const afterClose = { dayOfWeek: 6, minutes: 1000, dateKey: "2026-07-25" };
  check("nextOpen: still today when open is ahead", nextOpenAt(afterClose, "DINE_IN", week)?.daysAhead === 0);

  check("nextOpen: null when never open", nextOpenAt(beforeOpen, "DINE_IN", []) === null);
}

/* ── operational-status.ts ────────────────────────────────────────── */

{
  // The manual override beats a schedule that says open.
  const status = getRestaurantOperationalStatus(
    { isOpen: false, timezone: KATHMANDU, capability: { dineInEnabled: true, deliveryEnabled: true, pickupEnabled: false } },
    buildUniformWeek("DINE_IN", 0, 1439),
    [],
    new Date("2026-07-25T06:00:00Z"),
  );
  check("status: manual close wins", !status.isOpen && status.reason === "MANUALLY_CLOSED");
  check("status: manual close stops delivery too", !status.deliveryOpen);
}
{
  // Delivery closing earlier than dine-in is the common real case.
  const hours: HoursWindow[] = [
    ...buildUniformWeek("DINE_IN", 540, 1380), // 09:00–23:00
    ...buildUniformWeek("DELIVERY", 600, 1290), // 10:00–21:30
  ];
  // 22:00 Nepal = 16:15 UTC.
  const at = new Date("2026-07-25T16:15:00Z");
  const status = getRestaurantOperationalStatus(
    { isOpen: true, timezone: KATHMANDU, capability: { dineInEnabled: true, deliveryEnabled: true, pickupEnabled: false } },
    hours,
    [],
    at,
  );
  check("status: dine-in open at 22:00", status.isOpen, `reason ${status.reason}`);
  check("status: delivery already shut", !status.deliveryOpen && status.deliveryReason === "DELIVERY_CLOSED");
  check("status: closesAt reported", status.closesAt === "23:00", `got ${status.closesAt}`);
}
{
  // Delivery with no rows of its own inherits the dine-in schedule.
  const status = getRestaurantOperationalStatus(
    { isOpen: true, timezone: KATHMANDU, capability: { dineInEnabled: true, deliveryEnabled: true, pickupEnabled: false } },
    buildUniformWeek("DINE_IN", 540, 1380),
    [],
    new Date("2026-07-25T06:00:00Z"), // 11:45 Nepal
  );
  check("status: delivery inherits dine-in hours", status.deliveryOpen);
}
{
  // Un-migrated restaurants fall back to the legacy two-string schedule.
  const status = getRestaurantOperationalStatus(
    { isOpen: true, timezone: KATHMANDU, openingTime: "09:00", closingTime: "23:00", deliveryEnabled: true },
    [],
    [],
    new Date("2026-07-25T06:00:00Z"), // 11:45 Nepal
  );
  check("status: legacy fallback open", status.isOpen, `reason ${status.reason}`);
}
{
  // Legacy close <= open is the old way of saying "we run past midnight".
  const status = getRestaurantOperationalStatus(
    { isOpen: true, timezone: KATHMANDU, openingTime: "18:00", closingTime: "02:00" },
    [],
    [],
    new Date("2026-07-25T18:30:00Z"), // 00:15 Nepal, next day
  );
  check("status: legacy overnight handled", status.isOpen, `reason ${status.reason}`);
}
{
  const status = getRestaurantOperationalStatus(
    { isOpen: true, timezone: KATHMANDU, capability: { dineInEnabled: true, deliveryEnabled: false, pickupEnabled: false } },
    buildUniformWeek("DINE_IN", 540, 1380),
    [],
    new Date("2026-07-25T06:00:00Z"),
  );
  check("status: delivery not offered", !status.deliveryOpen && status.deliveryReason === "NOT_OFFERED");
}
{
  // "When do you next open" is only meaningful while shut.
  const week = buildUniformWeek("DINE_IN", 540, 1380);
  const openNow = getRestaurantOperationalStatus(
    { isOpen: true, timezone: KATHMANDU }, week, [], new Date("2026-07-25T06:00:00Z"),
  );
  check("status: nextOpening null while open", openNow.nextOpening === null, `got ${openNow.nextOpening}`);

  const shut = getRestaurantOperationalStatus(
    { isOpen: true, timezone: KATHMANDU }, week, [], new Date("2026-07-25T01:00:00Z"), // 06:45 Nepal
  );
  check("status: nextOpening present while shut", typeof shut.nextOpening === "string", `got ${shut.nextOpening}`);
  check("status: describeStatus reads well when open", describeStatus(openNow) === "Open until 23:00", describeStatus(openNow));
  check("status: manually closed copy", describeStatus({ ...openNow, isOpen: false, reason: "MANUALLY_CLOSED" }) === "Temporarily closed");
}
{
  // The legacy columns were never validated on write; garbage must degrade to a
  // clear NO_HOURS_SET rather than a silent permanent "closed".
  const status = getRestaurantOperationalStatus(
    { isOpen: true, timezone: KATHMANDU, openingTime: "99:00", closingTime: "23:00" },
    [], [], new Date("2026-07-25T06:00:00Z"),
  );
  check("status: garbage legacy hours report NO_HOURS_SET", status.reason === "NO_HOURS_SET", `got ${status.reason}`);
}
{
  // The formatter cache must not leak state between timezones.
  const at = new Date("2026-07-25T18:30:00Z");
  const ktm1 = toLocalMoment(at, KATHMANDU);
  const utc = toLocalMoment(at, "UTC");
  const ktm2 = toLocalMoment(at, KATHMANDU);
  check(
    "cache: repeated lookups are stable across timezones",
    ktm1.dateKey === ktm2.dateKey && ktm1.minutes === ktm2.minutes && utc.dateKey !== ktm1.dateKey,
  );
  // An unrecognised identifier must degrade to UTC, not throw.
  const bogus = toLocalMoment(at, "Not/AZone");
  check("cache: bogus timezone falls back to UTC", bogus.dateKey === utc.dateKey);
}

/* ── the delivery-enable gate ─────────────────────────────────────── */

// This gate runs against LIVE restaurants that have no per-day rows yet. If it
// only counted rows, every existing restaurant would lose the ability to turn on
// delivery the moment this deploys — pointed at an editor that does not exist.
{
  const legacyDefaults = { openingTime: "09:00", closingTime: "23:00" };
  check("gate: live restaurant with legacy hours only is allowed", hasResolvableSchedule(legacyDefaults, 0));
  check("gate: per-day rows are allowed", hasResolvableSchedule({ openingTime: null, closingTime: null }, 7));
  check("gate: rows win even with junk legacy values", hasResolvableSchedule({ openingTime: "junk", closingTime: "junk" }, 7));
  check("gate: no rows and unparseable legacy is refused", !hasResolvableSchedule({ openingTime: "junk", closingTime: "" }, 0));
  check("gate: no rows and no legacy at all is refused", !hasResolvableSchedule({ openingTime: null, closingTime: null }, 0));
  check("gate: legacy overnight pair is allowed", hasResolvableSchedule({ openingTime: "18:00", closingTime: "02:00" }, 0));
}

/* ── geo.ts ───────────────────────────────────────────────────────── */

{
  // One degree of latitude is ~111.19 km on a sphere — an independent check that
  // the haversine is not merely self-consistent.
  const d = haversineKm({ latitude: 27, longitude: 85 }, { latitude: 28, longitude: 85 });
  check("geo: 1° latitude ≈ 111.19 km", near(d, 111.19, 0.5), `got ${d.toFixed(2)}`);
}
{
  // Kathmandu → Pokhara, ~140 km straight line.
  const d = haversineKm(
    { latitude: 27.7172, longitude: 85.324 },
    { latitude: 28.2096, longitude: 83.9856 },
  );
  check("geo: Kathmandu→Pokhara ≈ 140 km", near(d, 140, 6), `got ${d.toFixed(1)}`);
}
{
  // Thamel → Patan Durbar Square, a few km across the valley.
  const d = haversineKm(
    { latitude: 27.7154, longitude: 85.3123 },
    { latitude: 27.6727, longitude: 85.325 },
  );
  check("geo: intra-valley hop is 4–6 km", d > 4 && d < 6, `got ${d.toFixed(2)}`);
}
check("geo: zero distance", haversineKm({ latitude: 27.7, longitude: 85.3 }, { latitude: 27.7, longitude: 85.3 }) === 0);

{
  // The box must actually contain every point within the radius — verified by
  // probing the four cardinal extremes.
  const centre = { latitude: 27.7172, longitude: 85.324 };
  const box = boundingBox(centre, 5);
  const north = { latitude: centre.latitude + 5 / 111.32, longitude: centre.longitude };
  check("geo: box contains northern extreme", north.latitude <= box.maxLat + 1e-9);
  check("geo: box brackets centre", box.minLat < centre.latitude && box.maxLat > centre.latitude);
  check("geo: longitude span widens with latitude", box.maxLng - box.minLng > box.maxLat - box.minLat);
}

check("geo: rejects (0,0)", !isValidLatLng(0, 0));
check("geo: rejects null", !isValidLatLng(null, 85.3));
check("geo: accepts Kathmandu", isValidLatLng(27.7172, 85.324));

{
  const eta = estimateEtaMins(3, 30);
  check("geo: ETA includes prep + travel", eta >= 40 && eta <= 50, `got ${eta}`);
  check("geo: ETA rounds to 5", eta % 5 === 0, `got ${eta}`);
}

/* ── delivery-pricing.ts ──────────────────────────────────────────── */

const zones: PricingZone[] = [
  { id: "inner", name: "Inner Ring", baseFee: 50, perKmFee: 15, freeAbove: 1500, maxRadiusKm: 3, isActive: true },
  { id: "outer", name: "Outer Ring", baseFee: 80, perKmFee: 20, freeAbove: 2500, maxRadiusKm: 10, isActive: true },
  { id: "off", name: "Retired", baseFee: 1, perKmFee: 1, freeAbove: null, maxRadiusKm: 50, isActive: false },
];

check("pricing: narrowest covering zone wins", selectZone(zones, 2)?.id === "inner");
check("pricing: falls to wider zone", selectZone(zones, 6)?.id === "outer");
check("pricing: inactive zone never selected", selectZone(zones, 40) === null);

{
  const pickup = { latitude: 27.7172, longitude: 85.324 };
  const q = computeDeliveryFee({
    pickup,
    dropoff: { latitude: 27.7172, longitude: 85.324 },
    zones,
    subtotal: 500,
    maxRadiusKm: 10,
  });
  check("pricing: zero distance still charges base", q.ok && q.finalFee === 50, q.ok ? `got ${q.finalFee}` : q.reason);
  check("pricing: zero distance has no distance fee", q.ok && q.distanceFee === 0);
}
{
  // freeAbove is inclusive at the boundary — 1500 exactly must be free.
  const pickup = { latitude: 27.7172, longitude: 85.324 };
  const dropoff = { latitude: 27.73, longitude: 85.324 };
  const atBoundary = computeDeliveryFee({ pickup, dropoff, zones, subtotal: 1500, maxRadiusKm: 10 });
  const belowBoundary = computeDeliveryFee({ pickup, dropoff, zones, subtotal: 1499.99, maxRadiusKm: 10 });
  check("pricing: freeAbove inclusive at boundary", atBoundary.ok && atBoundary.isFree, atBoundary.ok ? `fee ${atBoundary.finalFee}` : atBoundary.reason);
  check("pricing: just below boundary still charged", belowBoundary.ok && !belowBoundary.isFree);
  check("pricing: free order records the discount", atBoundary.ok && atBoundary.discount > 0);
}
{
  // The capability radius is the outer boundary and must beat a wider zone.
  const q = computeDeliveryFee({
    pickup: { latitude: 27.7172, longitude: 85.324 },
    dropoff: { latitude: 27.9, longitude: 85.324 },
    zones,
    subtotal: 500,
    maxRadiusKm: 5,
  });
  check("pricing: out of range refused", !q.ok && q.reason === "OUT_OF_RANGE");
}
{
  const q = computeDeliveryFee({
    pickup: { latitude: 0, longitude: 0 },
    dropoff: { latitude: 27.7, longitude: 85.3 },
    zones,
    subtotal: 500,
    maxRadiusKm: 10,
  });
  check("pricing: missing coordinates refused", !q.ok && q.reason === "NO_COORDINATES");
}
{
  const q = computeDeliveryFee({
    pickup: { latitude: 27.7172, longitude: 85.324 },
    dropoff: { latitude: 27.72, longitude: 85.33 },
    zones: [],
    subtotal: 500,
    maxRadiusKm: 10,
  });
  check("pricing: no zone configured refused", !q.ok && q.reason === "NO_ZONE");
}

/* ── delivery/transitions.ts ──────────────────────────────────────── */

check("fsm: happy path assign", canTransition("READY_FOR_PICKUP", "ASSIGNED", "RESTAURANT").allowed);
check("fsm: driver picks up", canTransition("ASSIGNED", "PICKED_UP", "DRIVER").allowed);
check("fsm: driver delivers", canTransition("IN_TRANSIT", "DELIVERED", "DRIVER").allowed);

// A restaurant may not declare an order delivered — only the rider who handed it
// over can. This is the rule that stops a dashboard button faking completion.
check("fsm: restaurant cannot mark delivered", !canTransition("IN_TRANSIT", "DELIVERED", "RESTAURANT").allowed);
check(
  "fsm: wrong actor reports FORBIDDEN_ACTOR",
  (canTransition("IN_TRANSIT", "DELIVERED", "RESTAURANT") as { code?: string }).code === "FORBIDDEN_ACTOR",
);
check("fsm: customer cannot assign a rider", !canTransition("READY_FOR_PICKUP", "ASSIGNED", "CUSTOMER").allowed);
check("fsm: driver cannot cancel", !canTransition("ASSIGNED", "CANCELLED", "DRIVER").allowed);

// Skipping states is illegal — no jumping straight from PENDING to DELIVERED.
check("fsm: cannot skip to delivered", !canTransition("PENDING", "DELIVERED", "DRIVER").allowed);
check(
  "fsm: skipping reports ILLEGAL_EDGE",
  (canTransition("PENDING", "DELIVERED", "DRIVER") as { code?: string }).code === "ILLEGAL_EDGE",
);
check("fsm: cannot reverse delivered", !canTransition("DELIVERED", "IN_TRANSIT", "ADMIN").allowed);
check(
  "fsm: terminal reports TERMINAL",
  (canTransition("DELIVERED", "IN_TRANSIT", "ADMIN") as { code?: string }).code === "TERMINAL",
);

check("fsm: customer may cancel before dispatch", canTransition("PENDING", "CANCELLED", "CUSTOMER").allowed);
// Once a rider is holding the food it stops being a self-service action.
check("fsm: customer cannot cancel after assignment", !canTransition("ASSIGNED", "CANCELLED", "CUSTOMER").allowed);

check("fsm: terminal states are terminal", isTerminal("DELIVERED") && isTerminal("CANCELLED") && isTerminal("RETURNED"));
check("fsm: in-flight states are not terminal", !isTerminal("IN_TRANSIT") && !isTerminal("PENDING"));
check("fsm: no transitions out of a terminal state", allowedTransitions("DELIVERED", "ADMIN").length === 0);
check("fsm: driver sees exactly one next step when assigned", allowedTransitions("ASSIGNED", "DRIVER").join() === "PICKED_UP");

/* ── station routing ──────────────────────────────────────────────── */

check("station: plain food", stationForItem({ isDrink: false }) === "FOOD");
check("station: soft drink", stationForItem({ isDrink: true, drinkCategory: "COLD" }) === "DRINKS");
check("station: alcohol goes to the bar", stationForItem({ isDrink: true, drinkCategory: "ALCOHOL" }) === "BAR");
// drinkCategory is a free-form column, so casing must not decide routing.
check("station: alcohol casing tolerated", stationForItem({ isDrink: true, drinkCategory: "alcohol" }) === "BAR");
check("station: drink with no category", stationForItem({ isDrink: true, drinkCategory: null }) === "DRINKS");

/* ── report ──────────────────────────────────────────────────────── */

console.log(`\n  ${passed} passed, ${failures.length} failed\n`);
if (failures.length) {
  for (const f of failures) console.error(`  ✗ ${f}`);
  console.error("");
  process.exit(1);
}
console.log("  All delivery foundation checks passed.\n");
