// One-time migration: seed the hardware marketplace's `HardwareListing` table
// from the legacy `hardware_catalog` site-setting blob (the old admin-only
// catalog). Each legacy product becomes a PLATFORM listing (HimaVolt's own
// stock): status APPROVED, isPlatformListing true, no commission owed.
//
// Idempotent: skips any legacy product whose name already exists as a platform
// listing, so re-running is safe.
//
// Run ONCE, by hand, AFTER the schema has been deployed
// (ADDITIVE_SCHEMA_SYNC=true) and BEFORE relying on the public catalog:
//
//   npx tsx scripts/migrate-hardware-catalog.ts
//
// Not part of any automated build step. If the legacy blob is absent or empty,
// the script does nothing — new platform listings can just be added in the
// admin Hardware tab.

import { randomBytes } from "crypto";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma";
import * as dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const CATALOG_KEY = "hardware_catalog";

interface LegacyProduct {
  id?: string;
  name?: string;
  description?: string;
  type?: string;
  price?: number;
  stock?: number;
  imageUrl?: string;
}

async function main() {
  const row = await prisma.siteSetting.findUnique({ where: { key: CATALOG_KEY } });
  if (!row) {
    console.log("No legacy hardware_catalog site-setting found — nothing to migrate.");
    return;
  }

  let legacy: LegacyProduct[] = [];
  try {
    const parsed = JSON.parse(row.value);
    legacy = Array.isArray(parsed) ? parsed : [];
  } catch {
    console.error("Legacy hardware_catalog is not valid JSON — aborting.");
    return;
  }

  if (legacy.length === 0) {
    console.log("Legacy catalog is empty — nothing to migrate.");
    return;
  }

  console.log(`Found ${legacy.length} legacy product(s).`);
  let created = 0;
  let skipped = 0;

  for (const p of legacy) {
    const name = (p.name ?? "").trim();
    if (!name) {
      skipped++;
      continue;
    }
    const existing = await prisma.hardwareListing.findFirst({
      where: { name, isPlatformListing: true },
      select: { id: true },
    });
    if (existing) {
      console.log(`  • "${name}" already migrated — skipping.`);
      skipped++;
      continue;
    }
    await prisma.hardwareListing.create({
      data: {
        name,
        description: (p.description ?? "").trim(),
        type: p.type && ["Terminal", "Screen", "Printer", "Accessory"].includes(p.type) ? p.type : "Terminal",
        price: Number.isFinite(p.price) ? Number(p.price) : 0,
        stock: Number.isFinite(p.stock) ? Math.max(0, Math.round(Number(p.stock))) : 0,
        imageUrl: p.imageUrl ? String(p.imageUrl) : null,
        status: "APPROVED",
        isPlatformListing: true,
        sellerName: "HimaVolt",
        sellerPhone: "-",
        manageToken: randomBytes(24).toString("hex"),
      },
    });
    console.log(`  ✓ Migrated "${name}"`);
    created++;
  }

  console.log(`\nDone. Created ${created}, skipped ${skipped}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
