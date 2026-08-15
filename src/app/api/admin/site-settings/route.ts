import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { unauthorized } from "@/lib/api-helpers";
import { readSiteSettings, writeSiteSettings } from "@/lib/site-settings-store";
import { SITE_SETTINGS_FIELDS, SiteSettings } from "@/lib/site-settings";

/**
 * GET /api/admin/site-settings
 * Admin only — same payload as the public route, used by the Business Info tab.
 */
export async function GET() {
  const admin = await requireAdmin("settings.manage");
  if (!admin) return unauthorized("Admin access required");
  return NextResponse.json(await readSiteSettings());
}

/**
 * PATCH /api/admin/site-settings
 * Admin only — update one or more business/contact fields. Only known string
 * fields are accepted; each is trimmed and capped at 500 chars.
 */
export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin("settings.manage");
  if (!admin) return unauthorized("Admin access required");

  const body = await req.json().catch(() => ({}));
  const patch: Partial<SiteSettings> = {};
  for (const field of SITE_SETTINGS_FIELDS) {
    const value = body[field];
    if (typeof value === "string") {
      patch[field] = value.slice(0, 500).trim();
    }
  }

  const updated = await writeSiteSettings(patch);
  return NextResponse.json(updated);
}
