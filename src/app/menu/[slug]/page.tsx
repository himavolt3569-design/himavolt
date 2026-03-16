"use client";

import { Suspense, useState, useRef, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.4,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  },
};

import {
  ArrowLeft,
  Search,
  Star,
  Clock,
  Phone,
  Globe,
  Plus,
  Minus,
  ShoppingBag,
  Check,
  X,
  Flame,
  Leaf,
  Egg,
  ChevronRight,
  Loader2,
  Megaphone,
  Tag,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/context/ToastContext";
import { useOrder } from "@/context/OrderContext";
import { apiFetch } from "@/lib/api-client";
import gsap from "gsap";
import Link from "next/link";
import OrderStatus from "@/components/shared/OrderStatus";
import CartSidebar from "@/components/cart/CartSidebar";
import CheckoutSheet from "@/components/checkout/CheckoutSheet";
import MenuStories from "@/components/stories/MenuStories";
import ChatWidget from "@/components/chat/ChatWidget";
import { formatPrice } from "@/lib/currency";
import OfferCountdown from "@/components/menu/OfferCountdown";
import TableSessionBanner from "@/components/menu/TableSessionBanner";
import GetBillButton from "@/components/menu/GetBillButton";
import { useTableSession } from "@/hooks/useTableSession";
import { setActiveTableSession } from "@/hooks/useActiveTableSession";
import FoodSlider from "@/components/menu/FoodSlider";
import MenuStoryHero from "@/components/three/MenuStoryHero";
import ScrollStorySection from "@/components/three/ScrollStorySection";

const PLACEHOLDER_IMG =
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop";

interface RestaurantCategory {
  id: string;
  name: string;
  slug: string;
}

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  phone: string;
  type: string;
  address: string;
  city: string;
  imageUrl: string | null;
  coverUrl: string | null;
  rating: number;
  openingTime: string;
  closingTime: string;
  tableCount: number;
  currency: string;
  categories: RestaurantCategory[];
}

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

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  rating: number;
  prepTime: string;
  isVeg: boolean;
  hasEgg: boolean;
  hasOnionGarlic: boolean;
  isAvailable: boolean;
  badge: string | null;
  tags: string[];
  sortOrder: number;
  discount: number;
  discountLabel: string | null;
  isFeatured: boolean;
  offerExpiresAt: string | null;
  offerStartedAt: string | null;
  categoryId: string;
  category: { name: string; slug: string };
  sizes: MenuItemSize[];
  addOns: MenuItemAddOn[];
}

function img(url: string | null) {
  return url || PLACEHOLDER_IMG;
}

function VegIcon() {
  return (
    <span className="flex h-4 w-4 items-center justify-center rounded-sm border border-green-600">
      <span className="h-2 w-2 rounded-full bg-green-600" />
    </span>
  );
}

function NonVegIcon() {
  return (
    <span className="flex h-4 w-4 items-center justify-center rounded-sm border border-red-600">
      <span className="h-2 w-2 rounded-full bg-red-600" />
    </span>
  );
}

