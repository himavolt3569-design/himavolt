import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { unauthorized } from "@/lib/api-helpers";

export interface FeatureItem {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export interface MetricItem {
  id: string;
  value: string;
  label: string;
  suffix: string;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export interface LandingSettings {
  features: FeatureItem[];
  metrics: MetricItem[];
  faqs: FAQItem[];
}

const DEFAULTS: LandingSettings = {
  features: [],
  metrics: [],
  faqs: [],
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

async function readSettings(): Promise<LandingSettings> {
  await ensureTable();
  const rows = await db.$queryRaw<{ key: string; value: string }[]>`
    SELECT key, value FROM site_settings WHERE key LIKE 'landing_%'
  `;
  
  const result: Partial<LandingSettings> = {};
  
  for (const row of rows) {
    const field = row.key.replace("landing_", "") as keyof LandingSettings;
    try {
      result[field] = JSON.parse(row.value);
    } catch {
      // Invalid value, skip
    }
  }
  
  return { ...DEFAULTS, ...result };
}

/**
 * GET /api/admin/landing-settings
 * Public — returns current landing settings.
 */
export async function GET() {
  try {
    const settings = await readSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error("[Landing Settings GET]", error);
    return NextResponse.json(DEFAULTS);
  }
}

/**
 * PATCH /api/admin/landing-settings
 * Admin only — update landing settings.
 */
export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin access required");

  const body = await req.json();

  await ensureTable();

  // Save features
  if (body.features !== undefined) {
    await db.$executeRawUnsafe(
      `INSERT INTO site_settings (key, value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      "landing_features",
      JSON.stringify(body.features)
    );
  }

  // Save metrics
  if (body.metrics !== undefined) {
    await db.$executeRawUnsafe(
      `INSERT INTO site_settings (key, value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      "landing_metrics",
      JSON.stringify(body.metrics)
    );
  }

  // Save faqs
  if (body.faqs !== undefined) {
    await db.$executeRawUnsafe(
      `INSERT INTO site_settings (key, value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      "landing_faqs",
      JSON.stringify(body.faqs)
    );
  }

  const updated = await readSettings();
  return NextResponse.json(updated);
}
