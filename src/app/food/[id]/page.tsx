"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Star,
  Clock,
  Plus,
  Minus,
  ShoppingBag,
  Heart,
  Leaf,
  Flame,
  Tag,
  Check,
  Wine,
  Egg,
  Utensils,
  ChevronRight,
  MapPin,
  Share2,
} from "lucide-react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/context/ToastContext";
import { formatPrice } from "@/lib/currency";
import { apiFetch } from "@/lib/api-client";
import RatingInput from "@/components/menu/RatingInput";
import OfferCountdown from "@/components/menu/OfferCountdown";

/* ── Types ────────────────────────────────────────────────────────────────── */

interface MenuItemSize {
  id: string;
  label: string;
  grams: string;
  priceAdd: number;
}

interface MenuItemAddOn {
  id: string;
  name: string;
  price: number;
}

interface MenuItemData {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  rating: number;
  prepTime: string;
  isVeg: boolean;
  hasEgg?: boolean;
  hasOnionGarlic?: boolean;
  tags: string[];
  discount: number;
  discountLabel: string | null;
  isFeatured: boolean;
  badge: string | null;
  offerExpiresAt: string | null;
  offerStartedAt: string | null;
  calories?: number | null;
  allergens?: string[];
  spiceLevel?: number;
  isDrink?: boolean;
  drinkCategory?: string | null;
  restaurantId: string;
  restaurant: {
    id: string;
    name: string;
    slug: string;
    phone: string;
    address: string;
    imageUrl: string | null;
    currency?: string;
  };
  category: { name: string; slug: string };
  sizes: MenuItemSize[];
  addOns: MenuItemAddOn[];
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */

const PLACEHOLDER =
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop";

function img(url: string | null) {
  return url || PLACEHOLDER;
}

function VegDot({ isVeg }: { isVeg: boolean }) {
  return (
    <span
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border ${
        isVeg ? "border-green-600" : "border-red-600"
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${isVeg ? "bg-[var(--accent)]" : "bg-red-600"}`}
      />
    </span>
  );
}

const spiceLabels = ["", "Mild", "Medium", "Hot", "Extra Hot"];
const spiceClasses = [
  "",
  "text-yellow-700 bg-yellow-50 border-yellow-100",
  "text-[var(--accent)] bg-[var(--accent)] border-[var(--accent-border)]",
  "text-red-600 bg-red-50 border-red-100",
  "text-red-700 bg-red-100 border-red-200",
];

/* ── Suggested dish card ──────────────────────────────────────────────────── */

function SuggestedCard({
  item,
  currency,
}: {
  item: MenuItemData;
  currency: string;
}) {
  return (
    <Link href={`/food/${item.id}`} className="group block">
      <div className="rounded-2xl overflow-hidden border border-[var(--border-soft)] bg-[var(--canvas)] hover:border-[var(--accent-border)] hover:shadow-md transition-all duration-300">
        <div className="relative aspect-[4/3] overflow-hidden bg-[var(--surface)]">
          <img
            src={img(item.imageUrl)}
            alt={item.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {item.discountLabel && (
            <span className="absolute top-2 left-2 rounded-lg bg-red-500 px-2 py-0.5 text-[10px] font-extrabold text-white shadow">
              {item.discountLabel}
            </span>
          )}
          {item.badge && (
            <span
              className={`absolute top-2 right-2 rounded-lg px-2 py-0.5 text-[10px] font-extrabold text-white shadow ${
                item.badge === "Bestseller" ? "bg-[var(--accent)]" : "bg-[var(--text-1)]"
              }`}
            >
              {item.badge}
            </span>
          )}
          {item.rating > 0 && (
            <span className="absolute bottom-2 right-2 flex items-center gap-0.5 rounded-lg bg-black/55 backdrop-blur-sm px-1.5 py-0.5 text-[10px] font-bold text-white">
              <Star className="h-2.5 w-2.5 fill-[var(--accent)] text-[var(--accent)]" />
              {item.rating.toFixed(1)}
            </span>
          )}
        </div>
        <div className="p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <VegDot isVeg={item.isVeg} />
            <p className="text-[13px] font-bold text-[var(--text-1)] truncate group-hover:text-[var(--accent)] transition-colors">
              {item.name}
            </p>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-extrabold text-[var(--accent)]">
              {formatPrice(item.price, currency)}
            </span>
            <span className="text-[11px] text-[var(--text-3)] flex items-center gap-0.5 shrink-0">
              <Clock className="h-3 w-3" />
              {item.prepTime}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ── Main page ────────────────────────────────────────────────────────────── */

export default function FoodDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { addItem } = useCart();
  const { showToast } = useToast();

  const [food, setFood] = useState<MenuItemData | null>(null);
  const [suggested, setSuggested] = useState<MenuItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [qty, setQty] = useState(1);
  const [sizeIdx, setSizeIdx] = useState(0);
  const [selectedAddOns, setSelectedAddOns] = useState<Set<string>>(new Set());
  const [liked, setLiked] = useState(false);
  const [added, setAdded] = useState(false);

  const cur = food?.restaurant?.currency ?? "NPR";

  /* Fetch */
  useEffect(() => {
    setLoading(true);
    setError(false);
    setQty(1);
    setSizeIdx(0);
    setSelectedAddOns(new Set());

    // apiFetch picks up the in-memory GET cache (60s TTL) so navigating
    // back-and-forth between food items doesn't re-hit the API.
    apiFetch<{
      item: MenuItemData;
      related: MenuItemData[];
      topRated: MenuItemData[];
      trending: MenuItemData[];
    }>(`/api/public/menu-items/${params.id}`)
      .then((data) => {
        setFood(data.item);

        // Deduplicate all suggested lists into one set
        const seen = new Set<string>();
        const all: MenuItemData[] = [];
        for (const item of [
          ...(data.related ?? []),
          ...(data.topRated ?? []),
          ...(data.trending ?? []),
        ]) {
          if (!seen.has(item.id)) {
            seen.add(item.id);
            all.push(item);
          }
        }
        setSuggested(all);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [params.id]);

  const sizeAdd = food && food.sizes.length > 0 ? food.sizes[sizeIdx].priceAdd : 0;
  const addOnTotal = food
    ? food.addOns
        .filter((a) => selectedAddOns.has(a.id))
        .reduce((s, a) => s + a.price, 0)
    : 0;
  const unitPrice = food ? Math.round((food.price + sizeAdd + addOnTotal)) : 0;
  const total = unitPrice * qty;

  const toggleAddOn = useCallback((id: string) => {
    setSelectedAddOns((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}/food/${params.id}`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: food?.name ?? "Check this dish!", url });
      } else {
        await navigator.clipboard.writeText(url);
        showToast("Link copied to clipboard!", "success");
      }
    } catch { /* cancelled */ }
  }, [params.id, food, showToast]);

  const handleAdd = useCallback(() => {
    if (!food) return;
    for (let i = 0; i < qty; i++) {
      addItem(
        { id: food.id, name: food.name, price: unitPrice, image: img(food.imageUrl) },
        food.restaurant.id,
        food.restaurant.slug,
        food.restaurant.currency ?? "NPR",
      );
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 2200);
  }, [food, qty, unitPrice, addItem]);

  /* ── Error ── */
  if (error || !food) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--canvas)]">
        <div className="text-center px-6">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--accent-muted)]">
            <Utensils className="h-8 w-8 text-[var(--accent)]" />
          </div>
          <p className="text-xl font-bold text-[var(--text-1)]">Dish not found</p>
          <p className="text-sm text-[var(--text-3)] mt-1">This item may have been removed.</p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-bold text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Go Home
          </Link>
        </div>
      </div>
    );
  }

  const spice = food.spiceLevel ?? 0;
  const baseDiscounted =
    food.discount > 0
      ? Math.round(food.price * (1 - food.discount / 100))
      : null;

  return (
    <div className="min-h-screen bg-[#f7f7f7]">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="relative h-[44vh] sm:h-[52vh] overflow-hidden bg-[var(--surface-alt)]">
        <motion.img
          src={img(food.imageUrl)}
          alt={food.name}
          className="h-full w-full object-cover"
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-black/30" />

        {/* Top bar — extra pt to clear any system/app navbar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-12 pb-3 sm:px-6 z-20">
          <button
            onClick={() => router.back()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/30 backdrop-blur-md text-white hover:bg-black/50 transition-colors active:scale-90"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleShare}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black/30 backdrop-blur-md text-white hover:bg-black/50 transition-colors active:scale-90"
            >
              <Share2 className="h-5 w-5" />
            </button>
            <button
              onClick={() => setLiked((v) => !v)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black/30 backdrop-blur-md text-white hover:bg-black/50 transition-colors active:scale-90"
            >
              <Heart
                className={`h-5 w-5 transition-all duration-300 ${
                  liked ? "fill-red-400 text-red-400 scale-110" : ""
                }`}
              />
            </button>
          </div>
        </div>

        {/* Hero bottom text */}
        <div className="absolute bottom-4 left-4 right-4 sm:left-6 sm:right-6 z-10">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                {food.badge && (
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold text-white ${
                      food.badge === "Bestseller"
                        ? "bg-[var(--accent)]"
                        : food.badge === "Most Liked"
                          ? "bg-[var(--text-1)]"
                          : "bg-purple-500"
                    }`}
                  >
                    {food.badge === "Bestseller" ? "# Bestseller" : food.badge}
                  </span>
                )}
                {food.discountLabel && (
                  <span className="flex items-center gap-1 rounded-full bg-red-500 px-2.5 py-0.5 text-[10px] font-extrabold text-white">
                    <Tag className="h-2.5 w-2.5" />
                    {food.discountLabel}
                  </span>
                )}
                {food.offerExpiresAt && (
                  <OfferCountdown expiresAt={food.offerExpiresAt} compact />
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight truncate">
                {food.name}
              </h1>
              <p className="text-xs text-white/60 mt-0.5 flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {food.restaurant.name}
              </p>
            </div>

            {/* Price badge */}
            <div className="shrink-0 text-right">
              {baseDiscounted != null ? (
                <>
                  <p className="text-white/50 text-xs line-through leading-none">
                    {formatPrice(food.price, cur)}
                  </p>
                  <p className="text-xl font-extrabold text-[var(--accent)] leading-tight">
                    {formatPrice(baseDiscounted, cur)}
                  </p>
                </>
              ) : (
                <p className="text-xl font-extrabold text-white">
                  {formatPrice(food.price, cur)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Main content card ─────────────────────────────────────────────── */}
      <motion.div
        className="relative -mt-5 mx-auto max-w-2xl px-3 sm:px-4"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="rounded-3xl bg-[var(--canvas)] shadow-xl shadow-black/[0.06] overflow-hidden">

          <div className="p-5 sm:p-6 space-y-5">

            {/* ── Dietary + Name ── */}
            <div>
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                <VegDot isVeg={food.isVeg} />
                <span className="text-[11px] font-semibold text-[var(--text-3)]">
                  {food.isVeg ? "Pure Veg" : "Non-Veg"}
                </span>
                {food.hasEgg && (
                  <span className="flex items-center gap-1 rounded-full border border-[var(--accent-border)] bg-[var(--accent-muted)] px-2 py-0.5 text-[10px] font-bold text-[var(--accent-text)]">
                    <Egg className="h-3 w-3" /> Contains Egg
                  </span>
                )}
                {food.hasOnionGarlic === false && (
                  <span className="flex items-center gap-1 rounded-full border border-[var(--accent-border)] bg-[var(--accent-muted)] px-2 py-0.5 text-[10px] font-bold text-[var(--accent-text)]">
                    <Leaf className="h-3 w-3" /> No Onion/Garlic
                  </span>
                )}
                {food.isFeatured && (
                  <span className="flex items-center gap-0.5 rounded-full bg-[var(--accent-muted)] px-2 py-0.5 text-[10px] font-bold text-[var(--accent)]">
                    <Star className="h-3 w-3 fill-[var(--accent)]" /> Featured
                  </span>
                )}
              </div>
              <p className="text-[11px] font-medium text-[var(--text-3)] mb-1">
                {food.category.name}
              </p>
              <h2 className="text-xl font-extrabold text-[var(--text-1)] leading-tight">
                {food.name}
              </h2>
              <p className="mt-2 text-sm text-[var(--text-2)] leading-relaxed">
                {food.description}
              </p>
            </div>

            {/* ── Stats chips ── */}
            <div className="flex flex-wrap gap-2">
              {food.rating > 0 && (
                <span className="flex items-center gap-1.5 rounded-full border border-[var(--accent-border)] bg-[var(--accent-muted)] px-3 py-1.5 text-[11px] font-bold text-[var(--accent-text)]">
                  <Star className="h-3.5 w-3.5 fill-[var(--accent)] text-[var(--accent)]" />
                  {food.rating.toFixed(1)} rating
                </span>
              )}
              <span className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--canvas-sub)] px-3 py-1.5 text-[11px] font-bold text-[var(--text-2)]">
                <Clock className="h-3.5 w-3.5" />
                {food.prepTime}
              </span>
              {food.calories != null && (
                <span className="flex items-center gap-1.5 rounded-full border border-[var(--accent-border)] bg-[var(--accent)] px-3 py-1.5 text-[11px] font-bold text-[var(--accent)]">
                  <Flame className="h-3.5 w-3.5" />
                  {food.calories} kcal
                </span>
              )}
              {spice > 0 && (
                <span
                  className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-[11px] font-bold ${spiceClasses[spice]}`}
                >
                  {"🌶️".repeat(spice)} {spiceLabels[spice]}
                </span>
              )}
              {food.isDrink && food.drinkCategory && (
                <span className="flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-[11px] font-bold text-blue-600">
                  <Wine className="h-3.5 w-3.5" />
                  {food.drinkCategory}
                </span>
              )}
            </div>

            {/* ── Allergens ── */}
            {food.allergens && food.allergens.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider mb-2">
                  Allergens
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {food.allergens.map((a) => (
                    <span
                      key={a}
                      className="flex items-center gap-1 rounded-full bg-red-50 border border-red-100 px-2.5 py-1 text-[11px] font-bold text-red-600"
                    >
                      ⚠ {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ── Tags ── */}
            {food.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {food.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-[var(--surface)] px-2.5 py-1 text-[10px] font-medium text-[var(--text-2)]"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* ── Offer banner ── */}
            {(food.offerExpiresAt || food.discount > 0) && (
              <div className="flex items-center gap-3 rounded-xl bg-[#fef3dc] border border-[var(--accent-border)] p-3.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent)]/20 shrink-0">
                  <Tag className="h-4 w-4 text-[var(--accent-hover)]" />
                </div>
                <div className="min-w-0 flex-1">
                  {food.discountLabel && (
                    <p className="text-sm font-extrabold text-[var(--accent-text)]">
                      {food.discountLabel}
                    </p>
                  )}
                  {food.discount > 0 && (
                    <p className="text-[11px] text-[#8e491e]/70 mt-0.5">
                      {food.discount}% off the base price
                    </p>
                  )}
                  <OfferCountdown expiresAt={food.offerExpiresAt} compact />
                </div>
              </div>
            )}

            {/* ── Size selector ── */}
            {food.sizes.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider mb-3">
                  Choose Size
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {food.sizes.map((s, i) => (
                    <button
                      key={s.id}
                      onClick={() => setSizeIdx(i)}
                      className={`flex flex-col items-center gap-0.5 rounded-xl border-2 py-3 px-2 transition-all ${
                        sizeIdx === i
                          ? "border-[var(--accent)] bg-[#fef3dc]"
                          : "border-[var(--border)] hover:border-[var(--border)] bg-[var(--canvas)]"
                      }`}
                    >
                      <span
                        className={`text-sm font-extrabold leading-tight ${
                          sizeIdx === i ? "text-[var(--accent-text)]" : "text-[var(--text-1)]"
                        }`}
                      >
                        {s.grams}
                      </span>
                      <span className="text-[10px] text-[var(--text-3)] font-medium">
                        {s.label}
                      </span>
                      {s.priceAdd > 0 && (
                        <span
                          className={`text-[10px] font-bold mt-0.5 ${
                            sizeIdx === i ? "text-[var(--accent-hover)]" : "text-[var(--text-3)]"
                          }`}
                        >
                          +{formatPrice(s.priceAdd, cur)}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Add-ons ── */}
            {food.addOns.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider mb-3">
                  Build Your Meal
                </p>
                <div className="space-y-2">
                  {food.addOns.map((a) => (
                    <label
                      key={a.id}
                      className={`flex items-center justify-between rounded-xl border px-4 py-3 cursor-pointer transition-all ${
                        selectedAddOns.has(a.id)
                          ? "border-[var(--accent)] bg-[#fef3dc]/50"
                          : "border-[var(--border-soft)] bg-[var(--canvas-sub)] hover:border-[var(--border)]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition-colors shrink-0 ${
                            selectedAddOns.has(a.id)
                              ? "border-[var(--accent)] bg-[var(--accent)]"
                              : "border-[var(--border)]"
                          }`}
                        >
                          {selectedAddOns.has(a.id) && (
                            <Check className="h-3 w-3 text-white" />
                          )}
                        </div>
                        <span className="text-sm font-medium text-[var(--text-1)]">
                          {a.name}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-[var(--accent)]">
                        +{formatPrice(a.price, cur)}
                      </span>
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={selectedAddOns.has(a.id)}
                        onChange={() => toggleAddOn(a.id)}
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="h-px bg-[var(--surface)]" />

            {/* ── Price + Qty ── */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider">
                  Total
                </p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  {food.discount > 0 && (
                    <span className="text-sm text-[var(--text-3)] line-through">
                      {formatPrice(food.price * qty, cur)}
                    </span>
                  )}
                  <motion.span
                    key={total}
                    initial={{ scale: 1.12, color: "#eaa94d" }}
                    animate={{ scale: 1, color: "#111111" }}
                    transition={{ duration: 0.3, ease: "backOut" }}
                    className="text-2xl font-extrabold"
                  >
                    {formatPrice(total, cur)}
                  </motion.span>
                </div>
                {qty > 1 && (
                  <p className="text-[11px] text-[var(--text-3)] mt-0.5">
                    {qty} × {formatPrice(unitPrice, cur)}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--canvas-sub)] px-1 py-1">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--canvas)] text-[var(--text-2)] hover:bg-[var(--surface)] transition-colors shadow-sm active:scale-90"
                >
                  <Minus className="h-4 w-4" strokeWidth={2.5} />
                </button>
                <motion.span
                  key={qty}
                  initial={{ scale: 1.3 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 20 }}
                  className="w-8 text-center text-base font-extrabold text-[var(--text-1)]"
                >
                  {qty}
                </motion.span>
                <button
                  onClick={() => setQty((q) => q + 1)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors shadow-sm active:scale-90"
                >
                  <Plus className="h-4 w-4" strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* ── Order Now ── */}
            <motion.button
              onClick={handleAdd}
              whileTap={{ scale: 0.97 }}
              whileHover={{ y: -1 }}
              className="relative w-full flex items-center justify-center gap-2.5 rounded-2xl bg-[var(--accent)] py-4 text-base font-bold text-white shadow-lg shadow-[var(--accent)]/25 overflow-hidden transition-colors hover:bg-[var(--accent-hover)]"
            >
              <motion.div
                className="absolute inset-0 bg-linear-to-r from-transparent via-white/15 to-transparent"
                initial={{ x: "-100%" }}
                animate={{ x: "200%" }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  repeatDelay: 3,
                  ease: "easeInOut",
                }}
              />
              <AnimatePresence mode="wait">
                {added ? (
                  <motion.span
                    key="added"
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    className="relative z-[1] flex items-center gap-2"
                  >
                    <Check className="h-5 w-5" strokeWidth={3} />
                    Added to cart!
                  </motion.span>
                ) : (
                  <motion.span
                    key="order"
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    className="relative z-[1] flex items-center gap-2"
                  >
                    <ShoppingBag className="h-5 w-5" />
                    Order Now — {formatPrice(total, cur)}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>

            <div className="h-px bg-[var(--surface)]" />

            {/* ── Rating ── */}
            <RatingInput
              menuItemId={food.id}
              restaurantId={food.restaurant.id}
              onRated={(avg) =>
                setFood((prev) => (prev ? { ...prev, rating: avg } : prev))
              }
            />

            {/* ── Restaurant info ── */}
            <div className="flex items-center gap-3 rounded-2xl bg-[var(--canvas-sub)] border border-[var(--border-soft)] p-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--text-1)]">
                <Utensils className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-[var(--text-1)] truncate">
                  {food.restaurant.name}
                </p>
                <p className="text-[11px] text-[var(--text-3)] mt-0.5 flex items-center gap-1 truncate">
                  <MapPin className="h-3 w-3 shrink-0" />
                  {food.restaurant.address}
                </p>
              </div>
              <Link
                href={`/menu/${food.restaurant.slug}`}
                className="shrink-0 flex items-center gap-0.5 text-[12px] font-bold text-[var(--accent)] hover:underline"
              >
                Full Menu
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── More from this restaurant ──────────────────────────────────────── */}
      {suggested.length > 0 && (
        <motion.div
          className="mx-auto max-w-2xl px-3 sm:px-4 mt-6 mb-12"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-extrabold text-[var(--text-1)]">
                More from {food.restaurant.name}
              </h3>
              <p className="text-[11px] text-[var(--text-3)] mt-0.5">
                {suggested.length} other dishes you might like
              </p>
            </div>
            <Link
              href={`/menu/${food.restaurant.slug}`}
              className="text-[12px] font-bold text-[var(--accent)] flex items-center gap-0.5 hover:underline"
            >
              See all <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {suggested.map((item) => (
              <SuggestedCard key={item.id} item={item} currency={cur} />
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
