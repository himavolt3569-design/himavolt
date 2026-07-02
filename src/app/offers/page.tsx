"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Search, SlidersHorizontal, ChevronDown,
  Star, Heart, MoreVertical, MapPin, Clock, X, UtensilsCrossed,
} from "lucide-react";
import Link from "next/link";
import { apiFetch } from "@/lib/api-client";
import { formatPrice } from "@/lib/currency";
import { getTypeLabel } from "@/lib/restaurant-types";

type Restaurant = {
  id: string;
  name: string;
  slug: string;
  type: string;
  address: string;
  city: string;
  imageUrl: string | null;
  coverUrl: string | null;
  rating: number | null;
  totalOrders: number;
  openingTime: string | null;
  closingTime: string | null;
};

type OfferBadge = {
  label: string;
  subLabel?: string;
  isAd?: boolean;
  bgColor: string;
};

const OFFER_BADGES: OfferBadge[] = [
  { label: "BUY 1 GET 1", isAd: true, bgColor: "bg-black/70" },
  { label: "60% OFF", subLabel: `UPTO ${formatPrice(110, "NPR")}`, isAd: true, bgColor: "bg-black/70" },
  { label: `FLAT ${formatPrice(100, "NPR")} OFF`, isAd: false, bgColor: "bg-[var(--accent)]/80" },
  { label: "FREE DELIVERY", isAd: false, bgColor: "bg-[var(--text-1)]/80" },
  { label: "20% OFF", subLabel: `MIN ORDER ${formatPrice(299, "NPR")}`, isAd: false, bgColor: "bg-[var(--accent)]/90" },
  { label: "BUY 1 GET 1", isAd: true, bgColor: "bg-black/70" },
  { label: "30% OFF", subLabel: `UPTO ${formatPrice(75, "NPR")}`, isAd: false, bgColor: "bg-[var(--accent)]/80" },
  { label: "50% OFF", subLabel: `UPTO ${formatPrice(150, "NPR")}`, isAd: true, bgColor: "bg-black/70" },
];

const CUISINE_MAP: Record<string, string[]> = {
  FAST_FOOD: ["Burgers", "American", "Snacks"],
  RESTAURANT: ["Nepali", "Indian", "Chinese"],
  CAFE: ["Coffee", "Bakery", "Sandwiches"],
  BAKERY: ["Cakes", "Pastries", "Bread"],
  HOTEL: ["Multi-Cuisine", "Continental", "Nepali"],
  RESORT: ["International", "Nepali", "Continental"],
  BAR: ["Cocktails", "Snacks", "Starters"],
  CLOUD_KITCHEN: ["Chinese", "Tibetan", "Desserts"],
};

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=400&fit=crop";

const DELIVERY_TIMES = ["20-25 mins", "30-35 mins", "35-40 mins", "40-45 mins", "45-50 mins", "25-30 mins"];
const DISTANCES = ["0.8 km", "1.3 km", "1.7 km", "2.1 km", "2.6 km", "3.2 km", "4.0 km"];
const LOCATIONS = ["New Road", "Thamel", "Durbar Marg", "Lazimpat", "Omaxe Mall", "Chandni Chowk"];

type SortOption = "relevance" | "rating" | "delivery" | "distance";
type VegFilter = "all" | "veg" | "non-veg";

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number,number,number,number] } },
};

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

function getDeliveryTime(id: string) {
  const hash = id.charCodeAt(0) % DELIVERY_TIMES.length;
  return DELIVERY_TIMES[hash];
}

function getDistance(id: string) {
  const hash = (id.charCodeAt(0) + id.charCodeAt(1 % id.length)) % DISTANCES.length;
  return DISTANCES[hash];
}

function getLocation(id: string) {
  const hash = id.charCodeAt(id.length - 1) % LOCATIONS.length;
  return LOCATIONS[hash];
}

function getCuisines(type: string) {
  return CUISINE_MAP[type] ?? ["Multi-Cuisine", "Nepali"];
}

function getOfferBadge(index: number): OfferBadge {
  return OFFER_BADGES[index % OFFER_BADGES.length];
}

