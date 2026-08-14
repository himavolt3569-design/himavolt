// Server-side read/write for site-wide business/contact settings.
//
// Backed by the `site_settings` key/value table (Prisma model `SiteSetting`).
// Uses defensive raw SQL — `CREATE TABLE IF NOT EXISTS` + upsert — mirroring the
// established pattern so it works even on an environment where the table was
// never migrated. Reads never throw: on any failure they fall back to defaults.
//
// Do NOT import this from a client component — it pulls in the db. Client code
// should read via `GET /api/site-settings` and use `SiteSettings` /
// `SITE_SETTINGS_DEFAULTS` from `./site-settings` instead.

import { db } from "@/lib/db";
import {
  SiteSettings,
  SITE_SETTINGS_DEFAULTS,
  SITE_SETTINGS_FIELDS,
  SITE_SETTINGS_LEGACY_FOOTER,
} from "@/lib/site-settings";

async function ensureTable() {
  await db.$executeRaw`
    CREATE TABLE IF NOT EXISTS site_settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

/**
 * Current site-wide settings, merged over defaults. Prefers `site_<field>`;
 * falls back to the legacy `footer_<field>` key, then the default. Never throws.
 */
export async function readSiteSettings(): Promise<SiteSettings> {
  try {
    await ensureTable();
    const rows = await db.$queryRaw<{ key: string; value: string }[]>`
      SELECT key, value FROM site_settings
      WHERE key LIKE 'site_%' OR key LIKE 'footer_%'
    `;
    const map = new Map(rows.map((r) => [r.key, r.value]));
    const result: SiteSettings = { ...SITE_SETTINGS_DEFAULTS };

    for (const field of SITE_SETTINGS_FIELDS) {
      const primary = map.get(`site_${field}`);
      if (primary !== undefined && primary !== "") {
        result[field] = primary;
        continue;
      }
      const legacyKey = SITE_SETTINGS_LEGACY_FOOTER[field];
      const legacy = legacyKey ? map.get(legacyKey) : undefined;
      if (legacy !== undefined && legacy !== "") {
        result[field] = legacy;
      }
    }

    return result;
  } catch {
    return { ...SITE_SETTINGS_DEFAULTS };
  }
}

/**
 * Persist the provided fields under their `site_<field>` keys, then return the
 * freshly merged settings. Only known fields are written; unknown keys ignored.
 */
export async function writeSiteSettings(
  patch: Partial<SiteSettings>,
): Promise<SiteSettings> {
  await ensureTable();

  for (const field of SITE_SETTINGS_FIELDS) {
    const val = patch[field];
    if (val === undefined) continue;
    const key = `site_${field}`;
    const str = String(val);
    await db.$executeRaw`
      INSERT INTO site_settings (key, value, updated_at)
      VALUES (${key}, ${str}, NOW())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    `;
  }

  return readSiteSettings();
}
