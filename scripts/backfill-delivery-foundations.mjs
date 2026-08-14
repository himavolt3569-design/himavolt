#!/usr/bin/env node

/**
 * Backfill for the delivery-platform Phase 0 schema.
 *
 * Creates, for every existing restaurant:
 *   · one `RestaurantCapability` row, seeded from the legacy
 *     `Restaurant.deliveryEnabled` column
 *   · seven `RestaurantHours` rows (DINE_IN), derived from the legacy
 *     `openingTime` / `closingTime` strings
 *
 * RUN THIS AFTER the schema is pushed (`ADDITIVE_SCHEMA_SYNC=true`) and BEFORE
 * shipping the code that reads the new tables.
 *
 *   node scripts/backfill-delivery-foundations.mjs --dry-run   # inspect first
 *   node scripts/backfill-delivery-foundations.mjs
 *
 * Idempotent by construction: capabilities are upserted, and hours are only
 * written for restaurants that have none. A partial or interrupted run can be
 * re-run safely, and a second full run is a no-op. It never overwrites hours an
 * owner has already edited.
 *
 * ⚠️ This writes to whatever DATABASE_URL points at, which locally is
 * PRODUCTION. Use --dry-run first. Every write is real customer data.
 */

import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import pkg from "../src/generated/prisma/index.js";

const { PrismaClient } = pkg;

const DRY_RUN = process.argv.includes("--dry-run");
const MINUTES_PER_DAY = 1440;

/**
 * Batch work goes over DIRECT_URL, not the pooler. Supabase's transaction-mode
 * pooler is tuned for many short-lived serverless connections; a long sequential
 * backfill belongs on the direct connection, same as the migrate CLI.
 */
function createClient() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Set DIRECT_URL (preferred) or DATABASE_URL before running.");
  }
  const isRemote = /supabase|amazonaws|neon|render/i.test(connectionString);
  const pool = new Pool({
    connectionString,
    max: 2,
    ssl: isRemote ? { rejectUnauthorized: false } : undefined,
  });
  return {
    db: new PrismaClient({ adapter: new PrismaPg(pool) }),
    pool,
    target: connectionString.replace(/:[^:@/]+@/, ":****@"),
  };
}

/** `"18:30"` → 1110. Null on anything unparseable. */
function parseTimeToMinutes(value) {
  if (typeof value !== "string") return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

/**
 * Legacy `closingTime <= openingTime` was the old way of expressing "we run past
 * midnight" — a bar saved as 18:00→02:00. Carry that into the overnight
 * representation (`closeMin > 1440`) rather than discarding it.
 */
function deriveWindow(openingTime, closingTime) {
  const openMin = parseTimeToMinutes(openingTime);
  const rawClose = parseTimeToMinutes(closingTime);
  if (openMin == null || rawClose == null) return null;
  const closeMin = rawClose <= openMin ? rawClose + MINUTES_PER_DAY : rawClose;
  return { openMin, closeMin };
}

/** Applied when the legacy columns are unusable. Deliberately conservative. */
const FALLBACK_WINDOW = { openMin: 540, closeMin: 1380 }; // 09:00–23:00

async function main() {
  const { db, pool, target } = createClient();

  console.log(
    DRY_RUN
      ? "\n▶ DRY RUN — inspecting only, nothing will be written."
      : "\n▶ Backfilling delivery foundations…",
  );
  // Print the target every time. Locally this points at PRODUCTION, and the
  // operator should see which database they are about to write to.
  console.log(`  Target: ${target}\n`);

  const restaurants = await db.restaurant.findMany({
    select: {
      id: true,
      name: true,
      openingTime: true,
      closingTime: true,
      deliveryEnabled: true,
      capability: { select: { id: true } },
      _count: { select: { hours: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(`  Found ${restaurants.length} restaurants.\n`);

  const stats = {
    capabilitiesCreated: 0,
    capabilitiesSkipped: 0,
    hoursCreated: 0,
    hoursSkipped: 0,
    fallbackUsed: 0,
    overnightPreserved: 0,
  };

  for (const r of restaurants) {
    const label = `${r.name} (${r.id.slice(0, 8)})`;

    /* ── Capability ─────────────────────────────────────────────── */
    if (r.capability) {
      stats.capabilitiesSkipped++;
    } else {
      if (!DRY_RUN) {
        await db.restaurantCapability.upsert({
          where: { restaurantId: r.id },
          // dineIn stays true (every venue served customers before delivery
          // existed); delivery carries over exactly what the owner had set.
          create: { restaurantId: r.id, deliveryEnabled: r.deliveryEnabled },
          update: {},
        });
      }
      stats.capabilitiesCreated++;
      console.log(
        `  + capability   ${label} — delivery ${r.deliveryEnabled ? "ON" : "off"}`,
      );
    }

    /* ── Hours ──────────────────────────────────────────────────── */
    if (r._count.hours > 0) {
      // Never clobber hours an owner has already set by hand.
      stats.hoursSkipped++;
      continue;
    }

    let window = deriveWindow(r.openingTime, r.closingTime);
    if (!window) {
      window = FALLBACK_WINDOW;
      stats.fallbackUsed++;
      console.log(
        `  ! fallback     ${label} — unparseable "${r.openingTime}"–"${r.closingTime}", using 09:00–23:00`,
      );
    } else if (window.closeMin > MINUTES_PER_DAY) {
      stats.overnightPreserved++;
    }

    const rows = Array.from({ length: 7 }, (_, dayOfWeek) => ({
      restaurantId: r.id,
      serviceType: "DINE_IN",
      dayOfWeek,
      isClosed: false,
      openMin: window.openMin,
      closeMin: window.closeMin,
    }));

    if (!DRY_RUN) {
      // skipDuplicates makes a re-run after a partial failure a no-op rather
      // than a unique-constraint crash.
      await db.restaurantHours.createMany({ data: rows, skipDuplicates: true });
    }
    stats.hoursCreated += rows.length;
    console.log(
      `  + hours        ${label} — ${r.openingTime}–${r.closingTime}` +
        (window.closeMin > MINUTES_PER_DAY ? " (overnight)" : ""),
    );
  }

  console.log("\n  ── Summary ──");
  console.log(`  Capabilities created : ${stats.capabilitiesCreated}`);
  console.log(`  Capabilities existing: ${stats.capabilitiesSkipped}`);
  console.log(`  Hours rows created   : ${stats.hoursCreated}`);
  console.log(`  Restaurants w/ hours : ${stats.hoursSkipped} (left untouched)`);
  console.log(`  Overnight preserved  : ${stats.overnightPreserved}`);
  console.log(`  Fallback window used : ${stats.fallbackUsed}`);
  console.log(
    DRY_RUN
      ? "\n  DRY RUN — nothing was written. Re-run without --dry-run to apply.\n"
      : "\n  Done.\n",
  );

  await db.$disconnect();
  await pool.end();
}

main().catch(async (err) => {
  console.error("\n  Backfill failed:", err);
  console.error("\n  Safe to re-run — the script is idempotent.\n");
  process.exit(1);
});