export default function OffersPage() {
  const restaurantsQuery = useQuery({
    queryKey: ["public-restaurants", "offers"],
    queryFn: () => apiFetch<Restaurant[]>("/api/public/restaurants?limit=20"),
  });
  const restaurants = restaurantsQuery.data ?? [];
  const loading = restaurantsQuery.isLoading;
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortOption>("relevance");
  const [vegFilter, setVegFilter] = useState<VegFilter>("all");
  const [minRating, setMinRating] = useState<number | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showVegMenu, setShowVegMenu] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  const toggleWishlist = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setWishlist((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filtered = restaurants
    .filter((r) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          r.name.toLowerCase().includes(q) ||
          r.city.toLowerCase().includes(q) ||
          getCuisines(r.type).some((c) => c.toLowerCase().includes(q))
        );
      }
      return true;
    })
    .filter((r) => {
      if (minRating != null) return (r.rating ?? 0) >= minRating;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "rating") return (b.rating ?? 0) - (a.rating ?? 0);
      if (sortBy === "delivery") {
        return getDeliveryTime(a.id).localeCompare(getDeliveryTime(b.id));
      }
      if (sortBy === "distance") {
        return parseFloat(getDistance(a.id)) - parseFloat(getDistance(b.id));
      }
      return 0;
    });

  const activeFiltersCount =
    (sortBy !== "relevance" ? 1 : 0) +
    (vegFilter !== "all" ? 1 : 0) +
    (minRating != null ? 1 : 0);

  const clearAllFilters = () => {
    setSortBy("relevance");
    setVegFilter("all");
    setMinRating(null);
  };

  return (
    <div className="min-h-screen bg-[var(--canvas)]">
      <div className="sticky top-0 z-40 bg-[var(--canvas)] border-b border-[var(--border-soft)]">
        <AnimatePresence mode="wait">
          {searchOpen ? (
            <motion.div
              key="search"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-3 px-4 py-3"
            >
              <button
                onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
                className="shrink-0 p-1.5 -ml-1.5 text-[var(--text-2)] active:text-[var(--text-1)] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search restaurants, cuisines..."
                className="flex-1 text-[15px] text-[var(--text-1)] placeholder-gray-400 outline-none bg-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="shrink-0 text-[var(--text-3)] active:text-[var(--text-2)]"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="title"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-between px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <Link
                  href="/"
                  className="p-1.5 -ml-1.5 text-[var(--text-1)] active:text-[var(--text-2)] transition-colors"
                  aria-label="Back"
                >
                  <ArrowLeft className="h-5 w-5" strokeWidth={2.5} />
                </Link>
                <h1 className="text-[17px] font-bold text-[var(--text-1)] tracking-tight">
                  Flavourful Offers League
                </h1>
              </div>
              <button
                onClick={() => setSearchOpen(true)}
                className="p-1.5 text-[var(--text-1)] active:text-[var(--text-2)] transition-colors"
                aria-label="Search"
              >
                <Search className="h-5 w-5" strokeWidth={2} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative">
          <div className="flex gap-2 overflow-x-auto px-4 pb-3 pt-0.5 scrollbar-hide">
            <button
              onClick={clearAllFilters}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-all active:scale-95 ${
                activeFiltersCount > 0
                  ? "border-[var(--accent)] bg-[var(--accent)]/5 text-[var(--accent)]"
                  : "border-[var(--border)] bg-[var(--canvas)] text-[var(--text-1)]"
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={2.5} />
              Filter
              {activeFiltersCount > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-bold text-white">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            <div className="relative shrink-0">
              <button
                onClick={() => { setShowSortMenu(!showSortMenu); setShowVegMenu(false); }}
                className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-all active:scale-95 ${
                  sortBy !== "relevance"
                    ? "border-[#3e1e0c] bg-[var(--text-1)] text-white"
                    : "border-[var(--border)] bg-[var(--canvas)] text-[var(--text-1)]"
                }`}
              >
                Sort by
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showSortMenu ? "rotate-180" : ""}`} strokeWidth={2.5} />
              </button>
              <AnimatePresence>
                {showSortMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 top-full mt-1.5 z-50 min-w-[160px] rounded-2xl border border-[var(--border-soft)] bg-[var(--canvas)] shadow-xl shadow-black/10 overflow-hidden"
                  >
                    {(["relevance", "rating", "delivery", "distance"] as SortOption[]).map((opt) => (
                      <button
                        key={opt}
                        onClick={() => { setSortBy(opt); setShowSortMenu(false); }}
                        className={`flex w-full items-center justify-between px-4 py-3 text-[13px] font-semibold transition-colors hover:bg-[var(--canvas-sub)] ${
                          sortBy === opt ? "text-[var(--accent)]" : "text-[var(--text-1)]"
                        }`}
                      >
                        {opt === "relevance" ? "Relevance" : opt === "rating" ? "Rating" : opt === "delivery" ? "Delivery Time" : "Distance"}
                        {sortBy === opt && <Star className="h-3 w-3 fill-[var(--accent)] text-[var(--accent)]" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Veg / Non-Veg */}
            <div className="relative shrink-0">
              <button
                onClick={() => { setShowVegMenu(!showVegMenu); setShowSortMenu(false); }}
                className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-all active:scale-95 ${
                  vegFilter !== "all"
                    ? "border-[#3e1e0c] bg-[var(--text-1)] text-white"
                    : "border-[var(--border)] bg-[var(--canvas)] text-[var(--text-1)]"
                }`}
              >
                {vegFilter === "all" ? "Veg/Non-Veg" : vegFilter === "veg" ? "Veg Only" : "Non-Veg"}
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showVegMenu ? "rotate-180" : ""}`} strokeWidth={2.5} />
              </button>
              <AnimatePresence>
                {showVegMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 top-full mt-1.5 z-50 min-w-[140px] rounded-2xl border border-[var(--border-soft)] bg-[var(--canvas)] shadow-xl shadow-black/10 overflow-hidden"
                  >
                    {(["all", "veg", "non-veg"] as VegFilter[]).map((opt) => (
                      <button
                        key={opt}
                        onClick={() => { setVegFilter(opt); setShowVegMenu(false); }}
                        className={`flex w-full items-center gap-2.5 px-4 py-3 text-[13px] font-semibold transition-colors hover:bg-[var(--canvas-sub)] ${
                          vegFilter === opt ? "text-[var(--accent)]" : "text-[var(--text-1)]"
                        }`}
                      >
                        <span
                          className={`h-3 w-3 rounded-sm border-2 ${
                            opt === "veg"
                              ? "border-green-600 bg-[var(--accent)]"
                              : opt === "non-veg"
                              ? "border-red-600 bg-red-500"
                              : "border-gray-400 bg-[var(--surface-alt)]"
                          }`}
                        />
                        {opt === "all" ? "All" : opt === "veg" ? "Pure Veg" : "Non-Veg"}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={() => setMinRating(minRating === 4 ? null : 4)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-all active:scale-95 ${
                minRating != null
                  ? "border-[#3e1e0c] bg-[var(--text-1)] text-white"
                  : "border-[var(--border)] bg-[var(--canvas)] text-[var(--text-1)]"
              }`}
            >
              <Star className={`h-3.5 w-3.5 ${minRating != null ? "fill-white text-white" : "fill-[var(--accent)] text-[var(--accent)]"}`} />
              Ratings 4.0+
            </button>

            <button className="flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--canvas)] px-3.5 py-1.5 text-[13px] font-semibold text-[var(--text-1)] transition-all active:scale-95">
              New Arrivals
            </button>
          </div>
          <div className="pointer-events-none absolute right-0 top-0 bottom-3 w-8 bg-gradient-to-l from-white to-transparent" />
        </div>
      </div>

      {(showSortMenu || showVegMenu) && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => { setShowSortMenu(false); setShowVegMenu(false); }}
        />
      )}

      <div className="mx-auto max-w-2xl">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[var(--border)] border-t-[#eaa94d]" />
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24 px-8 text-center"
          >
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--surface)] mx-auto"><UtensilsCrossed className="h-8 w-8 text-[var(--text-3)]" /></div>
            <p className="text-base font-bold text-[var(--text-1)]">No restaurants found</p>
            <p className="mt-1 text-sm text-[var(--text-3)]">Try adjusting your filters</p>
            <button
              onClick={clearAllFilters}
              className="mt-4 rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-bold text-white"
            >
              Clear Filters
            </button>
          </motion.div>
        ) : (
          <>
            <div className="px-4 py-3">
              <p className="text-[13px] font-medium text-[var(--text-3)]">
                {filtered.length} restaurant{filtered.length !== 1 ? "s" : ""} with deals
              </p>
            </div>

            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="divide-y divide-[var(--border)]"
            >
              {filtered.map((restaurant, index) => {
                const badge = getOfferBadge(index);
                const cuisines = getCuisines(restaurant.type);
                const deliveryTime = getDeliveryTime(restaurant.id);
                const distance = getDistance(restaurant.id);
                const location = getLocation(restaurant.id);
                const isWished = wishlist.has(restaurant.id);
                const imageSrc = restaurant.imageUrl || restaurant.coverUrl || FALLBACK_IMAGE;
                const ratingColor =
                  (restaurant.rating ?? 0) >= 4
                    ? "text-[#1e9a6f] bg-[#1e9a6f]/10"
                    : (restaurant.rating ?? 0) >= 3.5
                    ? "text-[var(--accent)] bg-[var(--accent-muted)]"
                    : "text-[var(--accent)] bg-[var(--accent-muted)]";

                return (
                  <motion.div key={restaurant.id} variants={itemVariants}>
                    <Link
                      href={`/menu/${restaurant.slug}`}
                      className="flex gap-3.5 px-4 py-4 active:bg-[var(--canvas-sub)] transition-colors"
                    >
                      <div className="relative h-[110px] w-[110px] shrink-0 rounded-2xl overflow-hidden">
                        <img
                          src={imageSrc}
                          alt={restaurant.name}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                        <button
                          onClick={(e) => toggleWishlist(restaurant.id, e)}
                          className="absolute top-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--canvas)]/90 backdrop-blur-sm shadow-sm transition-transform active:scale-90"
                          aria-label={isWished ? "Remove from wishlist" : "Add to wishlist"}
                        >
                          <Heart
                            className={`h-3.5 w-3.5 transition-colors ${isWished ? "fill-[var(--accent)] text-[var(--accent)]" : "text-[var(--text-2)]"}`}
                            strokeWidth={2}
                          />
                        </button>

                        <div className={`absolute bottom-0 left-0 right-0 flex items-center justify-between px-2 py-1.5 ${badge.bgColor}`}>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-extrabold text-white leading-tight">
                              {badge.label}
                            </span>
                            {badge.subLabel && (
                              <span className="text-[8px] font-semibold text-white/80 leading-tight">
                                {badge.subLabel}
                              </span>
                            )}
                          </div>
                          {badge.isAd && (
                            <span className="text-[8px] font-bold text-white/60 border border-white/30 rounded px-1 py-0.5 leading-tight">
                              AD
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-[15px] font-bold text-[var(--text-1)] leading-tight">
                            {restaurant.name}
                          </h3>
                          <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                            className="shrink-0 p-0.5 text-[var(--text-3)] active:text-[var(--text-2)] -mt-0.5 -mr-0.5"
                            aria-label="More options"
                          >
                            <MoreVertical className="h-4.5 w-4.5" strokeWidth={2} />
                          </button>
                        </div>

                        {/* Rating + delivery time */}
                        <div className="flex items-center gap-1.5 mt-1">
                          {restaurant.rating != null && (
                            <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-bold ${ratingColor}`}>
                              <Star className="h-2.5 w-2.5 fill-current" />
                              {restaurant.rating.toFixed(1)}
                            </span>
                          )}
                          <span className="text-[var(--text-3)] text-xs">•</span>
                          <div className="flex items-center gap-0.5">
                            <Clock className="h-3 w-3 text-[var(--text-3)]" strokeWidth={2} />
                            <span className="text-[12px] font-bold text-[var(--text-1)]">
                              {deliveryTime}
                            </span>
                          </div>
                        </div>

                        <p className="mt-1 text-[12px] text-[var(--text-3)] truncate font-medium">
                          {cuisines.join(", ")}
                        </p>

                        {/* Location + distance */}
                        <div className="flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3 shrink-0 text-[var(--text-3)]" strokeWidth={2} />
                          <p className="text-[12px] text-[var(--text-3)] truncate font-medium">
                            {location} • {distance}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>

            <div className="h-8" />
          </>
        )}
      </div>
    </div>
  );
}
