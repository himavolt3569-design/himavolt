// Site-wide business / contact information — the single source of truth for the
// public HimaVolt brand's own contact details (name, phone, email, address,
// opening hours). Edited once in Master Admin → "Business Info" and consumed by
// every public surface that shows HimaVolt's own contact info: the Footer, the
// Contact page, and anywhere added later.
//
// NOTE: this is a per-restaurant-agnostic, PLATFORM-level setting. It is NOT the
// contact number a restaurant owner/staff enters for their own venue — those
// live on the Restaurant row. This is HimaVolt's own number.
//
// This module is intentionally PURE (no db / server imports) so it can be shared
// by client components (Footer, Contact page) and the server store alike. The
// actual read/write against the `site_settings` table lives in
// `site-settings-store.ts` (server only).

export interface SiteSettings {
  /** Public brand name, e.g. "HimaVolt". */
  businessName: string;
  /** Short tagline shown under the logo in the footer. */
  description: string;
  /** Primary phone number (footer, contact page). */
  phone: string;
  /** Primary email address (footer, contact page). */
  email: string;
  /** Customer-support phone line (contact directory). Falls back to `phone`. */
  supportPhone: string;
  /** Restaurant-partners phone line (contact directory). Falls back to `phone`. */
  partnerPhone: string;
  /** Partnerships email (contact directory). Falls back to `email`. */
  partnerEmail: string;
  /** Office / mailing address, e.g. "Thamel, Kathmandu". */
  address: string;
  /** Secondary address line, e.g. "Nepal, 44600". */
  addressNote: string;
  /** Opening hours, e.g. "Sun to Fri, 9:00 AM to 6:00 PM". */
  hours: string;
  /**
   * Background photograph behind the landing page hero. Set in Master Admin so
   * the platform's front door can be re-dressed for a season or a campaign
   * without a code deploy. Empty string falls back to the built-in gradient.
   */
  heroImageUrl: string;
  /** Headline shown over the hero image. */
  heroTitle: string;
  /** Word inside the headline painted in the accent colour. */
  heroHighlight: string;
  /** Supporting line under the hero headline. */
  heroSubtitle: string;
}

export const SITE_SETTINGS_DEFAULTS: SiteSettings = {
  businessName: "HimaVolt",
  description:
    "Nepal's smartest food platform. Scan QR, browse the menu, order instantly or get it delivered to your door.",
  phone: "+977 9801234567",
  email: "hello@himavolt.com",
  supportPhone: "+977 9801234567",
  partnerPhone: "+977 9807654321",
  partnerEmail: "partners@himavolt.com",
  address: "Thamel, Kathmandu",
  addressNote: "Nepal, 44600",
  hours: "Sun to Fri, 9:00 AM to 6:00 PM",
  heroImageUrl: "",
  heroTitle: "Find Nearby.",
  heroHighlight: "Order Easily.",
  heroSubtitle:
    "Restaurants, hotels, fast food, drinks and more at your doorstep, from places that are actually open right now.",
};

/** All editable field keys, derived from the defaults so they can never drift. */
export const SITE_SETTINGS_FIELDS = Object.keys(
  SITE_SETTINGS_DEFAULTS,
) as (keyof SiteSettings)[];

/**
 * Fields that previously lived under a legacy `footer_<field>` key (the old
 * Footer Settings tab). Read as a fallback so existing production values carry
 * over the first time the new Business Info settings are read, before the admin
 * re-saves under the new `site_<field>` keys.
 */
export const SITE_SETTINGS_LEGACY_FOOTER: Partial<
  Record<keyof SiteSettings, string>
> = {
  phone: "footer_phone",
  email: "footer_email",
  address: "footer_address",
  description: "footer_description",
};

/** Build a `tel:` href from a display phone string (strips spaces/dashes). */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

/** Build a `mailto:` href from an email string. */
export function mailtoHref(email: string): string {
  return `mailto:${email.trim()}`;
}
