"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Crosshair, Loader2, MapPin } from "lucide-react";
import { useLocation } from "@/context/LocationContext";
import LocationPickerModal from "@/components/modals/LocationPickerModal";

/**
 * The hero. One job: get the visitor from "I'm hungry" to a list of places that
 * will actually feed them, in one tap.
 *
 * The location control is the primary action rather than a search box, because
 * on this platform *where you are* decides what you can order — a search for
 * "momo" is meaningless until we know which momos can reach you.
 */
export default function MarketplaceHero() {
  const router = useRouter();
  const { label, coords, locating, isPrecise, requestPrecise, setManual } =
    useLocation();
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <section className="relative isolate overflow-hidden">
      {/* Backdrop. A CSS gradient rather than a photo: no image request, no
          layout shift, and it cannot 404 the way a hardcoded asset can. */}
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(135deg,#1c1917_0%,#292524_45%,#3f2d1a_100%)]" />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-30 [background-image:radial-gradient(circle_at_20%_20%,rgba(245,158,11,.35),transparent_45%),radial-gradient(circle_at_80%_10%,rgba(251,191,36,.25),transparent_40%)]"
      />

      <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
        <h1 className="max-w-2xl text-[36px] font-black leading-[1.05] tracking-tight text-white sm:text-[56px]">
          Find Nearby.
          <br />
          Order <span className="text-[var(--accent)]">Easily.</span>
        </h1>

        <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-white/70 sm:text-[17px]">
          Restaurants, hotels, fast food, drinks and more — at your doorstep,
          from places that are actually open right now.
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
