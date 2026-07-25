"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Bike,
  Clock,
  Coffee,
  Crosshair,
  Loader2,
  MapPin,
  Star,
  UtensilsCrossed,
} from "lucide-react";
import { formatDistance } from "@/lib/geo";
import { formatPrice } from "@/lib/currency";
import type { OperationalStatus } from "@/lib/operational-status";

/**
 * "Order near you" — proximity discovery.
 *
 * Location is resolved in two steps, deliberately. An IP lookup gives an instant
 * result with no permission prompt, so the list is populated before the customer
 * has decided whether to trust us. Precise GPS is offered as an upgrade, not a
 * gate; browsers can hang for ten seconds on `getCurrentPosition` and a blank
 * screen behind a permission dialog is a bounce.
 *
 * Coordinates go in a POST body, never a query string.
 */

interface NearbyRestaurant {
  id: string;
  name: string;
  slug: string;
  type: string;
  address: string;
  city: string;
  imageUrl: string | null;
  coverUrl: string | null;
  rating: number;
  totalOrders: number;
  distanceKm: number;
  deliversHere: boolean;
  etaMins: number | null;
  fromDeliveryFee: number | null;
  status: OperationalStatus;
  hasDrinks: boolean;
}

type Kind = "all" | "food" | "drinks";

const KINDS: { id: Kind; label: string; icon: typeof UtensilsCrossed }[] = [
  { id: "all", label: "Everything", icon: MapPin },
  { id: "food", label: "Food", icon: UtensilsCrossed },
  { id: "drinks", label: "Drinks", icon: Coffee },
];

export default function NearbySearch({
  compact = false,
  initialLimit = 20,
}: {
  /** Landing-page variant: fewer cards, no radius control. */
  compact?: boolean;
  initialLimit?: number;
}) {
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [cityLabel, setCityLabel] = useState<string | null>(null);
  const [precise, setPrecise] = useState(false);
  const [locating, setLocating] = useState(false);

  const [kind, setKind] = useState<Kind>("all");
  const [openNow, setOpenNow] = useState(true);
  const [radiusKm, setRadiusKm] = useState(5);

  const [results, setResults] = useState<NearbyRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reqId = useRef(0);

  /* ── instant, prompt-free guess ─────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    fetch("/api/geoip")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d?.lat) return;
        setCoords({ lat: d.lat, lon: d.lon });
        setCityLabel(d.city ?? null);
      })
      .catch(() => {
        if (!cancelled) setError("Could not work out where you are.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /* ── optional precise upgrade ───────────────────────────────────── */
  const useExactLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setPrecise(true);
        setCityLabel(null);
        setLocating(false);
      },
      () => {
        // Denied or timed out — the IP guess still stands, so say nothing loud.
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
    );
  }, []);

  /* ── search ─────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!coords) return;
    const id = ++reqId.current;
    setLoading(true);
    setError(null);

    fetch("/api/public/nearby", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        latitude: coords.lat,
        longitude: coords.lon,
        radiusKm,
        kind,
        openNow,
        deliveryOnly: true,
        limit: initialLimit,
      }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json())?.error ?? "Search failed");
        return r.json();
      })
      .then((d) => {
        // Ignore anything but the newest request — filter chips fire fast and
        // an out-of-order response would show the wrong list.
        if (id !== reqId.current) return;
        setResults(d.restaurants ?? []);
        setLoading(false);
      })
      .catch((e) => {
        if (id !== reqId.current) return;
        setError(e instanceof Error ? e.message : "Search failed");
        setLoading(false);
      });
  }, [coords, radiusKm, kind, openNow, initialLimit]);

  return (
    <section className="w-full">
      {/* Location bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[13px] text-[var(--text-2)]">
          <MapPin className="h-4 w-4 text-[var(--accent)]" />
          {coords ? (
            <span>
              {precise
                ? "Using your exact location"
                : cityLabel
                  ? `Near ${cityLabel}`
                  : "Near you"}
            </span>
          ) : (
            <span>Finding you…</span>
          )}
        </div>

        {!precise && (
          <button
            onClick={useExactLocation}
            disabled={locating}
            className="flex items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-1.5 text-[12px] font-semibold text-[var(--text-2)] transition-colors hover:bg-[var(--surface)] disabled:opacity-50"
          >
            {locating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Crosshair className="h-3.5 w-3.5" />
            )}
            Use my exact location
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {KINDS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setKind(id)}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-bold transition-all ${
              kind === id
                ? "bg-[var(--accent)] text-white"
                : "bg-[var(--surface)] text-[var(--text-2)] hover:text-[var(--text-1)]"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}

        <button
          onClick={() => setOpenNow((v) => !v)}
          className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-bold transition-all ${
            openNow
              ? "bg-[var(--accent)] text-white"
              : "bg-[var(--surface)] text-[var(--text-2)] hover:text-[var(--text-1)]"
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          Open now
        </button>

        {!compact && (
          <label className="ml-auto flex items-center gap-2 text-[12px] font-semibold text-[var(--text-3)]">
            Within
            <select
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className="rounded-lg border border-[var(--border)] bg-[var(--canvas)] px-2 py-1 text-[12px] text-[var(--text-1)]"
            >
              {[2, 5, 10, 15, 25].map((r) => (
                <option key={r} value={r}>
                  {r} km
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {/* Results */}
      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: compact ? 3 : 6 }).map((_, i) => (
            <div
              key={i}
              className="h-44 animate-pulse rounded-2xl bg-[var(--surface)]"
            />
          ))}
        </div>
      )}

      {!loading && error && (
        <p className="rounded-2xl bg-[var(--surface)] px-4 py-6 text-center text-[13px] text-[var(--text-2)]">
          {error}
        </p>
      )}

      {!loading && !error && results.length === 0 && (
        <div className="rounded-2xl bg-[var(--surface)] px-4 py-10 text-center">
          <p className="text-[14px] font-bold text-[var(--text-1)]">
            Nothing delivering here yet
          </p>
          <p className="mx-auto mt-1 max-w-sm text-[12px] text-[var(--text-3)]">
            {openNow
              ? "Try switching off “Open now”, or widen the distance — some places may open later today."
              : "Try widening the distance. We are adding new restaurants all the time."}
          </p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((r) => (
            <RestaurantCard key={r.id} restaurant={r} />
          ))}
        </div>
      )}

      {compact && results.length > 0 && (
        <div className="mt-6 text-center">
          <Link
            href="/nearby"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--text-1)] px-5 py-2.5 text-[13px] font-bold text-[var(--canvas)] transition-opacity hover:opacity-90"
          >
            See everything near you
          </Link>
        </div>
      )}
    </section>
  );
}

