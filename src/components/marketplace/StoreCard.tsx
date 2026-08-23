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
      className="group flex flex-col gap-0 overflow-hidden rounded-3xl bg-[var(--surface)] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl sm:block"
    >
      {/* Thumbnail: Large 16:9 banner */}
      <div className="relative h-[160px] w-full shrink-0 overflow-hidden sm:h-[200px]">
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
          <span className="absolute left-3 top-3 rounded-xl bg-emerald-500/90 px-2.5 py-1 text-[11px] font-black text-white shadow-sm backdrop-blur-md">
            Free Delivery
          </span>
        )}

        {!open && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <span className="rounded-2xl bg-white/95 px-4 py-1.5 text-[12px] font-black text-neutral-900 shadow-xl">
              {r.status.nextOpening ?? "Closed"}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 truncate text-[16px] font-black text-[var(--text-1)] tracking-tight">
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

        <p className="mt-1 truncate text-[13px] font-medium text-[var(--text-3)]">
          {getTypeLabel(r.type)}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-[var(--text-2)]">
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
          <div className="mt-4 pt-4 border-t border-[var(--border-soft)]">
            <p className="flex items-center gap-1.5 text-[12px] font-black text-emerald-600">
              <Bike className="h-4 w-4" />
              {freeDelivery
                ? "Free Delivery"
                : r.fromDeliveryFee != null
                  ? `Delivery ${formatPrice(r.fromDeliveryFee, "NPR")}`
                  : "Delivers here"}
            </p>
          </div>
        ) : (
          <div className="mt-4 pt-4 border-t border-[var(--border-soft)]">
            <p className="truncate text-[12px] font-bold text-[var(--text-3)]">
              Pickup and dine-in only
            </p>
          </div>
        )}
      </div>
    </Link>
  );
}
