#!/usr/bin/env node

/**
 * Vercel Build Script
 *
 * Handles the full build pipeline for Vercel deployments:
 *   1. prisma generate  — generates the Prisma Client (no DB connection needed)
 *   2. prisma db push   — syncs schema to Supabase using the DIRECT connection
 *                          (bypasses PgBouncer pooler to avoid MaxClientsInSessionMode)
 *   3. next build        — builds the Next.js application
 *
 * Required Vercel Environment Variables:
 *   DATABASE_URL          — Supabase pooled connection (used at runtime by the app)
 *   DIRECT_DATABASE_URL   — Supabase direct connection (used here for schema sync)
 */

import { execSync } from "node:child_process";

function run(cmd, env = {}) {
  console.log(`\n▶ ${cmd}\n`);
  execSync(cmd, {
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
}

// Step 1 — Generate Prisma Client (no DB connection required)
run("npx prisma generate");

// Step 2 — Push schema to database via the direct (non-pooled) connection
const directUrl = process.env.DIRECT_DATABASE_URL;

if (directUrl) {
  run("npx prisma db push --accept-data-loss", {
    DATABASE_URL: directUrl,
  });
} else {
  console.warn(
    "\n⚠  DIRECT_DATABASE_URL is not set — skipping prisma db push.",
    "\n   Set it in Vercel Environment Variables to enable automatic schema sync.",
    "\n   Use your Supabase direct connection string (db.<ref>.supabase.co:5432).\n"
  );
}

// Step 3 — Build Next.js
run("npx next build");
