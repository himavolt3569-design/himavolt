"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useId,
  CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Heart,
  Share2,
  Star,
  Clock,
  Flame,
  Leaf,
  Egg,
  Tag,
  Check,
  Wine,
  Plus,
  Minus,
  ShoppingBag,
  ChevronRight,
  MapPin,
  Utensils,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/context/ToastContext";
import { formatPrice } from "@/lib/currency";
import RatingInput from "@/components/menu/RatingInput";
import OfferCountdown from "@/components/menu/OfferCountdown";

/* ── Exported types ───────────────────────────────────────────────────────── */

export interface PopupMenuItemSize {
  id: string;
  label: string;
  grams: string;
  priceAdd: number;
}

export interface PopupMenuItemAddOn {
  id: string;
  name: string;
  price: number;
}

export interface PopupMenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
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
  restaurant: {
    id: string;
    name: string;
    slug: string;
    phone?: string;
    address?: string;
    imageUrl?: string | null;
    currency?: string;
  };
  category: { name: string; slug: string };
  sizes: PopupMenuItemSize[];
  addOns: PopupMenuItemAddOn[];
}

export type FoodDetailContext = "landing" | "menu";

export interface FoodDetailPopupProps {
  itemId: string;
  initialItem?: PopupMenuItem;
  context: FoodDetailContext;
  allMenuItems?: PopupMenuItem[];
  surgeMultiplier?: number;
  updateUrl?: boolean;
  onClose: () => void;
  onSelectRelated?: (item: PopupMenuItem) => void;
}

/* ── Constants ────────────────────────────────────────────────────────────── */

const PLACEHOLDER =
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop";

const spiceLabels = ["", "Mild", "Medium", "Hot", "Extra Hot"];
const spiceClasses = [
  "",
  "text-yellow-700 bg-yellow-50 border-yellow-100",
  "text-[var(--accent)] bg-[var(--accent)] border-[var(--accent-border)]",
  "text-red-600 bg-red-50 border-red-100",
  "text-red-700 bg-red-100 border-red-200",
];

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function imgSrc(url: string | null | undefined) {
  return url || PLACEHOLDER;
}

function getAccent(item: PopupMenuItem): string {
  if (item.isDrink) return "#3b82f6";
  if (item.isVeg) return "#16a34a";
  if ((item.spiceLevel ?? 0) >= 3) return "#ef4444";
  return "#eaa94d";
}

function VegDot({ isVeg }: { isVeg: boolean }) {
  return (
    <span
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border ${
        isVeg ? "border-green-600" : "border-red-600"
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${
          isVeg ? "bg-[var(--accent)]" : "bg-red-600"
        }`}
      />
    </span>
  );
}

function GrainSVG({ uid, suffix }: { uid: string; suffix: string }) {
  const id = `grain-${uid}-${suffix}`;
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.025] mix-blend-overlay z-[5]"
      aria-hidden="true"
    >
      <filter id={id}>
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.65"
          numOctaves="3"
          stitchTiles="stitch"
        />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter={`url(#${id})`} />
    </svg>
  );
}

/* ── Animation variants ───────────────────────────────────────────────────── */

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.25 } },
};

const mobileVariants = {
  hidden: { y: "100%" },
  visible: {
    y: 0,
    transition: { type: "spring" as const, stiffness: 400, damping: 42 },
  },
  exit: {
    y: "100%",
    transition: { duration: 0.28, ease: "easeIn" as const },
  },
};

const desktopVariants = {
  hidden: { scale: 0.94, opacity: 0, y: 10 },
  visible: {
    scale: 1,
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 360, damping: 36 },
  },
  exit: {
    scale: 0.94,
    opacity: 0,
    y: 10,
    transition: { duration: 0.22 },
  },
};

/* ── SimilarCard ──────────────────────────────────────────────────────────── */

