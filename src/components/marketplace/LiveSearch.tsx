"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BedDouble,
  Coffee,
  Leaf,
  Loader2,
  MapPin,
  Search,
  Store,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { useLocation } from "@/context/LocationContext";
import { formatPrice } from "@/lib/currency";
import { formatDistance } from "@/lib/geo";
import { getTypeLabel } from "@/lib/restaurant-types";

/**
 * Search as you type, across dishes, shops and hotels.
 *
 * Results come back in three labelled groups rather than one blended list.
 * "momo" legitimately means a dish to add to a basket, a shop to browse, or a
 * hotel that happens to serve them, and mixing those forces the reader to work
 * out which is which from every row.
 *
 * Requests are debounced and stamped: filter chips and fast typing both produce
 * overlapping requests, and without an id check a slow early response can land
 * after a fast later one and show results for a query the box no longer holds.
 */

interface Dish {
  id: string;
  name: string;
  price: number;
  finalPrice: number;
  discount: number;
  imageUrl: string | null;
  isDrink: boolean;
  isVeg: boolean;
  restaurantName: string;
  slug: string;
  currency: string;
  distanceKm: number | null;
}

interface Venue {
  id: string;
  name: string;
  slug: string;
  type: string;
  address: string;
  city: string;
  image: string | null;
  rating: number;
  isOpen: boolean;
  nextOpening: string | null;
  distanceKm: number | null;
}

interface Results {
  dishes: Dish[];
  shops: Venue[];
  hotels: Venue[];
}

const EMPTY: Results = { dishes: [], shops: [], hotels: [] };
const DEBOUNCE_MS = 220;

