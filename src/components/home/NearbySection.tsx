"use client";

import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import NearbySearch from "@/components/nearby/NearbySearch";

/**
 * "Order near you" on the landing page.
 *
 * The rest of this page sells the platform to restaurant owners. This block is
 * the one part addressed to a hungry customer, so it stays visually distinct and
 * shows real, live results rather than marketing copy.
 */
export default function NearbySection() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-muted)] px-3 py-1 text-[11px] font-bold text-[var(--accent-text)]">
            <MapPin className="h-3 w-3" />
            Near you
          </span>
          <h2 className="text-[26px] font-black tracking-tight text-[var(--text-1)] sm:text-[32px]">
            Hungry right now?
          </h2>
          <p className="mt-2 max-w-lg text-[14px] text-[var(--text-2)]">
            Restaurants, cafes and bars close to you that are open at this moment
            and deliver to your door. Drinks included, not just food.
          </p>
        </div>

        <Link
          href="/nearby"
          className="group flex items-center gap-1.5 text-[13px] font-bold text-[var(--accent-text)] transition-colors hover:text-[var(--accent)]"
        >
          Browse all
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <NearbySearch compact initialLimit={6} />
    </section>
  );
}
