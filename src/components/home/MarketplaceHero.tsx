"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Crosshair, Loader2, MapPin } from "lucide-react";
import { useLocation } from "@/context/LocationContext";
import LocationPickerModal from "@/components/modals/LocationPickerModal";
import type { SiteSettings } from "@/lib/site-settings";

/**
 * The hero. One job: get the visitor from "I am hungry" to a list of places that
 * will actually feed them, in one tap.
 *
 * The location control is the primary action rather than a search box, because
 * on this platform where you are decides what you can order. A search for "momo"
 * means nothing until we know which momos can reach you.
 *
 * The backdrop photograph and the headline come from Master Admin, so the front
 * door can be re-dressed for Dashain or a campaign without a code deploy. When
 * no image is set the gradient underneath stands on its own.
 *
 * `settings` arrives as a prop from the server component above rather than being
 * fetched here. Fetching it on mount put the photograph behind hydration plus an
 * HTTP round trip, so the hero sat empty for seconds while the browser had no
 * idea an image was coming.
 */
export default function MarketplaceHero({
  settings,
}: {
  settings: SiteSettings;
}) {
  const router = useRouter();
  const { label, coords, locating, isPrecise, requestPrecise, setManual } =
    useLocation();
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    // The gradient sits on the section itself so there is never a flash of empty
    // background while the photograph decodes: the fallback IS the backdrop, and
    // the image simply covers it once ready.
    <section className="relative isolate overflow-hidden bg-[linear-gradient(135deg,#1c1917_0%,#292524_45%,#3f2d1a_100%)]">
      {/* Photograph, when one is set. */}
      {settings.heroImageUrl ? (
        <>
          {/* Plain img rather than next/image on purpose: the URL is arbitrary
              user-uploaded storage, and the optimiser would add a server round
              trip in front of the one thing that must paint first.
              `fetchPriority="high"` plus the preload in the page moves it ahead
              of the JS bundle in the network queue. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={settings.heroImageUrl}
            alt=""
            aria-hidden
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 -z-20 h-full w-full object-cover"
          />
          {/* Scrim. The headline has to stay legible over a photograph nobody
              has vetted for contrast, so the gradient is opaque on the left
              where the text sits and clears toward the right. */}
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(100deg,rgba(23,20,18,.94)_0%,rgba(23,20,18,.82)_45%,rgba(23,20,18,.45)_100%)]" />
        </>
      ) : (
        <>
          <div className="absolute inset-0 -z-20 bg-[linear-gradient(135deg,#1c1917_0%,#292524_45%,#3f2d1a_100%)]" />
          <div
            aria-hidden
            className="absolute inset-0 -z-10 opacity-30 [background-image:radial-gradient(circle_at_20%_20%,rgba(245,158,11,.35),transparent_45%),radial-gradient(circle_at_80%_10%,rgba(251,191,36,.25),transparent_40%)]"
          />
        </>
      )}

      {/* Bottom padding leaves room for the trust bar that overlaps this
          section, so its cards never sit on top of the hero copy. */}
      <div className="mx-auto w-full max-w-7xl px-4 pb-28 pt-10 sm:px-6 sm:pb-36 sm:pt-24">
        <h1 className="max-w-2xl text-[30px] font-black leading-[1.08] tracking-tight text-white sm:text-[56px]">
          {settings.heroTitle}
          <br />
          <span className="text-[var(--accent)]">{settings.heroHighlight}</span>
        </h1>

        <p className="mt-3 max-w-lg text-[13.5px] leading-relaxed text-white/75 sm:mt-4 sm:text-[17px]">
          {settings.heroSubtitle}
        </p>

        {/* Location card */}
        <div className="mt-8 w-full max-w-xl rounded-2xl bg-white/95 p-2 shadow-2xl backdrop-blur dark:bg-[var(--canvas)]/95">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              onClick={() => setPickerOpen(true)}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-black/5 dark:hover:bg-white/5"
            >
              <MapPin className="h-5 w-5 shrink-0 text-[var(--accent)]" />
              <span className="min-w-0">
                <span className="block text-[11px] font-semibold text-neutral-500 dark:text-[var(--text-3)]">
                  Your location
                </span>
                <span className="flex items-center gap-1 text-[14px] font-bold text-neutral-900 dark:text-[var(--text-1)]">
                  <span className="truncate">{label}</span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
                </span>
              </span>
            </button>

            <button
              onClick={() => router.push("/nearby")}
              className="shrink-0 rounded-xl bg-[var(--accent)] px-6 py-3 text-[14px] font-black text-white transition-colors hover:bg-[var(--accent-hover)]"
            >
              Find Nearby
            </button>
          </div>
        </div>

        {!isPrecise && (
          <button
            onClick={requestPrecise}
            disabled={locating}
            className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-white/70 transition-colors hover:text-white disabled:opacity-50"
          >
            {locating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Crosshair className="h-3.5 w-3.5" />
            )}
            Use my exact location for better results
          </button>
        )}
      </div>

      {pickerOpen && (
        <LocationPickerModal
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          initialCoords={{
            lat: coords?.lat ?? 27.7172,
            lon: coords?.lon ?? 85.324,
          }}
          initialAddress=""
          initialCity="Kathmandu"
          onConfirm={(r) =>
            setManual(r.coords, r.address || r.city || "Your location")
          }
        />
      )}
    </section>
  );
}
