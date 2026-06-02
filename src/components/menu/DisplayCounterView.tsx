"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Monitor, Sparkles, Flame, Clock, X, ChevronRight } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { formatPrice } from "@/lib/currency";

type ItemStatus = "available" | "just-baked" | "last-few" | "sold-out";

interface DisplayItem {
  id: string;
  name: string;
  category: string;
  price: number | null;
  status: ItemStatus;
  imageUrl: string | null;
}

interface DisplayCounterData {
  enabled: boolean;
  currency: string;
  items: DisplayItem[];
}

const STATUS_CONFIG: Record<ItemStatus, { label: string; icon: typeof Sparkles; color: string; bg: string; ring: string }> = {
  available: { label: "Available", icon: Sparkles, color: "text-[var(--accent-text)]", bg: "bg-[var(--accent-muted)]", ring: "ring-[var(--accent-border)]" },
  "just-baked": { label: "Fresh Now", icon: Flame, color: "text-[var(--accent-text)]", bg: "bg-[var(--accent-muted)]", ring: "ring-[var(--accent-border)]" },
  "last-few": { label: "Last Few!", icon: Clock, color: "text-[var(--accent)]", bg: "bg-[var(--accent)]", ring: "ring-orange-100" },
  "sold-out": { label: "Sold Out", icon: X, color: "text-red-400", bg: "bg-red-50", ring: "ring-red-100" },
};

export default function DisplayCounterView({ slug }: { slug: string }) {
  const [data, setData] = useState<DisplayCounterData | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  useEffect(() => {
    let cancelled = false;
    apiFetch<DisplayCounterData>(`/api/public/restaurants/${slug}/display-counter`)
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [slug]);

  if (!data?.enabled || data.items.length === 0) return null;

  const categories = [...new Set(data.items.map((i) => i.category))];
  const filteredItems = selectedCategory === "all"
    ? data.items
    : data.items.filter((i) => i.category === selectedCategory);

  const availableItems = filteredItems.filter((i) => i.status !== "sold-out");
  const freshCount = data.items.filter((i) => i.status === "just-baked").length;
  const previewItems = expanded ? filteredItems : filteredItems.slice(0, 6);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl bg-gradient-to-br from-[var(--accent)]0/80 via-white to-pink-50/60 ring-1 ring-[var(--accent-border)]/60 shadow-sm overflow-hidden"
    >
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--accent)] to-pink-400 shadow-sm">
              <Monitor className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-1)]">Live Counter</h3>
              <p className="text-[10px] text-[var(--text-3)] font-medium">
                {availableItems.length} available{freshCount > 0 ? ` · ${freshCount} fresh now` : ""}
              </p>
            </div>
          </div>
          {data.items.length > 6 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-[11px] font-semibold text-[var(--accent-text)] hover:text-[var(--accent-text)] transition-colors"
            >
              {expanded ? "Show less" : "View all"}
              <ChevronRight className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-90" : ""}`} />
            </button>
          )}
        </div>

        {categories.length > 1 && (
          <div className="flex gap-1.5 mt-3 overflow-x-auto scrollbar-hide pb-0.5">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide transition-all ${
                selectedCategory === "all"
                  ? "bg-[var(--text-1)] text-white shadow-sm"
                  : "bg-[var(--canvas)] text-[var(--text-2)] ring-1 ring-[var(--border)] hover:ring-[var(--border)]"
              }`}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setSelectedCategory(c)}
                className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide transition-all ${
                  selectedCategory === c
                    ? "bg-[var(--text-1)] text-white shadow-sm"
                    : "bg-[var(--canvas)] text-[var(--text-2)] ring-1 ring-[var(--border)] hover:ring-[var(--border)]"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 pb-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <AnimatePresence mode="popLayout">
            {previewItems.map((item) => {
              const sc = STATUS_CONFIG[item.status];
              const Icon = sc.icon;
              const isSoldOut = item.status === "sold-out";

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className={`relative rounded-xl bg-[var(--canvas)] p-3 ring-1 shadow-sm transition-all ${
                    isSoldOut
                      ? "ring-[var(--border)] opacity-50"
                      : item.status === "just-baked"
                      ? `${sc.ring} shadow-[var(--accent)]/20`
                      : "ring-[var(--border)] hover:ring-[var(--border)] hover:shadow-md"
                  }`}
                >
                  {item.status !== "available" && (
                    <div className={`absolute -top-1.5 -right-1.5 flex items-center gap-0.5 ${sc.bg} ${sc.color} text-[8px] font-bold px-1.5 py-0.5 rounded-full ring-1 ${sc.ring} shadow-sm`}>
                      <Icon className="h-2.5 w-2.5" />
                      {sc.label}
                    </div>
                  )}

                  <div className="text-center pt-1">
                    {item.imageUrl ? (
                      <div className="h-12 w-12 mx-auto rounded-lg overflow-hidden mb-2">
                        <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <div className={`h-10 w-10 mx-auto rounded-lg flex items-center justify-center mb-2 ${
                        item.status === "just-baked" ? "bg-[var(--accent-muted)]" : "bg-[var(--canvas-sub)]"
                      }`}>
                        <Sparkles className={`h-4 w-4 ${
                          item.status === "just-baked" ? "text-[var(--accent)]" : "text-[var(--text-3)]"
                        }`} />
                      </div>
                    )}
                    <p className={`text-xs font-bold leading-tight ${isSoldOut ? "text-[var(--text-3)] line-through" : "text-[var(--text-1)]"}`}>
                      {item.name}
                    </p>
                    {item.price !== null && (
                      <p className={`text-[11px] font-bold mt-0.5 ${isSoldOut ? "text-[var(--text-3)]" : "text-pink-500"}`}>
                        {formatPrice(item.price, data.currency)}
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
