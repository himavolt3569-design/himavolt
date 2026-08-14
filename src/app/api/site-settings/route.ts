import { NextResponse } from "next/server";
import { readSiteSettings } from "@/lib/site-settings-store";
import { SITE_SETTINGS_DEFAULTS } from "@/lib/site-settings";

/**
 * GET /api/site-settings
 *
 * Public — the site-wide business/contact info consumed by the Footer, the
 * Contact page, and any other public surface. Falls back to defaults on error
 * so a public page never breaks on a settings read. This route is on the
 * middleware PUBLIC_ROUTES allowlist so logged-out visitors get real values
 * (the legacy admin footer-settings route was not, so anonymous users always
 * saw defaults).
 */
export async function GET() {
  try {
    return NextResponse.json(await readSiteSettings());
  } catch {
    return NextResponse.json(SITE_SETTINGS_DEFAULTS);
  }
}
