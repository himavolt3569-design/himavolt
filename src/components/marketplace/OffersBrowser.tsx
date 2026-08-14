"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Clock,
  Coffee,
  Flame,
  Leaf,
  MapPin,
  Star,
  Tag,
  UtensilsCrossed,
} from "lucide-react";
import { useLocation } from "@/context/LocationContext";
import { formatPrice } from "@/lib/currency";
import { formatDistance } from "@/lib/geo";

/**
 * Discounted dishes, not restaurants.
 *
 * The previous version of this page listed venues with decorative badges such
 * as "BUY 1 GET 1" hardcoded in the client. They were not tied to anything, so
 * the checkout would never honour them. Everything here comes from a real
 * discount on a real menu item, inside its offer window.
 */

interface Offer {
  id: string;
  name: string;
  description: string | null;
  originalPrice: number;
  finalPrice: number;
  discount: number;
  discountLabel: string | null;
  saving: number;
  imageUrl: string | null;
  rating: number;
  isVeg: boolean;
  isDrink: boolean;
  endsAt: string | null;
  restaurant: {
    name: string;
    slug: string;
    type: string;
    currency: string;
    coverUrl: string | null;
  };
  distanceKm: number | null;
}

type Kind = "all" | "food" | "drinks";

const KINDS: { id: Kind; label: string; icon: typeof Tag }[] = [
  { id: "all", label: "Everything", icon: Tag },
  { id: "food", label: "Food", icon: UtensilsCrossed },
  { id: "drinks", label: "Drinks", icon: Coffee },
];

/** Human countdown so an offer that ends soon reads as urgent, honestly. */
function endsIn(iso: string | null): string | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return null;
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return `${Math.max(1, Math.round(ms / 60_000))} min left`;
  if (hours < 24) return `${hours} hr left`;
  return `${Math.round(hours / 24)} days left`;
}

export default function OffersBrowser() {
  const { coords, label } = useLocation();
  const [kind, setKind] = useState<Kind>("all");
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reqId = useRef(0);

  const load = useCallback(async () => {
    const id = ++reqId.current;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/public/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(coords ? { latitude: coords.lat, longitude: coords.lon } : {}),
          radiusKm: 25,
          kind,
          limit: 40,
        }),
      });
      if (!res.ok) throw new Error((await res.json())?.error ?? "Could not load offers");
      const data = await res.json();
      if (id !== reqId.current) return;
      setOffers(data.offers ?? []);
      setLoading(false);
    } catch (e) {
      if (id !== reqId.current) return;
      setError(e instanceof Error ? e.message : "Could not load offers");
      setLoading(false);
    }
  }, [coords, kind]);

  useEffect(() => {
    void load();
  }, [load]);

  const best = useMemo(
    () => offers.reduce((m, o) => Math.max(m, o.discount), 0),
    [offers],
  );

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {KINDS.map(({ id, label: l, icon: Icon }) => (
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
            {l}
          </button>
        ))}

        <span className="ml-auto flex items-center gap-1.5 text-[12px] text-[var(--text-3)]">
          <MapPin className="h-3.5 w-3.5" />
          {coords ? `Near ${label}` : "Across Nepal"}
        </span>
      </div>

      {!loading && !error && best > 0 && (
        <p className="mb-5 flex items-center gap-2 rounded-2xl bg-[var(--accent-muted)] px-4 py-3 text-[13px] font-bold text-[var(--accent-text)]">
          <Flame className="h-4 w-4" />
          Biggest discount near you right now is {best}% off
        </p>
      )}

      {loading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-64 animate-pulse rounded-2xl bg-[var(--surface)]"
            />
          ))}
        </div>
      )}

      {!loading && error && (
        <p className="rounded-2xl bg-[var(--surface)] px-4 py-6 text-center text-[13px] text-[var(--text-2)]">
          {error}
        </p>
      )}

      {!loading && !error && offers.length === 0 && (
        <div className="rounded-2xl bg-[var(--surface)] px-4 py-14 text-center">
          <Tag className="mx-auto mb-3 h-8 w-8 text-[var(--text-3)]" />
          <p className="text-[15px] font-bold text-[var(--text-1)]">
            No live offers near you at the moment
          </p>
          <p className="mx-auto mt-1.5 max-w-sm text-[12px] text-[var(--text-3)]">
            We only show discounts that are genuinely running, so this page is
            empty rather than showing you a deal that would not apply.
          </p>
          <Link
            href="/nearby"
            className="mt-4 inline-block rounded-full bg-[var(--accent)] px-4 py-2 text-[12px] font-bold text-white"
          >
            Browse everything nearby
          </Link>
        </div>
      )}

      {!loading && offers.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {offers.map((o) => (
            <OfferCard key={o.id} offer={o} />
          ))}
        </div>
      )}
    </section>
  );
}

function OfferCard({ offer: o }: { offer: Offer }) {
  const remaining = endsIn(o.endsAt);
  const image = o.imageUrl ?? o.restaurant.coverUrl;

  return (
    <Link
      href={`/menu/${o.restaurant.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--canvas)] transition-all hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="relative h-32 w-full overflow-hidden bg-[var(--surface)]">
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
            {o.isDrink ? (
              <Coffee className="h-7 w-7 text-[var(--text-3)]" />
            ) : (
              <UtensilsCrossed className="h-7 w-7 text-[var(--text-3)]" />
            )}
          </div>
        )}

        <span className="absolute left-2 top-2 rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-black text-white">
          {o.discountLabel ?? `${Math.round(o.discount)}% OFF`}
        </span>

        {remaining && (
          <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-bold text-white">
            <Clock className="h-2.5 w-2.5" />
            {remaining}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 truncate text-[14px] font-bold text-[var(--text-1)]">
            {o.name}
          </h3>
          {o.isVeg && (
            <Leaf className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-label="Vegetarian" />
          )}
        </div>

        <p className="truncate text-[11px] text-[var(--text-3)]">
          {o.restaurant.name}
        </p>

        <div className="mt-1 flex flex-wrap items-baseline gap-2">
          <span className="text-[16px] font-black text-[var(--text-1)]">
            {formatPrice(o.finalPrice, o.restaurant.currency)}
          </span>
          <span className="text-[12px] font-medium text-[var(--text-3)] line-through">
            {formatPrice(o.originalPrice, o.restaurant.currency)}
          </span>
        </div>

        <p className="text-[11px] font-bold text-emerald-600">
          You save {formatPrice(o.saving, o.restaurant.currency)}
        </p>

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1.5 text-[11px] text-[var(--text-2)]">
          {o.distanceKm != null && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {formatDistance(o.distanceKm)}
            </span>
          )}
          {o.rating > 0 && (
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-[var(--accent)] text-[var(--accent)]" />
              {o.rating.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
