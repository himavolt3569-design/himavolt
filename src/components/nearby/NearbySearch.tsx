"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bike,
  Clock,
  Crosshair,
  Loader2,
  MapPin,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useLocation } from "@/context/LocationContext";
import { useNearby } from "@/hooks/useNearby";
import { BROWSE_CATEGORIES, getCategory } from "@/lib/discovery/categories";
import StoreCard from "@/components/marketplace/StoreCard";

/**
 * The full browse experience.
 *
 * Filter state lives in the URL, not component state: a customer who finds
 * "cafes open now within 2km" should be able to send that link to a friend, and
 * the back button should undo one filter rather than the whole visit.
 */
export default function NearbySearch({
  compact = false,
  initialLimit = 20,
}: {
  compact?: boolean;
  initialLimit?: number;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const { label, resolving, locating, isPrecise, requestPrecise } = useLocation();

  const categoryId = params?.get("category") ?? null;
  const category = getCategory(categoryId);
  const urlQuery = params?.get("q") ?? "";
  const openNow = params?.get("open") === "1";
  const deliveryOnly = params?.get("delivery") === "1";
  const radiusKm = Number(params?.get("radius") ?? 5) || 5;

  // Local mirror so typing feels instant; the URL updates on submit. Re-synced
  // during render rather than in an effect, an effect would paint the stale
  // value once, then immediately repaint. This is React's documented pattern for
  // adjusting state when a prop changes.
  const [search, setSearch] = useState(urlQuery);
  const [lastUrlQuery, setLastUrlQuery] = useState(urlQuery);
  if (urlQuery !== lastUrlQuery) {
    setLastUrlQuery(urlQuery);
    setSearch(urlQuery);
  }

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params?.toString() ?? "");
    if (value == null || value === "") next.delete(key);
    else next.set(key, value);
    router.replace(`/nearby${next.toString() ? `?${next}` : ""}`, {
      scroll: false,
    });
  };

  const options = useMemo(
    () => ({
      radiusKm,
      openNow,
      deliveryOnly,
      kind: category?.kind ?? ("all" as const),
      types: category?.types.length ? category.types : undefined,
      q: urlQuery || undefined,
      limit: initialLimit,
    }),
    [radiusKm, openNow, deliveryOnly, category, urlQuery, initialLimit],
  );

  const { results, loading, error } = useNearby(options);

  const heading = category?.label ?? (urlQuery ? `“${urlQuery}”` : "Everything near you");
  const blurb =
    category?.blurb ??
    (urlQuery
      ? "Matching venues and dishes around you"
      : "Open now, in range, and ready to take your order");

  return (
    <section className="w-full">
      {/* Location + search */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-1.5 text-[13px] text-[var(--text-2)]">
          <MapPin className="h-4 w-4 text-[var(--accent)]" />
          {resolving ? "Finding you..." : label}
        </span>

        {!isPrecise && (
          <button
            onClick={requestPrecise}
            disabled={locating}
            className="flex items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-1.5 text-[12px] font-semibold text-[var(--text-2)] transition-colors hover:bg-[var(--surface)] disabled:opacity-50"
          >
            {locating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Crosshair className="h-3.5 w-3.5" />
            )}
            Use exact location
          </button>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setParam("q", search.trim() || null);
          }}
          className="ml-auto flex min-w-[220px] flex-1 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--canvas-sub)] px-3 py-1.5 focus-within:border-[var(--accent)] sm:max-w-xs"
        >
          <Search className="h-3.5 w-3.5 shrink-0 text-[var(--text-3)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search a place or a dish"
            className="min-w-0 flex-1 bg-transparent text-[12px] text-[var(--text-1)] outline-none placeholder:text-[var(--text-3)]"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setParam("q", null);
              }}
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5 text-[var(--text-3)]" />
            </button>
          )}
        </form>
      </div>

      {/* Heading */}
      {!compact && (
        <div className="mb-4">
          <h2 className="text-[20px] font-black tracking-tight text-[var(--text-1)]">
            {heading}
          </h2>
          <p className="mt-0.5 text-[13px] text-[var(--text-2)]">{blurb}</p>
        </div>
      )}

      {/* Category chips */}
      <div className="mb-3 flex flex-wrap gap-2">
        <Chip
          active={!categoryId}
          onClick={() => setParam("category", null)}
          label="All"
        />
        {BROWSE_CATEGORIES.map((c) => (
          <Chip
            key={c.id}
            active={categoryId === c.id}
            onClick={() => setParam("category", categoryId === c.id ? null : c.id)}
            label={c.label}
          />
        ))}
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Chip
          active={openNow}
          onClick={() => setParam("open", openNow ? null : "1")}
          label="Open now"
          icon={Clock}
        />
        <Chip
          active={deliveryOnly}
          onClick={() => setParam("delivery", deliveryOnly ? null : "1")}
          label="Delivers to me"
          icon={Bike}
        />
        <label className="ml-auto flex items-center gap-2 text-[12px] font-semibold text-[var(--text-3)]">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Within
          <select
            value={radiusKm}
            onChange={(e) => setParam("radius", e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--canvas)] px-2 py-1 text-[12px] text-[var(--text-1)]"
          >
            {[2, 5, 10, 15, 25].map((r) => (
              <option key={r} value={r}>
                {r} km
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Results */}
      {loading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: compact ? 3 : 8 }).map((_, i) => (
            <div
              key={i}
              className="h-56 animate-pulse rounded-2xl bg-[var(--surface)]"
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
        <div className="rounded-2xl bg-[var(--surface)] px-4 py-12 text-center">
          <p className="text-[15px] font-bold text-[var(--text-1)]">
            Nothing matches here yet
          </p>
          <p className="mx-auto mt-1.5 max-w-sm text-[12px] text-[var(--text-3)]">
            {openNow || deliveryOnly
              ? "Try turning off a filter, some places may open later today, or take pickup instead."
              : "Try widening the distance. We are adding new places all the time."}
          </p>
          {(openNow || deliveryOnly || categoryId) && (
            <button
              onClick={() => router.replace("/nearby", { scroll: false })}
              className="mt-4 rounded-full bg-[var(--accent)] px-4 py-2 text-[12px] font-bold text-white"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {!loading && results.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {results.map((r) => (
              <StoreCard key={r.id} store={r} />
            ))}
          </div>
          <p className="mt-6 text-center text-[12px] text-[var(--text-3)]">
            {results.length} place{results.length === 1 ? "" : "s"} within{" "}
            {radiusKm} km
          </p>
        </>
      )}
    </section>
  );
}

function Chip({
  active,
  onClick,
  label,
  icon: Icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: typeof Clock;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-bold transition-all ${
        active
          ? "bg-[var(--accent)] text-white"
          : "bg-[var(--surface)] text-[var(--text-2)] hover:text-[var(--text-1)]"
      }`}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {label}
    </button>
  );
}
