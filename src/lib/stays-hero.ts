import { parseImageList, type SiteSettings } from "./site-settings";

/**
 * Resolve the Stays hero backdrop.
 *
 * There are deliberately NO remote default photographs. The previous version
 * shipped five Unsplash URLs, and a third-party CDN is the slowest possible
 * thing to put in front of a hero: a cold DNS lookup, a TLS handshake, and a
 * large image, none of which we control or can cache. On a slow link the hero
 * simply stayed grey.
 *
 * Order of preference now:
 *   1. `staysHeroImages` set in Master Admin, uploaded to our own storage
 *   2. the landing page hero photograph, already uploaded and already warm
 *   3. no image at all, and the CSS gradient stands on its own
 *
 * Every one of those either loads from the same origin as the rest of the page
 * or costs nothing.
 */

export interface StaysHero {
  slides: string[];
  title: string;
  subtitle: string;
  /** Origins to preconnect to, so the first image skips DNS and TLS setup. */
  origins: string[];
}

export function resolveStaysHero(settings: SiteSettings): StaysHero {
  const custom = parseImageList(settings.staysHeroImages);

  // Falling back to the landing hero means an operator who has set one
  // photograph gets a real backdrop on both pages without doing it twice.
  const slides =
    custom.length > 0
      ? custom
      : settings.heroImageUrl
        ? [settings.heroImageUrl]
        : [];

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
