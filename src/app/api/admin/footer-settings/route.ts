import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { unauthorized } from "@/lib/api-helpers";

export interface FooterSettings {
  phone: string;
  email: string;
  address: string;
  description: string;
}

const DEFAULTS: FooterSettings = {
  phone: "+977 980-123-4567",
  email: "hello@himavolt.com",
  address: "Thamel, Kathmandu",
  description:
    "Nepal's smartest food platform. Scan QR, browse the menu, order instantly or get it delivered to your door.",
};

const ALLOWED_KEYS = ["phone", "email", "address", "description"] as const;

async function ensureTable() {
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS site_settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function readSettings(): Promise<FooterSettings> {
  await ensureTable();
  const rows = await db.$queryRaw<{ key: string; value: string }[]>`
    SELECT key, value FROM site_settings WHERE key LIKE 'footer_%'
  `;
  const result = { ...DEFAULTS };
  for (const row of rows) {
    const field = row.key.replace("footer_", "") as keyof FooterSettings;
    if (ALLOWED_KEYS.includes(field as (typeof ALLOWED_KEYS)[number])) {
      result[field] = row.value;
    }
  }
  return result;
}

/**
 * GET /api/admin/footer-settings
 * Public — returns current footer settings (falls back to defaults).
 */
export async function GET() {
  try {
    const settings = await readSettings();
    return NextResponse.json(settings);
  } catch {
    return NextResponse.json(DEFAULTS);
  }
}

/**
 * PATCH /api/admin/footer-settings
 * Admin only — update one or more footer fields.
 */
export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin access required");

  const body = await req.json();

  await ensureTable();

  for (const key of ALLOWED_KEYS) {
    if (body[key] !== undefined) {
      const dbKey = `footer_${key}`;
      await db.$executeRawUnsafe(
        `INSERT INTO site_settings (key, value, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        dbKey,
        String(body[key]),
      );
    }
  }

  const updated = await readSettings();
  return NextResponse.json(updated);
}
