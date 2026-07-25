"use client";

import Link from "next/link";
import { Bike, Clock, GlassWater, MapPin, Star, Store } from "lucide-react";
import { formatDistance } from "@/lib/geo";
import { formatPrice } from "@/lib/currency";
import { getTypeLabel } from "@/lib/restaurant-types";
import type { NearbyRestaurant } from "@/hooks/useNearby";

/**
 * One venue, everywhere it appears.
 *
 * Two shapes from one component. On a phone the card is a horizontal row with a
 * square thumbnail, which fits three or four on a screen and reads like a list;
 * stacking tall cards there meant one and a half results per viewport. From `sm`
 * up it becomes the usual vertical tile.
 *
 * Deliberately shows the awkward facts rather than hiding them: a place that is
 * closed says when it opens, and a place outside its own delivery range says so.
 * Hiding either would make the area look emptier than it is and send people to a
 * kitchen that cannot serve them.
 */
export default function StoreCard({
  store: r,
}: {
  store: NearbyRestaurant;
}) {
  const open = r.status.isOpen || r.status.deliveryOpen;
  const image = r.coverUrl ?? r.imageUrl;
  const freeDelivery = r.deliversHere && r.fromDeliveryFee === 0;

  return (
    <Link
      href={`/menu/${r.slug}`}
      className="group flex gap-3 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--canvas)] p-2.5 transition-all hover:shadow-lg sm:block sm:p-0 sm:hover:-translate-y-0.5"
    >
      {/* Thumbnail: square on mobile, full-width banner from sm up */}
      <div className="relative h-[86px] w-[86px] shrink-0 overflow-hidden rounded-xl bg-[var(--surface)] sm:h-36 sm:w-full sm:rounded-none">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 sm:group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Store className="h-6 w-6 text-[var(--text-3)] sm:h-7 sm:w-7" />
          </div>
        )}

        {freeDelivery && open && (
          <span className="absolute left-1.5 top-1.5 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] font-black text-white sm:left-2 sm:top-2 sm:px-2 sm:text-[10px]">
            Free Delivery
          </span>
        )}

        {!open && (
          <div className="absolute inset-0 flex items-end bg-black/55 p-1.5 sm:p-3">
            <span className="truncate rounded-full bg-white/95 px-1.5 py-0.5 text-[9px] font-bold text-neutral-800 sm:px-2.5 sm:py-1 sm:text-[11px]">
              {r.status.nextOpening ?? "Closed"}
            </span>
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:gap-1.5 sm:p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 truncate text-[14px] font-bold text-[var(--text-1)]">
            {r.name}
          </h3>
          {r.rating > 0 && (
            <span className="flex shrink-0 items-center gap-0.5 text-[11px] font-bold text-[var(--text-2)]">
              <Star className="h-3 w-3 fill-[var(--accent)] text-[var(--accent)]" />
              {r.rating.toFixed(1)}
              {r.totalOrders > 0 && (
                <span className="hidden font-medium text-[var(--text-3)] sm:inline">
                  ({r.totalOrders})
                </span>
              )}
            </span>
          )}
        </div>

        <p className="truncate text-[11px] font-medium text-[var(--text-3)]">
          {getTypeLabel(r.type)}
        </p>

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-0.5 pt-0.5 text-[11px] text-[var(--text-2)] sm:pt-1">
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
            <span className="hidden items-center gap-1 text-[var(--text-3)] sm:flex">
              <GlassWater className="h-3 w-3" />
              Drinks
            </span>
          )}
        </div>

        {r.deliversHere ? (
          <p className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
            <Bike className="h-3 w-3" />
            {freeDelivery
              ? "Free Delivery"
              : r.fromDeliveryFee != null
                ? `Delivery ${formatPrice(r.fromDeliveryFee, "NPR")}`
                : "Delivers here"}
          </p>
        ) : (
          <p className="truncate text-[11px] font-semibold text-[var(--text-3)]">
            Pickup and dine-in only
          </p>
        )}
      </div>
    </Link>
  );
}