function SimilarCard({
  item,
  currency,
  onSelect,
}: {
  item: PopupMenuItem;
  currency: string;
  onSelect: () => void;
}) {
  return (
    <button onClick={onSelect} className="text-left group block w-full">
      <div className="rounded-xl overflow-hidden border border-[var(--border-soft)] bg-[var(--canvas)] hover:border-[var(--accent)]/40 hover:shadow-md transition-all duration-200">
        <div className="relative aspect-[4/3] overflow-hidden bg-[var(--surface)]">
          <img
            src={imgSrc(item.imageUrl)}
            alt={item.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {item.discountLabel && (
            <span className="absolute top-1.5 left-1.5 rounded-md bg-red-500 px-1.5 py-0.5 text-[9px] font-extrabold text-white shadow">
              {item.discountLabel}
            </span>
          )}
          {item.rating > 0 && (
            <span className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 rounded-md bg-black/55 backdrop-blur-sm px-1.5 py-0.5 text-[9px] font-bold text-white">
              <Star className="h-2 w-2 fill-[var(--accent)] text-[var(--accent)]" />
              {item.rating.toFixed(1)}
            </span>
          )}
        </div>
        <div className="p-2">
          <div className="flex items-center gap-1 mb-0.5">
            <VegDot isVeg={item.isVeg} />
            <p className="text-[11px] font-bold text-[var(--text-1)] truncate group-hover:text-[var(--accent)] transition-colors">
              {item.name}
            </p>
          </div>
          <div className="flex items-center justify-between gap-1">
            <p className="text-[11px] font-extrabold text-[var(--accent)]">
              {formatPrice(item.price, currency)}
            </p>
            <span className="text-[10px] text-[var(--text-3)] flex items-center gap-0.5 shrink-0">
              <Clock className="h-2.5 w-2.5" />
              {item.prepTime}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

/* ── Main popup ───────────────────────────────────────────────────────────── */

export default function FoodDetailPopup({
  itemId,
  initialItem,
  context,
  allMenuItems,
  surgeMultiplier = 1,
  updateUrl = true,
  onClose,
  onSelectRelated,
}: FoodDetailPopupProps) {
  const { addItem } = useCart();
  const { showToast } = useToast();
  const rawId = useId();
  const uid = rawId.replace(/[^a-zA-Z0-9]/g, "");

  /* ── State ── */
  const [isOpen, setIsOpen] = useState(true);
  const [currentItemId, setCurrentItemId] = useState(itemId);
  const [item, setItem] = useState<PopupMenuItem | null>(initialItem ?? null);
  const [related, setRelated] = useState<PopupMenuItem[]>([]);
  const [fetchState, setFetchState] = useState<"idle" | "loading" | "error">(
    initialItem ? "idle" : "loading",
  );
  const [qty, setQty] = useState(1);
  const [sizeIdx, setSizeIdx] = useState(0);
  const [selectedAddOns, setSelectedAddOns] = useState<Set<string>>(new Set());
  const [liked, setLiked] = useState(false);
  const [added, setAdded] = useState(false);
  const [shareState, setShareState] = useState<"idle" | "copied">("idle");
  const [mounted, setMounted] = useState(false);

  const mobileScrollRef = useRef<HTMLDivElement>(null);
  const desktopScrollRef = useRef<HTMLDivElement>(null);
  const originalUrlRef = useRef<string | null>(null);

  /* ── Mount guard (SSR safety) ── */
  useEffect(() => setMounted(true), []);

  /* ── Sync itemId prop → internal state ── */
  useEffect(() => {
    setCurrentItemId(itemId);
  }, [itemId]);

  /* ── Data fetch ── */
  useEffect(() => {
    setQty(1);
    setSizeIdx(0);
    setSelectedAddOns(new Set());

    // Fast path: menu context with pre-loaded data for the initial item
    if (
      context === "menu" &&
      currentItemId === itemId &&
      initialItem &&
      allMenuItems
    ) {
      setItem(initialItem);
      const catSlug = initialItem.category?.slug;
      const sameCat = allMenuItems
        .filter(
          (m) =>
            m.id !== currentItemId &&
            m.category?.slug === catSlug &&
            m.isAvailable !== false,
        )
        .sort((a, b) => b.rating - a.rating);
      const otherTop = allMenuItems
        .filter(
          (m) =>
            m.id !== currentItemId &&
            m.category?.slug !== catSlug &&
            m.isAvailable !== false,
        )
        .sort((a, b) => b.rating - a.rating);
      setRelated([...sameCat, ...otherTop].slice(0, 10));
      setFetchState("idle");
      return;
    }

    // API fetch
    setFetchState("loading");
    fetch(`/api/public/menu-items/${currentItemId}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => {
        setItem(data.item);

        let rel: PopupMenuItem[] = [];

        if (context === "menu" && allMenuItems) {
          // For a chained item inside menu context, compute from allMenuItems
          const found = allMenuItems.find((m) => m.id === currentItemId);
          if (found) {
            const catSlug = found.category?.slug;
            const sameCat = allMenuItems
              .filter(
                (m) =>
                  m.id !== currentItemId &&
                  m.category?.slug === catSlug &&
                  m.isAvailable !== false,
              )
              .sort((a, b) => b.rating - a.rating);
            const otherTop = allMenuItems
              .filter(
                (m) =>
                  m.id !== currentItemId &&
                  m.category?.slug !== catSlug &&
                  m.isAvailable !== false,
              )
              .sort((a, b) => b.rating - a.rating);
            rel = [...sameCat, ...otherTop].slice(0, 10);
          } else {
            rel = dedup(
              [...(data.topRated ?? []), ...(data.trending ?? [])],
              currentItemId,
            ).slice(0, 10);
          }
        } else {
          // Landing context: use `related` (cross-restaurant same category) as primary
          rel = dedup(
            [
              ...(data.related ?? []),
              ...(data.topRated ?? []),
              ...(data.trending ?? []),
            ],
            currentItemId,
          ).slice(0, 10);
        }

        setRelated(rel);
        setFetchState("idle");
      })
      .catch(() => setFetchState("error"));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentItemId]);

  /* ── URL management ── */
  useEffect(() => {
    if (!updateUrl || typeof window === "undefined") return;
    if (!originalUrlRef.current) {
      originalUrlRef.current = window.location.href;
    }
    window.history.pushState(
      { foodPopupId: currentItemId },
      "",
      `/food/${currentItemId}`,
    );
  }, [currentItemId, updateUrl]);

  useEffect(() => {
    return () => {
      if (updateUrl && originalUrlRef.current) {
        window.history.replaceState({}, "", originalUrlRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Scroll lock + Escape ── */
  const handleClose = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [handleClose]);

  /* ── Browser back button ── */
  useEffect(() => {
    const handler = (e: PopStateEvent) => {
      if (!e.state?.foodPopupId) handleClose();
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, [handleClose]);

  /* ── Scroll to top on item change ── */
  useEffect(() => {
    mobileScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    desktopScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentItemId]);

  /* ── Pricing ── */
  const sizeAdd =
    item && item.sizes.length > 0 ? (item.sizes[sizeIdx]?.priceAdd ?? 0) : 0;
  const addOnTotal = item
    ? item.addOns
        .filter((a) => selectedAddOns.has(a.id))
        .reduce((s, a) => s + a.price, 0)
    : 0;
  const unitPrice = item
    ? Math.round((item.price + sizeAdd + addOnTotal) * surgeMultiplier)
    : 0;
  const total = unitPrice * qty;
  const baseDiscounted =
    item && item.discount > 0
      ? Math.round(item.price * (1 - item.discount / 100))
      : null;
  const cur = item?.restaurant?.currency ?? "NPR";
  const accent = item ? getAccent(item) : "#eaa94d";

  /* ── Callbacks ── */
  const toggleAddOn = useCallback((id: string) => {
    setSelectedAddOns((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleAdd = useCallback(() => {
    if (!item) return;
    for (let i = 0; i < qty; i++) {
      addItem(
        {
          id: item.id,
          name: item.name,
          price: unitPrice,
          image: imgSrc(item.imageUrl),
        },
        item.restaurant.id,
        item.restaurant.slug,
        cur,
      );
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 2200);
    showToast(`${item.name} added to cart!`, "success");
  }, [item, qty, unitPrice, cur, addItem, showToast]);

  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}/food/${currentItemId}`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: item?.name ?? "Check this dish!", url });
      } else {
        await navigator.clipboard.writeText(url);
        setShareState("copied");
        showToast("Link copied to clipboard!", "success");
        setTimeout(() => setShareState("idle"), 2000);
      }
    } catch {
      /* user cancelled */
    }
  }, [currentItemId, item, showToast]);

  const handleRelatedSelect = useCallback(
    (rel: PopupMenuItem) => {
      setCurrentItemId(rel.id);
      onSelectRelated?.(rel);
    },
    [onSelectRelated],
  );

  /* ── Shared render helpers ────────────────────────────────────────────── */

  function renderOrderButton() {
    return (
      <motion.button
        onClick={handleAdd}
        whileTap={{ scale: 0.97 }}
        whileHover={{ y: -1 }}
        disabled={fetchState !== "idle"}
        className="relative w-full flex items-center justify-center gap-2.5 rounded-2xl py-4 text-base font-bold text-white shadow-lg overflow-hidden transition-colors disabled:opacity-50"
        style={{
          backgroundColor: accent,
          boxShadow: `0 8px 28px ${accent}45`,
        }}
      >
        {/* Shimmer */}
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
    );
  }

  /* The full details body — used for mobile scrollable area */
  function renderDetailsBody() {
    if (fetchState === "loading") return null;
    if (fetchState === "error")
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center px-5">
          <AlertCircle className="h-8 w-8 text-red-400 mb-3" />
          <p className="text-sm font-semibold text-[var(--text-2)]">
            Failed to load item details.
          </p>
        </div>
      );
    if (!item) return null;

    const spice = item.spiceLevel ?? 0;

    return (
      <div className="space-y-5 p-5">
        {/* Dietary */}
        <div className="flex flex-wrap items-center gap-1.5">
          <VegDot isVeg={item.isVeg} />
          <span className="text-[11px] font-semibold text-[var(--text-3)]">
            {item.isVeg ? "Pure Veg" : "Non-Veg"}
          </span>
          {item.hasEgg && (
            <span className="flex items-center gap-1 rounded-full border border-[var(--accent-border)] bg-[var(--accent-muted)] px-2 py-0.5 text-[10px] font-bold text-[var(--accent-text)]">
              <Egg className="h-3 w-3" /> Contains Egg
            </span>
          )}
          {item.hasOnionGarlic === false && (
            <span className="flex items-center gap-1 rounded-full border border-[var(--accent-border)] bg-[var(--accent-muted)] px-2 py-0.5 text-[10px] font-bold text-[var(--accent-text)]">
              <Leaf className="h-3 w-3" /> No Onion/Garlic
            </span>
          )}
          {item.isFeatured && (
            <span className="flex items-center gap-0.5 rounded-full bg-[var(--accent-muted)] px-2 py-0.5 text-[10px] font-bold text-[var(--accent)]">
              <Star className="h-3 w-3 fill-[var(--accent)]" /> Featured
            </span>
          )}
        </div>

        {/* Category + Name + Description */}
        <div>
          <p className="text-[11px] font-medium text-[var(--text-3)] mb-1">
            {item.category.name}
          </p>
          <h2 className="text-xl font-extrabold text-[var(--text-1)] leading-tight">
            {item.name}
          </h2>
          {item.description && (
            <p className="mt-2 text-sm text-[var(--text-2)] leading-relaxed">
              {item.description}
            </p>
          )}
        </div>

        {/* Stats chips */}
        <div className="flex flex-wrap gap-2">
          {item.rating > 0 && (
            <span className="flex items-center gap-1.5 rounded-full border border-[var(--accent-border)] bg-[var(--accent-muted)] px-3 py-1.5 text-[11px] font-bold text-[var(--accent-text)]">
              <Star className="h-3.5 w-3.5 fill-[var(--accent)] text-[var(--accent)]" />
              {item.rating.toFixed(1)} rating
            </span>
          )}
          <span className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--canvas-sub)] px-3 py-1.5 text-[11px] font-bold text-[var(--text-2)]">
            <Clock className="h-3.5 w-3.5" />
            {item.prepTime}
          </span>
          {item.calories != null && (
            <span className="flex items-center gap-1.5 rounded-full border border-[var(--accent-border)] bg-[var(--accent)] px-3 py-1.5 text-[11px] font-bold text-[var(--accent)]">
              <Flame className="h-3.5 w-3.5" />
              {item.calories} kcal
            </span>
          )}
          {spice > 0 && (
            <span
              className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-[11px] font-bold ${spiceClasses[Math.min(spice, 4)]}`}
            >
              {"🌶️".repeat(Math.min(spice, 4))} {spiceLabels[Math.min(spice, 4)]}
            </span>
          )}
          {item.isDrink && item.drinkCategory && (
            <span className="flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-[11px] font-bold text-blue-600">
              <Wine className="h-3.5 w-3.5" />
              {item.drinkCategory}
            </span>
          )}
        </div>

        {/* Allergens */}
        {item.allergens && item.allergens.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider mb-2">
              Allergens
            </p>
            <div className="flex flex-wrap gap-1.5">
              {item.allergens.map((a) => (
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

        {/* Tags */}
        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {item.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-[var(--surface)] px-2.5 py-1 text-[10px] font-medium text-[var(--text-2)]"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Offer banner */}
        {(item.offerExpiresAt || item.discount > 0) && (
          <div className="flex items-center gap-3 rounded-2xl bg-[var(--accent-muted)] border border-[var(--accent-border)] p-3.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)]/20 shrink-0">
              <Tag className="h-4 w-4 text-[var(--accent-hover)]" />
            </div>
            <div className="min-w-0 flex-1">
              {item.discountLabel && (
                <p className="text-sm font-extrabold text-[var(--accent-text)]">
                  {item.discountLabel}
                </p>
              )}
              {item.discount > 0 && (
                <p className="text-[11px] text-[#8e491e]/70 mt-0.5">
                  {item.discount}% off the base price
                </p>
              )}
              <OfferCountdown expiresAt={item.offerExpiresAt} compact />
            </div>
          </div>
        )}

        {/* Size selector */}
        {item.sizes.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider mb-3">
              Choose Size
            </p>
            <div className="grid grid-cols-3 gap-2">
              {item.sizes.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => setSizeIdx(i)}
                  className={`flex flex-col items-center gap-0.5 rounded-xl border-2 py-3 px-2 transition-all ${
                    sizeIdx === i
                      ? "border-[var(--accent)] bg-[var(--accent-muted)]"
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

        {/* Add-ons */}
        {item.addOns.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider mb-3">
              Build Your Meal
            </p>
            <div className="space-y-2">
              {item.addOns.map((a) => (
                <label
                  key={a.id}
                  className={`flex items-center justify-between rounded-xl border px-4 py-3 cursor-pointer transition-all ${
                    selectedAddOns.has(a.id)
                      ? "border-[var(--accent)] bg-[var(--accent-muted)]/50"
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

        {/* Price + Qty */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider">
              Total
            </p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              {item.discount > 0 && (
                <span className="text-sm text-[var(--text-3)] line-through">
                  {formatPrice(item.price * qty, cur)}
                </span>
              )}
              <motion.span
                key={total}
                initial={{ scale: 1.12, color: accent }}
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
              className="flex h-9 w-9 items-center justify-center rounded-xl text-white hover:opacity-90 transition-colors shadow-sm active:scale-90"
              style={{ backgroundColor: accent }}
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Order Now */}
        {renderOrderButton()}

        <div className="h-px bg-[var(--surface)]" />

        {/* Rating */}
        <RatingInput
          menuItemId={item.id}
          restaurantId={item.restaurant.id}
          onRated={(avg) =>
            setItem((prev) => (prev ? { ...prev, rating: avg } : prev))
          }
        />

        {/* Restaurant card */}
        <div className="flex items-center gap-3 rounded-2xl bg-[var(--canvas-sub)] border border-[var(--border-soft)] p-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--text-1)]">
            <Utensils className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold text-[var(--text-1)] truncate">
              {item.restaurant.name}
            </p>
            {item.restaurant.address && (
              <p className="text-[11px] text-[var(--text-3)] mt-0.5 flex items-center gap-1 truncate">
                <MapPin className="h-3 w-3 shrink-0" />
                {item.restaurant.address}
              </p>
            )}
          </div>
          <Link
            href={`/menu/${item.restaurant.slug}`}
            onClick={handleClose}
            className="shrink-0 flex items-center gap-0.5 text-[12px] font-bold text-[var(--accent)] hover:underline"
          >
            Full Menu <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Similar foods */}
        {related.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-extrabold text-[var(--text-1)]">
                {context === "landing" ? "Similar dishes" : "You might also like"}
              </h3>
              <span className="text-[11px] text-[var(--text-3)]">
                {related.length} dishes
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {related.map((rel) => (
                <SimilarCard
                  key={rel.id}
                  item={rel}
                  currency={cur}
                  onSelect={() => handleRelatedSelect(rel)}
                />
              ))}
            </div>
          </div>
        )}

        <div className="h-4" />
      </div>
    );
  }

  /* Desktop details body (without category/name since those are in the sticky header) */
  function renderDetailsBodyDesktop() {
    if (fetchState === "loading") return null;
    if (fetchState === "error")
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center px-5">
          <AlertCircle className="h-8 w-8 text-red-400 mb-3" />
          <p className="text-sm font-semibold text-[var(--text-2)]">
            Failed to load details.
          </p>
        </div>
      );
    if (!item) return null;

    const spice = item.spiceLevel ?? 0;

    return (
      <div className="space-y-5 p-5">
        {/* Description */}
        {item.description && (
          <p className="text-sm text-[var(--text-2)] leading-relaxed">
            {item.description}
          </p>
        )}

        {/* Dietary */}
        <div className="flex flex-wrap items-center gap-1.5">
          <VegDot isVeg={item.isVeg} />
          <span className="text-[11px] font-semibold text-[var(--text-3)]">
            {item.isVeg ? "Pure Veg" : "Non-Veg"}
          </span>
          {item.hasEgg && (
            <span className="flex items-center gap-1 rounded-full border border-[var(--accent-border)] bg-[var(--accent-muted)] px-2 py-0.5 text-[10px] font-bold text-[var(--accent-text)]">
              <Egg className="h-3 w-3" /> Contains Egg
            </span>
          )}
          {item.hasOnionGarlic === false && (
            <span className="flex items-center gap-1 rounded-full border border-[var(--accent-border)] bg-[var(--accent-muted)] px-2 py-0.5 text-[10px] font-bold text-[var(--accent-text)]">
              <Leaf className="h-3 w-3" /> No Onion/Garlic
            </span>
          )}
          {item.isFeatured && (
            <span className="flex items-center gap-0.5 rounded-full bg-[var(--accent-muted)] px-2 py-0.5 text-[10px] font-bold text-[var(--accent)]">
              <Star className="h-3 w-3 fill-[var(--accent)]" /> Featured
            </span>
          )}
        </div>

        {/* Stats chips */}
        <div className="flex flex-wrap gap-2">
          {item.rating > 0 && (
            <span className="flex items-center gap-1.5 rounded-full border border-[var(--accent-border)] bg-[var(--accent-muted)] px-3 py-1.5 text-[11px] font-bold text-[var(--accent-text)]">
              <Star className="h-3.5 w-3.5 fill-[var(--accent)] text-[var(--accent)]" />
              {item.rating.toFixed(1)} rating
            </span>
          )}
          <span className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--canvas-sub)] px-3 py-1.5 text-[11px] font-bold text-[var(--text-2)]">
            <Clock className="h-3.5 w-3.5" />
            {item.prepTime}
          </span>
          {item.calories != null && (
            <span className="flex items-center gap-1.5 rounded-full border border-[var(--accent-border)] bg-[var(--accent)] px-3 py-1.5 text-[11px] font-bold text-[var(--accent)]">
              <Flame className="h-3.5 w-3.5" />
              {item.calories} kcal
            </span>
          )}
          {spice > 0 && (
            <span
              className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-[11px] font-bold ${spiceClasses[Math.min(spice, 4)]}`}
            >
              {"🌶️".repeat(Math.min(spice, 4))} {spiceLabels[Math.min(spice, 4)]}
            </span>
          )}
          {item.isDrink && item.drinkCategory && (
            <span className="flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-[11px] font-bold text-blue-600">
              <Wine className="h-3.5 w-3.5" />
              {item.drinkCategory}
            </span>
          )}
        </div>

        {/* Allergens */}
        {item.allergens && item.allergens.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider mb-2">
              Allergens
            </p>
            <div className="flex flex-wrap gap-1.5">
              {item.allergens.map((a) => (
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

        {/* Tags */}
        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {item.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-[var(--surface)] px-2.5 py-1 text-[10px] font-medium text-[var(--text-2)]"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Offer banner */}
        {(item.offerExpiresAt || item.discount > 0) && (
          <div className="flex items-center gap-3 rounded-2xl bg-[var(--accent-muted)] border border-[var(--accent-border)] p-3.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)]/20 shrink-0">
              <Tag className="h-4 w-4 text-[var(--accent-hover)]" />
            </div>
            <div className="min-w-0 flex-1">
              {item.discountLabel && (
                <p className="text-sm font-extrabold text-[var(--accent-text)]">
                  {item.discountLabel}
                </p>
              )}
              {item.discount > 0 && (
                <p className="text-[11px] text-[#8e491e]/70 mt-0.5">
                  {item.discount}% off base price
                </p>
              )}
              <OfferCountdown expiresAt={item.offerExpiresAt} compact />
            </div>
          </div>
        )}

        {/* Size selector */}
        {item.sizes.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider mb-3">
              Choose Size
            </p>
            <div className="grid grid-cols-3 gap-2">
              {item.sizes.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => setSizeIdx(i)}
                  className={`flex flex-col items-center gap-0.5 rounded-xl border-2 py-3 px-2 transition-all ${
                    sizeIdx === i
                      ? "border-[var(--accent)] bg-[var(--accent-muted)]"
                      : "border-[var(--border)] hover:border-[var(--border)] bg-[var(--canvas)]"
                  }`}
                >
                  <span
                    className={`text-sm font-extrabold ${
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

        {/* Add-ons */}
        {item.addOns.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider mb-3">
              Build Your Meal
            </p>
            <div className="space-y-2">
              {item.addOns.map((a) => (
                <label
                  key={a.id}
                  className={`flex items-center justify-between rounded-xl border px-4 py-3 cursor-pointer transition-all ${
                    selectedAddOns.has(a.id)
                      ? "border-[var(--accent)] bg-[var(--accent-muted)]/50"
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

        {/* Price + Qty */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider">
              Total
            </p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              {item.discount > 0 && (
                <span className="text-sm text-[var(--text-3)] line-through">
                  {formatPrice(item.price * qty, cur)}
                </span>
              )}
              <motion.span
                key={total}
                initial={{ scale: 1.12, color: accent }}
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
              className="flex h-9 w-9 items-center justify-center rounded-xl text-white hover:opacity-90 transition-colors shadow-sm active:scale-90"
              style={{ backgroundColor: accent }}
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Order Now */}
        {renderOrderButton()}

        <div className="h-px bg-[var(--surface)]" />

        {/* Rating */}
        <RatingInput
          menuItemId={item.id}
          restaurantId={item.restaurant.id}
          onRated={(avg) =>
            setItem((prev) => (prev ? { ...prev, rating: avg } : prev))
          }
        />

        {/* Similar foods */}
        {related.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-extrabold text-[var(--text-1)]">
                {context === "landing" ? "Similar dishes" : "You might also like"}
              </h3>
              <span className="text-[11px] text-[var(--text-3)]">
                {related.length} dishes
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {related.map((rel) => (
                <SimilarCard
                  key={rel.id}
                  item={rel}
                  currency={cur}
                  onSelect={() => handleRelatedSelect(rel)}
                />
              ))}
            </div>
          </div>
        )}

        <div className="h-4" />
      </div>
    );
  }

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence onExitComplete={onClose}>
      {isOpen && (
        <div
          key="food-detail-popup"
          style={{ "--accent": accent } as CSSProperties}
        >
          {/* ── Backdrop ── */}
          <motion.div
            className="fixed inset-0 z-[74] bg-black/60 backdrop-blur-sm"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={handleClose}
          />

          {/* ── Mobile: bottom sheet ──────────────────────────────────────── */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-[75] flex flex-col rounded-t-3xl bg-[#fdfcf9] overflow-hidden md:hidden"
            style={{ maxHeight: "92vh" }}
            variants={mobileVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <GrainSVG uid={uid} suffix="mob" />

            {/* Image header */}
            <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-[var(--surface)]">
              {item && (
                <motion.img
                  key={currentItemId}
                  src={imgSrc(item.imageUrl)}
                  alt={item.name}
                  className="h-full w-full object-cover"
                  initial={{ scale: 1.06, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.45 }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/30" />

              {/* Accent glow at bottom */}
              <div
                className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none"
                style={{
                  background: `linear-gradient(to top, ${accent}35, transparent)`,
                }}
              />

              {/* Badges */}
              {item && (
                <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-1.5">
                  {item.badge && (
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold text-white shadow ${
                        item.badge === "Bestseller"
                          ? "bg-[var(--accent)]"
                          : item.badge === "Most Liked"
                            ? "bg-[var(--text-1)]"
                            : "bg-purple-500"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  {item.discountLabel && (
                    <span className="flex items-center gap-1 rounded-full bg-red-500 px-2.5 py-0.5 text-[10px] font-extrabold text-white shadow">
                      <Tag className="h-2.5 w-2.5" />
                      {item.discountLabel}
                    </span>
                  )}
                </div>
              )}

              {/* Price */}
              {item && (
                <div className="absolute bottom-3 right-3 text-right">
                  {baseDiscounted != null ? (
                    <>
                      <p className="text-white/55 text-[10px] line-through leading-none">
                        {formatPrice(item.price, cur)}
                      </p>
                      <p className="text-lg font-extrabold text-[var(--accent)] leading-tight drop-shadow">
                        {formatPrice(baseDiscounted, cur)}
                      </p>
                    </>
                  ) : (
                    <p className="text-lg font-extrabold text-white leading-tight drop-shadow">
                      {formatPrice(item.price, cur)}
                    </p>
                  )}
                </div>
              )}

              {/* Close button */}
              <button
                onClick={handleClose}
                className="absolute top-3 left-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/35 backdrop-blur-md text-white hover:bg-black/55 transition-colors active:scale-90 z-10"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Heart + Share */}
              <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                <button
                  onClick={handleShare}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-black/35 backdrop-blur-md text-white hover:bg-black/55 transition-colors active:scale-90"
                >
                  <AnimatePresence mode="wait">
                    {shareState === "copied" ? (
                      <motion.div
                        key="ck"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                      >
                        <Check className="h-4 w-4 text-[#16a34a]" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="sh"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                      >
                        <Share2 className="h-4 w-4" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
                <button
                  onClick={() => setLiked((v) => !v)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-black/35 backdrop-blur-md text-white hover:bg-black/55 transition-colors active:scale-90"
                >
                  <Heart
                    className={`h-4 w-4 transition-all duration-300 ${
                      liked ? "fill-red-400 text-red-400 scale-110" : ""
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Scrollable content */}
            <div
              ref={mobileScrollRef}
              className="flex-1 overflow-y-auto overscroll-contain"
              style={{ scrollbarWidth: "none" }}
            >
              {renderDetailsBody()}
            </div>
          </motion.div>

          {/* ── Desktop: centered modal ───────────────────────────────────── */}
          <div className="fixed inset-0 z-[75] hidden md:flex items-center justify-center p-6">
            <motion.div
              className="relative flex w-full overflow-hidden rounded-3xl bg-[#fdfcf9] shadow-2xl shadow-black/20"
              style={{ maxWidth: "840px", maxHeight: "88vh" }}
              variants={desktopVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <GrainSVG uid={uid} suffix="dsk" />

              {/* Left: sticky image column */}
              <div className="relative w-[340px] shrink-0 self-stretch overflow-hidden bg-[var(--surface)]">
                {item && (
                  <motion.img
                    key={currentItemId}
                    src={imgSrc(item.imageUrl)}
                    alt={item.name}
                    className="h-full w-full object-cover"
                    initial={{ scale: 1.06, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.45 }}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />

                {/* Accent glow */}
                <div
                  className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
                  style={{
                    background: `linear-gradient(to top, ${accent}40, transparent)`,
                  }}
                />

                {/* Badges */}
                {item && (
                  <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5">
                    {item.badge && (
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold text-white shadow ${
                          item.badge === "Bestseller"
                            ? "bg-[var(--accent)]"
                            : item.badge === "Most Liked"
                              ? "bg-[var(--text-1)]"
                              : "bg-purple-500"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                    {item.discountLabel && (
                      <span className="flex items-center gap-1 rounded-full bg-red-500 px-2.5 py-0.5 text-[10px] font-extrabold text-white shadow">
                        <Tag className="h-2.5 w-2.5" />
                        {item.discountLabel}
                      </span>
                    )}
                  </div>
                )}

                {/* Price (bottom-right) */}
                {item && (
                  <div className="absolute bottom-16 right-3 text-right">
                    {baseDiscounted != null ? (
                      <>
                        <p className="text-white/55 text-[10px] line-through leading-none">
                          {formatPrice(item.price, cur)}
                        </p>
                        <p className="text-xl font-extrabold text-[var(--accent)] leading-tight drop-shadow">
                          {formatPrice(baseDiscounted, cur)}
                        </p>
                      </>
                    ) : (
                      <p className="text-xl font-extrabold text-white leading-tight drop-shadow">
                        {formatPrice(item.price, cur)}
                      </p>
                    )}
                  </div>
                )}

                {/* Restaurant info (glass card at bottom) */}
                {item && (
                  <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
                    <div className="flex items-center gap-2.5 rounded-xl bg-[var(--canvas)]/90 backdrop-blur-md border border-white/60 p-2.5 shadow-sm">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--text-1)]">
                        <Utensils className="h-4 w-4 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-bold text-[var(--text-1)] truncate">
                          {item.restaurant.name}
                        </p>
                        {item.restaurant.address && (
                          <p className="text-[10px] text-[var(--text-2)] truncate">
                            {item.restaurant.address}
                          </p>
                        )}
                      </div>
                      <Link
                        href={`/menu/${item.restaurant.slug}`}
                        onClick={handleClose}
                        className="shrink-0 text-[11px] font-bold text-[var(--accent)] hover:underline flex items-center gap-0.5"
                      >
                        Menu <ChevronRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Right: scrollable details */}
              <div className="flex flex-col flex-1 overflow-hidden">
                {/* Sticky header */}
                <div className="shrink-0 flex items-start justify-between gap-3 px-5 pt-4 pb-3 bg-[#fdfcf9]/95 backdrop-blur-sm border-b border-[var(--border-soft)] z-10">
                  <div className="min-w-0 flex-1">
                    {item ? (
                      <>
                        <p className="text-[10px] font-medium text-[var(--text-3)] uppercase tracking-wider mb-0.5">
                          {item.category.name}
                        </p>
                        <h2 className="text-lg font-extrabold text-[var(--text-1)] leading-tight line-clamp-2">
                          {item.name}
                        </h2>
                      </>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={handleShare}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--canvas)] text-[var(--text-2)] hover:border-[var(--accent)]/50 hover:text-[var(--accent)] transition-colors"
                    >
                      <AnimatePresence mode="wait">
                        {shareState === "copied" ? (
                          <motion.div
                            key="ck"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                          >
                            <Check className="h-3.5 w-3.5 text-[var(--accent-hover)]" />
                          </motion.div>
                        ) : (
                          <motion.div
                            key="sh"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                          >
                            <Share2 className="h-3.5 w-3.5" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </button>
                    <button
                      onClick={() => setLiked((v) => !v)}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--canvas)] text-[var(--text-2)] hover:border-red-200 hover:text-red-400 transition-colors"
                    >
                      <Heart
                        className={`h-3.5 w-3.5 transition-all ${
                          liked ? "fill-red-400 text-red-400" : ""
                        }`}
                      />
                    </button>
                    <button
                      onClick={handleClose}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--canvas)] text-[var(--text-2)] hover:bg-[var(--canvas-sub)] transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Scrollable content */}
                <div
                  ref={desktopScrollRef}
                  className="flex-1 overflow-y-auto"
                  style={{ scrollbarWidth: "thin" }}
                >
                  {renderDetailsBodyDesktop()}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/* ── Utility ──────────────────────────────────────────────────────────────── */

function dedup(items: PopupMenuItem[], excludeId: string): PopupMenuItem[] {
  const seen = new Set<string>();
  const out: PopupMenuItem[] = [];
  for (const item of items) {
    if (!seen.has(item.id) && item.id !== excludeId) {
      seen.add(item.id);
      out.push(item);
    }
  }
  return out;
}
