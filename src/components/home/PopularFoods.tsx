"use client";

import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { Star, Clock, Flame, Sparkles, Tag, ShoppingBag, ArrowRight, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/currency";
import { useLocation } from "@/context/LocationContext";
import FoodDetailPopup, {
  type PopupMenuItem,
} from "@/components/food/FoodDetailPopup";

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
  description: string;
  imageUrl: string | null;
  price: number;
  rating: number;
  prepTime: string;
  isVeg: boolean;
  hasEgg?: boolean;
  hasOnionGarlic?: boolean | null;
  isAvailable?: boolean;
  badge: string | null;
  tags: string[];
  discount: number;
  discountLabel: string | null;
  isFeatured: boolean;
  offerExpiresAt: string | null;
  offerStartedAt?: string | null;
  calories?: number | null;
  allergens?: string[];
  spiceLevel?: number;
  isDrink?: boolean;
  drinkCategory?: string | null;
  restaurantId: string;
  category: { name: string; slug?: string | null } | null;
  restaurant: {
    id: string;
    name: string;
    slug: string;
    imageUrl?: string | null;
    currency?: string;
  } | null;
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

function apiToPopupMenuItem(item: ApiMenuItem): PopupMenuItem {
  return {
    id: item.id,
    name: item.name,
    description: item.description ?? "",
    price: item.price,
    imageUrl: item.imageUrl,
    rating: item.rating,
    prepTime: item.prepTime,
    isVeg: item.isVeg,
    hasEgg: item.hasEgg,
    hasOnionGarlic: item.hasOnionGarlic,
    isAvailable: item.isAvailable,
    badge: item.badge,
    tags: item.tags,
    discount: item.discount,
    discountLabel: item.discountLabel,
    isFeatured: item.isFeatured,
    offerExpiresAt: item.offerExpiresAt,
    offerStartedAt: item.offerStartedAt,
    calories: item.calories,
    allergens: item.allergens ?? [],
    spiceLevel: item.spiceLevel,
    isDrink: item.isDrink,
    drinkCategory: item.drinkCategory,
    restaurantId: item.restaurantId || item.restaurant?.id || "home",
    restaurant: {
      id: item.restaurant?.id || item.restaurantId || "home",
      name: item.restaurant?.name || "",
      slug: item.restaurant?.slug || "home",
      imageUrl: item.restaurant?.imageUrl,
      currency: item.restaurant?.currency ?? "NPR",
    },
    category: {
      name: item.category?.name || "Nepali",
      slug: item.category?.slug || item.category?.name || "nepali",
    },
    sizes: [],
    addOns: [],
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
  const { addItem } = useCart();
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsAdding(true);
    addItem(
      { id: item.id, name: item.name, price: item.price, image: item.image },
      item.restaurantId,
      item.restaurantSlug
    );
    setTimeout(() => setIsAdding(false), 800);
  };

  return (
    <div className="group">
      <div className="relative overflow-hidden rounded-[2rem] bg-white border border-slate-100 shadow-sm transition-all duration-500 hover:shadow-focus hover:-translate-y-1">
        {/* Image & Badges */}
        <div 
          onClick={() => onOpenPopup(item.id)}
          className="relative aspect-[1.1] overflow-hidden cursor-pointer"
        >
          <img
            src={item.image}
            alt={item.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/40 via-transparent to-transparent opacity-60" />
          
          <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
            <div className={`h-5 w-5 rounded-md border-2 flex items-center justify-center bg-white/90 backdrop-blur-md ${item.isVeg ? 'border-green-500' : 'border-red-500'}`}>
              <div className={`h-1.5 w-1.5 rounded-full ${item.isVeg ? 'bg-green-500' : 'bg-red-500'}`} />
            </div>
            {item.offer && (
              <div className="bg-[var(--accent)] text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg shadow-lg">
                {item.offer}
              </div>
            )}
          </div>

          <div className="absolute bottom-3 left-3">
             <div className="bg-white/90 backdrop-blur-md px-2 py-1 rounded-xl shadow-sm flex items-center gap-1">
                <Star className="h-2.5 w-2.5 fill-[var(--accent)] text-[var(--accent)]" />
                <span className="text-[10px] font-black text-slate-900">{item.rating.toFixed(1)}</span>
             </div>
          </div>
        </div>

        {/* Info */}
        <div className="p-4 md:p-5">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h3 
              onClick={() => onOpenPopup(item.id)}
              className="text-[15px] font-black text-[var(--text-1)] tracking-tight leading-tight line-clamp-1 cursor-pointer group-hover:text-[var(--accent)] transition-colors"
            >
              {item.name}
            </h3>
            <p className="text-[14px] font-black text-slate-900 shrink-0">
              {formatPrice(item.price, "NPR")}
            </p>
          </div>

          <div className="flex items-center gap-2 mb-4">
             <p className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider truncate">
                {item.restaurantName || "Chef's Special"}
             </p>
             <div className="h-1 w-1 rounded-full bg-slate-200" />
             <div className="flex items-center gap-1 text-[10px] font-black text-slate-400">
                <Clock className="h-3 w-3 opacity-40" />
                {item.prepTime}
             </div>
          </div>

          {/* Action Button */}
          <motion.button
            onClick={handleAdd}
            animate={isAdding ? { scale: [1, 0.95, 1.05, 1] } : {}}
            className={`w-full py-3 rounded-2xl flex items-center justify-center gap-2 transition-all duration-300 font-black uppercase tracking-widest text-[10px] ${
              isAdding 
                ? "bg-green-500 text-white shadow-green-500/20" 
                : "bg-slate-900 text-white shadow-xl shadow-slate-900/10 hover:bg-slate-800"
            }`}
          >
            {isAdding ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
              <>
                <ShoppingBag className="h-3.5 w-3.5" />
                Add to Cart
              </>
            )}
          </motion.button>
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
  const [popupItems, setPopupItems] = useState<PopupMenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);
  const [popupItemId, setPopupItemId] = useState<string | null>(null);

  const fetchMenuItems = useCallback(async () => {
    try {
      const res = await fetch("/api/public/menu-items?limit=120");
      if (!res.ok) return;
      const data = await res.json();
      if (data.items) {
        setFoods(data.items.map(apiToFoodItem));
        setPopupItems(data.items.map(apiToPopupMenuItem));
      }
    } catch {} finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchMenuItems(); }, [fetchMenuItems]);

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

  const VISIBLE = 8;
  const displayed = showAll ? filtered : filtered.slice(0, VISIBLE);
  const popupItemsById = useMemo(
    () => new Map(popupItems.map((item) => [item.id, item])),
    [popupItems],
  );
  const filteredPopupItems = useMemo(
    () =>
      filtered
        .map((item) => popupItemsById.get(item.id))
        .filter((item): item is PopupMenuItem => Boolean(item)),
    [filtered, popupItemsById],
  );
  const selectedPopupItem = popupItemId
    ? popupItemsById.get(popupItemId)
    : undefined;

  return (
    <section className="bg-[var(--canvas)] section-focus overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 md:px-8 lg:px-12">
        
        {/* Command Strip Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-8">
          <div className="flex items-center gap-4">
             <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent)]/10 text-[var(--accent)]">
                <Flame className="h-6 w-6" />
             </div>
             <div>
                <h2 className="text-[11px] font-black text-[var(--accent)] uppercase tracking-[0.3em] mb-1">Live Recommendations</h2>
                <h3 className="text-3xl font-black text-slate-900 tracking-tighter leading-none italic">
                  Trending {activeCategory === "All" ? "Now" : activeCategory}.
                </h3>
             </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4 md:mx-0 md:px-0">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => toggleFilter(f.id)}
                className={`shrink-0 h-10 px-5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                  activeFilters.has(f.id)
                    ? "bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/20"
                    : "bg-white border border-slate-200 text-slate-400 hover:border-slate-400"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </header>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-[0.9] rounded-[2.5rem] bg-slate-50 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-24 text-center border border-dashed border-slate-200 rounded-[3rem] bg-slate-50/30">
            <Sparkles className="h-8 w-8 text-slate-200 mx-auto mb-4" />
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Awaiting New Flavors</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-12">
            {displayed.map((item) => (
              <FoodCard key={item.id} item={item} onOpenPopup={setPopupItemId} />
            ))}
          </div>
        )}

        {filtered.length > VISIBLE && (
          <div className="flex justify-center mt-16">
            <button
              onClick={() => setShowAll(!showAll)}
              className="group flex items-center gap-4 text-[11px] font-black uppercase tracking-[0.3em] text-slate-900"
            >
              {showAll ? "Collapse List" : `Reveal All ${filtered.length} Dishes`}
              <div className="h-10 w-10 rounded-full border border-slate-200 flex items-center justify-center transition-all group-hover:bg-slate-900 group-hover:text-white group-hover:border-slate-900">
                <ArrowRight className={`h-4 w-4 transition-transform duration-500 ${showAll ? "-rotate-90" : "rotate-90"}`} />
              </div>
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {popupItemId && (
          <FoodDetailPopup
            itemId={popupItemId}
            initialItem={selectedPopupItem}
            context="landing"
            allMenuItems={filteredPopupItems.length > 0 ? filteredPopupItems : popupItems}
            updateUrl={true}
            onClose={() => setPopupItemId(null)}
            onSelectRelated={(rel) => setPopupItemId(rel.id)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
