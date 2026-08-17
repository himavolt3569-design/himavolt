#!/usr/bin/env node

/**
 * Vercel Build Script
 *
 * Handles the full build pipeline for Vercel deployments:
 *   1. prisma generate  — generates the Prisma Client (no DB connection needed)
 *   2. migrate data     — convert legacy OrderStatus values before schema sync
 *   3. prisma db push   — syncs schema to Supabase using the DIRECT connection
 *                          (bypasses PgBouncer pooler to avoid MaxClientsInSessionMode)
 *   4. next build        — builds the Next.js application
 *
 * Required Vercel Environment Variables:
 *   DATABASE_URL          — Supabase pooled connection (used at runtime by the app)
 *   DIRECT_URL             — Supabase direct connection (used here for schema sync)
 */

import { execSync } from "node:child_process";

function run(cmd, env = {}) {
  console.log(`\n▶ ${cmd}\n`);
  execSync(cmd, {
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
}

/**
 * Step 1.5 — Migrate legacy OrderStatus enum values
 *
 * The schema now only allows PENDING | ACCEPTED | REJECTED.
 * Existing rows with PREPARING / READY / DELIVERED / CANCELLED must be
 * updated BEFORE `prisma db push` tries to drop those enum variants,
 * otherwise PostgreSQL will reject the ALTER TYPE.
 *
 * We run raw SQL via psql (available on Vercel build images) or via
 * node-postgres which Prisma bundles as a transitive dependency.
 */
async function migrateOrderStatuses(connectionString) {
  console.log("\n▶ Migrating legacy OrderStatus values…\n");
  let pg;
  try {
    pg = await import("pg");
  } catch {
    // pg may not be installed — use psql fallback
    console.log("  pg module not found, using psql fallback…");
    const sql = `
      UPDATE "orders" SET "status" = 'ACCEPTED'::"OrderStatus"
        WHERE "status"::text IN ('PREPARING', 'READY', 'DELIVERED');
      UPDATE "orders" SET "status" = 'REJECTED'::"OrderStatus"
        WHERE "status"::text = 'CANCELLED';
    `;
    execSync(`psql "${connectionString}" -c "${sql.replace(/"/g, '\\"')}"`, {
      stdio: "inherit",
    });
    return;
  }

  const Client = pg.default?.Client ?? pg.Client;
  const client = new Client({ connectionString });
  try {
    await client.connect();

    // Check if legacy values still exist before running updates
    const { rows } = await client.query(
      `SELECT "status"::text AS status, COUNT(*)::int AS cnt FROM "orders"
       WHERE "status"::text IN ('PREPARING', 'READY', 'DELIVERED', 'CANCELLED')
       GROUP BY "status"::text`
    );

    if (rows.length === 0) {
      console.log("  ✓ No legacy statuses found — skipping.\n");
      return;
    }

    console.log("  Found legacy statuses:", rows.map((r) => `${r.status}(${r.cnt})`).join(", "));

    await client.query(`BEGIN`);

    // PREPARING, READY, DELIVERED → ACCEPTED (completed/in-progress orders)
    const r1 = await client.query(
      `UPDATE "orders" SET "status" = 'ACCEPTED' WHERE "status"::text IN ('PREPARING', 'READY', 'DELIVERED')`
    );
    console.log(`  ✓ ${r1.rowCount} orders → ACCEPTED`);

    // CANCELLED → REJECTED
    const r2 = await client.query(
      `UPDATE "orders" SET "status" = 'REJECTED' WHERE "status"::text = 'CANCELLED'`
    );
    console.log(`  ✓ ${r2.rowCount} orders → REJECTED`);

    await client.query(`COMMIT`);
    console.log("  ✓ Data migration complete.\n");
  } catch (err) {
    await client.query(`ROLLBACK`).catch(() => {});
    throw err;
  } finally {
    await client.end();
  }
}

// Step 1 — Generate Prisma Client (no DB connection required)
run("npx prisma generate");

// ─── Deployment Safety Guard — 3 schema-sync modes ──────────────────────────
//
// Schema sync mutates the live database, so it is OFF by default and split into
// three explicit modes (lowest privilege wins unless a higher one is opted in):
//
//   1. NORMAL BUILD (default — no flags)
//      → `prisma generate` + `next build` only. No DB writes. Safe for any
//        non-schema deploy and for an accidental local `npm run build`.
//
//   2. ADDITIVE SCHEMA SYNC  (ADDITIVE_SCHEMA_SYNC=true)
//      → `prisma db push` WITHOUT `--accept-data-loss`. Applies additive
//        changes (new optional columns/tables/indexes) and REFUSES if any
//        destructive change would be required — so it can never drop data.
//        This is the mode for additive phases (e.g. Phase 2's new MenuItem
//        fields).
//
//   3. DESTRUCTIVE SYNC  (ALLOW_PRISMA_ACCEPT_DATA_LOSS=true)
//      → runs the legacy OrderStatus data migration + `prisma db push
//        --accept-data-loss`. This CAN drop columns/tables/enum variants and
//        must only be enabled for a single, reviewed, deliberate deploy.
//
// All schema-sync modes use DIRECT_URL (non-pooled) to avoid PgBouncer limits.
//
/**
 * Normalize a Postgres connection URL that arrived via an environment variable.
 *
 * A dashboard-pasted value can be truthy — so it sails past a `!directUrl`
 * check — while still being unparseable. Prisma then fails with P1013 "the
 * scheme is not recognized", which names neither the variable nor the defect,
 * 1.5s into the build. Every repair below is for something that is NEVER valid
 * inside a connection URI, so fixing it silently loses no information.
 *
 * Returns the cleaned URL, or exits with a redacted diagnostic if it is still
 * not a Postgres URL after repair.
 */
function normalizeConnectionUrl(raw, varName) {
  const repairs = [];
  let v = raw;

  // BOM / zero-width / non-breaking space. These survive a copy out of a
  // styled code block (the Supabase connect panel renders one) and are
  // invisible in the Vercel UI, the Supabase UI, and any diff.
  const invisible = /[﻿​-‍⁠ ]/g;
  const withoutInvisible = v.replace(invisible, "");
  if (withoutInvisible !== v) {
    v = withoutInvisible;
    repairs.push("stripped invisible characters (BOM/zero-width/nbsp)");
  }

  if (v !== v.trim()) {
    v = v.trim();
    repairs.push("trimmed surrounding whitespace or newline");
  }

  // Quoting is correct in a .env file and wrong in a dashboard field, which
  // stores the quotes as part of the value.
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1).trim();
    repairs.push("removed surrounding quotes");
  }

  // The Supabase connect panel's Type dropdown also offers a psql command;
  // pasting that whole line is an easy mis-click away from the URI option.
  const psql = v.match(/^psql\s+["']?(postgres(?:ql)?:\/\/\S+?)["']?$/);
  if (psql) {
    v = psql[1];
    repairs.push("unwrapped a psql command");
  }

  if (!/^postgres(ql)?:\/\//.test(v)) {
    // Redacted: first 12 chars only, plus code points, so an invisible or
    // unexpected leading byte is identifiable without printing the password.
    const head = v.slice(0, 12);
    const codes = [...v.slice(0, 4)]
      .map((c) => `U+${c.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}`)
      .join(" ");
    console.error(
      "\n" +
      "════════════════════════════════════════════════════════════════════\n" +
      `✖  ${varName} is set but is not a Postgres connection URL.\n` +
      "════════════════════════════════════════════════════════════════════\n" +
      `   length      : ${raw.length}\n` +
      `   starts with : ${JSON.stringify(head)}\n` +
      `   code points : ${codes}\n` +
      `   expected    : postgresql://postgres.<ref>:<password>@<region>.pooler.supabase.com:5432/postgres\n` +
      "\n   Fix the value in Vercel → Settings → Environment Variables.\n" +
      "   See docs/10-env-recovery.md for where each value comes from.\n" +
      "════════════════════════════════════════════════════════════════════\n"
    );
    process.exit(1);
  }

  if (repairs.length > 0) {
    console.warn(`\n⚠  ${varName} needed repair before use: ${repairs.join("; ")}.`);
    console.warn(`   Correct the stored value so future builds do not rely on this.\n`);
  }

  return v;
}

const allowDataLoss = process.env.ALLOW_PRISMA_ACCEPT_DATA_LOSS === "true";
const additiveSync = process.env.ADDITIVE_SCHEMA_SYNC === "true";
const directUrl = process.env.DIRECT_URL
  ? normalizeConnectionUrl(process.env.DIRECT_URL, "DIRECT_URL")
  : process.env.DIRECT_URL;

if (allowDataLoss) {
  // ── Mode 3: DESTRUCTIVE sync (emergency, explicitly authorized) ──
  if (!directUrl) {
    console.warn(
      "\n⚠  ALLOW_PRISMA_ACCEPT_DATA_LOSS=true but DIRECT_URL is not set —",
      "\n   skipping prisma db push. Set DIRECT_URL (db.<ref>.supabase.co:5432).\n"
    );
  } else {
    console.log(
      "\n" +
      "════════════════════════════════════════════════════════════════════\n" +
      "⚠  DESTRUCTIVE SCHEMA SYNC AUTHORIZED (--accept-data-loss)\n" +
      "════════════════════════════════════════════════════════════════════\n" +
      "   Running the OrderStatus data migration + `prisma db push\n" +
      "   --accept-data-loss`. This can DROP data. Ensure this deploy was\n" +
      "   reviewed for destructive schema changes.\n" +
      "════════════════════════════════════════════════════════════════════\n"
    );
    await migrateOrderStatuses(directUrl);
    // Both vars: prisma.config.ts prefers DIRECT_URL, so the child must not
    // inherit the raw (unnormalized) one from the build environment.
    run("npx prisma db push --accept-data-loss", {
      DATABASE_URL: directUrl,
      DIRECT_URL: directUrl,
    });
  }
} else if (additiveSync) {
  // ── Mode 2: ADDITIVE sync (safe — no --accept-data-loss) ──
  if (!directUrl) {
    console.warn(
      "\n⚠  ADDITIVE_SCHEMA_SYNC=true but DIRECT_URL is not set —",
      "\n   skipping prisma db push. Set DIRECT_URL (db.<ref>.supabase.co:5432).\n"
    );
  } else {
    console.log(
      "\n▶ ADDITIVE_SCHEMA_SYNC=true — running additive schema sync",
      "(prisma db push, no --accept-data-loss).\n",
      "  This refuses any destructive change; if it errors, a non-additive\n",
      "  change was detected and must be reviewed.\n"
    );
    run("npx prisma db push", { DATABASE_URL: directUrl, DIRECT_URL: directUrl });
  }
} else {
  // ── Mode 1: NORMAL build — no schema sync ──
  console.warn(
    "\n" +
    "════════════════════════════════════════════════════════════════════\n" +
    "ℹ  SCHEMA SYNC SKIPPED — normal build (safe default)\n" +
    "════════════════════════════════════════════════════════════════════\n" +
    "   No DB schema changes will be applied. `prisma generate` + `next\n" +
    "   build` run normally. To sync schema on a deploy, set ONE of:\n" +
    "     • ADDITIVE_SCHEMA_SYNC=true          (safe additive changes)\n" +
    "     • ALLOW_PRISMA_ACCEPT_DATA_LOSS=true (reviewed destructive deploy)\n" +
    "════════════════════════════════════════════════════════════════════\n"
  );
}

// Step 3 — Build Next.js
run("npx next build");
