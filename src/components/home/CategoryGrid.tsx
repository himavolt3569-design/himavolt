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
    <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-[22px] font-black tracking-tight text-[var(--text-1)] sm:text-[26px]">
            Explore by category
          </h2>
          <p className="mt-1 text-[13px] text-[var(--text-2)]">
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

      <div className="grid grid-cols-4 gap-3 sm:gap-4 md:grid-cols-8">
        {BROWSE_CATEGORIES.map((c) => {
          const Icon = ICONS[c.iconName] ?? UtensilsCrossed;
          return (
            <Link
              key={c.id}
              href={`/nearby?category=${c.id}`}
              className="group flex flex-col items-center gap-2 rounded-2xl p-2 transition-colors hover:bg-[var(--surface)]"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent-muted)] transition-transform group-hover:scale-105 sm:h-16 sm:w-16">
                <Icon className="h-6 w-6 text-[var(--accent-text)] sm:h-7 sm:w-7" />
              </span>
              <span className="text-center text-[11px] font-bold leading-tight text-[var(--text-1)] sm:text-[12px]">
                {c.label}
              </span>
            </Link>
          );
        })}

        <Link
          href="/nearby"
          className="group flex flex-col items-center gap-2 rounded-2xl p-2 transition-colors hover:bg-[var(--surface)]"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface)] transition-transform group-hover:scale-105 sm:h-16 sm:w-16">
            <LayoutGrid className="h-6 w-6 text-[var(--text-2)] sm:h-7 sm:w-7" />
          </span>
          <span className="text-center text-[11px] font-bold leading-tight text-[var(--text-1)] sm:text-[12px]">
            More
          </span>
        </Link>
      </div>
    </section>
  );
}
