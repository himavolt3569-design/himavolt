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

// Step 2 — Migrate data + push schema via the direct (non-pooled) connection
const directUrl = process.env.DIRECT_URL;

if (directUrl) {
  // 2a — Convert legacy enum values so the ALTER TYPE can succeed
  await migrateOrderStatuses(directUrl);

  // 2b — Push schema (now safe to drop old enum variants)
  run("npx prisma db push --accept-data-loss", {
    DATABASE_URL: directUrl,
  });
} else {
  console.warn(
    "\n⚠  DIRECT_URL is not set — skipping prisma db push.",
    "\n   Set it in Vercel Environment Variables to enable automatic schema sync.",
    "\n   Use your Supabase direct connection string (db.<ref>.supabase.co:5432).\n"
  );
}

// Step 3 — Build Next.js
run("npx next build");