function RestaurantCard({ restaurant: r }: { restaurant: NearbyRestaurant }) {
  const open = r.status.deliveryOpen;

  return (
    <Link
      href={`/menu/${r.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--canvas)] transition-shadow hover:shadow-lg"
    >
      <div className="relative h-32 w-full overflow-hidden bg-[var(--surface)]">
        {r.coverUrl || r.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={r.coverUrl ?? r.imageUrl ?? ""}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <UtensilsCrossed className="h-8 w-8 text-[var(--text-3)]" />
          </div>
        )}

        {!open && (
          <div className="absolute inset-0 flex items-end bg-black/45 p-3">
            <span className="rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-neutral-800">
              {r.status.nextOpening ?? "Closed"}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 truncate text-[14px] font-bold text-[var(--text-1)]">
            {r.name}
          </h3>
          {r.rating > 0 && (
            <span className="flex shrink-0 items-center gap-0.5 text-[11px] font-bold text-[var(--text-2)]">
              <Star className="h-3 w-3 fill-[var(--accent)] text-[var(--accent)]" />
              {r.rating.toFixed(1)}
            </span>
          )}
        </div>

        <p className="truncate text-[11px] text-[var(--text-3)]">{r.address}</p>

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--text-2)]">
          <span className="flex items-center gap-1 font-semibold">
            <MapPin className="h-3 w-3" />
            {formatDistance(r.distanceKm)}
          </span>

          {r.deliversHere ? (
            <>
              {r.etaMins != null && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />~{r.etaMins} min
                </span>
              )}
              {r.fromDeliveryFee != null && (
                <span className="flex items-center gap-1">
                  <Bike className="h-3 w-3" />
                  {formatPrice(r.fromDeliveryFee, "NPR")}
                </span>
              )}
            </>
          ) : (
            // Shown rather than hidden: "too far" is a useful answer, and hiding
            // it makes the list look emptier than the area really is.
            <span className="font-semibold text-[var(--text-3)]">
              Outside their delivery range
            </span>
          )}

          {r.hasDrinks && (
            <span className="flex items-center gap-1 text-[var(--text-3)]">
              <Coffee className="h-3 w-3" />
              Drinks
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
