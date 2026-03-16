"use client";

import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Star, Clock, ChevronDown, SlidersHorizontal, Flame, Sparkles, Tag, Plus } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/currency";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/* ── Types ─────────────────────────────────────────────────────────── */

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


/* ── API data transformer ──────────────────────────────────────────── */

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

/* ── Filter definitions ───────────────────────────────────────────── */

const FILTERS = [
  { id: "under200", label: `Under ${formatPrice(200, "NPR")}` },
  { id: "rating4", label: "Rating 4.0+" },
  { id: "veg", label: "Pure Veg" },
  { id: "fast", label: "Fast Delivery" },
  { id: "offers", label: "Offers" },
];

/* ── Food Card ────────────────────────────────────────────────────── */

function FoodCard({ item }: { item: FoodItem }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { addItem } = useCart();

  useGSAP(
    () => {
      if (!cardRef.current) return;
      gsap.fromTo(
        cardRef.current,
        { opacity: 0, y: 40, scale: 0.97 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.55,
          ease: "power3.out",
          scrollTrigger: {
            trigger: cardRef.current,
            start: "top 92%",
            toggleActions: "play none none none",
          },
        }
      );
    },
    { scope: cardRef }
  );

  const vegDotColor = item.isVeg ? "bg-[#1E7B3E]" : "bg-[#E23744]";
  const vegBorderColor = item.isVeg ? "border-[#1E7B3E]" : "border-[#E23744]";

  const foodLink = item.restaurantSlug !== "home"
    ? `/food/${item.id}`
    : `/food/${item.id}`;

  return (
    <div ref={cardRef} className="group">

      {/* ── Mobile: Swiggy-style horizontal card ── */}
      <div className="flex items-start gap-4 py-4 sm:hidden">
        {/* Left: tapping navigates to detail */}
        <Link href={foodLink} className="flex-1 min-w-0">
          {/* Veg / Non-veg indicator */}
          <div className={`mb-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-sm border-2 ${vegBorderColor} bg-white`}>
            <div className={`h-2 w-2 rounded-full ${vegDotColor}`} />
          </div>

          <h3 className="text-[15px] font-bold text-[#1F2A2A] leading-snug line-clamp-2">
            {item.name}
          </h3>

          {/* Rating + prep time */}
          <div className="mt-1 flex items-center gap-2">
            <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-bold text-white leading-none ${
              item.rating >= 4.0 ? "bg-[#1E7B3E]" : item.rating >= 3.0 ? "bg-[#DB7C10]" : "bg-[#E23744]"
            }`}>
              {item.rating.toFixed(1)}
              <Star className="h-2.5 w-2.5 fill-white ml-0.5" />
            </span>
            <span className="text-[11px] text-gray-400">&bull;</span>
            <div className="flex items-center gap-0.5">
              <Clock className="h-3 w-3 text-gray-400" />
              <span className="text-[11px] text-gray-500">{item.prepTime}</span>
            </div>
          </div>

          <p className="mt-0.5 text-[12px] text-gray-400 truncate">{item.tags.join(", ")}</p>

          {/* Restaurant name */}
          {item.restaurantName && (
            <p className="mt-0.5 text-[11px] text-gray-400 truncate">by {item.restaurantName}</p>
          )}

          {/* Price */}
          <p className="mt-2 text-[17px] font-extrabold text-[#1F2A2A] tracking-tight">
            {formatPrice(item.price, "NPR")}
          </p>

          {/* Offer badge */}
          {item.offer && (
            <div className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-[#F0FAF4] border border-[#1E7B3E]/20 px-2 py-1">
              <Tag className="h-3 w-3 text-[#1E7B3E] shrink-0" />
              <span className="text-[11px] font-bold text-[#1E7B3E] leading-none">{item.offer}</span>
            </div>
          )}
        </Link>

        {/* Right: image (navigates) + ADD button (adds to cart) */}
        <div className="relative shrink-0 w-27.5">
          <Link href={foodLink}>
            <img
              src={item.image}
              alt={item.name}
              loading="lazy"
              className="h-27.5 w-27.5 rounded-2xl object-cover shadow-sm"
            />
          </Link>
          {/* ADD button — outside any <Link> so it never navigates */}
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2">
            <button
              onClick={() =>
                addItem(
                  { id: item.id, name: item.name, price: item.price, image: item.image },
                  item.restaurantId,
                  item.restaurantSlug
                )
              }
              className="flex items-center gap-0.5 rounded-xl border-2 border-[#E23744] bg-white px-4 py-1 text-[13px] font-extrabold text-[#E23744] shadow-md whitespace-nowrap active:scale-95 transition-transform"
            >
              <Plus className="h-3.5 w-3.5" />
              ADD
            </button>
          </div>
        </div>
      </div>

      {/* ── Desktop: vertical card ── */}
      <Link href={foodLink} className="hidden sm:block">
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-gray-100 shadow-sm">
          <img
            src={item.image}
            alt={item.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
          />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent" />

          {/* Offer badge */}
          {item.offer && (
            <div className="absolute bottom-2.5 left-2.5">
              <span className="inline-flex items-center gap-1 rounded-md bg-[#E23744] px-2 py-1 text-[11px] font-extrabold text-white leading-none shadow-lg">
                <Tag className="h-2.5 w-2.5" />
                {item.offer}
              </span>
            </div>
          )}

          {/* Rating badge */}
          <div className="absolute bottom-2.5 right-2.5">
            <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-1 text-[11px] font-bold text-white leading-none shadow-lg ${
              item.rating >= 4.0 ? "bg-[#1E7B3E]" : item.rating >= 3.0 ? "bg-[#DB7C10]" : "bg-[#E23744]"
            }`}>
              {item.rating.toFixed(1)}
              <Star className="h-2.5 w-2.5 fill-white" />
            </span>
          </div>

          {/* Veg indicator */}
          <div className={`absolute top-2.5 left-2.5 flex h-5 w-5 items-center justify-center rounded-sm border-2 ${vegBorderColor} bg-white`}>
            <div className={`h-2 w-2 rounded-full ${vegDotColor}`} />
          </div>
        </div>

        {/* Details */}
        <div className="mt-2.5 px-0.5">
          <h3 className="text-[15px] font-bold text-[#1F2A2A] truncate leading-snug group-hover:text-[#E23744] transition-colors">
            {item.name}
          </h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Clock className="h-3 w-3 text-gray-400" />
            <span className="text-[12px] text-gray-500">{item.prepTime}</span>
          </div>
          <p className="text-[12px] text-gray-400 truncate mt-0.5">{item.tags.join(", ")}</p>
          {item.restaurantName && (
            <p className="text-[11px] text-gray-400 truncate mt-0.5">by {item.restaurantName}</p>
          )}
          <p className="text-[15px] font-bold text-[#1F2A2A] mt-1">{formatPrice(item.price, "NPR")}</p>
        </div>
      </Link>

    </div>
  );
}

