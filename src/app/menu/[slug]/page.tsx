"use client";

import { Suspense, useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
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
  Wifi,
  Copy,
  History,
  Receipt,
  Utensils,
  ChevronDown,
  QrCode,
  MapPin,
  Wine,
  BedDouble,
  Users,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/context/ToastContext";
import { useOrder } from "@/context/OrderContext";
import { apiFetch } from "@/lib/api-client";
import gsap from "gsap";
import Link from "next/link";
import OrderStatus from "@/components/shared/OrderStatus";
import CartSidebar from "@/components/cart/CartSidebar";
import CheckoutSheet from "@/components/checkout/CheckoutSheet";
import FoodSlider from "@/components/menu/FoodSlider";
import ScrollStorySection from "@/components/three/ScrollStorySection";
import MenuStories from "@/components/stories/MenuStories";
import ChatWidget from "@/components/chat/ChatWidget";
import { formatPrice } from "@/lib/currency";
import OfferCountdown from "@/components/menu/OfferCountdown";
import TableSessionBanner from "@/components/menu/TableSessionBanner";
import DisplayCounterView from "@/components/menu/DisplayCounterView";
import GetBillButton from "@/components/menu/GetBillButton";
import { useTableSession } from "@/hooks/useTableSession";
import { setActiveTableSession } from "@/hooks/useActiveTableSession";

const PLACEHOLDER_IMG =
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80";

const stripEmojis = (str?: string) => {
  if (!str) return '';
  return str.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '').trim();
};

interface RestaurantCategory {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  icon: string | null;
}

interface Room {
  id: string;
  roomNumber: string;
  name: string | null;
  type: string;
  floor: number;
  price: number;
  maxGuests: number;
  description: string | null;
  amenities: string[];
  imageUrls: string[];
  videoUrl: string | null;
  isAvailable: boolean;
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
  roomCount: number;
  wifiName: string | null;
  wifiPassword: string | null;
  currency: string;
  prepaidEnabled: boolean;
  counterPayEnabled: boolean;
  directPayEnabled: boolean;
  categories: RestaurantCategory[];
  paymentQRs: { id: string; label: string; imageUrl: string }[];
  // Theme
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  fontFamily: string | null;
  menuLayout: string;
  footerText: string | null;
  showStories: boolean;
  showReviews: boolean;
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
  calories: number | null;
  allergens: string[];
  isDrink: boolean;
  drinkCategory: string | null;
  lowStock: boolean;
  outOfStock: boolean;
}

interface ComboMealItem {
  id: string;
  name: string;
  quantity: number;
  menuItemId: string | null;
  menuItem: { id: string; name: string; imageUrl: string | null; price: number; isAvailable: boolean } | null;
}

interface ComboMeal {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  comboPrice: number;
  originalPrice: number;
  items: ComboMealItem[];
}

interface RushHourData {
  isEnabled: boolean;
  isRushNow: boolean;
  surgeEnabled: boolean;
  surgePercent: number;
}

function img(url: string | null) {
  return url || PLACEHOLDER_IMG;
}

