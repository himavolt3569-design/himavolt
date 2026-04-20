"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Sparkles, Plus, UtensilsCrossed } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { formatPrice } from "@/lib/currency";

interface MenuItemLite {
  id: string;
  name: string;
  description: string | null;
  price: number;
  discount?: number;
  imageUrl: string | null;
  isAvailable: boolean;
  isDrink?: boolean;
  rating?: number;
  outOfStock?: boolean;
  category?: { name: string } | null;
}

interface Props {
  slug: string;
  currency: string;
  excludeItemNames: string[];
  tableNo: number | null;
}

export default function TrackingCrossSell({
  slug,
  currency,
  excludeItemNames,
  tableNo,
}: Props) {
  const [items, setItems] = useState<MenuItemLite[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch<MenuItemLite[]>(
          `/api/public/restaurants/${slug}/menu`,
        );
        if (cancelled) return;
        const excludeSet = new Set(
          excludeItemNames.map((n) => n.toLowerCase().trim()),
        );
        const filtered = data
          .filter(
            (it) =>
              it.isAvailable &&
              !it.outOfStock &&
              !excludeSet.has(it.name.toLowerCase().trim()),
          )
          .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
          .slice(0, 12);
        setItems(filtered);
      } catch {
        setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, excludeItemNames]);

  const menuHref = `/menu/${slug}${tableNo ? `?table=${tableNo}` : ""}`;

  if (loading || items.length === 0) return null;

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(240, el.clientWidth * 0.8), behavior: "smooth" });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-2xl border border-[var(--border)] bg-[var(--canvas)] p-4 shadow-sm"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent-muted)]">
            <Sparkles className="h-3.5 w-3.5 text-[var(--accent)]" />
          </div>
          <div>
            <p className="text-sm font-bold text-[var(--text-1)]">You may also like</p>
            <p className="text-[11px] text-[var(--text-3)]">From the same kitchen</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => scrollBy(-1)}
            className="hidden sm:flex h-7 w-7 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--text-2)] hover:bg-[var(--surface-alt)]"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => scrollBy(1)}
            className="hidden sm:flex h-7 w-7 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--text-2)] hover:bg-[var(--surface-alt)]"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1 -mx-1 px-1"
      >
        {items.map((it) => {
          const discountPrice =
            it.discount && it.discount > 0
              ? Math.round(it.price * (1 - it.discount / 100))
              : it.price;
          return (
            <Link
              key={it.id}
              href={menuHref}
              className="group relative shrink-0 w-36 sm:w-40 snap-start rounded-xl border border-[var(--border-soft)] bg-[var(--canvas)] overflow-hidden hover:border-[var(--accent-border)] hover:shadow-md transition-all"
            >
              <div className="relative h-24 bg-gradient-to-br from-[var(--accent-muted)] to-[var(--surface)] overflow-hidden">
                {it.imageUrl ? (
                  <img
                    src={it.imageUrl}
                    alt={it.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <UtensilsCrossed className="h-6 w-6 text-[var(--accent)]/60" />
                  </div>
                )}
                {it.discount && it.discount > 0 && (
                  <span className="absolute top-1.5 left-1.5 rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm">
                    -{it.discount}%
                  </span>
                )}
                <div className="absolute bottom-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--text-1)] text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-md">
                  <Plus className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="px-2.5 py-2 space-y-0.5">
                <p className="text-[12px] font-bold text-[var(--text-1)] leading-tight line-clamp-1">
                  {it.name}
                </p>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[12px] font-extrabold text-[var(--accent-text)]">
                    {formatPrice(discountPrice, currency)}
                  </span>
                  {it.discount && it.discount > 0 && (
                    <span className="text-[10px] text-[var(--text-3)] line-through">
                      {formatPrice(it.price, currency)}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <Link
        href={menuHref}
        className="mt-3 flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--accent-border)] bg-[var(--accent-muted)]/40 py-2.5 text-[12px] font-bold text-[var(--accent-text)] hover:bg-[var(--accent-muted)] transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
        Order more from this menu
      </Link>
    </motion.div>
  );
}