/* ── Main Section ─────────────────────────────────────────────────── */

export default function PopularFoods({
  activeCategory = "All",
}: {
  activeCategory?: string;
}) {
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);
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

  // Filter logic
  const filtered = useMemo(() => {
    let items = foods;

    // Category filter from FoodCategories
    if (activeCategory !== "All") {
      items = items.filter((i) =>
        i.category.toLowerCase() === activeCategory.toLowerCase() ||
        i.tags.some((t) => t.toLowerCase() === activeCategory.toLowerCase())
      );
    }

    // Pill filters
    if (activeFilters.has("under200")) items = items.filter((i) => i.price < 200);
    if (activeFilters.has("rating4")) items = items.filter((i) => i.rating >= 4.0);
    if (activeFilters.has("veg")) items = items.filter((i) => i.isVeg);
    if (activeFilters.has("fast")) items = items.filter((i) => i.prepTime.split("-")[0] && parseInt(i.prepTime) <= 15);
    if (activeFilters.has("offers")) items = items.filter((i) => i.offer);

    return items;
  }, [foods, activeCategory, activeFilters]);

  const VISIBLE = 12;
  const displayed = showAll ? filtered : filtered.slice(0, VISIBLE);

  // GSAP header animation
  useGSAP(
    () => {
      if (!headerRef.current || !sectionRef.current) return;
      gsap.fromTo(
        headerRef.current,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: "power3.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 85%",
            toggleActions: "play none none none",
          },
        }
      );
    },
    { scope: sectionRef }
  );

  return (
    <section ref={sectionRef} className="bg-white">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8 lg:px-12 py-8 md:py-12 space-y-6">
        {/* Filter pills */}
        <div className="flex gap-2.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          <button className="shrink-0 flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2 text-[13px] font-semibold text-gray-600 hover:border-gray-300 transition-all">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
          </button>
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => toggleFilter(f.id)}
              className={`shrink-0 rounded-full border px-4 py-2 text-[13px] font-semibold transition-all ${
                activeFilters.has(f.id)
                  ? "border-[#E23744] bg-[#FFF0F1] text-[#E23744]"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Section header */}
        <div ref={headerRef} className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E23744]/10">
            <Flame className="h-4.5 w-4.5 text-[#E23744]" />
          </div>
          <div>
            <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
              {activeCategory === "All" ? "Recommended for you" : activeCategory}
            </h2>
            <p className="text-[12px] text-gray-400">
              {filtered.length} dishes {activeCategory !== "All" ? `in ${activeCategory}` : isLive ? "from nearby restaurants" : "from popular restaurants"}
            </p>
          </div>
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-7 pb-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-4/3 rounded-2xl bg-gray-100" />
                <div className="mt-3 space-y-2 px-0.5">
                  <div className="h-4 w-3/4 rounded bg-gray-100" />
                  <div className="h-3 w-1/2 rounded bg-gray-100" />
                  <div className="h-4 w-1/3 rounded bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No dishes — loading complete but DB is empty */}
        {!isLoading && filtered.length === 0 && foods.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 mb-4">
              <Sparkles className="h-7 w-7 text-gray-300" />
            </div>
            <p className="text-base font-bold text-[#1F2A2A]">No dishes yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Restaurants are coming soon — check back shortly!
            </p>
          </div>
        )}

        {/* Filtered empty state */}
        {!isLoading && foods.length > 0 && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 mb-4">
              <Sparkles className="h-7 w-7 text-gray-300" />
            </div>
            <p className="text-base font-bold text-[#1F2A2A]">No dishes found</p>
            <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
          </div>
        )}

        {/* Food grid */}
        {!isLoading && displayed.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-7 sm:gap-y-7 pb-4 sm:pb-0">
            {displayed.map((item, idx) => (
              <div key={item.id} className={idx !== 0 ? "sm:border-t-0 border-t border-gray-100" : ""}>
                <FoodCard item={item} />
              </div>
            ))}
          </div>
        )}

        {/* Show more */}
        {filtered.length > VISIBLE && (
          <div className="flex justify-center pt-2">
            <button
              onClick={() => setShowAll(!showAll)}
              className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-6 py-3 text-[13px] font-bold text-[#E23744] hover:bg-[#FFF0F1] hover:border-[#E23744]/30 transition-all active:scale-[0.97] shadow-sm"
            >
              {showAll ? "Show Less" : `See all ${filtered.length} dishes`}
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-300 ${showAll ? "rotate-180" : ""}`} />
            </button>
          </div>
        )}
      </div>

      <div className="mx-auto max-w-[1440px] px-4 md:px-8 lg:px-12">
        <hr className="border-gray-100" />
      </div>
    </section>
  );
}
