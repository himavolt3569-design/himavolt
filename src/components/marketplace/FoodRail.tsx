"use client";

import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { useNearbyFoods } from "@/hooks/useNearbyFoods";
import { formatPrice } from "@/lib/currency";
import type { NearbyOptions } from "@/hooks/useNearby";

export default function FoodRail({
  title,
  subtitle,
  options,
  skeletonCount = 6,
}: {
  title: string;
  subtitle?: string;
  options: NearbyOptions;
  skeletonCount?: number;
}) {
  const { items, loading, error } = useNearbyFoods(options);

  if (!loading && !error && items.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12 relative">
      <div className="mb-6 flex flex-col gap-1">
        <h2 className="text-2xl font-black tracking-tight text-[var(--text-1)] sm:text-3xl">
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm font-medium text-[var(--text-2)]">
            {subtitle}
          </p>
        )}
      </div>

      {error ? (
        <p className="flex items-center gap-2 rounded-2xl bg-[var(--surface)] px-4 py-5 text-sm font-medium text-[var(--text-2)]">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
          {error}
        </p>
      ) : (
        <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0">
          {loading
            ? Array.from({ length: skeletonCount }).map((_, i) => (
                <div
                  key={i}
                  className="w-[140px] shrink-0 sm:w-[180px] animate-pulse rounded-3xl bg-[var(--surface)] shadow-sm h-[200px] sm:h-[240px]"
                />
              ))
            : items.map((item) => (
                <Link
                  key={item.id}
                  href={`/menu/${item.restaurant.slug}`}
                  className="group flex w-[140px] shrink-0 snap-start flex-col gap-3 rounded-3xl bg-[var(--surface)] p-2 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl sm:w-[180px] sm:p-2.5 relative"
                >
                  <div className="relative h-[120px] w-full overflow-hidden rounded-2xl sm:h-[160px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute bottom-2 right-2 rounded-xl bg-white/90 px-2 py-1 text-[10px] sm:text-xs font-black text-black shadow-md backdrop-blur-md">
                      {formatPrice(item.price, "NPR")}
                    </div>
                  </div>
                  <div className="flex flex-col px-1 pb-1">
                    <h3 className="line-clamp-2 text-[13px] sm:text-[15px] font-bold leading-tight text-[var(--text-1)]">
                      {item.name}
                    </h3>
                    <p className="mt-1 truncate text-[11px] font-semibold text-[var(--text-3)]">
                      from {item.restaurant.name}
                    </p>
                  </div>
                </Link>
              ))}
        </div>
      )}
    </section>
  );
}