export default function LiveSearch({
  placeholder = "Search for restaurants, hotels, foods, drinks...",
  className = "",
  compact = false,
}: {
  placeholder?: string;
  className?: string;
  /** Mobile variant: no Search button, tighter padding. */
  compact?: boolean;
}) {
  const router = useRouter();
  const { coords } = useLocation();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Results>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const boxRef = useRef<HTMLDivElement>(null);
  const reqId = useRef(0);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const run = useCallback(
    async (q: string) => {
      const id = ++reqId.current;
      try {
        const res = await fetch("/api/public/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            q,
            ...(coords ? { latitude: coords.lat, longitude: coords.lon } : {}),
            radiusKm: 25,
            limitPerGroup: 5,
          }),
        });
        if (!res.ok) throw new Error("search failed");
        const data = await res.json();
        if (id !== reqId.current) return;
        setResults({
          dishes: data.dishes ?? [],
          shops: data.shops ?? [],
          hotels: data.hotels ?? [],
        });
      } catch {
        if (id === reqId.current) setResults(EMPTY);
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    },
    [coords],
  );

  // Debounced so a normal typing speed produces one request per pause, not one
  // per character.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults(EMPTY);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(() => void run(q), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query, run]);

  const go = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    go(`/nearby?q=${encodeURIComponent(q)}`);
  };

  const total =
    results.dishes.length + results.shops.length + results.hotels.length;
  const showPanel = open && query.trim().length >= 2;

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <form onSubmit={submit}>
        <div
          className={`flex w-full items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--canvas-sub)] focus-within:border-[var(--accent)] ${
            compact ? "px-3.5 py-2.5" : "py-1.5 pl-4 pr-1.5"
          }`}
        >
          <Search className="h-4 w-4 shrink-0 text-[var(--text-3)]" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--text-1)] outline-none placeholder:text-[var(--text-3)]"
          />

          {loading && (
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-[var(--text-3)]" />
          )}

          {query && !loading && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setResults(EMPTY);
              }}
              aria-label="Clear search"
              className="shrink-0"
            >
              <X className="h-3.5 w-3.5 text-[var(--text-3)]" />
            </button>
          )}

          {!compact && (
            <button
              type="submit"
              className="shrink-0 rounded-full bg-[var(--accent)] px-4 py-1.5 text-[12px] font-bold text-white transition-colors hover:bg-[var(--accent-hover)]"
            >
              Search
            </button>
          )}
        </div>
      </form>

      {showPanel && (
        <div className="absolute inset-x-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--canvas)] shadow-2xl">
          {loading && total === 0 && (
            <div className="flex items-center gap-2 px-4 py-6 text-[13px] text-[var(--text-3)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching near you...
            </div>
          )}

          {!loading && total === 0 && (
            <div className="px-4 py-8 text-center">
              <p className="text-[13px] font-bold text-[var(--text-1)]">
                Nothing found for &ldquo;{query.trim()}&rdquo;
              </p>
              <p className="mt-1 text-[11px] text-[var(--text-3)]">
                Try a dish, a shop name, or a place to stay.
              </p>
            </div>
          )}

          {results.dishes.length > 0 && (
            <Group label="Food and drinks" icon={UtensilsCrossed}>
              {results.dishes.map((d) => (
                <button
                  key={d.id}
                  onClick={() => go(`/menu/${d.slug}`)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[var(--surface)]"
                >
                  <span className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-[var(--surface)]">
                    {d.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={d.imageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center">
                        {d.isDrink ? (
                          <Coffee className="h-4 w-4 text-[var(--text-3)]" />
                        ) : (
                          <UtensilsCrossed className="h-4 w-4 text-[var(--text-3)]" />
                        )}
                      </span>
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-[13px] font-bold text-[var(--text-1)]">
                        {d.name}
                      </span>
                      {d.isVeg && (
                        <Leaf className="h-3 w-3 shrink-0 text-emerald-600" />
                      )}
                    </span>
                    <span className="block truncate text-[11px] text-[var(--text-3)]">
                      {d.restaurantName}
                      {d.distanceKm != null
                        ? ` · ${formatDistance(d.distanceKm)}`
                        : ""}
                    </span>
                  </span>

                  <span className="shrink-0 text-right">
                    <span className="block text-[13px] font-black text-[var(--text-1)]">
                      {formatPrice(d.finalPrice, d.currency)}
                    </span>
                    {d.discount > 0 && (
                      <span className="block text-[10px] text-[var(--text-3)] line-through">
                        {formatPrice(d.price, d.currency)}
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </Group>
          )}

          {results.shops.length > 0 && (
            <Group label="Restaurants and shops" icon={Store}>
              {results.shops.map((v) => (
                <VenueRow key={v.id} venue={v} onGo={() => go(`/menu/${v.slug}`)} />
              ))}
            </Group>
          )}

          {results.hotels.length > 0 && (
            <Group label="Hotels and stays" icon={BedDouble}>
              {results.hotels.map((v) => (
                <VenueRow
                  key={v.id}
                  venue={v}
                  // Hotels go straight to the booking page, since someone
                  // searching for a hotel usually wants a bed, not the menu.
                  onGo={() => go(`/hotel/${v.slug}`)}
                />
              ))}
            </Group>
          )}

          {total > 0 && (
            <button
              onClick={() => go(`/nearby?q=${encodeURIComponent(query.trim())}`)}
              className="flex w-full items-center justify-center gap-1.5 border-t border-[var(--border)] px-4 py-3 text-[12px] font-bold text-[var(--accent-text)] transition-colors hover:bg-[var(--surface)]"
            >
              See all results for &ldquo;{query.trim()}&rdquo;
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Group({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: typeof Store;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-[var(--border)] last:border-0">
      <h3 className="flex items-center gap-1.5 px-4 pb-1 pt-3 text-[10px] font-black uppercase tracking-wide text-[var(--text-3)]">
        <Icon className="h-3 w-3" />
        {label}
      </h3>
      <div className="pb-1.5">{children}</div>
    </section>
  );
}

function VenueRow({ venue: v, onGo }: { venue: Venue; onGo: () => void }) {
  return (
    <button
      onClick={onGo}
      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[var(--surface)]"
    >
      <span className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-[var(--surface)]">
        {v.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={v.image} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full items-center justify-center">
            <Store className="h-4 w-4 text-[var(--text-3)]" />
          </span>
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-bold text-[var(--text-1)]">
          {v.name}
        </span>
        <span className="flex items-center gap-1.5 truncate text-[11px] text-[var(--text-3)]">
          {getTypeLabel(v.type)}
          {v.distanceKm != null && (
            <>
              <MapPin className="h-2.5 w-2.5" />
              {formatDistance(v.distanceKm)}
            </>
          )}
        </span>
      </span>

      {/* Openness is stated rather than implied, so nobody taps through to a
          closed kitchen and finds out at checkout. */}
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
          v.isOpen
            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
            : "bg-[var(--surface)] text-[var(--text-3)]"
        }`}
      >
        {v.isOpen ? "Open" : (v.nextOpening ?? "Closed")}
      </span>
    </button>
  );
}