function SizeSelector({
  sizes,
  selected,
  onSelect,
}: {
  sizes: MenuItemSize[];
  selected: number;
  onSelect: (i: number) => void;
}) {
  return (
    <div className="flex gap-2">
      {sizes.map((s, i) => (
        <motion.button
          key={s.id}
          onClick={() => onSelect(i)}
          whileTap={{ scale: 0.92 }}
          animate={selected === i ? { scale: 1 } : { scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
          className={`relative rounded-full px-4 py-2 text-xs font-bold transition-colors ${
            selected === i
              ? "bg-[#FF9933] text-white shadow-lg shadow-[#FF9933]/25"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {selected === i && (
            <motion.div
              layoutId="size-pill"
              className="absolute inset-0 rounded-full bg-[#FF9933]"
              transition={{ type: "spring", stiffness: 500, damping: 28 }}
            />
          )}
          <span className="relative z-[1]">{s.grams}</span>
        </motion.button>
      ))}
    </div>
  );
}

function DishDetailModal({
  dish,
  restaurantId,
  restaurantSlug,
  restaurantCurrency,
  allItems,
  onClose,
  onSelectDish,
}: {
  dish: MenuItem;
  restaurantId: string;
  restaurantSlug: string;
  restaurantCurrency: string;
  allItems: MenuItem[];
  onClose: () => void;
  onSelectDish: (item: MenuItem) => void;
}) {
  const { addItem, getItemQty } = useCart();
  const { showToast } = useToast();
  const [qty, setQty] = useState(1);
  const [sizeIdx, setSizeIdx] = useState(0);
  const [selectedAddOns, setSelectedAddOns] = useState<Set<string>>(new Set());
  const priceRef = useRef<HTMLParagraphElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const sizeAdd = dish.sizes.length > 0 ? dish.sizes[sizeIdx].priceAdd : 0;
  const addOnTotal = dish.addOns
    .filter((a) => selectedAddOns.has(a.id))
    .reduce((s, a) => s + a.price, 0);
  const unitPrice = dish.price + sizeAdd + addOnTotal;
  const total = unitPrice * qty;

  // Reset state when dish changes
  useEffect(() => {
    setQty(1);
    setSizeIdx(0);
    setSelectedAddOns(new Set());
    modalRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [dish.id]);

  useEffect(() => {
    if (priceRef.current) {
      gsap.fromTo(
        priceRef.current,
        { scale: 1.3, color: "#FF9933" },
        { scale: 1, color: "#1F2A2A", duration: 0.35, ease: "back.out(2)" },
      );
    }
  }, [total]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const toggleAddOn = (id: string) => {
    setSelectedAddOns((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = () => {
    for (let i = 0; i < qty; i++) {
      addItem(
        {
          id: dish.id,
          name: dish.name,
          price: unitPrice,
          image: img(dish.imageUrl),
        },
        restaurantId,
        restaurantSlug,
        restaurantCurrency,
      );
    }
    showToast(`${dish.name} added to cart!`);
  };

  const cartQty = getItemQty(dish.id);

  // Recommended items: same category, excluding current dish, top rated
  const recommended = allItems
    .filter((i) => i.id !== dish.id && i.categoryId === dish.categoryId && i.isAvailable)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 6);

  // If not enough from same category, fill from other categories
  const moreRecommended = recommended.length < 4
    ? allItems
        .filter((i) => i.id !== dish.id && i.categoryId !== dish.categoryId && i.isAvailable && !recommended.some((r) => r.id === i.id))
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 4 - recommended.length)
    : [];

  const allRecommended = [...recommended, ...moreRecommended];

  return (
    <>
      {/* Glassmorphism backdrop */}
      <motion.div
        key="glass-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md"
      />

      {/* Modal */}
      <motion.div
        key="glass-modal"
        initial={{ opacity: 0, scale: 0.92, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", damping: 28, stiffness: 350, mass: 0.8 }}
        className="fixed inset-4 sm:inset-6 md:inset-x-auto md:inset-y-6 md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-2xl lg:max-w-3xl z-50 flex flex-col rounded-3xl overflow-hidden border border-white/20 shadow-2xl shadow-black/20"
        style={{
          background: "rgba(255, 255, 255, 0.85)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
        }}
      >
        {/* Scrollable content */}
        <div ref={modalRef} className="flex-1 overflow-y-auto overscroll-contain">
          {/* Hero image */}
          <motion.div
            className="relative w-full aspect-[16/9] sm:aspect-[2.2/1] overflow-hidden bg-gray-100"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <img
              src={img(dish.imageUrl)}
              alt={dish.name}
              loading="lazy"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-black/10" />

            {/* Close button */}
            <motion.button
              onClick={onClose}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white/40 transition-all"
            >
              <X className="h-4 w-4" />
            </motion.button>

            {/* Badges on image */}
            <div className="absolute top-4 left-4 flex items-center gap-2">
              {dish.badge && (
                <motion.span
                  className={`rounded-full px-3 py-1 text-[11px] font-bold text-white shadow-md backdrop-blur-sm ${
                    dish.badge === "Bestseller"
                      ? "bg-[#FF9933]/90"
                      : dish.badge === "Most Liked"
                        ? "bg-[#0A4D3C]/90"
                        : "bg-purple-500/90"
                  }`}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 500, damping: 15 }}
                >
                  {dish.badge === "Bestseller" ? "# Bestseller" : dish.badge}
                </motion.span>
              )}
              {dish.discountLabel && (
                <motion.span
                  className="rounded-full bg-[#E23744]/90 backdrop-blur-sm px-3 py-1 text-[11px] font-extrabold text-white shadow-md flex items-center gap-1"
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.25, type: "spring", stiffness: 500, damping: 15 }}
                >
                  <Tag className="h-3 w-3" />
                  {dish.discountLabel}
                </motion.span>
              )}
            </div>

            {/* Price overlay */}
            <div className="absolute bottom-4 left-5">
              <span className="text-2xl font-extrabold text-white drop-shadow-lg" ref={priceRef}>
                {formatPrice(total, restaurantCurrency)}
              </span>
            </div>
          </motion.div>

          {/* Content */}
          <div className="px-5 sm:px-7 py-5 space-y-5">
            {/* Title & meta */}
            <motion.div
              initial={{ opacity: 0, y: 16, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    {dish.isVeg ? <VegIcon /> : <NonVegIcon />}
                    {dish.hasEgg && <Egg className="h-3.5 w-3.5 text-yellow-500" />}
                    {dish.isFeatured && (
                      <span className="flex items-center gap-0.5 rounded-full bg-[#FF9933]/10 px-2 py-0.5 text-[10px] font-bold text-[#FF9933]">
                        <Star className="h-3 w-3 fill-[#FF9933]" /> Featured
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-[#1F2A2A]">{dish.name}</h2>
                  <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">
                    {dish.description}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-400">
                <span className="flex items-center gap-1 rounded-full bg-gray-50 px-2.5 py-1">
                  <Star className="h-3.5 w-3.5 fill-[#FF9933] text-[#FF9933]" />
                  <span className="font-bold text-[#1F2A2A]">
                    {dish.rating.toFixed(1)}
                  </span>
                </span>
                <span className="flex items-center gap-1 rounded-full bg-gray-50 px-2.5 py-1">
                  <Clock className="h-3.5 w-3.5" />
                  {dish.prepTime}
                </span>
                <OfferCountdown expiresAt={dish.offerExpiresAt} compact />
                {cartQty > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 15 }}
                    className="rounded-full bg-[#0A4D3C] px-2.5 py-1 text-[10px] font-bold text-white"
                  >
                    {cartQty} in cart
                  </motion.span>
                )}
              </div>

              {/* Tags */}
              {dish.tags.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {dish.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-medium text-gray-500">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Divider */}
            <div className="h-px bg-gray-100" />

            {/* Quantity & Price */}
            <motion.div
              className="flex items-center justify-between"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <div className="flex items-center gap-3">
                <motion.button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  whileTap={{ scale: 0.85 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  <Minus className="h-4 w-4" />
                </motion.button>
                <motion.span
                  key={qty}
                  initial={{ scale: 1.3 }}
                  animate={{ scale: 1 }}
                  className="w-8 text-center text-base font-bold text-[#1F2A2A]"
                >
                  {qty}
                </motion.span>
                <motion.button
                  onClick={() => setQty((q) => q + 1)}
                  whileTap={{ scale: 0.85 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FF9933] text-white hover:bg-[#ff8811] transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </motion.button>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Total</span>
                <p className="text-xl font-extrabold text-[#1F2A2A]">
                  {formatPrice(total, restaurantCurrency)}
                </p>
              </div>
            </motion.div>

            {/* Size selector */}
            {dish.sizes.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.25 }}
              >
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Choose Size
                </h4>
                <SizeSelector
                  sizes={dish.sizes}
                  selected={sizeIdx}
                  onSelect={setSizeIdx}
                />
              </motion.div>
            )}

            {/* Add-ons */}
            {dish.addOns.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
              >
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Build Your Meal
                </h4>
                <div className="space-y-2">
                  {dish.addOns.map((a) => (
                    <motion.label
                      key={a.id}
                      whileTap={{ scale: 0.98 }}
                      className={`flex items-center justify-between rounded-xl px-4 py-3 cursor-pointer transition-all ${
                        selectedAddOns.has(a.id)
                          ? "bg-[#FF9933]/10 border border-[#FF9933]/30"
                          : "bg-white/60 border border-gray-100 hover:bg-white/80"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <motion.div
                          className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition-colors ${
                            selectedAddOns.has(a.id)
                              ? "border-[#FF9933] bg-[#FF9933]"
                              : "border-gray-300"
                          }`}
                          animate={
                            selectedAddOns.has(a.id) ? { scale: [1, 1.2, 1] } : {}
                          }
                          transition={{ duration: 0.25 }}
                        >
                          <AnimatePresence>
                            {selectedAddOns.has(a.id) && (
                              <motion.div
                                initial={{ scale: 0, rotate: -90 }}
                                animate={{ scale: 1, rotate: 0 }}
                                exit={{ scale: 0, rotate: 90 }}
                                transition={{ type: "spring", stiffness: 500, damping: 15 }}
                              >
                                <Check className="h-3 w-3 text-white" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                        <span className="text-sm font-medium text-[#1F2A2A]">
                          {a.name}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-gray-500">
                        +{formatPrice(a.price, restaurantCurrency)}
                      </span>
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={selectedAddOns.has(a.id)}
                        onChange={() => toggleAddOn(a.id)}
                      />
                    </motion.label>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Recommended from this restaurant */}
            {allRecommended.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.35 }}
              >
                <div className="h-px bg-gray-100 mb-5" />
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Flame className="h-3.5 w-3.5 text-[#FF9933]" />
                  You might also like
                </h4>
                <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
                  {allRecommended.map((rec) => (
                    <motion.div
                      key={rec.id}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => onSelectDish(rec)}
                      className="shrink-0 w-36 cursor-pointer group/rec"
                    >
                      <div className="relative h-24 w-full overflow-hidden rounded-xl bg-gray-100">
                        <img
                          src={img(rec.imageUrl)}
                          alt={rec.name}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-300 group-hover/rec:scale-110"
                        />
                        {rec.discountLabel && (
                          <span className="absolute top-1.5 right-1.5 rounded-md bg-[#E23744] px-1.5 py-0.5 text-[8px] font-extrabold text-white">
                            {rec.discountLabel}
                          </span>
                        )}
                        <div className="absolute bottom-1.5 left-1.5">
                          <span className={`inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] font-bold text-white ${
                            rec.rating >= 4.0 ? "bg-[#0A4D3C]/90" : "bg-[#FF9933]/90"
                          }`}>
                            {rec.rating.toFixed(1)}
                            <Star className="h-2 w-2 fill-white" />
                          </span>
                        </div>
                      </div>
                      <div className="mt-1.5 px-0.5">
                        <p className="text-[12px] font-bold text-[#1F2A2A] truncate">{rec.name}</p>
                        <p className="text-[11px] font-semibold text-gray-500">{formatPrice(rec.price, restaurantCurrency)}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Ad space */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.4 }}
            >
              <div className="h-px bg-gray-100 mb-5" />
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-5 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FF9933]/10">
                    <Megaphone className="h-4 w-4 text-[#FF9933]" />
                  </div>
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Sponsored</span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Ad space available for promotions & offers
                </p>
                <p className="text-[10px] text-gray-300 mt-1">
                  Restaurant owners can showcase specials here
                </p>
              </div>
            </motion.div>

            {/* Bottom spacer for the fixed button */}
            <div className="h-20" />
          </div>
        </div>

        {/* Fixed add to cart button at bottom */}
        <div className="shrink-0 border-t border-white/30 px-5 sm:px-7 py-4" style={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)" }}>
          <motion.button
            onClick={handleAdd}
            whileHover={{
              scale: 1.01,
              boxShadow: "0 12px 24px -6px rgba(255,153,51,0.35)",
            }}
            whileTap={{ scale: 0.97 }}
            className="relative w-full rounded-xl bg-[#FF9933] py-3.5 text-base font-bold text-white overflow-hidden shadow-lg shadow-[#FF9933]/20"
          >
            {/* Shimmer */}
            <motion.div
              className="absolute inset-0 bg-linear-to-r from-transparent via-white/15 to-transparent"
              initial={{ x: "-100%" }}
              animate={{ x: "200%" }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                repeatDelay: 4,
                ease: "easeInOut",
              }}
            />
            <span className="relative z-[1] flex items-center justify-center gap-2">
              <Plus className="h-4 w-4" strokeWidth={3} />
              Add to Cart — {formatPrice(total, restaurantCurrency)}
            </span>
          </motion.button>
        </div>
      </motion.div>
    </>
  );
}

function MenuItemCard({
  item,
  restaurantId,
  restaurantSlug,
  restaurantCurrency,
  onSelect,
}: {
  item: MenuItem;
  restaurantId: string;
  restaurantSlug: string;
  restaurantCurrency: string;
  onSelect: (item: MenuItem) => void;
}) {
  const { addItem, getItemQty } = useCart();
  const { showToast } = useToast();
  const btnRef = useRef<HTMLButtonElement>(null);
  const qty = getItemQty(item.id);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    addItem(
      {
        id: item.id,
        name: item.name,
        price: item.price,
        image: img(item.imageUrl),
      },
      restaurantId,
      restaurantSlug,
      restaurantCurrency,
    );
    showToast(`${item.name} added!`);
    if (btnRef.current) {
      gsap.fromTo(
        btnRef.current,
        { scale: 1.35 },
        { scale: 1, duration: 0.3, ease: "back.out(3)" },
      );
    }
  };

  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -3, boxShadow: "0 8px 30px rgba(0,0,0,0.08)" }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="group rounded-2xl bg-white border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden"
    >
      <div
        className="flex gap-4 p-3 cursor-pointer"
        onClick={() => onSelect(item)}
      >
        {/* Image on the left */}
        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-gray-100">
          <img
            src={img(item.imageUrl)}
            alt={item.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <OfferCountdown expiresAt={item.offerExpiresAt} />
          {item.badge && (
            <motion.span
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                delay: 0.15,
                type: "spring",
                stiffness: 400,
                damping: 20,
              }}
              className={`absolute top-1.5 left-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold text-white shadow ${
                item.badge === "Bestseller"
                  ? "bg-[#FF9933]"
                  : item.badge === "Most Liked"
                    ? "bg-[#0A4D3C]"
                    : "bg-purple-500"
              }`}
            >
              {item.badge === "Bestseller" ? "# Bestseller" : item.badge}
            </motion.span>
          )}
        </div>

        {/* Text on the right */}
        <div className="flex flex-1 flex-col justify-between min-w-0 py-0.5">
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              {item.isVeg ? <VegIcon /> : <NonVegIcon />}
              {item.hasEgg && <Egg className="h-3 w-3 text-yellow-500" />}
            </div>
            <h3 className="text-sm font-bold text-[#1F2A2A] truncate flex items-center gap-1">
              {item.name}
              {item.isFeatured && (
                <Star className="h-3 w-3 fill-[#FF9933] text-[#FF9933] shrink-0" />
              )}
            </h3>
            <p className="mt-0.5 text-[11px] text-gray-400 line-clamp-2 leading-relaxed">
              {item.description}
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-extrabold text-[#1F2A2A]">
              {formatPrice(item.price, restaurantCurrency)}
            </span>
            <span className="flex items-center gap-0.5 text-[11px] text-gray-400">
              <Star className="h-3 w-3 fill-[#FF9933] text-[#FF9933]" />
              {item.rating.toFixed(1)}
            </span>
            <span className="flex items-center gap-0.5 text-[11px] text-gray-400">
              <Clock className="h-3 w-3" />
              {item.prepTime}
            </span>
          </div>
          {/* Offer badge — right side */}
          {item.discountLabel && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                delay: 0.2,
                type: "spring",
                stiffness: 500,
                damping: 15,
              }}
              className="mt-1 inline-flex w-fit items-center gap-1 rounded-md bg-[#E23744] px-2 py-0.5 text-[10px] font-extrabold text-white shadow"
            >
              {item.discountLabel}
            </motion.span>
          )}
        </div>
      </div>

      {/* Add to Cart button — always visible below */}
      <div className="px-3 pb-3">
        <motion.button
          ref={btnRef}
          onClick={handleQuickAdd}
          whileTap={{ scale: 0.96 }}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF9933] py-2.5 text-[13px] font-bold text-white shadow-sm shadow-[#FF9933]/20 hover:bg-[#ff8811] transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" strokeWidth={3} />
          Add to Cart
          {qty > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 15 }}
              className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white/25 px-1.5 text-[10px] font-bold"
            >
              {qty}
            </motion.span>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}

function HeroDish({
  dish,
  currency,
  onSelect,
}: {
  dish: MenuItem;
  currency: string;
  onSelect: (dish: MenuItem) => void;
}) {
  const priceRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (priceRef.current) {
      gsap.fromTo(
        priceRef.current,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: "back.out(2)" },
      );
    }
  }, [dish.id]);

  return (
    <motion.div
      onClick={() => onSelect(dish)}
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4, boxShadow: "0 12px 30px rgba(0,0,0,0.1)" }}
      className="relative overflow-hidden rounded-2xl bg-white border border-gray-100 cursor-pointer group shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
    >
      <div className="relative aspect-[2.2/1] md:aspect-3/1 overflow-hidden">
        <img
          src={img(dish.imageUrl)}
          alt={dish.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-4 left-5 right-5">
          <div className="flex items-center gap-2 mb-1">
            {dish.isVeg ? (
              <span className="flex h-4 w-4 items-center justify-center rounded-sm border border-green-400">
                <span className="h-2 w-2 rounded-full bg-green-400" />
              </span>
            ) : (
              <span className="flex h-4 w-4 items-center justify-center rounded-sm border border-red-400">
                <span className="h-2 w-2 rounded-full bg-red-400" />
              </span>
            )}
            {dish.badge && (
              <span className="rounded-full bg-[#FF9933] px-2.5 py-0.5 text-[10px] font-bold text-white">
                {dish.badge === "Bestseller" ? "# Bestseller" : dish.badge}
              </span>
            )}
          </div>
          <h2 className="text-lg md:text-xl font-bold text-white">
            {dish.name}
          </h2>
          <p className="text-xs text-white/70 line-clamp-1 mt-0.5">
            {dish.description}
          </p>
          <span
            ref={priceRef}
            className="mt-1.5 inline-block text-xl font-extrabold text-[#FF9933]"
          >
            {formatPrice(dish.price, currency)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function FilterPill({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.92 }}
      animate={active ? { scale: 1 } : { scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-[11px] font-bold transition-colors ${
        active
          ? "bg-[#0A4D3C] text-white shadow-md shadow-[#0A4D3C]/15"
          : "bg-white text-gray-500 border border-gray-200 hover:border-gray-300 hover:bg-gray-50"
      }`}
    >
      {icon}
      {label}
    </motion.button>
  );
}

function DesktopCartPreview({
  currency,
  onProceed,
  onOpenFull,
}: {
  currency: string;
  onProceed: () => void;
  onOpenFull: () => void;
}) {
  const { items, subtotal, totalItems, increaseQty, decreaseQty } = useCart();

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-[0_2px_16px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-4 w-4 text-[#FF9933]" />
          <h3 className="text-sm font-bold text-[#1F2A2A]">Your Order</h3>
        </div>
        {totalItems > 0 && (
          <span className="rounded-full bg-[#FF9933]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#FF9933]">
            {totalItems} items
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <ShoppingBag className="mx-auto h-8 w-8 text-gray-200 mb-2" />
          <p className="text-xs font-medium text-gray-400">
            Your cart is empty
          </p>
          <p className="text-[11px] text-gray-300 mt-0.5">
            Add dishes from the menu
          </p>
        </div>
      ) : (
        <>
          <div className="max-h-[320px] overflow-y-auto px-5 py-3 space-y-1">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 py-2">
                <div className="h-10 w-10 rounded-lg overflow-hidden shrink-0">
                  <img
                    src={item.image}
                    alt={item.name}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-[#1F2A2A] truncate">
                    {item.name}
                  </p>
                  <p className="text-xs font-semibold text-[#FF9933]">
                    {formatPrice(item.price * item.quantity, currency)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => decreaseQty(item.id)}
                    className="flex h-6 w-6 items-center justify-center rounded-md border border-gray-200 text-gray-400 hover:bg-gray-50 text-xs"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-5 text-center text-[11px] font-bold">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => increaseQty(item.id)}
                    className="flex h-6 w-6 items-center justify-center rounded-md bg-[#FF9933] text-white text-xs"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 px-5 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">
                Subtotal
              </span>
              <span className="text-sm font-bold text-[#1F2A2A]">
                {formatPrice(subtotal, currency)}
              </span>
            </div>
            <motion.button
              onClick={onProceed}
              whileHover={{
                scale: 1.01,
                boxShadow: "0 10px 20px -6px rgba(255,153,51,0.35)",
              }}
              whileTap={{ scale: 0.97 }}
              className="relative w-full rounded-xl bg-[#FF9933] py-3.5 text-sm font-bold text-white overflow-hidden shadow-md shadow-[#FF9933]/25"
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent"
                initial={{ x: "-100%" }}
                animate={{ x: "200%" }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  repeatDelay: 5,
                  ease: "easeInOut",
                }}
              />
              <span className="relative z-[1]">Proceed to Order</span>
            </motion.button>
          </div>
        </>
      )}
    </div>
  );
}

export default function MenuPage() {
  return (
    <Suspense>
      <MenuPageContent />
    </Suspense>
  );
}

function MenuPageContent() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const slug = params.slug;
  const tableNo = searchParams.get("table")
    ? Number(searchParams.get("table"))
    : null;
  const roomNo = searchParams.get("room") || null;
  const addToOrderId = searchParams.get("addTo") || null;

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeCategory, setActiveCategory] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDish, setSelectedDish] = useState<MenuItem | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [showOrder, setShowOrder] = useState(false);
  const [filterVeg, setFilterVeg] = useState(false);
  const [filterNonVeg, setFilterNonVeg] = useState(false);
  const [filterEgg, setFilterEgg] = useState(false);
  const [filterNoOnionGarlic, setFilterNoOnionGarlic] = useState(false);
  const [filterBestseller, setFilterBestseller] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);
  const { totalItems, items, subtotal } = useCart();
  const { activeOrder, restoreOrder, restoreFromStorage } = useOrder();

  const restaurantId = restaurant?.id ?? null;
  const cur = restaurant?.currency ?? "NPR";

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [rest, menu] = await Promise.all([
          apiFetch<Restaurant>(`/api/public/restaurants/${slug}`),
          apiFetch<MenuItem[]>(`/api/public/restaurants/${slug}/menu`),
        ]);
        if (cancelled) return;
        setRestaurant(rest);
        setMenuItems(menu);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Failed to load restaurant",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // Table session for persistent ordering
  const {
    session: tableSession,
    order: sessionOrder,
    hasActiveOrder: hasSessionOrder,
    getBill,
  } = useTableSession(restaurantId, tableNo);

  // Restore active order when returning from tracking page with ?addTo=orderId
  useEffect(() => {
    if (addToOrderId && restaurantId) {
      restoreOrder(restaurantId, addToOrderId);
    }
  }, [addToOrderId, restaurantId, restoreOrder]);

  // Auto-restore order from localStorage or table session
  useEffect(() => {
    if (restaurantId && !activeOrder && !addToOrderId) {
      if (sessionOrder) {
        restoreOrder(restaurantId, sessionOrder.id);
      } else {
        restoreFromStorage(restaurantId, tableNo ?? undefined);
      }
    }
  }, [restaurantId, activeOrder, addToOrderId, sessionOrder, tableNo, restoreOrder, restoreFromStorage]);

  // Save last visited menu for BottomNav + active table session
  useEffect(() => {
    if (slug && typeof window !== "undefined") {
      localStorage.setItem("hh_last_menu", `/menu/${slug}${tableNo ? `?table=${tableNo}` : ""}`);

      if (tableNo && restaurantId) {
        setActiveTableSession({ restaurantSlug: slug, tableNo, restaurantId });
      }
    }
  }, [slug, tableNo, restaurantId]);

  const handleProceedToCheckout = useCallback(() => {
    setCartOpen(false);
    setCheckoutOpen(true);
  }, []);

  const handleOrderPlaced = useCallback((orderId: string) => {
    setCheckoutOpen(false);
    setShowOrder(true);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `/track/${orderId}`);
    }
  }, []);

  useEffect(() => {
    if (activeOrder?.status === "DELIVERED") {
      const t = setTimeout(() => setShowOrder(false), 3000);
      return () => clearTimeout(t);
    }
  }, [activeOrder?.status]);

  const categories = restaurant?.categories ?? [];

  const filteredItems = menuItems.filter((item) => {
    if (!item.isAvailable) return false;
    if (activeCategory && item.category.name !== activeCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !item.name.toLowerCase().includes(q) &&
        !item.description.toLowerCase().includes(q) &&
        !item.tags.some((t) => t.toLowerCase().includes(q))
      )
        return false;
    }
    if (filterVeg && !item.isVeg) return false;
    if (filterNonVeg && item.isVeg) return false;
    if (filterEgg && !item.hasEgg) return false;
    if (filterNoOnionGarlic && item.hasOnionGarlic) return false;
    if (filterBestseller && item.badge !== "Bestseller") return false;
    return true;
  });

  // Smart AI sorting: featured → bestsellers → highest rated → rest
  const smartSorted = [...filteredItems].sort((a, b) => {
    // Featured items first
    if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
    // Items with discounts next
    if (a.discount > 0 !== b.discount > 0) return a.discount > 0 ? -1 : 1;
    // Bestsellers next
    const aBS = a.badge === "Bestseller" ? 1 : 0;
    const bBS = b.badge === "Bestseller" ? 1 : 0;
    if (aBS !== bBS) return bBS - aBS;
    // Then by rating (highest first)
    if (a.rating !== b.rating) return b.rating - a.rating;
    // Then by sort order
    return a.sortOrder - b.sortOrder;
  });

  if (showOrder && activeOrder) {
    return <OrderStatus onClose={() => setShowOrder(false)} />;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F8FA]">
        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          {/* Pulsing food icon */}
          <motion.div
            className="relative flex h-16 w-16 items-center justify-center"
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="absolute inset-0 rounded-full bg-[#FF9933]/10" />
            <motion.div
              className="absolute inset-1 rounded-full bg-[#FF9933]/20"
              animate={{ scale: [1, 1.15, 1] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.2,
              }}
            />
            <ShoppingBag className="h-7 w-7 text-[#FF9933] relative z-[1]" />
          </motion.div>
          <div className="space-y-1.5 text-center">
            <p className="text-sm font-bold text-[#1F2A2A]">Loading menu</p>
            <div className="flex items-center gap-1 justify-center">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-[#FF9933]"
                  animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F8FA] p-6">
        <div className="text-center max-w-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 mb-4">
            <X className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-[#1F2A2A] mb-1">
            Restaurant not found
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            {error || "We couldn't find the restaurant you're looking for."}
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-[#0A4D3C] px-6 py-3 text-sm font-bold text-white hover:bg-[#083a2d] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA] relative">
      {/* Cinematic restaurant hero */}
      <MenuStoryHero
        name={restaurant.name}
        address={restaurant.address}
        rating={restaurant.rating}
        openingTime={restaurant.openingTime}
        closingTime={restaurant.closingTime}
        coverUrl={restaurant.coverUrl}
        imageUrl={restaurant.imageUrl}
      />

      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="sticky top-0 z-40 bg-white/80 backdrop-blur-2xl border-b border-gray-200/60 shadow-[0_1px_12px_rgba(0,0,0,0.04)]"
      >
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="flex h-16 items-center gap-4">
            <Link
              href="/"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-[#1F2A2A] transition-all shrink-0 shadow-sm"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-[#1F2A2A] truncate">
                  {restaurant.name}
                </h1>
                <span className="flex items-center gap-0.5 shrink-0 rounded-full bg-[#0A4D3C] px-2 py-0.5 text-[10px] font-bold text-white">
                  <Star className="h-2.5 w-2.5 fill-white" />
                  {restaurant.rating.toFixed(1)}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 font-medium">
                {restaurant.address}
                {tableNo && (
                  <span className="ml-2 inline-flex items-center gap-1 rounded-md bg-[#FF9933]/15 px-2 py-0.5 text-[12px] font-black text-[#FF9933]">
                    Table {tableNo}
                  </span>
                )}
                {roomNo && (
                  <span className="ml-2 inline-flex items-center gap-1 rounded-md bg-[#FF9933]/15 px-2 py-0.5 text-[12px] font-black text-[#FF9933]">
                    Room {roomNo}
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {restaurant.phone && (
                <a
                  href={`tel:${restaurant.phone}`}
                  className="hidden sm:flex h-9 items-center gap-1.5 rounded-full bg-gray-100 px-3 text-xs font-bold text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  <Phone className="h-3.5 w-3.5" />
                  Call
                </a>
              )}
              <motion.button
                onClick={() => setCartOpen(true)}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                className="relative flex h-9 items-center gap-1.5 rounded-xl bg-[#FF9933] px-4 text-xs font-bold text-white shadow-md shadow-[#FF9933]/20 hover:bg-[#ff8811]"
              >
                <ShoppingBag className="h-4 w-4" />
                <span className="hidden sm:inline">Cart</span>
                {totalItems > 0 && (
                  <motion.span
                    key={totalItems}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 15 }}
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-[#FF9933]"
                  >
                    {totalItems}
                  </motion.span>
                )}
              </motion.button>
            </div>
          </div>
        </div>
      </motion.header>

      <div className="relative z-10 mx-auto max-w-7xl px-4 md:px-6">
        <div className="flex flex-col lg:flex-row gap-6 py-4 lg:py-6">
          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Stories - with scroll reveal */}
            <ScrollStorySection fadeIn slideFrom="bottom" scrub={false}>
              <MenuStories slug={slug} />
            </ScrollStorySection>

            {/* Table session banner */}
            {hasSessionOrder && sessionOrder && (
              <TableSessionBanner
                tableNo={tableNo ?? sessionOrder.tableNo ?? 0}
                itemCount={sessionOrder.items.reduce((s, i) => s + i.quantity, 0)}
                total={sessionOrder.total}
                status={sessionOrder.status}
              />
            )}

            {/* Search */}
            <motion.div
              className="relative group"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-[#FF9933] transition-colors" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search dishes, cuisines..."
                className="w-full rounded-xl bg-white py-3 pl-11 pr-4 text-sm font-medium text-[#1F2A2A] placeholder-gray-400 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#FF9933]/20 focus:border-[#FF9933]/40 transition-all shadow-sm"
              />
            </motion.div>

            <motion.div
              ref={tabsRef}
              className="flex gap-2 overflow-x-auto scrollbar-hide pb-1"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
            >
              <button
                onClick={() => setActiveCategory("")}
                className={`shrink-0 rounded-xl px-5 py-2.5 text-xs font-bold transition-all ${
                  activeCategory === ""
                    ? "bg-[#0A4D3C] text-white shadow-md shadow-[#0A4D3C]/15"
                    : "bg-white text-gray-500 border border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.name)}
                  className={`shrink-0 rounded-xl px-5 py-2.5 text-xs font-bold transition-all ${
                    activeCategory === cat.name
                      ? "bg-[#0A4D3C] text-white shadow-md shadow-[#0A4D3C]/15"
                      : "bg-white text-gray-500 border border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </motion.div>

            {/* Filters */}
            <motion.div
              className="flex flex-wrap gap-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <FilterPill
                active={filterVeg}
                onClick={() => setFilterVeg(!filterVeg)}
                icon={<Leaf className="h-3 w-3" />}
                label="Veg"
              />
              <FilterPill
                active={filterNonVeg}
                onClick={() => setFilterNonVeg(!filterNonVeg)}
                icon={<Flame className="h-3 w-3" />}
                label="Non-Veg"
              />
              <FilterPill
                active={filterEgg}
                onClick={() => setFilterEgg(!filterEgg)}
                icon={<Egg className="h-3 w-3" />}
                label="Egg"
              />
              <FilterPill
                active={filterNoOnionGarlic}
                onClick={() => setFilterNoOnionGarlic(!filterNoOnionGarlic)}
                icon={<X className="h-3 w-3" />}
                label="No Onion-Garlic"
              />
              <FilterPill
                active={filterBestseller}
                onClick={() => setFilterBestseller(!filterBestseller)}
                icon={<span className="text-[10px] font-black">#</span>}
                label="Bestseller"
              />
            </motion.div>

            {/* Hero slider */}
            {!searchQuery && (
              <FoodSlider
                restaurantSlug={slug}
                onSlideClick={(linkItemId) => {
                  const item = smartSorted.find((d) => d.id === linkItemId);
                  if (item) setSelectedDish(item);
                }}
              />
            )}

            {/* Dish list — grouped by category, scroll-revealed */}
            <ScrollStorySection fadeIn slideFrom="bottom" scrub={false}>
            <div className="space-y-6">
              <AnimatePresence mode="popLayout">
                {smartSorted.length === 0 ? (
                  <motion.p
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="py-12 text-center text-sm text-gray-400"
                  >
                    No dishes found. Try a different filter.
                  </motion.p>
                ) : activeCategory ? (
                  /* Single category selected */
                  <div key="single" className="space-y-3">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                      {activeCategory}
                      <span className="ml-2 text-[#1F2A2A]">
                        ({smartSorted.length})
                      </span>
                    </h3>
                    <motion.div
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                      className="space-y-3"
                    >
                      {smartSorted.map((item) => (
                        <MenuItemCard
                          key={item.id}
                          item={item}
                          restaurantId={restaurant.id}
                          restaurantSlug={restaurant.slug}
                          restaurantCurrency={cur}
                          onSelect={(d) => setSelectedDish(d)}
                        />
                      ))}
                    </motion.div>
                  </div>
                ) : (
                  /* All items — grouped by category */
                  <div key="grouped" className="space-y-6">
                    {categories.map((cat) => {
                      const catItems = smartSorted.filter(
                        (item) => item.category.name === cat.name,
                      );
                      if (catItems.length === 0) return null;
                      return (
                        <div key={cat.id} className="space-y-3">
                          <div className="flex items-center gap-3">
                            <h3 className="text-sm font-bold text-[#1F2A2A]">
                              {cat.name}
                            </h3>
                            <span className="text-[11px] font-semibold text-gray-400">
                              {catItems.length} {catItems.length === 1 ? "item" : "items"}
                            </span>
                            <div className="flex-1 h-px bg-gray-100" />
                          </div>
                          <motion.div
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            className="space-y-3"
                          >
                            {catItems.map((item) => (
                              <MenuItemCard
                                key={item.id}
                                item={item}
                                restaurantId={restaurant.id}
                                restaurantSlug={restaurant.slug}
                                restaurantCurrency={cur}
                                onSelect={(d) => setSelectedDish(d)}
                              />
                            ))}
                          </motion.div>
                        </div>
                      );
                    })}
                    {/* Items with categories not in the restaurant categories list */}
                    {smartSorted.filter(
                      (item) => !categories.some((c) => c.name === item.category.name),
                    ).length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                          Other
                        </h3>
                        <motion.div
                          variants={containerVariants}
                          initial="hidden"
                          animate="visible"
                          className="space-y-3"
                        >
                          {smartSorted
                            .filter(
                              (item) => !categories.some((c) => c.name === item.category.name),
                            )
                            .map((item) => (
                              <MenuItemCard
                                key={item.id}
                                item={item}
                                restaurantId={restaurant.id}
                                restaurantSlug={restaurant.slug}
                                restaurantCurrency={cur}
                                onSelect={(d) => setSelectedDish(d)}
                              />
                            ))}
                        </motion.div>
                      </div>
                    )}
                  </div>
                )}
              </AnimatePresence>
            </div>
            </ScrollStorySection>
          </div>

          {/* Desktop cart sidebar */}
          <div className="hidden lg:block w-[340px] shrink-0">
            <div className="sticky top-[80px]">
              <DesktopCartPreview
                currency={cur}
                onProceed={handleProceedToCheckout}
                onOpenFull={() => setCartOpen(true)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile cart bar */}
      <AnimatePresence>
        {totalItems > 0 && (
          <motion.div
            className="fixed bottom-0 inset-x-0 z-30 lg:hidden"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >
            <motion.button
              onClick={() => setCartOpen(true)}
              whileTap={{ scale: 0.98 }}
              className="flex w-full items-center justify-between bg-[#0A4D3C] px-5 py-4 text-white shadow-[0_-4px_20px_rgba(0,0,0,0.15)]"
            >
              <div className="flex items-center gap-2">
                <motion.span
                  key={totalItems}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 15 }}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs font-bold"
                >
                  {totalItems}
                </motion.span>
                <span className="text-sm font-bold">
                  {totalItems} {totalItems === 1 ? "item" : "items"} |{" "}
                  {formatPrice(subtotal, cur)}
                </span>
              </div>
              <div className="flex items-center gap-1 text-sm font-bold">
                View Cart
                <motion.div
                  animate={{ x: [0, 4, 0] }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <ChevronRight className="h-4 w-4" />
                </motion.div>
              </div>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dish detail glassmorphism modal */}
      <AnimatePresence>
        {selectedDish && (
          <DishDetailModal
            dish={selectedDish}
            restaurantId={restaurant.id}
            restaurantSlug={restaurant.slug}
            restaurantCurrency={cur}
            allItems={menuItems}
            onClose={() => setSelectedDish(null)}
            onSelectDish={(d) => setSelectedDish(d)}
          />
        )}
      </AnimatePresence>

      {/* Get Bill button — shown when dine-in order is active */}
      {hasSessionOrder && sessionOrder && (
        <GetBillButton
          total={sessionOrder.total}
          itemCount={sessionOrder.items.reduce((s, i) => s + i.quantity, 0)}
          paymentMethod={sessionOrder.payment?.method}
          onGetBill={getBill}
        />
      )}

      {/* Cart sidebar */}
      <CartSidebar
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onProceed={handleProceedToCheckout}
      />

      {/* Checkout sheet */}
      {restaurantId && (
        <CheckoutSheet
          open={checkoutOpen}
          onClose={() => setCheckoutOpen(false)}
          restaurantId={restaurantId}
          restaurantSlug={slug}
          tableNo={tableNo}
          roomNo={roomNo}
          tableSessionId={tableSession?.id}
          onOrderPlaced={handleOrderPlaced}
        />
      )}

      {/* Customer chat — visible as soon as user lands on menu */}
      {restaurantId && (tableNo || roomNo || activeOrder) && (
        <ChatWidget
          orderId={activeOrder?.id}
          restaurantId={restaurantId}
          tableNo={tableNo}
          roomNo={roomNo}
          senderRole="CUSTOMER"
          senderName={tableNo ? `Table ${tableNo}` : roomNo ? `Room ${roomNo}` : "Customer"}
        />
      )}
    </div>
  );
}
