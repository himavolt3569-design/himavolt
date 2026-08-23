"use client";

import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { useNearby, type NearbyOptions } from "@/hooks/useNearby";
import StoreCard from "./StoreCard";

/**
 * A titled row of nearby venues, driven by a live query.
 *
 * Every rail on the landing page is one of these with different options, so the
 * loading, empty and error states are written once and behave identically.
 */
export default function StoreRail({
  title,
  subtitle,
  viewAllHref,
  options,
  emptyMessage = "Nothing here just yet.",
  skeletonCount = 4,
}: {
  title: string;
  subtitle?: string;
  viewAllHref?: string;
  options: NearbyOptions;
  emptyMessage?: string;
  skeletonCount?: number;
}) {
  const { results, loading, error } = useNearby(options);

  // A rail with nothing in it is noise on a landing page. Once we know there is
  // genuinely nothing to show and nothing went wrong, the whole section goes.
  if (!loading && !error && results.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-4 flex items-end justify-between gap-4 sm:mb-5">
        <div className="min-w-0">
          <h2 className="text-[19px] font-black tracking-tight text-[var(--text-1)] sm:text-[26px]">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-0.5 hidden text-[13px] text-[var(--text-2)] sm:block">
              {subtitle}
            </p>
          )}
        </div>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="shrink-0 text-[13px] font-bold text-[var(--accent-text)] hover:text-[var(--accent)]"
          >
            View all
          </Link>
        )}
      </div>

      {error ? (
        <p className="flex items-center gap-2 rounded-2xl bg-[var(--surface)] px-4 py-5 text-[13px] text-[var(--text-2)]">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </p>
      ) : loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: skeletonCount }).map((_, i) => (
            <div
              key={i}
              className="h-[106px] animate-pulse rounded-2xl bg-[var(--surface)] sm:h-56"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {results.slice(0, 4).map((r) => (
            <StoreCard key={r.id} store={r} />
          ))}
        </div>
      )}

      {!loading && !error && results.length === 0 && (
        <p className="rounded-2xl bg-[var(--surface)] px-4 py-5 text-center text-[13px] text-[var(--text-2)]">
          {emptyMessage}
        </p>
      )}
    </section>
  );
}
