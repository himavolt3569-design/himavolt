"use client";

import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { Star, Clock, ChevronDown, SlidersHorizontal, Flame, Sparkles, Tag, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/currency";
import { useLocation } from "@/context/LocationContext";
import FoodDetailPopup from "@/components/food/FoodDetailPopup";


interface FoodItem {
  id: string;
  name: string;
  image: string;
  price: number;
  rating: number;
  prepTime: string;
  tags: string[];
  offer?: string;
  isVeg?: boolean;
  category: string;
  restaurantId: string;
  restaurantSlug: string;
  restaurantName: string;
}



interface ApiMenuItem {
  id: string;
  name: string;
  imageUrl: string | null;
  price: number;
  rating: number;
  prepTime: string;
  isVeg: boolean;
  tags: string[];
  discountLabel: string | null;
  category: { name: string } | null;
  restaurant: { id: string; name: string; slug: string } | null;
}

function apiToFoodItem(item: ApiMenuItem): FoodItem {
  return {
    id: item.id,
    name: item.name,
    image: item.imageUrl || "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop",
    price: item.price,
    rating: item.rating,
    prepTime: item.prepTime,
    tags: item.tags,
    offer: item.discountLabel || undefined,
    isVeg: item.isVeg,
    category: item.category?.name || "Nepali",
    restaurantId: item.restaurant?.id || "home",
    restaurantSlug: item.restaurant?.slug || "home",
    restaurantName: item.restaurant?.name || "",
  };
}


const FILTERS = [
  { id: "under200", label: `Under ${formatPrice(200, "NPR")}` },
  { id: "rating4", label: "Rating 4.0+" },
  { id: "veg", label: "Pure Veg" },
  { id: "fast", label: "Fast Delivery" },
  { id: "offers", label: "Offers" },
];


function FoodCard({ item, onOpenPopup }: { item: FoodItem; onOpenPopup: (id: string) => void }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { addItem } = useCart();

  const vegDotColor = item.isVeg ? "bg-[var(--accent)]" : "bg-[#E23744]";
  const vegBorderColor = item.isVeg ? "border-[var(--accent)]" : "border-[#E23744]";

  return (
    <div ref={cardRef} className="group">

      {/* ── Mobile: horizontal card — image left, text right ── */}
      <div className="flex items-start gap-4 py-4 sm:hidden">
        {/* Left: image + ADD button */}
        <div className="relative shrink-0 w-27.5">
          <button onClick={() => onOpenPopup(item.id)} className="block">
            <img
              src={item.image}
              alt={item.name}
              loading="lazy"
              className="h-27.5 w-27.5 rounded-2xl object-cover shadow-sm"
            />
          </button>
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2">
            <button
              onClick={() =>
                addItem(
                  { id: item.id, name: item.name, price: item.price, image: item.image },
                  item.restaurantId,
                  item.restaurantSlug
                )
              }
              className="flex items-center gap-0.5 rounded-xl border-2 border-[var(--accent)] bg-[var(--canvas)] px-4 py-1 text-[13px] font-extrabold text-[var(--accent)] shadow-md whitespace-nowrap active:scale-95 transition-transform"
            >
              <Plus className="h-3.5 w-3.5" />
              ADD
            </button>
          </div>
        </div>

        <button onClick={() => onOpenPopup(item.id)} className="flex-1 min-w-0 text-left">
          {/* Veg / Non-veg indicator */}
          <div className={`mb-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-sm border-2 ${vegBorderColor} bg-[var(--canvas)]`}>
            <div className={`h-2 w-2 rounded-full ${vegDotColor}`} />
          </div>

          <h3 className="text-[15px] font-bold text-[var(--text-1)] leading-snug line-clamp-2">
            {item.name}
          </h3>

          {/* Rating + prep time */}
          <div className="mt-1 flex items-center gap-2">
            <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-bold text-white leading-none ${
              item.rating >= 4.0 ? "bg-[var(--accent)]" : item.rating >= 3.0 ? "bg-[#DB7C10]" : "bg-[#E23744]"
            }`}>
              {item.rating.toFixed(1)}
              <Star className="h-2.5 w-2.5 fill-white ml-0.5" />
            </span>
            <span className="text-[11px] text-[var(--text-3)]">&bull;</span>
            <div className="flex items-center gap-0.5">
              <Clock className="h-3 w-3 text-[var(--text-3)]" />
              <span className="text-[11px] text-[var(--text-2)]">{item.prepTime}</span>
            </div>
          </div>

          {item.restaurantName && (
            <p className="mt-0.5 text-[11px] text-[var(--text-3)] truncate">by {item.restaurantName}</p>
          )}

          <p className="mt-2 text-[17px] font-extrabold text-[var(--text-1)] tracking-tight">
            {formatPrice(item.price, "NPR")}
          </p>

          {item.offer && (
            <div className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-[#F0FAF4] border border-[var(--accent)]/20 px-2 py-1">
              <Tag className="h-3 w-3 text-[var(--accent)] shrink-0" />
              <span className="text-[11px] font-bold text-[var(--accent)] leading-none">{item.offer}</span>
            </div>
          )}
        </button>
      </div>

      {/* ── Desktop: vertical card ── */}
      <div onClick={() => onOpenPopup(item.id)} className="hidden sm:block w-full text-left cursor-pointer">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-[var(--surface)] shadow-sm">
          <img
            src={item.image}
            alt={item.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
          />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent" />

          {item.offer && (
            <div className="absolute bottom-2.5 left-2.5">
              <span className="inline-flex items-center gap-1 rounded-md bg-[var(--accent)] px-2 py-1 text-[11px] font-extrabold text-white leading-none shadow-lg">
                <Tag className="h-2.5 w-2.5" />
                {item.offer}
              </span>
            </div>
          )}

          <div className="absolute bottom-2.5 right-2.5">
            <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-1 text-[11px] font-bold text-white leading-none shadow-lg ${
              item.rating >= 4.0 ? "bg-[var(--accent)]" : item.rating >= 3.0 ? "bg-[#DB7C10]" : "bg-[#E23744]"
            }`}>
              {item.rating.toFixed(1)}
              <Star className="h-2.5 w-2.5 fill-white" />
            </span>
          </div>

          <div className={`absolute top-2.5 left-2.5 flex h-5 w-5 items-center justify-center rounded-sm border-2 ${vegBorderColor} bg-[var(--canvas)]`}>
            <div className={`h-2 w-2 rounded-full ${vegDotColor}`} />
          </div>

          {/* Desktop hover ADD button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              addItem(
                { id: item.id, name: item.name, price: item.price, image: item.image },
                item.restaurantId,
                item.restaurantSlug,
              );
            }}
            className="absolute bottom-3 right-3 hidden sm:flex items-center gap-1 rounded-xl bg-[var(--canvas)] px-3 py-1.5 text-[13px] font-extrabold text-[var(--accent)] border-2 border-[var(--accent)] shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" /> ADD
          </button>
        </div>

        <div className="mt-2.5 px-0.5">
          <h3 className="text-[15px] font-bold text-[var(--text-1)] truncate leading-snug group-hover:text-[var(--accent)] transition-colors">
            {item.name}
          </h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Clock className="h-3 w-3 text-[var(--text-3)]" />
            <span className="text-[12px] text-[var(--text-2)]">{item.prepTime}</span>
          </div>
          <p className="text-[12px] text-[var(--text-3)] truncate mt-0.5">{item.tags.join(", ")}</p>
          {item.restaurantName && (
            <p className="text-[11px] text-[var(--text-3)] truncate mt-0.5">by {item.restaurantName}</p>
          )}
          <p className="text-[15px] font-bold text-[var(--text-1)] mt-1">{formatPrice(item.price, "NPR")}</p>
        </div>
      </div>

    </div>
  );
}


export default function PopularFoods({
  activeCategory = "All",
}: {
  activeCategory?: string;
}) {
  const { location } = useLocation();
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);
  const [popupItemId, setPopupItemId] = useState<string | null>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  // Fetch real menu items from the API
  const fetchMenuItems = useCallback(async () => {
    try {
      const res = await fetch("/api/public/menu-items?limit=120");
      if (!res.ok) return;
      const data = await res.json();
      if (data.items && data.items.length > 0) {
        setFoods(data.items.map(apiToFoodItem));
        setIsLive(true);
      }
    } catch {
      // remain empty on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMenuItems();
  }, [fetchMenuItems]);

  const toggleFilter = (id: string) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setShowAll(false);
  };

  const filtered = useMemo(() => {
    let items = foods;

    if (activeCategory !== "All") {
      items = items.filter((i) =>
        i.category.toLowerCase() === activeCategory.toLowerCase() ||
        i.tags.some((t) => t.toLowerCase() === activeCategory.toLowerCase())
      );
    }

    if (activeFilters.has("under200")) items = items.filter((i) => i.price < 200);
    if (activeFilters.has("rating4")) items = items.filter((i) => i.rating >= 4.0);
    if (activeFilters.has("veg")) items = items.filter((i) => i.isVeg);
    if (activeFilters.has("fast")) items = items.filter((i) => i.prepTime.split("-")[0] && parseInt(i.prepTime) <= 15);
    if (activeFilters.has("offers")) items = items.filter((i) => i.offer);

    return items;
  }, [foods, activeCategory, activeFilters]);

  const VISIBLE = 12;
  const displayed = showAll ? filtered : filtered.slice(0, VISIBLE);

  /* Header entrance — no GSAP fromTo (avoids mobile invisible bug) */

  return (
    <section ref={sectionRef} className="bg-[var(--canvas)]">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8 lg:px-12 py-8 md:py-12 space-y-6">
        <div className="flex gap-2.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          <button className="shrink-0 flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--canvas)] px-4 py-2 text-[13px] font-semibold text-[var(--text-2)] hover:border-[var(--border)] transition-all">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
          </button>
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => toggleFilter(f.id)}
              className={`shrink-0 rounded-full border px-4 py-2 text-[13px] font-semibold transition-all ${
                activeFilters.has(f.id)
                  ? "border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--accent)]"
                  : "border-[var(--border)] bg-[var(--canvas)] text-[var(--text-2)] hover:border-[var(--border)]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div ref={headerRef} className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-muted)]">
            <Flame className="h-4.5 w-4.5 text-[var(--accent)]" />
          </div>
          <div>
            <h2 className="text-[11px] font-bold text-[var(--text-3)] uppercase tracking-widest">
              {activeCategory === "All" ? "Recommended for you" : activeCategory}
            </h2>
            <p className="text-[12px] text-[var(--text-3)]">
              {filtered.length} dishes {activeCategory !== "All" ? `in ${activeCategory}` : location.area !== "Kathmandu" ? `near ${location.area}` : "from nearby restaurants"}
            </p>
          </div>
        </div>

        {/* No dishes — loading complete but DB is empty */}
        {!isLoading && filtered.length === 0 && foods.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--surface)] mb-4">
              <Sparkles className="h-7 w-7 text-[var(--text-3)]" />
            </div>
            <p className="text-base font-bold text-[var(--text-1)]">No dishes yet</p>
            <p className="text-sm text-[var(--text-3)] mt-1">
              Restaurants are coming soon — check back shortly!
            </p>
          </div>
        )}

        {!isLoading && foods.length > 0 && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--surface)] mb-4">
              <Sparkles className="h-7 w-7 text-[var(--text-3)]" />
            </div>
            <p className="text-base font-bold text-[var(--text-1)]">No dishes found</p>
            <p className="text-sm text-[var(--text-3)] mt-1">Try adjusting your filters</p>
          </div>
        )}

        {displayed.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-7 sm:gap-y-7 pb-4 sm:pb-0"
          >
            {displayed.map((item, idx) => (
              <div key={item.id} className={idx !== 0 ? "sm:border-t-0 border-t border-[var(--border-soft)]" : ""}>
                <FoodCard item={item} onOpenPopup={setPopupItemId} />
              </div>
            ))}
          </motion.div>
        )}

        {filtered.length > VISIBLE && (
          <div className="flex justify-center pt-2">
            <button
              onClick={() => setShowAll(!showAll)}
              className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--canvas)] px-6 py-3 text-[13px] font-bold text-[var(--accent)] hover:bg-[var(--accent-muted)] hover:border-[var(--accent-border)] transition-all active:scale-[0.97] shadow-sm"
            >
              {showAll ? "Show Less" : `See all ${filtered.length} dishes`}
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-300 ${showAll ? "rotate-180" : ""}`} />
            </button>
          </div>
        )}
      </div>

      <div className="mx-auto max-w-[1440px] px-4 md:px-8 lg:px-12">
        <hr className="border-[var(--border-soft)]" />
      </div>

      <AnimatePresence>
        {popupItemId && (
          <FoodDetailPopup
            itemId={popupItemId}
            context="landing"
            updateUrl={true}
            onClose={() => setPopupItemId(null)}
            onSelectRelated={(rel) => setPopupItemId(rel.id)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
