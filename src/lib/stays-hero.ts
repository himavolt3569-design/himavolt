import { parseImageList, type SiteSettings } from "./site-settings";

/**
 * Fallback backdrop for the Stays hero when Master Admin has not set one.
 *
 * Trimmed from five slides to three and from 1920px to 1600px at q=65. Each
 * slide is a full-bleed download on a page whose whole job is to load fast, and
 * nobody stays on a hero long enough to see a fifth photograph.
 */
const DEFAULT_STAYS_SLIDES = [
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=65&w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=65&w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=65&w=1600&auto=format&fit=crop",
];

export interface StaysHero {
  slides: string[];
  title: string;
  subtitle: string;
  /** Origins to preconnect to, so the first image skips DNS and TLS setup. */
  origins: string[];
}

export function resolveStaysHero(settings: SiteSettings): StaysHero {
  const custom = parseImageList(settings.staysHeroImages);
  const slides = custom.length > 0 ? custom : DEFAULT_STAYS_SLIDES;

  // Unique origins only. Warming a connection twice is wasted work, and the
  // browser caps how many preconnects it will honour.
  const origins = Array.from(
    new Set(
      slides
        .map((s) => {
          try {
            return new URL(s).origin;
          } catch {
            return null;
          }
        })
        .filter((o): o is string => o != null),
    ),
  ).slice(0, 2);

  return {
    slides,
    title: settings.staysHeroTitle,
    subtitle: settings.staysHeroSubtitle,
    origins,
  };
}
