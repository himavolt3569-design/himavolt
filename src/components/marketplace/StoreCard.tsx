"use client";

import Link from "next/link";
import { Bike, Clock, GlassWater, MapPin, Star, UtensilsCrossed } from "lucide-react";
import { formatDistance } from "@/lib/geo";
import { formatPrice } from "@/lib/currency";
import { getTypeLabel } from "@/lib/restaurant-types";
import type { NearbyRestaurant } from "@/hooks/useNearby";

/**
 * One venue, everywhere it appears.
 *
 * Deliberately shows the awkward facts rather than hiding them: a place that is
 * closed says when it opens, and a place outside its own delivery range says so.
 * Silently dropping either would make the area look emptier than it is and send
 * people to a kitchen that cannot serve them.
 */
export default function StoreCard({
  store: r,
  compact = false,
}: {
  store: NearbyRestaurant;
  compact?: boolean;
}) {
  const open = r.status.isOpen || r.status.deliveryOpen;
  const image = r.coverUrl ?? r.imageUrl;

  return (
    <Link
      href={`/menu/${r.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--canvas)] transition-all hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div
        className={`relative w-full overflow-hidden bg-[var(--surface)] ${
          compact ? "h-28" : "h-36"
        }`}
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <UtensilsCrossed className="h-7 w-7 text-[var(--text-3)]" />
          </div>
        )}

        {open ? (
          r.fromDeliveryFee === 0 && r.deliversHere ? (
            <span className="absolute left-2 top-2 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-black text-white">
              Free Delivery
            </span>
          ) : null
        ) : (
          <div className="absolute inset-0 flex items-end bg-black/50 p-3">
            <span className="rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-neutral-800">
              {r.status.nextOpening ?? "Closed"}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 truncate text-[14px] font-bold text-[var(--text-1)]">
            {r.name}
          </h3>
          {r.rating > 0 && (
            <span className="flex shrink-0 items-center gap-0.5 text-[11px] font-bold text-[var(--text-2)]">
              <Star className="h-3 w-3 fill-[var(--accent)] text-[var(--accent)]" />
              {r.rating.toFixed(1)}
              {r.totalOrders > 0 && (
                <span className="font-medium text-[var(--text-3)]">
                  ({r.totalOrders})
                </span>
              )}
            </span>
          )}
        </div>

        <p className="truncate text-[11px] font-medium text-[var(--text-3)]">
          {getTypeLabel(r.type)}
        </p>

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[11px] text-[var(--text-2)]">
          <span className="flex items-center gap-1 font-semibold">
            <MapPin className="h-3 w-3" />
            {formatDistance(r.distanceKm)}
          </span>

          {r.etaMins != null && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {r.etaMins}-{r.etaMins + 10} mins
            </span>
          )}

          {r.hasDrinks && (
            <span className="flex items-center gap-1 text-[var(--text-3)]">
              <GlassWater className="h-3 w-3" />
              Drinks
            </span>
          )}
        </div>

        {r.deliversHere ? (
          <p className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
            <Bike className="h-3 w-3" />
            {r.fromDeliveryFee === 0
              ? "Free Delivery"
              : r.fromDeliveryFee != null
                ? `Delivery ${formatPrice(r.fromDeliveryFee, "NPR")}`
                : "Delivers here"}
          </p>
        ) : (
          <p className="text-[11px] font-semibold text-[var(--text-3)]">
            Pickup &amp; dine-in only here
          </p>
        )}
      </div>
    </Link>
  );
}
