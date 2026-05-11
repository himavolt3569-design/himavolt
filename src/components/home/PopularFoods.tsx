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

function FoodCard({ item, index, onOpenPopup }: { item: FoodItem; index: number; onOpenPopup: (id: string) => void }) {
  const { addItem, getItemQty } = useCart();
  const [isAdding, setIsAdding] = useState(false);
  const qty = getItemQty ? getItemQty(item.id) : 0;

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

  const isLong = (index + 1) % 5 === 0;

  if (isLong) {
    return (
      <div 
        className="group relative overflow-hidden rounded-[2rem] bg-white border border-slate-100 shadow-sm transition-all duration-500 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:-translate-y-1 col-span-1 sm:col-span-2 md:col-span-2 lg:col-span-2 cursor-pointer"
        onClick={() => onOpenPopup(item.id)}
      >
        <div className="relative aspect-[2/1] sm:aspect-[2.5/1] overflow-hidden w-full">
           <img
             src={item.image}
             alt={item.name}
             loading="lazy"
             decoding="async"
             className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
           />
           <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
           <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] sm:text-xs font-black uppercase shadow-lg text-slate-800">
              {item.restaurantName || "Chef's Special"}
           </div>
           
           <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-2 py-1 rounded-xl flex items-center gap-1 shadow-lg">
              <Star className="h-3 w-3 sm:h-3.5 sm:w-3.5 fill-[var(--accent)] text-[var(--accent)]" />
              <span className="text-[10px] sm:text-xs font-black text-slate-900">{item.rating.toFixed(1)}</span>
           </div>

           <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between pointer-events-none">
             <div className="flex-1 pr-4">
                <div className="flex items-center gap-2 mb-1.5">
                   <div className={`h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center rounded border-2 border-white/80 ${item.isVeg ? "bg-green-500/20" : "bg-red-500/20"}`}>
                     <div className={`h-1.5 w-1.5 rounded-full ${item.isVeg ? "bg-green-400" : "bg-red-400"}`} />
                   </div>
                   <h3 className="text-xl sm:text-2xl font-black text-white drop-shadow-md truncate">{item.name}</h3>
                </div>
                <div className="flex gap-3 text-white/90 text-[10px] sm:text-xs font-bold drop-shadow-md">
                   <span className="flex items-center gap-1"><Clock className="h-3 w-3 opacity-80"/> {item.prepTime}</span>
                   {item.tags && item.tags.length > 0 && (
                     <span className="hidden sm:inline-block truncate">| {item.tags[0]}</span>
                   )}
                </div>
             </div>
             
             <div className="flex flex-col items-end gap-2 pointer-events-auto">
                <div className="bg-[#0f172a] text-white px-4 py-2 sm:px-5 sm:py-2.5 rounded-2xl flex items-center gap-2 shadow-xl shadow-[#0f172a]/20 hover:bg-[#1e293b] active:scale-95 transition-all" onClick={handleAdd}>
                   <span className="text-[14px] sm:text-[16px] font-black mr-1">{formatPrice(item.price, "NPR")}</span>
                   <div className="h-4 w-[1px] bg-white/20" />
                   {isAdding ? (
                     <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider ml-1 text-green-400">Added</span>
                   ) : (
                     <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider ml-1">Add</span>
                   )}
                </div>
             </div>
           </div>
        </div>
      </div>
    );
  }

  // The horizontal stacked Swiggy style shown in screenshot attached by user
  return (
    <div 
      className="group relative flex items-center gap-4 sm:gap-5 bg-white rounded-3xl p-3 shadow-sm border border-slate-100 hover:shadow-md hover:border-orange-100 transition-all duration-300 cursor-pointer w-full"
      onClick={() => onOpenPopup(item.id)}
    >
       {/* Left: Stacked images mimicking the screenshot */}
       <div className="relative shrink-0 w-[100px] h-[100px] sm:w-[110px] sm:h-[110px] ml-4 my-1">
         {/* Shadow layers behind */}
         <div className="absolute inset-0 bg-[#2b2b2b] rounded-[1.25rem] scale-[0.85] -translate-x-[18px] sm:-translate-x-5 shadow-sm transition-transform duration-500 group-hover:-translate-x-[22px] sm:group-hover:-translate-x-6" />
         <div className="absolute inset-0 bg-[#a39485] rounded-[1.25rem] scale-[0.92] -translate-x-[9px] sm:-translate-x-2.5 shadow-sm transition-transform duration-500 group-hover:-translate-x-[12px] sm:group-hover:-translate-x-3.5" />
         
         <div className="relative z-10 w-full h-full rounded-[1.25rem] overflow-hidden bg-[var(--surface)] shadow-sm">
           <img
             src={item.image}
             alt={item.name}
             loading="lazy"
             className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
           />
           {item.isVeg !== undefined && (
             <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-md p-[3px] rounded bg-white shadow-sm border border-slate-100/50">
                <div className={`h-1.5 w-1.5 rounded-sm ${item.isVeg ? "bg-green-500" : "bg-red-500"}`} />
             </div>
           )}
           {qty > 0 && (
             <div className="absolute top-2 right-2 bg-orange-500 text-white font-black text-[10px] h-5 w-5 flex items-center justify-center rounded-full shadow-lg border border-white">
               {qty}
             </div>
           )}
         </div>
       </div>

       {/* Right: Info */}
       <div className="flex-1 flex flex-col justify-center min-w-0 pr-2 sm:pr-3 py-1">
         <h3 className="text-[15px] sm:text-[16px] font-black text-slate-800 leading-tight mb-1 truncate">
           {item.name}
         </h3>

         <div className="flex items-center text-[11px] sm:text-[12px] text-slate-500 mb-2 font-semibold gap-1.5 line-clamp-1">
            <span className="truncate">{item.restaurantName || "Chef's Special"}</span>
            <span className="opacity-40 font-normal">|</span>
            <span className="shrink-0 flex items-center gap-0.5"><Clock className="h-3 w-3 opacity-60" /> {item.prepTime}</span>
         </div>

         <div className="flex items-center justify-between mt-auto pt-1 rounded-xl">
            <div className="text-[16px] sm:text-[18px] font-black text-orange-500 tracking-tight">
              {formatPrice(item.price, "NPR")}
            </div>

            <div className="shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
               <button
                 onClick={handleAdd}
                 className={`uppercase px-4 py-1.5 rounded-xl text-[11px] sm:text-[12px] font-bold tracking-wider transition-all ${
                   isAdding 
                     ? "bg-green-50 text-green-600 border border-green-200"
                     : "bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-500 hover:text-white"
                 }`}
               >
                 {isAdding ? "Added" : "Add"}
               </button>
            </div>
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
            {displayed.map((item, index) => (
              <FoodCard key={item.id} item={item} index={index} onOpenPopup={setPopupItemId} />
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
