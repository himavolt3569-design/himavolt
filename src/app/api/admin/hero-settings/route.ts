import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { unauthorized } from "@/lib/api-helpers";

export interface HeroImage {
  id: string;
  url: string;
  order: number;
  createdAt: string;
}

export interface HeroSettings {
  images: HeroImage[];
  autoplay: boolean;
  interval: number;
  overlayOpacity: number;
}

const DEFAULTS: HeroSettings = {
  images: [],
  autoplay: true,
  interval: 5000,
  overlayOpacity: 40,
};

async function ensureTable() {
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS site_settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function readSettings(): Promise<HeroSettings> {
  await ensureTable();
  const rows = await db.$queryRaw<{ key: string; value: string }[]>`
    SELECT key, value FROM site_settings WHERE key LIKE 'hero_%'
  `;
  
  const result: Partial<HeroSettings> = {};
  
  for (const row of rows) {
    const field = row.key.replace("hero_", "") as keyof HeroSettings;
    try {
      if (field === "images") {
        result[field] = JSON.parse(row.value) as HeroImage[];
      } else if (field === "autoplay") {
        result[field] = row.value === "true";
      } else if (field === "interval" || field === "overlayOpacity") {
        result[field] = parseInt(row.value, 10);
      }
    } catch {
      // Invalid value, skip
    }
  }
  
  return { ...DEFAULTS, ...result };
}

/**
 * GET /api/admin/hero-settings
 * Public — returns current hero settings (falls back to defaults).
 */
export async function GET() {
  try {
    const settings = await readSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error("[Hero Settings GET]", error);
    return NextResponse.json(DEFAULTS);
  }
}

/**
 * PATCH /api/admin/hero-settings
 * Admin only — update hero images or settings.
 */
export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin("settings.manage");
  if (!admin) return unauthorized("Admin access required");

  const body = await req.json();

  await ensureTable();

  // Handle images update
  if (body.images !== undefined) {
    const imagesKey = "hero_images";
    await db.$executeRawUnsafe(
      `INSERT INTO site_settings (key, value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      imagesKey,
      JSON.stringify(body.images)
    );
  }

  // Handle autoplay update
  if (body.autoplay !== undefined) {
    const autoplayKey = "hero_autoplay";
    await db.$executeRawUnsafe(
      `INSERT INTO site_settings (key, value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      autoplayKey,
      String(body.autoplay)
    );
  }

  // Handle interval update
  if (body.interval !== undefined) {
    const intervalKey = "hero_interval";
    await db.$executeRawUnsafe(
      `INSERT INTO site_settings (key, value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      intervalKey,
      String(body.interval)
    );
  }

  // Handle overlayOpacity update
  if (body.overlayOpacity !== undefined) {
    const overlayKey = "hero_overlayOpacity";
    await db.$executeRawUnsafe(
      `INSERT INTO site_settings (key, value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      overlayKey,
      String(body.overlayOpacity)
    );
  }

  const updated = await readSettings();
  return NextResponse.json(updated);
}
