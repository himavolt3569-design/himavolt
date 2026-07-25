import React, { Suspense } from "react";
import { HotelSearchHero } from "./components/HotelSearchHero";
import { HotelsCinematicBg } from "./components/HotelsCinematicBg";
import { HotelsBrowser } from "./components/HotelsBrowser";
import { BadgeCheck, Zap, Sparkles } from "lucide-react";
import { readSiteSettings } from "@/lib/site-settings-store";
import { resolveStaysHero } from "@/lib/stays-hero";

export const metadata = {
  title: "Stays by HimaVolt - Discover Hotels & Resorts in Nepal",
  description:
    "Discover luxury hotels, boutique resorts, and mountain retreats across Nepal with HimaVolt.",
  openGraph: { title: "Stays by HimaVolt", siteName: "HimaVolt" },
};

const TRUST = [
  { icon: Sparkles, label: "Handpicked stays" },
  { icon: Zap, label: "Instant confirmation" },
  { icon: BadgeCheck, label: "Verified properties" },
];

// Settings change rarely and are read on every visit, so a short revalidate
// keeps the hero instant without pinning a stale photograph for long.
export const revalidate = 60;

export default async function HotelsDiscoveryPage() {
  const hero = resolveStaysHero(await readSiteSettings());

  return (
    <div className="flex flex-col min-h-screen">
      {/* Warm the image origin and start the first slide before any script
          runs. Without the preconnect the very first byte waits on a fresh DNS
          lookup and TLS handshake to a third-party CDN. */}
      {hero.origins.map((o) => (
        <link key={o} rel="preconnect" href={o} crossOrigin="anonymous" />
      ))}
      {hero.slides[0] && (
        <link
          rel="preload"
          as="image"
          href={hero.slides[0]}
          fetchPriority="high"
        />
      )}
      {/* Cinematic hero */}
      <section className="relative h-[82vh] min-h-[580px] w-full flex flex-col items-center justify-center overflow-hidden">
        <HotelsCinematicBg slides={hero.slides} />

        <div className="relative z-10 flex flex-col items-center w-full max-w-5xl px-4 mt-6">
          {/* Static headline paints instantly — the LCP element, no data wait */}
          <div className="text-center hotels-hero-enter">
            <h1 className="font-fraunces text-[13vw] leading-[0.95] sm:text-6xl md:text-7xl font-black text-white drop-shadow-2xl tracking-tight">
              {hero.title}
            </h1>
            <p className="mt-4 text-white/85 text-base md:text-xl font-medium drop-shadow max-w-2xl mx-auto">
              {hero.subtitle}
            </p>

            {/* Trust chips */}
            <div className="mt-5 hidden sm:flex items-center justify-center gap-2.5">
              {TRUST.map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="flex items-center gap-1.5 rounded-full bg-white/12 backdrop-blur-md border border-white/20 px-3.5 py-1.5 text-white text-xs font-semibold"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Interactive search — Suspense-wrapped for useSearchParams */}
          <Suspense fallback={<div className="h-[92px] w-full max-w-4xl mt-8" />}>
            <HotelSearchHero />
          </Suspense>
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1 animate-bounce opacity-60">
          <span className="text-white text-[10px] font-bold uppercase tracking-widest">
            Scroll
          </span>
          <div className="w-0.5 h-6 bg-white/60 rounded-full" />
        </div>
      </section>

      {/* Results — client TanStack grid, filters stay instant */}
      <Suspense fallback={<div className="min-h-[40vh]" />}>
        <HotelsBrowser />
      </Suspense>
    </div>
  );
}
