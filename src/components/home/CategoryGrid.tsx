"use client";

import Link from "next/link";
import {
  Beer,
  Building2,
  Candy,
  Coffee,
  Croissant,
  CupSoda,
  LayoutGrid,
  Sandwich,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { BROWSE_CATEGORIES } from "@/lib/discovery/categories";

/**
 * Browse by what you feel like eating.
 *
 * Each tile is a real query, it carries the category id to /nearby, which
 * resolves it to restaurant types through the shared map. No tile is decorative.
 */

const ICONS: Record<string, LucideIcon> = {
  UtensilsCrossed,
  Building2,
  Sandwich,
  CupSoda,
  Coffee,
  Croissant,
  Candy,
  Beer,
};

export default function CategoryGrid() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-4 flex items-end justify-between gap-4 sm:mb-6">
        <div>
          <h2 className="text-[19px] font-black tracking-tight text-[var(--text-1)] sm:text-[26px]">
            Explore by category
          </h2>
          <p className="mt-0.5 hidden text-[13px] text-[var(--text-2)] sm:block">
            Pick a craving, we&apos;ll only show what can reach you
          </p>
        </div>
        <Link
          href="/nearby"
          className="shrink-0 text-[13px] font-bold text-[var(--accent-text)] hover:text-[var(--accent)]"
        >
          View all
        </Link>
      </div>

      {/* One horizontal rail on phones, a full grid from sm up.
          Nine categories wrapped into three rows on a phone and pushed the
          actual restaurant results below the fold. A single swipeable row keeps
          the whole set reachable in one gesture and gives the listings the
          screen. Negative margins let it bleed to the screen edge so the last
          tile is visibly cut off, which is what signals "scrollable". */}
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:grid-cols-5 sm:gap-4 sm:overflow-visible sm:px-0 md:grid-cols-9">
        {BROWSE_CATEGORIES.map((c) => {
          const Icon = ICONS[c.iconName] ?? UtensilsCrossed;
          return (
            <Link
              key={c.id}
              href={`/nearby?category=${c.id}`}
              className="group flex w-[68px] shrink-0 snap-start flex-col items-center gap-2 rounded-2xl py-2 transition-colors hover:bg-[var(--surface)] sm:w-auto"
            >
              <span
                className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-transform group-hover:scale-105 sm:h-16 sm:w-16 ${c.tile}`}
              >
                <Icon
                  className={`h-6 w-6 sm:h-7 sm:w-7 ${c.iconColor}`}
                  strokeWidth={2.2}
                />
              </span>
              <span className="text-center text-[10.5px] font-bold leading-tight text-[var(--text-1)] sm:text-[12px]">
                {c.label}
              </span>
            </Link>
          );
        })}

        <Link
          href="/nearby"
          className="group flex w-[68px] shrink-0 snap-start flex-col items-center gap-2 rounded-2xl py-2 transition-colors hover:bg-[var(--surface)] sm:w-auto"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface)] transition-transform group-hover:scale-105 sm:h-16 sm:w-16">
            <LayoutGrid
              className="h-6 w-6 text-[var(--text-2)] sm:h-7 sm:w-7"
              strokeWidth={2.2}
            />
          </span>
          <span className="text-center text-[10.5px] font-bold leading-tight text-[var(--text-1)] sm:text-[12px]">
            More
          </span>
        </Link>
      </div>
    </section>
  );
}