function WifiBadge({ name, password }: { name: string; password: string | null }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (password) {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 items-center gap-1.5 rounded-full bg-blue-50 px-3 text-xs font-bold text-blue-600 hover:bg-blue-100 transition-colors"
      >
        <Wifi className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">WiFi</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-white shadow-xl ring-1 ring-gray-200 p-4 z-50"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50">
                <Wifi className="h-4 w-4 text-blue-500" />
              </div>
              <span className="text-xs font-bold text-gray-700">WiFi Details</span>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Network</p>
                <p className="text-sm font-bold text-gray-800">{name}</p>
              </div>
              {password ? (
                <div>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Password</p>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-sm font-mono font-bold text-gray-800">{password}</p>
                    <button
                      onClick={copy}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400">Open network — no password needed</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PaymentQRBadge({ paymentQRs }: { paymentQRs?: { id: string; label: string; imageUrl: string }[] }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!paymentQRs || paymentQRs.length === 0) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 items-center gap-1.5 rounded-full bg-purple-50 px-3 text-xs font-bold text-purple-600 hover:bg-purple-100 transition-colors"
      >
        <QrCode className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Pay</span>
      </button>

      {mounted && typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {open && (
            <div key="qr-modal-wrapper">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setOpen(false)}
                className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="fixed left-1/2 top-1/2 z-[9999] w-[90%] max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl bg-white shadow-2xl"
              >
                <div className="flex items-center justify-between border-b border-gray-100 p-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-50">
                      <QrCode className="h-4 w-4 text-purple-600" />
                    </div>
                    <h3 className="font-bold text-gray-900">Scan to Pay</h3>
                  </div>
                  <button
                    onClick={() => setOpen(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="max-h-[70vh] overflow-y-auto p-5 space-y-6">
                  {paymentQRs.map((qr) => (
                    <div key={qr.id} className="text-center flex flex-col items-center">
                      <p className="mb-3 text-sm font-bold text-gray-700">{qr.label}</p>
                      <div className="w-full max-w-[280px] overflow-hidden rounded-2xl border border-gray-200 bg-white p-2 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
                        <img
                          src={img(qr.imageUrl)}
                          alt={qr.label}
                          className="w-full max-h-[50vh] h-auto object-contain rounded-xl"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
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
              ? "bg-[#eaa94d] text-white shadow-lg shadow-[#eaa94d]/25"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {selected === i && (
            <motion.div
              layoutId="size-pill"
              className="absolute inset-0 rounded-full bg-[#eaa94d]"
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
  surgeMultiplier = 1,
}: {
  dish: MenuItem;
  restaurantId: string;
  restaurantSlug: string;
  restaurantCurrency: string;
  allItems: MenuItem[];
  onClose: () => void;
  onSelectDish: (item: MenuItem) => void;
  surgeMultiplier?: number;
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
  const unitPrice = Math.round((dish.price + sizeAdd + addOnTotal) * surgeMultiplier);
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
        { scale: 1.3, color: "#eaa94d" },
        { scale: 1, color: "#3e1e0c", duration: 0.35, ease: "back.out(2)" },
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
                      ? "bg-[#eaa94d]/90"
                      : dish.badge === "Most Liked"
                        ? "bg-[#3e1e0c]/90"
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
                  className="rounded-full bg-[#eaa94d]/90 backdrop-blur-sm px-3 py-1 text-[11px] font-extrabold text-white shadow-md flex items-center gap-1"
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
                      <span className="flex items-center gap-0.5 rounded-full bg-[#eaa94d]/10 px-2 py-0.5 text-[10px] font-bold text-[#eaa94d]">
                        <Star className="h-3 w-3 fill-[#eaa94d]" /> Featured
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-[#3e1e0c]">{dish.name}</h2>
                  <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">
                    {dish.description}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-400">
                <span className="flex items-center gap-1 rounded-full bg-gray-50 px-2.5 py-1">
                  <Star className="h-3.5 w-3.5 fill-[#eaa94d] text-[#eaa94d]" />
                  <span className="font-bold text-[#3e1e0c]">
                    {dish.rating.toFixed(1)}
                  </span>
                </span>
                <span className="flex items-center gap-1 rounded-full bg-gray-50 px-2.5 py-1">
                  <Clock className="h-3.5 w-3.5" />
                  {dish.prepTime}
                </span>
                {dish.calories && (
                  <span className="flex items-center gap-1 rounded-full bg-orange-50 text-orange-600 px-2.5 py-1">
                    <Flame className="h-3.5 w-3.5" />
                    {dish.calories} kcal
                  </span>
                )}
                {dish.allergens && dish.allergens.length > 0 && (
                  <span className="flex items-center gap-1 rounded-full bg-red-50 text-red-600 px-2.5 py-1 font-medium">
                    <Leaf className="h-3.5 w-3.5" />
                    Contains: {dish.allergens.join(", ")}
                  </span>
                )}
                <OfferCountdown expiresAt={dish.offerExpiresAt} compact />
                {cartQty > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 15 }}
                    className="rounded-full bg-[#3e1e0c] px-2.5 py-1 text-[10px] font-bold text-white"
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
                  className="w-8 text-center text-base font-bold text-[#3e1e0c]"
                >
                  {qty}
                </motion.span>
                <motion.button
                  onClick={() => setQty((q) => q + 1)}
                  whileTap={{ scale: 0.85 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eaa94d] text-white hover:bg-[#d67620] transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </motion.button>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Total</span>
                <p className="text-xl font-extrabold text-[#3e1e0c]">
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
                          ? "bg-[#eaa94d]/10 border border-[#eaa94d]/30"
                          : "bg-white/60 border border-gray-100 hover:bg-white/80"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <motion.div
                          className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition-colors ${
                            selectedAddOns.has(a.id)
                              ? "border-[#eaa94d] bg-[#eaa94d]"
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
                        <span className="text-sm font-medium text-[#3e1e0c]">
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
                  <Flame className="h-3.5 w-3.5 text-[#eaa94d]" />
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
                          <span className="absolute top-1.5 right-1.5 rounded-md bg-[#eaa94d] px-1.5 py-0.5 text-[8px] font-extrabold text-white">
                            {rec.discountLabel}
                          </span>
                        )}
                        <div className="absolute bottom-1.5 left-1.5">
                          <span className={`inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] font-bold text-white ${
                            rec.rating >= 4.0 ? "bg-[#3e1e0c]/90" : "bg-[#eaa94d]/90"
                          }`}>
                            {rec.rating.toFixed(1)}
                            <Star className="h-2 w-2 fill-white" />
                          </span>
                        </div>
                      </div>
                      <div className="mt-1.5 px-0.5">
                        <p className="text-[12px] font-bold text-[#3e1e0c] truncate">{rec.name}</p>
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
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#eaa94d]/10">
                    <Megaphone className="h-4 w-4 text-[#eaa94d]" />
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
            className="relative w-full rounded-xl bg-[#eaa94d] py-3.5 text-base font-bold text-white overflow-hidden shadow-lg shadow-[#eaa94d]/20"
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

function ComboDealCard({
  combo,
  restaurantId,
  restaurantSlug,
  currency,
  surgeMultiplier = 1,
}: {
  combo: ComboMeal;
  restaurantId: string;
  restaurantSlug: string;
  currency: string;
  surgeMultiplier?: number;
}) {
  const { addItem } = useCart();
  const { showToast } = useToast();

  const effectivePrice = Math.round(combo.comboPrice * surgeMultiplier);
  const savings = Math.round(combo.originalPrice - combo.comboPrice);

  const handleAddAll = () => {
    combo.items.forEach((ci) => {
      const menuItem = ci.menuItem;
      const itemPrice = menuItem ? Math.round(menuItem.price * surgeMultiplier) : 0;
      addItem(
        {
          id: menuItem?.id ?? ci.id,
          name: ci.name,
          price: itemPrice,
          image: img(menuItem?.imageUrl ?? null),
        },
        restaurantId,
        restaurantSlug,
        currency,
      );
    });
    showToast(`${combo.name} added to cart!`);
  };

  return (
    <div className="flex-shrink-0 w-64 rounded-2xl border border-gray-100 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
      {combo.imageUrl && (
        <div className="h-32 w-full overflow-hidden bg-gray-100">
          <img src={combo.imageUrl} alt={combo.name} className="h-full w-full object-cover" />
        </div>
      )}
      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-bold text-[#3e1e0c] leading-tight">{combo.name}</h3>
          {savings > 0 && (
            <span className="flex-shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
              Save {formatPrice(savings, currency)}
            </span>
          )}
        </div>
        {combo.description && (
          <p className="text-[11px] text-gray-400 line-clamp-2">{combo.description}</p>
        )}
        <div className="flex flex-wrap gap-1">
          {combo.items.map((ci) => (
            <span key={ci.id} className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
              {ci.quantity > 1 ? `${ci.quantity}× ` : ""}{ci.name}
            </span>
          ))}
        </div>
        <div className="flex items-center justify-between pt-1">
          <div>
            <span className="text-sm font-extrabold text-[#3e1e0c]">{formatPrice(effectivePrice, currency)}</span>
            {combo.originalPrice > combo.comboPrice && (
              <span className="ml-1.5 text-[11px] text-gray-400 line-through">{formatPrice(Math.round(combo.originalPrice * surgeMultiplier), currency)}</span>
            )}
          </div>
          <button
            onClick={handleAddAll}
            className="flex items-center gap-1.5 rounded-xl bg-[#eaa94d] px-3 py-2 text-[11px] font-bold text-white hover:bg-[#d67620] transition-colors"
          >
            <Plus className="h-3 w-3" strokeWidth={3} />
            Add All
          </button>
        </div>
      </div>
    </div>
  );
}

function MenuItemCard({
  item,
  restaurantId,
  restaurantSlug,
  restaurantCurrency,
  onSelect,
  surgeMultiplier = 1,
}: {
  item: MenuItem;
  restaurantId: string;
  restaurantSlug: string;
  restaurantCurrency: string;
  onSelect: (item: MenuItem) => void;
  surgeMultiplier?: number;
}) {
  const { addItem, getItemQty } = useCart();
  const { showToast } = useToast();
  const btnRef = useRef<HTMLButtonElement>(null);
  const qty = getItemQty(item.id);
  const displayPrice = Math.round(item.price * surgeMultiplier);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    addItem(
      {
        id: item.id,
        name: item.name,
        price: displayPrice,
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
        <div className="relative h-24 w-24 sm:h-28 sm:w-28 shrink-0 overflow-hidden rounded-xl bg-gray-100">
          <img
            src={img(item.imageUrl)}
            alt={item.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
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
                  ? "bg-[#eaa94d]"
                  : item.badge === "Most Liked"
                    ? "bg-[#3e1e0c]"
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
              {item.isDrink && (
                <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[8px] font-bold text-blue-600">
                  {item.drinkCategory || "Drink"}
                </span>
              )}
              {item.lowStock && !item.outOfStock && (
                <span className="rounded-full bg-orange-50 px-1.5 py-0.5 text-[8px] font-bold text-orange-600">
                  Few left
                </span>
              )}
            </div>
            <h3 className="text-sm font-bold text-[#3e1e0c] truncate flex items-center gap-1">
              {stripEmojis(item.name)}
              {item.isFeatured && (
                <Star className="h-3 w-3 fill-[#eaa94d] text-[#eaa94d] shrink-0" />
              )}
            </h3>
            <p className="mt-0.5 text-[11px] text-gray-400 line-clamp-2 leading-relaxed">
              {item.description}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-extrabold text-[#3e1e0c]">
              {formatPrice(displayPrice, restaurantCurrency)}
            </span>
            {surgeMultiplier > 1 && (
              <span className="text-[10px] text-gray-400 line-through">{formatPrice(item.price, restaurantCurrency)}</span>
            )}
            <span className="flex items-center gap-0.5 text-[11px] text-gray-400">
              <Star className="h-3 w-3 fill-[#eaa94d] text-[#eaa94d]" />
              {item.rating.toFixed(1)}
            </span>
            <span className="flex items-center gap-0.5 text-[11px] text-gray-400">
              <Clock className="h-3 w-3" />
              {item.prepTime}
            </span>
            <OfferCountdown expiresAt={item.offerExpiresAt} compact />
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
              className="mt-1 inline-flex w-fit items-center gap-1 rounded-md bg-[#eaa94d] px-2 py-0.5 text-[10px] font-extrabold text-white shadow"
            >
              {item.discountLabel}
            </motion.span>
          )}
        </div>
      </div>

      {/* Add to Cart button — always visible below */}
      <div className="px-3 pb-3 space-y-1.5">
        {qty > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-1 text-[11px] font-semibold text-[#3e1e0c]"
          >
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#eaa94d] text-[9px] font-bold text-white">
              {qty}
            </span>
            in cart
          </motion.div>
        )}
        {item.outOfStock ? (
          <div className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-200 py-2.5 text-[13px] font-bold text-gray-500 cursor-not-allowed">
            Out of Stock
          </div>
        ) : (
          <motion.button
            ref={btnRef}
            onClick={handleQuickAdd}
            whileTap={{ scale: 0.96 }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#eaa94d] py-2.5 text-[13px] font-bold text-white shadow-sm shadow-[#eaa94d]/20 hover:bg-[#d67620] transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" strokeWidth={3} />
            Add to Cart
          </motion.button>
        )}
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
              <span className="rounded-full bg-[#eaa94d] px-2.5 py-0.5 text-[10px] font-bold text-white">
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
            className="mt-1.5 inline-block text-xl font-extrabold text-[#eaa94d]"
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
      className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-[11px] font-bold tracking-wide transition-all ${
        active
          ? "bg-[#1a1a1a] text-white shadow-md shadow-black/10"
          : "bg-white text-gray-500 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900"
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
          <ShoppingBag className="h-4 w-4 text-[#eaa94d]" />
          <h3 className="text-sm font-bold text-[#3e1e0c]">Your Order</h3>
        </div>
        {totalItems > 0 && (
          <span className="rounded-full bg-[#eaa94d]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#eaa94d]">
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
                <div className="flex-1">
                  <h2 className="text-xl font-black text-[#3e1e0c] leading-tight">
                    {stripEmojis(item.name)}
                  </h2>
                  <p className="text-xs font-semibold text-[#eaa94d]">
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
                    className="flex h-6 w-6 items-center justify-center rounded-md bg-[#eaa94d] text-white text-xs"
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
              <span className="text-sm font-bold text-[#3e1e0c]">
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
              className="relative w-full rounded-xl bg-[#eaa94d] py-3.5 text-sm font-bold text-white overflow-hidden shadow-md shadow-[#eaa94d]/25"
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
  const [activeSubCategory, setActiveSubCategory] = useState<string>("");
  const [categoryView, setCategoryView] = useState<"scroll" | "grid">("scroll");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDish, setSelectedDish] = useState<MenuItem | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [showOrder, setShowOrder] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(`hh_tracking_${slug}`) === "1";
  });
  const [showHistory, setShowHistory] = useState(false);
  const [filterVeg, setFilterVeg] = useState(false);
  const { isSignedIn } = useAuth();
  const [filterNonVeg, setFilterNonVeg] = useState(false);
  const [filterEgg, setFilterEgg] = useState(false);
  const [filterNoOnionGarlic, setFilterNoOnionGarlic] = useState(false);
  const [filterBestseller, setFilterBestseller] = useState(false);
  const [filterDrinks, setFilterDrinks] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [showRooms, setShowRooms] = useState(false);
  const [hasCoupons, setHasCoupons] = useState(false);
  const [comboMeals, setComboMeals] = useState<ComboMeal[]>([]);
  const [rushHour, setRushHour] = useState<RushHourData>({ isEnabled: false, isRushNow: false, surgeEnabled: false, surgePercent: 0 });
  const tabsRef = useRef<HTMLDivElement>(null);
  const { totalItems, items, subtotal } = useCart();
  const { activeOrder, restoreOrder, restoreFromStorage } = useOrder();

  const restaurantId = restaurant?.id ?? null;
  const cur = restaurant?.currency ?? "NPR";
  const surgeMultiplier = (rushHour.isRushNow && rushHour.surgeEnabled) ? (1 + rushHour.surgePercent / 100) : 1;

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

        // Load rooms for hotel/resort/guesthouse types
        const hotelTypes = ["HOTEL", "RESORT", "GUEST_HOUSE"];
        if (hotelTypes.includes(rest.type)) {
          apiFetch<Room[]>(`/api/public/restaurants/${slug}/rooms`)
            .then((r) => { if (!cancelled) setRooms(r); })
            .catch(() => {});
        }

        // Load combo deals
        apiFetch<ComboMeal[]>(`/api/public/restaurants/${slug}/combo-meals`)
          .then((c) => { if (!cancelled) setComboMeals(c); })
          .catch(() => {});

        // Load rush hour config
        apiFetch<RushHourData>(`/api/public/restaurants/${slug}/rush-hour`)
          .then((r) => { if (!cancelled) setRushHour(r); })
          .catch(() => {});

        // Check if restaurant has active coupons
        apiFetch<{ valid: boolean }>(`/api/public/restaurants/${slug}/coupons/validate`, {
          method: "POST",
          body: { code: "__CHECK__", orderTotal: 0 },
        }).catch((err) => {
          // If error message mentions "not found" it means no coupons; any other error means coupons exist
          if (err instanceof Error && !err.message.toLowerCase().includes("not found")) {
            if (!cancelled) setHasCoupons(true);
          }
        });
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
      if (sessionOrder && !["DELIVERED", "CANCELLED", "REJECTED"].includes(sessionOrder.status)) {
        // Only restore non-terminal session orders
        restoreOrder(restaurantId, sessionOrder.id);
      } else if (!sessionOrder) {
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

  const handleOrderPlaced = useCallback((_orderId: string) => {
    localStorage.setItem(`hh_tracking_${slug}`, "1");
    setCheckoutOpen(false);
    setShowOrder(true);
    // Do NOT change the URL — preserves ?table=N so Dine-In stays available for repeat orders
  }, [slug]);

  // Auto-show order tracking whenever an active (non-terminal) order is loaded or restored.
  // Terminal orders restored from storage are cleared immediately without reopening the overlay.
  useEffect(() => {
    if (activeOrder?.id) {
      const isTerminal = ["DELIVERED", "CANCELLED", "REJECTED"].includes(activeOrder.status);
      if (isTerminal) {
        // Order was already done before the page was refreshed — don't reopen overlay
        localStorage.removeItem(`hh_tracking_${slug}`);
        setShowOrder(false);
      } else {
        setShowOrder(true);
      }
    }
  }, [activeOrder?.id, slug]); // only fires when the ORDER IDENTITY changes, not on every status poll

  useEffect(() => {
    if (activeOrder?.status === "DELIVERED" || activeOrder?.status === "CANCELLED" || activeOrder?.status === "REJECTED") {
      // Remove the tracking flag and close the overlay after a brief delay
      // (delay BEFORE removal so refresh within window still shows final state)
      const t = setTimeout(() => {
        localStorage.removeItem(`hh_tracking_${slug}`);
        setShowOrder(false);
      }, activeOrder.status === "DELIVERED" ? 4000 : 1500);
      return () => clearTimeout(t);
    }
  }, [activeOrder?.status, slug]);

  // If tracking overlay is open but no order is restored within 8s, the stored order
  // is likely gone — clear the flag and return to the menu
  useEffect(() => {
    if (!showOrder || activeOrder) return;
    const t = setTimeout(() => {
      localStorage.removeItem(`hh_tracking_${slug}`);
      setShowOrder(false);
    }, 8000);
    return () => clearTimeout(t);
  }, [showOrder, activeOrder, slug]);

  const allCategories = restaurant?.categories ?? [];
  const categories = allCategories.filter((c) => !c.parentId);
  const activeParentCat = categories.find((c) => c.name === activeCategory);
  const subCategories = activeParentCat
    ? allCategories.filter((c) => c.parentId === activeParentCat.id)
    : [];

  const filteredItems = menuItems.filter((item) => {
    if (!item.isAvailable) return false;
    // Category filter: match parent or child categories
    if (activeCategory) {
      if (activeSubCategory) {
        // If subcategory selected, match only that subcategory
        if (item.category.name !== activeSubCategory) return false;
      } else {
        // If only parent category, match parent + all its subcategories
        const childCatNames = subCategories.map((c) => c.name);
        if (
          item.category.name !== activeCategory &&
          !childCatNames.includes(item.category.name)
        )
          return false;
      }
    }
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
    if (filterDrinks && !item.isDrink) return false;
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

  if (showOrder) {
    if (!activeOrder) {
      return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white">
          <Loader2 className="h-8 w-8 animate-spin text-[#eaa94d] mb-3" />
          <p className="text-sm font-semibold text-gray-500">Loading your order…</p>
        </div>
      );
    }
    return <OrderStatus onClose={() => { localStorage.removeItem(`hh_tracking_${slug}`); setShowOrder(false); }} />;
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
            <div className="absolute inset-0 rounded-full bg-[#eaa94d]/10" />
            <motion.div
              className="absolute inset-1 rounded-full bg-[#eaa94d]/20"
              animate={{ scale: [1, 1.15, 1] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.2,
              }}
            />
            <ShoppingBag className="h-7 w-7 text-[#eaa94d] relative z-[1]" />
          </motion.div>
          <div className="space-y-1.5 text-center">
            <p className="text-sm font-bold text-[#3e1e0c]">Loading menu</p>
            <div className="flex items-center gap-1 justify-center">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-[#eaa94d]"
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
          <h2 className="text-lg font-bold text-[#3e1e0c] mb-1">
            Restaurant not found
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            {error || "We couldn't find the restaurant you're looking for."}
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-[#3e1e0c] px-6 py-3 text-sm font-bold text-white hover:bg-[#733e1b] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // Build CSS custom properties from restaurant theme
  const themeStyle: React.CSSProperties = {
    ...(restaurant.primaryColor ? { "--menu-primary": restaurant.primaryColor } as React.CSSProperties : {}),
    ...(restaurant.secondaryColor ? { "--menu-secondary": restaurant.secondaryColor } as React.CSSProperties : {}),
    ...(restaurant.accentColor ? { "--menu-accent": restaurant.accentColor } as React.CSSProperties : {}),
    ...(restaurant.fontFamily ? { fontFamily: `${restaurant.fontFamily}, sans-serif` } : {}),
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex justify-center w-full" style={themeStyle}>
      <div className="w-full max-w-5xl bg-white min-h-screen shadow-[0_0_40px_rgba(0,0,0,0.03)] relative flex flex-col">
        {/* Sleek Cover Banner */}
        {restaurant.coverUrl && (
          <div className="relative w-full h-[180px] sm:h-[240px] md:h-[280px] shrink-0">
            <img 
               src={restaurant.coverUrl} 
               alt="Cover" 
               className="w-full h-full object-cover"
            />
            {/* Elegant gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            
            {/* Restaurant Info Overlay */}
            <div className="absolute bottom-6 left-6 right-6 flex items-end gap-3 sm:gap-4">
               {/* Avatar or Logo */}
               <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-white p-1 shadow-lg shrink-0 overflow-hidden">
                 <img src={restaurant.imageUrl || PLACEHOLDER_IMG} alt={restaurant.name} className="h-full w-full object-cover rounded-xl" />
               </div>
               <div className="flex-1 pb-1">
                 <h1 className="text-2xl sm:text-3xl font-black text-white leading-none tracking-tight shadow-black drop-shadow-md">
                   {restaurant.name}
                 </h1>
                 <div className="mt-2 flex items-center gap-3 text-white/90 text-[10px] sm:text-xs font-semibold">
                    <span className="flex items-center gap-1 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-md text-[#eaa94d]">
                      <Star className="h-3 w-3 text-[#eaa94d] fill-[#eaa94d]" />
                      {restaurant.rating.toFixed(1)}
                    </span>
                    <span className="flex items-center gap-1 drop-shadow-md truncate">
                      <MapPin className="h-3 w-3" />
                      {restaurant.address}
                    </span>
                 </div>
               </div>
            </div>
          </div>
        )}

        {/* Premium Header Container */}
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="sticky top-0 z-40 bg-white/95 backdrop-blur-3xl shadow-sm border-b border-black/[0.04]"
        >
          <div className="px-4 md:px-6 py-2">
            <div className="flex h-12 sm:h-14 items-center gap-3 sm:gap-4">
              <Link
                href="/"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-[#3e1e0c] transition-all shrink-0 shadow-sm"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
            <div className="flex-1 min-w-0 flex items-center">
              {/* Only show Table/Room badges since Resto Name is in the cover banner now */}
              {(tableNo || roomNo) ? (
                <div className="flex gap-2">
                  {tableNo && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-[#eaa94d]/15 px-2.5 py-1 text-[13px] font-black text-[#eaa94d]">
                      Table {tableNo}
                    </span>
                  )}
                  {roomNo && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-[#eaa94d]/15 px-2.5 py-1 text-[13px] font-black text-[#eaa94d]">
                      Room {roomNo}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-sm font-bold text-[#3e1e0c] truncate hidden sm:inline-block">Menu</span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {restaurant.wifiName && (
                <WifiBadge name={restaurant.wifiName} password={restaurant.wifiPassword} />
              )}
              <PaymentQRBadge paymentQRs={restaurant.paymentQRs} />
              {restaurant.phone && (
                <a
                  href={`tel:${restaurant.phone}`}
                  className="hidden sm:flex h-9 items-center gap-1.5 rounded-full bg-gray-100 px-3 text-xs font-bold text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  <Phone className="h-3.5 w-3.5" />
                  Call
                </a>
              )}
              {isSignedIn && (
                <button
                  onClick={() => setShowHistory(true)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                  title="My Order History"
                >
                  <History className="h-4 w-4" />
                </button>
              )}
              <motion.button
                onClick={() => setCartOpen(true)}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                className="relative flex h-9 items-center gap-1.5 rounded-xl bg-[#eaa94d] px-4 text-xs font-bold text-white shadow-md shadow-[#eaa94d]/20 hover:bg-[#d67620]"
              >
                <ShoppingBag className="h-4 w-4" />
                <span className="hidden sm:inline">Cart</span>
                {totalItems > 0 && (
                  <motion.span
                    key={totalItems}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 15 }}
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-[#eaa94d]"
                  >
                    {totalItems}
                  </motion.span>
                )}
              </motion.button>
            </div>
          </div>
        </div>
      </motion.header>

      <div className="relative z-10 flex-1 px-4 md:px-6 pb-24">
        <div className="flex flex-col md:flex-row gap-6 py-4 lg:py-6 w-full">
          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-5">
            {/* Stories - with scroll reveal */}
            {restaurant.showStories && (
              <ScrollStorySection fadeIn slideFrom="bottom" scrub={false}>
                <MenuStories slug={slug} />
              </ScrollStorySection>
            )}

            {/* Display Counter - live availability view */}
            <DisplayCounterView slug={slug} />

            {/* Table session banner */}
            {hasSessionOrder && sessionOrder && (
              <TableSessionBanner
                tableNo={tableNo ?? sessionOrder.tableNo ?? 0}
                itemCount={sessionOrder.items.reduce((s, i) => s + i.quantity, 0)}
                total={sessionOrder.total}
                status={sessionOrder.status}
              />
            )}

            {/* Search + Category bar — sticky seamlessly under header */}
            <div className="sticky top-[64px] sm:top-[72px] z-30 -mx-4 px-4 md:-mx-6 md:px-6 pt-1 pb-2 bg-white/95 backdrop-blur-md space-y-3">
            <motion.div
              className="relative group"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-[#eaa94d] transition-colors" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search dishes, cuisines..."
                className="w-full rounded-xl bg-white py-3 pl-11 pr-4 text-sm font-medium text-[#3e1e0c] placeholder-gray-400 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#eaa94d]/20 focus:border-[#eaa94d]/40 transition-all shadow-sm"
              />
            </motion.div>

            {/* Category bar with toggle + search */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="space-y-2"
            >
              {/* Main category pills */}
              <div className="flex items-center gap-2">
                <div
                  ref={tabsRef}
                  className="flex flex-1 gap-2 overflow-x-auto scrollbar-hide pb-0.5"
                >
                  <button
                    onClick={() => {
                      setActiveCategory("");
                      setActiveSubCategory("");
                    }}
                    className={`shrink-0 rounded-full px-6 py-2.5 text-[11px] font-bold tracking-wide uppercase transition-all ${
                      activeCategory === ""
                        ? "bg-[#1a1a1a] text-white shadow-md shadow-black/10"
                        : "bg-white text-gray-500 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 hover:text-[#1a1a1a]"
                    }`}
                  >
                    All
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setActiveCategory(cat.name === activeCategory ? "" : cat.name);
                        setActiveSubCategory("");
                      }}
                      className={`shrink-0 rounded-full px-6 py-2.5 text-[11px] font-bold tracking-wide uppercase transition-all flex items-center ${
                        activeCategory === cat.name
                          ? "bg-[#1a1a1a] text-white shadow-md shadow-black/10"
                          : "bg-white text-gray-500 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 hover:text-[#1a1a1a]"
                      }`}
                    >
                      {stripEmojis(cat.name)}
                    </button>
                  ))}
                </div>

                {/* Grid / Scroll toggle */}
                <button
                  onClick={() => setCategoryView((v) => (v === "scroll" ? "grid" : "scroll"))}
                  className="shrink-0 flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-400 hover:text-brand-600 hover:border-brand-200 transition-all"
                  title={categoryView === "scroll" ? "Grid view" : "List view"}
                >
                  {categoryView === "scroll" ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
                  )}
                </button>
              </div>

              {/* Subcategory chips — appear when a parent category is selected */}
              <AnimatePresence>
                {activeCategory && subCategories.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
                      <button
                        onClick={() => setActiveSubCategory("")}
                        className={`shrink-0 rounded-full px-4 py-1.5 text-[10px] font-bold tracking-wide uppercase transition-all ${
                          activeSubCategory === ""
                            ? "bg-[#1a1a1a] text-white shadow-sm"
                            : "bg-white text-gray-500 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 hover:text-[#1a1a1a]"
                        }`}
                      >
                        All {stripEmojis(activeCategory)}
                      </button>
                      {subCategories.map((sub) => (
                        <button
                          key={sub.id}
                          onClick={() => setActiveSubCategory(sub.name === activeSubCategory ? "" : sub.name)}
                          className={`shrink-0 rounded-full px-4 py-1.5 text-[10px] font-bold tracking-wide uppercase transition-all ${
                            activeSubCategory === sub.name
                              ? "bg-[#1a1a1a] text-white shadow-sm"
                              : "bg-white text-gray-500 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 hover:text-[#1a1a1a]"
                          }`}
                        >
                          {stripEmojis(sub.name)}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
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
              {menuItems.some((i) => i.isDrink) && (
                <FilterPill
                  active={filterDrinks}
                  onClick={() => setFilterDrinks(!filterDrinks)}
                  icon={<Wine className="h-3 w-3" />}
                  label="Drinks"
                />
              )}
            </motion.div>
            </div>

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

            {/* Rush Hour banner */}
            {rushHour.isRushNow && rushHour.surgeEnabled && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-red-50 to-orange-50 border border-orange-200/60 px-4 py-3"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 shrink-0">
                  <Flame className="h-4 w-4 text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-orange-800">Rush Hour Pricing Active</p>
                  <p className="text-[11px] text-orange-600">Prices +{rushHour.surgePercent}% during peak hours</p>
                </div>
              </motion.div>
            )}

            {/* Combo Deals section */}
            {comboMeals.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="space-y-3"
              >
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-[#3e1e0c]" />
                  <h2 className="text-sm font-bold text-[#3e1e0c]">Combo Deals</h2>
                  <span className="text-[11px] font-semibold text-gray-400">{comboMeals.length} deal{comboMeals.length > 1 ? "s" : ""}</span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                  {comboMeals.map((combo) => (
                    <ComboDealCard
                      key={combo.id}
                      combo={combo}
                      restaurantId={restaurant.id}
                      restaurantSlug={restaurant.slug}
                      currency={cur}
                      surgeMultiplier={surgeMultiplier}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Coupon banner — tell customers coupons are available */}
            {hasCoupons && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.25 }}
                className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200/60 px-4 py-3"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-100 shrink-0">
                  <Tag className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-green-800">Coupons Available!</p>
                  <p className="text-[11px] text-green-600">Apply a coupon code at checkout to get a discount</p>
                </div>
              </motion.div>
            )}

            {/* Rooms section — for hotel/resort/guesthouse */}
            {rooms.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
                className="space-y-3"
              >
                <button
                  onClick={() => setShowRooms(!showRooms)}
                  className="flex w-full items-center justify-between rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 shrink-0">
                      <BedDouble className="h-4 w-4 text-amber-700" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-amber-800">
                        {rooms.length} Room{rooms.length > 1 ? "s" : ""} Available
                      </p>
                      <p className="text-[11px] text-amber-600">Tap to browse & book rooms</p>
                    </div>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-amber-400 transition-transform ${showRooms ? "rotate-180" : ""}`} />
                </button>

                <AnimatePresence>
                  {showRooms && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-3 pt-1">
                        {rooms.map((room) => (
                          <div
                            key={room.id}
                            className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden"
                          >
                            {room.imageUrls[0] && (
                              <div className="relative h-36 w-full overflow-hidden">
                                <img
                                  src={room.imageUrls[0]}
                                  alt={room.name || `Room ${room.roomNumber}`}
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                />
                                <span className="absolute top-2 right-2 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-[#3e1e0c] shadow-sm">
                                  {formatPrice(room.price, cur)}/night
                                </span>
                              </div>
                            )}
                            <div className="p-4 space-y-2">
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-bold text-[#3e1e0c]">
                                  {room.name || `Room ${room.roomNumber}`}
                                </h4>
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                  room.type === "SUITE" ? "bg-purple-50 text-purple-700" :
                                  room.type === "DELUXE" ? "bg-amber-50 text-amber-700" :
                                  "bg-gray-50 text-gray-600"
                                }`}>
                                  {room.type}
                                </span>
                              </div>
                              {room.description && (
                                <p className="text-[11px] text-gray-500 line-clamp-2">{room.description}</p>
                              )}
                              <div className="flex items-center gap-3 text-[11px] text-gray-400">
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  Up to {room.maxGuests} guests
                                </span>
                                <span>Floor {room.floor}</span>
                              </div>
                              {room.amenities.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {room.amenities.slice(0, 4).map((a) => (
                                    <span key={a} className="rounded-full bg-gray-50 px-2 py-0.5 text-[9px] font-medium text-gray-500">
                                      {a}
                                    </span>
                                  ))}
                                  {room.amenities.length > 4 && (
                                    <span className="rounded-full bg-gray-50 px-2 py-0.5 text-[9px] font-medium text-gray-400">
                                      +{room.amenities.length - 4} more
                                    </span>
                                  )}
                                </div>
                              )}
                              {!room.imageUrls[0] && (
                                <div className="flex items-center justify-between pt-1">
                                  <span className="text-sm font-bold text-[#eaa94d]">
                                    {formatPrice(room.price, cur)}/night
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* Dish list — grouped by category */}
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
                      {stripEmojis(activeCategory)}
                      {activeSubCategory && (
                        <span className="text-brand-500"> / {activeSubCategory}</span>
                      )}
                      <span className="ml-2 text-[#3e1e0c]">
                        ({smartSorted.length})
                      </span>
                    </h3>
                    <motion.div
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                      className={categoryView === "grid"
                        ? "grid grid-cols-1 sm:grid-cols-2 gap-3"
                        : "space-y-3"
                      }
                    >
                      {smartSorted.map((item) => (
                        <MenuItemCard
                          key={item.id}
                          item={item}
                          restaurantId={restaurant.id}
                          restaurantSlug={restaurant.slug}
                          restaurantCurrency={cur}
                          onSelect={(d) => setSelectedDish(d)}
                          surgeMultiplier={surgeMultiplier}
                        />
                      ))}
                    </motion.div>
                  </div>
                ) : (
                  /* All items — grouped by category */
                  <div key="grouped" className="space-y-6">
                    {categories.map((cat) => {
                      const childCats = allCategories.filter((c) => c.parentId === cat.id);
                      const childCatNames = childCats.map((c) => c.name);
                      const catItems = smartSorted.filter(
                        (item) =>
                          item.category.name === cat.name ||
                          childCatNames.includes(item.category.name),
                      );
                      if (catItems.length === 0) return null;
                      return (
                        <div key={cat.id} className="space-y-3">
                          <div className="flex items-center gap-3">
                            <h3 className="text-sm font-bold text-[#3e1e0c]">
                              {stripEmojis(cat.name)}
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
                            className={categoryView === "grid"
                              ? "grid grid-cols-2 gap-3"
                              : "space-y-3"
                            }
                          >
                            {catItems.map((item) => (
                              <MenuItemCard
                                key={item.id}
                                item={item}
                                restaurantId={restaurant.id}
                                restaurantSlug={restaurant.slug}
                                restaurantCurrency={cur}
                                onSelect={(d) => setSelectedDish(d)}
                                surgeMultiplier={surgeMultiplier}
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
                                surgeMultiplier={surgeMultiplier}
                              />
                            ))}
                        </motion.div>
                      </div>
                    )}
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Desktop cart sidebar */}
          <div className="hidden md:block w-[280px] lg:w-[320px] shrink-0">
            <div className="sticky top-[100px]">
              <DesktopCartPreview
                currency={cur}
                onProceed={handleProceedToCheckout}
                onOpenFull={() => setCartOpen(true)}
              />
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Mobile cart bar — must sit above BottomNav (z-50) */}
      <AnimatePresence>
        {totalItems > 0 && (
          <motion.div
            className="fixed bottom-0 inset-x-0 mx-auto max-w-5xl z-[60] md:hidden"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >
            <motion.button
              onClick={() => setCartOpen(true)}
              whileTap={{ scale: 0.98 }}
              className="flex w-full items-center justify-between bg-[#3e1e0c] px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-white shadow-[0_-4px_20px_rgba(0,0,0,0.15)]"
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
            surgeMultiplier={surgeMultiplier}
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

      {/* Floating "Track Order" button — shown when order is active but overlay is closed */}
      {activeOrder &&
        !showOrder &&
        !["DELIVERED", "CANCELLED", "REJECTED"].includes(activeOrder.status) && (
          <button
            onClick={() => setShowOrder(true)}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-[#3e1e0c] px-5 py-3 text-sm font-bold text-white shadow-xl shadow-[#3e1e0c]/30 hover:bg-[#2d1508] active:scale-95 transition-all"
          >
            <Receipt className="h-4 w-4" />
            Track Order · {activeOrder.orderNo}
          </button>
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

      {/* Order History Sheet */}
      <OrderHistorySheet
        open={showHistory}
        onClose={() => setShowHistory(false)}
        restaurantSlug={slug}
        currency={restaurant?.currency ?? "NPR"}
      />

      {/* Dynamic footer text */}
      {restaurant.footerText && (
        <div className="border-t border-gray-100 px-6 py-4 text-center">
          <p className="text-xs text-gray-400">{restaurant.footerText}</p>
        </div>
      )}
    </div>
  );
}

/* ── Order History Sheet ──────────────────────────────── */
interface HistoryOrder {
  id: string;
  orderNo: string;
  status: string;
  total: number;
  createdAt: string;
  items: { id: string; name: string; quantity: number; price: number }[];
  payment?: { method: string; status: string } | null;
}

const H_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:   { label: "Pending",   color: "text-amber-700",  bg: "bg-amber-50" },
  ACCEPTED:  { label: "Accepted",  color: "text-blue-700",   bg: "bg-blue-50" },
  PREPARING: { label: "Preparing", color: "text-purple-700", bg: "bg-purple-50" },
  READY:     { label: "Ready",     color: "text-emerald-700",bg: "bg-emerald-50" },
  DELIVERED: { label: "Delivered", color: "text-green-700",  bg: "bg-green-50" },
  CANCELLED: { label: "Cancelled", color: "text-red-700",    bg: "bg-red-50" },
  REJECTED:  { label: "Rejected",  color: "text-red-700",    bg: "bg-red-50" },
};

function OrderHistorySheet({
  open,
  onClose,
  restaurantSlug,
  currency,
}: {
  open: boolean;
  onClose: () => void;
  restaurantSlug: string;
  currency: string;
}) {
  const [orders, setOrders] = useState<HistoryOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/orders?restaurantSlug=${restaurantSlug}&limit=50`)
      .then((r) => r.json())
      .then((data) => setOrders(Array.isArray(data) ? data : []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [open, restaurantSlug]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm bg-white shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-[#eaa94d]" />
                <h3 className="text-base font-bold text-[#3e1e0c]">My Orders Here</h3>
              </div>
              <button onClick={onClose} className="rounded-full p-2 text-gray-400 hover:bg-gray-100 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <Receipt className="h-12 w-12 mb-3 opacity-30" />
                  <p className="text-sm font-semibold text-gray-500">No orders yet</p>
                  <p className="text-xs text-gray-400 mt-1">Your orders at this place will appear here</p>
                </div>
              ) : (
                orders.map((order) => {
                  const meta = H_STATUS[order.status] || H_STATUS.PENDING;
                  const expanded = expandedId === order.id;
                  return (
                    <div key={order.id} className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                      <button
                        onClick={() => setExpandedId(expanded ? null : order.id)}
                        className="w-full p-4 text-left"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-bold text-gray-800">#{order.orderNo}</p>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${meta.bg} ${meta.color}`}>
                            {meta.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400">
                          {order.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-sm font-bold text-gray-900">
                            {formatPrice(order.total, currency)}
                          </p>
                          <div className="flex items-center gap-1.5">
                            <p className="text-[10px] text-gray-400">
                              {new Date(order.createdAt).toLocaleDateString("en-NP", { month: "short", day: "numeric" })}
                            </p>
                            <ChevronDown className={`h-3.5 w-3.5 text-gray-300 transition-transform ${expanded ? "rotate-180" : ""}`} />
                          </div>
                        </div>
                      </button>

                      <AnimatePresence>
                        {expanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="border-t border-gray-100 px-4 py-3 space-y-2">
                              {order.items.map((item) => (
                                <div key={item.id} className="flex items-center justify-between">
                                  <span className="text-xs text-gray-600">{item.quantity}x {item.name}</span>
                                  <span className="text-xs font-medium text-gray-700">
                                    {formatPrice(item.price * item.quantity, currency)}
                                  </span>
                                </div>
                              ))}
                              <div className="border-t border-dashed border-gray-200 pt-2 flex justify-between">
                                <span className="text-xs font-bold text-gray-800">Total</span>
                                <span className="text-xs font-bold text-gray-800">{formatPrice(order.total, currency)}</span>
                              </div>
                              {order.payment && (
                                <p className="text-[10px] text-gray-400">
                                  Paid via {order.payment.method}
                                </p>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
