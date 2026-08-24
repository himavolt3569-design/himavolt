/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element, react-hooks/exhaustive-deps, @typescript-eslint/no-unused-vars */
"use client";

import { Suspense, useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

import {
  ArrowLeft,
  Search,
  Star,
  Clock,
  Phone,
  Plus,
  Minus,
  ShoppingBag,
  Check,
  X,
  Flame,
  Sparkles,
  Leaf,
  Egg,
  ChevronRight,
  Loader2,
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
  Gift,
  SlidersHorizontal,
  ChevronUp,
  User as UserIcon,
  CheckCircle,
  Mail,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/context/ToastContext";
import { useOrder } from "@/context/OrderContext";
import { apiFetch } from "@/lib/api-client";
// GSAP is heavy (~98 KB gzip) and only needed for two small button/price
// bounce animations. Import it dynamically the first time those animations
// fire so it never lands in the initial menu-page bundle.
let _gsapPromise: Promise<typeof import("gsap").default> | null = null;
function loadGsap() {
  if (!_gsapPromise) {
    _gsapPromise = import("gsap").then((m: any) => m.default);
  }
  return _gsapPromise;
}
import Link from "next/link";
import { rememberIntendedRole } from "@/lib/intended-role";
import type { PopupMenuItem } from "@/components/food/FoodDetailPopup";
import OrderPlacedPopup from "@/components/checkout/OrderPlacedPopup";
import CartSidebar from "@/components/cart/CartSidebar";
import FoodSlider from "@/components/menu/FoodSlider";
import MenuStories from "@/components/stories/MenuStories";
import SaveHeart from "@/components/shared/SaveHeart";

import dynamic from "next/dynamic";
const TrackOrderModal = dynamic(
  () => import("@/components/tracking/TrackOrderModal"),
  { ssr: false },
);
const FoodDetailPopup = dynamic(
  () => import("@/components/food/FoodDetailPopup"),
  { ssr: false },
);

const ComboDetailPopup = dynamic(
  () => import("@/components/food/ComboDetailPopup"),
  { ssr: false },
);
const ComboCoverCollage = dynamic(
  () => import("@/components/food/ComboCoverCollage"),
  { ssr: false },
);
const CheckoutSheet = dynamic(
  () => import("@/components/checkout/CheckoutSheet"),
  { ssr: false },
);
const ScrollStorySection = dynamic(
  () => import("@/components/three/ScrollStorySection"),
  { ssr: false },
);
const ChatWidget = dynamic(() => import("@/components/chat/ChatWidget"), {
  ssr: false,
});
import { formatPrice } from "@/lib/currency";
import OfferCountdown from "@/components/menu/OfferCountdown";
import TableSessionBanner from "@/components/menu/TableSessionBanner";
import DisplayCounterView from "@/components/menu/DisplayCounterView";
import { isFeatureAvailable } from "@/lib/restaurant-types";
import GetBillButton from "@/components/menu/GetBillButton";
import HotelRoomsPanel from "@/components/menu/HotelRoomsPanel";
import { useTableSession } from "@/hooks/useTableSession";
import { setActiveTableSession } from "@/hooks/useActiveTableSession";
import LiveOrderWidget from "@/components/orders/LiveOrderWidget";
const PLACEHOLDER_IMG =
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80";

const stripEmojis = (str?: string) => {
  if (!str) return "";
  return str
    .replace(
      /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g,
      "",
    )
    .trim();
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
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  fontFamily: string | null;
  menuLayout: string;
  footerText: string | null;
  showStories: boolean;
  showReviews: boolean;
  featuresEnabled?: string[];
  featuresDisabled?: string[];
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
  spiceLevel?: number;
}

interface ComboMealItem {
  id: string;
  name: string;
  quantity: number;
  menuItemId: string | null;
  menuItem: {
    id: string;
    name: string;
    imageUrl: string | null;
    price: number;
    isAvailable: boolean;
  } | null;
}

interface ComboMeal {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  comboPrice: number;
  originalPrice: number;
  items: ComboMealItem[];
  choiceGroups: any[];
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

function WifiBadge({
  name,
  password,
}: {
  name: string;
  password: string | null;
}) {
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
            initial={{ opacity: 0, scale: 0.97, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -4 }}
            transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
            className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-[var(--canvas)] shadow-xl ring-1 ring-[var(--border)] p-4 z-50"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50">
                <Wifi className="h-4 w-4 text-blue-500" />
              </div>
              <span className="text-xs font-bold text-[var(--text-2)]">
                WiFi Details
              </span>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-[10px] text-[var(--text-3)] font-semibold uppercase tracking-wider">
                  Network
                </p>
                <p className="text-sm font-bold text-[var(--text-1)]">{name}</p>
              </div>
              {password ? (
                <div>
                  <p className="text-[10px] text-[var(--text-3)] font-semibold uppercase tracking-wider">
                    Password
                  </p>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-sm font-mono font-bold text-[var(--text-1)]">
                      {password}
                    </p>
                    <button
                      onClick={copy}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--text-3)] hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      {copied ? (
                        <Check className="h-3.5 w-3.5 text-[var(--accent-hover)]" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[var(--text-3)]">
                  Open network, no password needed
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PaymentQRBadge({
  paymentQRs,
}: {
  paymentQRs?: { id: string; label: string; imageUrl: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTimeout(() => setMounted(true), 0);
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

      {mounted &&
        typeof document !== "undefined" &&
        createPortal(
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
                  initial={{ opacity: 0, scale: 0.97, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97, y: 20 }}
                  transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  className="fixed left-1/2 top-1/2 z-[9999] w-[90%] max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl bg-[var(--canvas)] shadow-2xl"
                >
                  <div className="flex items-center justify-between border-b border-[var(--border-soft)] p-4">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-50">
                        <QrCode className="h-4 w-4 text-purple-600" />
                      </div>
                      <h3 className="font-bold text-[var(--text-1)]">
                        Scan to Pay
                      </h3>
                    </div>
                    <button
                      onClick={() => setOpen(false)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--text-2)] hover:bg-[var(--surface-alt)] transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="max-h-[70vh] overflow-y-auto p-5 space-y-6">
                    {paymentQRs.map((qr) => (
                      <div
                        key={qr.id}
                        className="text-center flex flex-col items-center"
                      >
                        <p className="mb-3 text-sm font-bold text-[var(--text-2)]">
                          {qr.label}
                        </p>
                        <div className="w-full max-w-[280px] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--canvas)] p-2 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
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
          document.body,
        )}
    </>
  );
}

function VegIcon() {
  return (
    <span className="flex h-4 w-4 items-center justify-center rounded-sm border border-green-600">
      <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
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

function dishToPopupItem(
  dish: MenuItem,
  restaurant: Restaurant,
): PopupMenuItem {
  return {
    id: dish.id,
    name: dish.name,
    description: dish.description,
    price: dish.price,
    imageUrl: dish.imageUrl,
    rating: dish.rating,
    prepTime: dish.prepTime,
    isVeg: dish.isVeg,
    hasEgg: dish.hasEgg,
    hasOnionGarlic: dish.hasOnionGarlic,
    isAvailable: dish.isAvailable,
    badge: dish.badge,
    tags: dish.tags,
    discount: dish.discount,
    discountLabel: dish.discountLabel,
    isFeatured: dish.isFeatured,
    offerExpiresAt: dish.offerExpiresAt,
    offerStartedAt: dish.offerStartedAt,
    calories: dish.calories,
    allergens: dish.allergens,
    spiceLevel: dish.spiceLevel,
    isDrink: dish.isDrink,
    drinkCategory: dish.drinkCategory,
    restaurantId: restaurant.id,
    restaurant: {
      id: restaurant.id,
      name: restaurant.name,
      slug: restaurant.slug,
      phone: restaurant.phone,
      address: restaurant.address,
      imageUrl: restaurant.imageUrl,
      currency: restaurant.currency,
    },
    category: dish.category ?? { name: "", slug: "" },
    sizes: dish.sizes,
    addOns: dish.addOns,
  };
}

function ComboDealCard({
  combo,
  restaurantId,
  restaurantSlug,
  currency,
  surgeMultiplier = 1,
  onSelectCombo,
}: {
  combo: ComboMeal;
  restaurantId: string;
  restaurantSlug: string;
  currency: string;
  surgeMultiplier?: number;
  onSelectCombo: (combo: ComboMeal) => void;
}) {
  const { addItem } = useCart();
  const { showToast } = useToast();

  const effectivePrice = Math.round(combo.comboPrice * surgeMultiplier);
  const savings = Math.round(combo.originalPrice - combo.comboPrice);

  const handleAddAll = () => {
    onSelectCombo(combo);
  };

  const itemImages = combo.items
    .map((item: any) => item.menuItem?.imageUrl)
    .filter(Boolean);

  const hasImage = combo.imageUrl || itemImages.length > 0;

  return (
    <div className="flex-shrink-0 w-64 rounded-2xl border border-[var(--border-soft)] bg-[var(--canvas)] shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
      {hasImage && (
        <div className="h-32 w-full overflow-hidden bg-[var(--surface)]">
          {combo.imageUrl ? (
            <img
              src={combo.imageUrl}
              alt={combo.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <ComboCoverCollage images={itemImages} alt={combo.name} />
          )}
        </div>
      )}
      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-bold text-[var(--text-1)] leading-tight">
            {combo.name}
          </h3>
          {savings > 0 && (
            <span className="flex-shrink-0 rounded-full bg-[var(--accent-muted)] px-2 py-0.5 text-[10px] font-bold text-[var(--accent-text)]">
              Save {formatPrice(savings, currency)}
            </span>
          )}
        </div>
        {combo.description && (
          <p className="text-[11px] text-[var(--text-3)] line-clamp-2">
            {combo.description}
          </p>
        )}
        <div className="flex flex-wrap gap-1">
          {combo.items.map((ci) => (
            <span
              key={ci.id}
              className="rounded-full bg-[var(--accent-muted)] px-2 py-0.5 text-[10px] font-semibold text-[var(--accent-text)]"
            >
              {ci.quantity > 1 ? `${ci.quantity}× ` : ""}
              {ci.name}
            </span>
          ))}
        </div>
        <div className="flex items-center justify-between pt-1">
          <div>
            <span className="text-sm font-extrabold text-[var(--text-1)]">
              {formatPrice(effectivePrice, currency)}
            </span>
            {combo.originalPrice > combo.comboPrice && (
              <span className="ml-1.5 text-[11px] text-[var(--text-3)] line-through">
                {formatPrice(
                  Math.round(combo.originalPrice * surgeMultiplier),
                  currency,
                )}
              </span>
            )}
          </div>
          <button
            onClick={handleAddAll}
            className="flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-3 py-2 text-[11px] font-bold text-white hover:bg-[var(--accent-hover)] transition-colors"
          >
            <Plus className="h-3 w-3" strokeWidth={3} />
            {combo.choiceGroups && combo.choiceGroups.length > 0 ? "Select" : "Add"}
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
  const { addItem, getItemQty, increaseQty, decreaseQty } = useCart();
  const { showToast } = useToast();
  const qty = getItemQty(item.id);
  const basePriceWithDiscount =
    item.discount > 0 ? item.price * (1 - item.discount / 100) : item.price;
  const displayPrice = Math.round(basePriceWithDiscount * surgeMultiplier);
  const originalDisplayPrice = Math.round(item.price * surgeMultiplier);

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
  };

  let itemAccent = "#eaa94d";
  if (item.isDrink) itemAccent = "#3b82f6";
  else if (item.isVeg) itemAccent = "#16a34a";
  else if (!item.isVeg) itemAccent = "#ef4444";

  return (
    <div
      onClick={() => onSelect(item)}
      className="group relative flex justify-between gap-4 py-3.5 border-b border-[var(--border-soft)]/60 cursor-pointer hover:bg-[var(--canvas-sub)]/50 transition-colors px-4 -mx-4 sm:px-6 sm:-mx-6"
      style={{ "--item-accent": itemAccent } as React.CSSProperties}
    >
      {/* Left Content (Text) */}
      <div className="flex flex-1 flex-col justify-start min-w-0 pr-2 pt-0.5">
        <div className="flex items-center gap-1.5 mb-1.5">
          {!item.isDrink && (item.isVeg ? <VegIcon /> : <NonVegIcon />)}
          {item.hasEgg && <Egg className="h-3 w-3 text-yellow-500" />}
          {item.badge && (
            <span
              className={`rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white shadow-sm ${
                item.badge === "Bestseller"
                  ? "bg-gradient-to-r from-amber-500 to-orange-500"
                  : "bg-gradient-to-r from-purple-500 to-indigo-500"
              }`}
            >
              {item.badge === "Bestseller" ? "Bestseller" : item.badge}
            </span>
          )}
        </div>

        <h3
          className="text-[15px] sm:text-[16px] font-black text-[var(--text-1)] mb-0.5 leading-tight tracking-tight"
          style={{ fontFamily: "var(--font-poppins)" }}
        >
          {stripEmojis(item.name)}
        </h3>

        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[14px] font-extrabold text-[var(--text-1)] tracking-tight">
            {formatPrice(displayPrice, restaurantCurrency)}
          </span>
          {originalDisplayPrice !== displayPrice && (
            <span className="text-[11px] font-medium text-[var(--text-3)] line-through">
              {formatPrice(originalDisplayPrice, restaurantCurrency)}
            </span>
          )}
        </div>

        {item.rating > 0 && (
          <div className="flex items-center gap-1 mb-1.5">
            <Star className="h-3 w-3 fill-[var(--item-accent)] text-[var(--item-accent)]" />
            <span className="text-[11px] font-black text-[var(--item-accent)]">
              {item.rating.toFixed(1)}
            </span>
            <span className="text-[11px] font-medium text-[var(--text-3)]">
              (24+)
            </span>
          </div>
        )}

        <p className="text-[12px] font-light text-[var(--text-3)] line-clamp-2 leading-snug mt-0.5">
          {item.description}
        </p>
      </div>

      {/* Right Content (Image & Add Button) */}
      <div className="relative shrink-0 flex flex-col items-center justify-start pb-4">
        {item.imageUrl ? (
          <div className="h-[96px] w-[104px] rounded-[16px] overflow-hidden bg-[var(--canvas-sub)] shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-[var(--border-soft)]/80">
            <img
              src={img(item.imageUrl)}
              alt={item.name}
              loading="lazy"
              className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
          </div>
        ) : (
          <div className="h-[96px] w-[104px] rounded-[16px] bg-[var(--canvas-sub)] border border-[var(--border-soft)]/80 flex flex-col items-center justify-center text-[var(--text-3)] shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
            <Utensils className="h-6 w-6 mb-1 opacity-40" />
          </div>
        )}

        <div
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-[86px]"
          onClick={(e) => e.stopPropagation()}
        >
          {qty === 0 ? (
            <button
              onClick={handleQuickAdd}
              className="w-full flex items-center justify-center rounded-xl bg-[var(--surface)] border border-[var(--border)] py-1.5 text-[12px] font-black text-[var(--item-accent)] shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md hover:-translate-y-0.5 transition-all uppercase tracking-wide"
            >
              Add
            </button>
          ) : (
            <div
              className="w-full flex items-center justify-between rounded-xl bg-[var(--surface)] border border-[var(--item-accent)] py-1 px-1.5 text-[13px] font-black text-[var(--item-accent)] shadow-[0_2px_8px_var(--item-accent)]"
              style={{ boxShadow: "0 2px 8px var(--item-accent)" }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  decreaseQty(item.id);
                }}
                className="flex h-6 w-6 items-center justify-center text-lg hover:bg-[var(--surface-alt)] rounded-lg active:scale-95 transition-all"
              >
                −
              </button>
              <span>{qty}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  increaseQty(item.id);
                }}
                className="flex h-6 w-6 items-center justify-center text-lg hover:bg-[var(--surface-alt)] rounded-lg active:scale-95 transition-all"
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
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
      const target = priceRef.current;
      loadGsap().then((gsap) => {
        gsap.fromTo(
          target,
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, ease: "back.out(2)" },
        );
      });
    }
  }, [dish.id]);

  return (
    <motion.div
      onClick={() => onSelect(dish)}
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
      whileHover={{ y: -4, boxShadow: "0 12px 30px rgba(0,0,0,0.1)" }}
      className="relative overflow-hidden rounded-2xl bg-[var(--canvas)] border border-[var(--border-soft)] cursor-pointer group shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
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
              <span className="flex h-4 w-4 items-center justify-center rounded-sm border border-[var(--accent)]">
                <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
              </span>
            ) : (
              <span className="flex h-4 w-4 items-center justify-center rounded-sm border border-red-400">
                <span className="h-2 w-2 rounded-full bg-red-400" />
              </span>
            )}
            {dish.badge && (
              <span className="rounded-full bg-[var(--accent)] px-2.5 py-0.5 text-[10px] font-bold text-white">
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
            className="mt-1.5 inline-block text-xl font-extrabold text-[var(--accent)]"
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
      whileTap={{ scale: 0.97 }}
      animate={active ? { scale: 1 } : { scale: 1 }}
      transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
      className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-[11px] font-extrabold tracking-wide transition-all border ${
        active
          ? "bg-[#e8f6f0] border-[#1ba672] text-[#1ba672] shadow-sm"
          : "bg-[var(--surface)] text-[var(--text-2)] border-[var(--border)] hover:border-[var(--border)] shadow-sm"
      }`}
    >
      {icon}
      <span>{label}</span>
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
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--canvas)] shadow-[0_2px_16px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-soft)]">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-4 w-4 text-[var(--accent)]" />
          <h3 className="text-sm font-bold text-[var(--text-1)]">Your Order</h3>
        </div>
        {totalItems > 0 && (
          <span className="rounded-full bg-[var(--accent-muted)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--accent)]">
            {totalItems} items
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <ShoppingBag className="mx-auto h-8 w-8 text-[var(--text-3)] mb-2" />
          <p className="text-xs font-medium text-[var(--text-3)]">
            Your cart is empty
          </p>
          <p className="text-[11px] text-[var(--text-3)] mt-0.5">
            Add dishes from the menu
          </p>
        </div>
      ) : (
        <>
          <div className="max-h-[320px] overflow-y-auto px-5 py-3 space-y-1">
            {items.map((item: any) => (
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
                  <h2 className="text-xl font-black text-[var(--text-1)] leading-tight">
                    {stripEmojis(item.name)}
                  </h2>
                  <p className="text-xs font-semibold text-[var(--accent)]">
                    {formatPrice(item.price * item.quantity, currency)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => decreaseQty(item.id)}
                    className="flex h-6 w-6 items-center justify-center rounded-md border border-[var(--border)] text-[var(--text-3)] hover:bg-[var(--canvas-sub)] text-xs"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-5 text-center text-[11px] font-bold">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => increaseQty(item.id)}
                    className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--accent)] text-white text-xs"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-[var(--border-soft)] px-5 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--text-2)]">
                Subtotal
              </span>
              <span className="text-sm font-bold text-[var(--text-1)]">
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
              className="relative w-full rounded-xl bg-[var(--accent)] py-3.5 text-sm font-bold text-white overflow-hidden shadow-md shadow-[var(--accent)]/25"
            >
              <span className="relative z-[1]">Proceed to Order</span>
            </motion.button>
          </div>
        </>
      )}
    </div>
  );
}
const TIME_SLOTS = [
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
  "20:00",
  "20:30",
  "21:00",
];

function InlineReservationForm({ slug }: { slug: string }) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    guestName: "",
    phone: "",
    email: "",
    partySize: 2,
    date: today,
    timeSlot: "19:00",
    specialRequests: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState<null | {
    id: string;
    date: string;
    timeSlot: string;
  }>(null);
  const [error, setError] = useState<string | null>(null);
  const [bookedSlots, setBookedSlots] = useState<Record<string, number>>({});
  const [tableCount, setTableCount] = useState<number>(10);

  useEffect(() => {
    if (!slug || !form.date) return;
    apiFetch<{ bookedSlots: Record<string, number>; tableCount: number }>(
      `/api/public/restaurants/${slug}/reservations?date=${form.date}`,
    )
      .then((res) => {
        setBookedSlots(res.bookedSlots || {});
        setTableCount(res.tableCount || 10);
      })
      .catch(() => {});
  }, [slug, form.date]);

  const handleSubmit = async () => {
    if (!form.guestName.trim() || !form.phone.trim()) {
      setError("Name and phone are required");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch<{
        id: string;
        date: string;
        timeSlot: string;
      }>(`/api/public/restaurants/${slug}/reservations`, {
        method: "POST",
        body: form,
      });
      setConfirmed(res);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not submit reservation",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmed) {
    return (
      <div className="flex items-center justify-center py-10 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md rounded-2xl bg-[var(--surface)] border border-[var(--border-soft)] p-8 shadow-sm text-center"
        >
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-xl font-bold text-[var(--text-1)] mb-2">
            Reservation Requested
          </h1>
          <p className="text-sm text-[var(--text-3)] mb-6">
            We&apos;ve received your request for{" "}
            <span className="font-semibold">
              {new Date(confirmed.date).toLocaleDateString()}
            </span>{" "}
            at <span className="font-semibold">{confirmed.timeSlot}</span>. The
            restaurant will confirm shortly.
          </p>
          <button
            onClick={() => setConfirmed(null)}
            className="inline-block w-full rounded-xl bg-[#1ba672] py-3 text-sm font-bold text-white shadow-sm"
          >
            Make Another Reservation
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto py-6 space-y-5">
      <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-5 sm:p-6 space-y-5 shadow-sm">
        <div>
          <label className="text-xs font-semibold text-[var(--text-2)] mb-1.5 flex items-center gap-1.5">
            <UserIcon className="h-3.5 w-3.5" />
            Your Name
          </label>
          <input
            type="text"
            value={form.guestName}
            onChange={(e) => setForm({ ...form, guestName: e.target.value })}
            placeholder="Full name"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] px-4 py-3 text-sm text-[var(--text-1)] focus:outline-none focus:border-[#1ba672] focus:ring-1 focus:ring-[#1ba672]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-[var(--text-2)] mb-1.5 flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" />
              Phone
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) =>
                setForm({
                  ...form,
                  phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                })
              }
              placeholder="98XXXXXXXX"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] px-4 py-3 text-sm text-[var(--text-1)] focus:outline-none focus:border-[#1ba672] focus:ring-1 focus:ring-[#1ba672]"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--text-2)] mb-1.5 flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              Email (optional)
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] px-4 py-3 text-sm text-[var(--text-1)] focus:outline-none focus:border-[#1ba672] focus:ring-1 focus:ring-[#1ba672]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-[var(--text-2)] mb-1.5 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Date
            </label>
            <input
              type="date"
              min={today}
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] px-4 py-3 text-sm text-[var(--text-1)] focus:outline-none focus:border-[#1ba672] focus:ring-1 focus:ring-[#1ba672]"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--text-2)] mb-1.5 flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Party Size
            </label>
            <input
              type="number"
              min={1}
              max={20}
              value={form.partySize}
              onChange={(e) =>
                setForm({
                  ...form,
                  partySize: parseInt(e.target.value, 10) || 1,
                })
              }
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] px-4 py-3 text-sm text-[var(--text-1)] focus:outline-none focus:border-[#1ba672] focus:ring-1 focus:ring-[#1ba672]"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-[var(--text-2)] mb-2 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Time Slot
          </label>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {TIME_SLOTS.map((slot) => {
              const booked = bookedSlots[slot] || 0;
              const full = booked >= tableCount;
              const active = form.timeSlot === slot;
              return (
                <button
                  key={slot}
                  onClick={() => !full && setForm({ ...form, timeSlot: slot })}
                  disabled={full}
                  className={`rounded-xl border px-2 py-2 text-xs font-semibold transition-all ${
                    active
                      ? "bg-[#1ba672] text-white border-[#1ba672] shadow-sm"
                      : full
                        ? "bg-[var(--surface-alt)] text-[var(--text-3)] border-[var(--border)] cursor-not-allowed line-through"
                        : "bg-[var(--surface)] text-[var(--text-2)] border-[var(--border)] hover:border-[#1ba672]"
                  }`}
                >
                  {slot}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-[var(--text-2)] mb-1.5 block">
            Special Requests (optional)
          </label>
          <textarea
            value={form.specialRequests}
            onChange={(e) =>
              setForm({ ...form, specialRequests: e.target.value })
            }
            placeholder="Dietary needs, occasion..."
            rows={3}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] px-4 py-3 text-sm text-[var(--text-1)] focus:outline-none focus:border-[#1ba672] focus:ring-1 focus:ring-[#1ba672] resize-none"
          />
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#1ba672] py-4 text-sm font-bold text-white shadow-md shadow-[#1ba672]/20 hover:bg-[#158f60] transition-colors disabled:opacity-50"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            "Request Reservation"
          )}
        </button>
      </div>
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
  const router = useRouter();
  const slug = params.slug;
  const qrToken = searchParams.get("t") || null;
  const urlTableNo = searchParams.get("table")
    ? Number(searchParams.get("table"))
    : null;
  const roomNo = searchParams.get("room") || null;
  const addToOrderId = searchParams.get("addTo") || null;

  // Server-prefetched + hydrated by page.tsx (HydrationBoundary) — a fresh
  // QR-scan visitor gets restaurant + menu on first paint, no client fetch,
  // no spinner. Client-side slug navigation re-runs the Server Component too
  // (dynamic route param), so this stays true on in-app navigation as well.
  const restaurantQuery = useQuery({
    queryKey: ["restaurant", slug],
    queryFn: () => apiFetch<Restaurant>(`/api/public/restaurants/${slug}`),
    enabled: !!slug,
  });
  const restaurant = restaurantQuery.data ?? null;
  const menuQuery = useQuery({
    queryKey: ["menu", slug],
    queryFn: () => apiFetch<MenuItem[]>(`/api/public/restaurants/${slug}/menu`),
    enabled: !!slug,
  });
  const menuItems = menuQuery.data ?? [];
  // Matches the old semantics: block only on the restaurant resolving; menu
  // items stream in whenever their own query settles.
  const loading = restaurantQuery.isLoading;
  const loadError = restaurantQuery.error;
  const error = loadError
    ? loadError instanceof Error
      ? loadError.message
      : "Failed to load restaurant"
    : null;

  const [activeTab, setActiveTab] = useState<"menu" | "reserve" | "rooms">(
    "menu",
  );
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [activeSubCategory, setActiveSubCategory] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDish, setSelectedDish] = useState<MenuItem | null>(null);
  const [selectedCombo, setSelectedCombo] = useState<ComboMeal | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showOrderPlaced, setShowOrderPlaced] = useState(false);
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [lastTrackToken, setLastTrackToken] = useState<string | null>(null);
  const [filterVeg, setFilterVeg] = useState(false);
  const { isSignedIn } = useAuth();
  const [filterNonVeg, setFilterNonVeg] = useState(false);
  const [filterEgg, setFilterEgg] = useState(false);
  const [filterNoOnionGarlic, setFilterNoOnionGarlic] = useState(false);
  const [filterBestseller, setFilterBestseller] = useState(false);
  const [filterDrinks, setFilterDrinks] = useState(false);
  const [showRooms, setShowRooms] = useState(false);
  const [hasCoupons, setHasCoupons] = useState(false);

  // The rest of these used to chain behind the restaurant fetch resolving
  // (`.then()` after `rest`); each is now its own query firing in parallel
  // with restaurant/menu, so its section renders as soon as it settles
  // instead of waiting on a waterfall.
  const roomsQuery = useQuery({
    queryKey: ["rooms", slug],
    queryFn: () => apiFetch<Room[]>(`/api/public/restaurants/${slug}/rooms`),
    enabled:
      !!restaurant &&
      ["HOTEL", "RESORT", "GUEST_HOUSE"].includes(restaurant.type),
  });
  const rooms = roomsQuery.data ?? [];

  const comboMealsQuery = useQuery({
    queryKey: ["combo-meals", slug],
    queryFn: () =>
      apiFetch<ComboMeal[]>(`/api/public/restaurants/${slug}/combo-meals`),
    enabled: !!slug,
  });
  const comboMeals = comboMealsQuery.data ?? [];

  const rushHourQuery = useQuery({
    queryKey: ["rush-hour", slug],
    queryFn: () =>
      apiFetch<RushHourData>(`/api/public/restaurants/${slug}/rush-hour`),
    enabled: !!slug,
  });
  const rushHour = rushHourQuery.data ?? {
    isEnabled: false,
    isRushNow: false,
    surgeEnabled: false,
    surgePercent: 0,
  };

  const specialsQuery = useQuery({
    queryKey: ["specials", slug],
    queryFn: () =>
      apiFetch<{ specials: MenuItem[] }>(
        `/api/public/restaurants/${slug}/specials`,
      ),
    enabled: !!slug,
  });
  const specials = specialsQuery.data?.specials ?? [];

  const happyHoursQuery = useQuery({
    queryKey: ["happy-hours", slug],
    queryFn: () =>
      apiFetch<{
        isHappyNow: boolean;
        activeHours: Array<{
          name: string;
          endTime: string;
          discountType: string;
          discountValue: number;
        }>;
      }>(`/api/public/restaurants/${slug}/happy-hours`),
    enabled: !!slug,
  });
  const happyHourActive: {
    isHappyNow: boolean;
    name?: string;
    endTime?: string;
    discountType?: string;
    discountValue?: number;
  } = (() => {
    const h = happyHoursQuery.data;
    if (h?.isHappyNow && h.activeHours[0]) {
      return {
        isHappyNow: true,
        name: h.activeHours[0].name,
        endTime: h.activeHours[0].endTime,
        discountType: h.activeHours[0].discountType,
        discountValue: h.activeHours[0].discountValue,
      };
    }
    return { isHappyNow: false };
  })();
  const [loyaltyInfo, setLoyaltyInfo] = useState<{
    enabled: boolean;
    pointsPerCurrency: number;
  }>({ enabled: false, pointsPerCurrency: 1 });
  const tabsRef = useRef<HTMLDivElement>(null);
  const { totalItems, items, subtotal, initForRestaurant } = useCart();
  const { activeOrder, restoreOrder, restoreFromStorage } = useOrder();

  const restaurantId = restaurant?.id ?? null;
  const cur = restaurant?.currency ?? "NPR";

  useEffect(() => {
    if (restaurantId && restaurant?.slug && restaurant?.currency) {
      initForRestaurant(restaurantId, restaurant.slug, restaurant.currency);
    }
  }, [restaurantId]);

  // Prefetch the checkout/food-detail chunks on the first sign of real
  // ordering intent (opening a dish, opening the cart, or adding an item)
  // rather than a fixed idle timer — a customer who moves faster than 1.5s
  // no longer eats that chunk's load time right when they open it.
  const prefetchedOrderingChunks = useRef(false);
  useEffect(() => {
    if (totalItems > 0 || cartOpen || selectedDish || selectedCombo) {
      import("@/components/cart/CartSidebar");
      import("@/components/food/FoodDetailPopup");
      import("@/components/food/ComboDetailPopup");
      import("@/components/checkout/CheckoutSheet");
    }
  }, [totalItems, cartOpen, selectedDish, selectedCombo]);

  const surgeMultiplier =
    rushHour.isRushNow && rushHour.surgeEnabled
      ? 1 + rushHour.surgePercent / 100
      : 1;

  // Independent of the restaurant/menu queries above — only needs slug.
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    apiFetch<{ valid: boolean }>(
      `/api/public/restaurants/${slug}/coupons/validate`,
      {
        method: "POST",
        body: { code: "__CHECK__", orderTotal: 0 },
      },
    ).catch((err) => {
      if (
        err instanceof Error &&
        !err.message.toLowerCase().includes("not found")
      ) {
        if (!cancelled) setHasCoupons(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const {
    session: tableSession,
    order: sessionOrder,
    hasActiveOrder: hasSessionOrder,
    getBill,
  } = useTableSession(restaurantId, urlTableNo, qrToken);

  const tableNo = tableSession?.tableNo ?? urlTableNo;

  useEffect(() => {
    if (addToOrderId && restaurantId) {
      restoreOrder(restaurantId, addToOrderId);
    }
  }, [addToOrderId, restaurantId, restoreOrder]);

  useEffect(() => {
    if (restaurantId && !activeOrder && !addToOrderId) {
      if (
        sessionOrder &&
        !["ACCEPTED", "REJECTED", "REJECTED"].includes(sessionOrder.status)
      ) {
        restoreOrder(restaurantId, sessionOrder.id);
      } else {
        restoreFromStorage(restaurantId, tableSession?.id ?? undefined);
      }
    }
  }, [
    restaurantId,
    activeOrder,
    addToOrderId,
    sessionOrder,
    tableNo,
    restoreOrder,
    restoreFromStorage,
  ]);

  useEffect(() => {
    if (slug && typeof window !== "undefined") {
      const qs = qrToken ? `?t=${qrToken}` : tableNo ? `?table=${tableNo}` : "";
      localStorage.setItem("hh_last_menu", `/menu/${slug}${qs}`);

      if (tableNo && restaurantId) {
        setActiveTableSession({ restaurantSlug: slug, tableNo, restaurantId });
      }
    }
  }, [slug, tableNo, qrToken, restaurantId]);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    fetch(`/api/public/restaurants/${slug}/rewards`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        setLoyaltyInfo({
          enabled: Boolean(d.loyaltyEnabled),
          pointsPerCurrency: Number(d.pointsPerCurrency ?? 1),
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const handleProceedToCheckout = useCallback(() => {
    setCartOpen(false);
    setCheckoutOpen(true);
  }, []);

  const freshOrderIdRef = useRef<string | null>(null);

  const handleOrderPlaced = useCallback(
    (orderId: string, trackToken?: string | null) => {
      freshOrderIdRef.current = orderId;
      localStorage.setItem(`hh_tracking_${slug}`, "1");
      setLastTrackToken(trackToken ?? null);
      setCheckoutOpen(false);
      setShowOrderPlaced(true);
    },
    [slug],
  );

  const allCategories = restaurant?.categories ?? [];
  const categories = allCategories.filter((c: any) => !c.parentId);
  const activeParentCat = categories.find(
    (c: any) => c.name === activeCategory,
  );
  const subCategories = activeParentCat
    ? allCategories.filter((c: any) => c.parentId === activeParentCat.id)
    : [];

  const filteredItems = menuItems.filter((item: any) => {
    if (!item.isAvailable) return false;
    if (activeCategory) {
      if (activeSubCategory) {
        if (item.category.name !== activeSubCategory) return false;
      } else {
        const childCatNames = subCategories.map((c: any) => c.name);
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
        !item.tags.some((t: any) => t.toLowerCase().includes(q))
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

  const smartSorted = [...filteredItems].sort((a, b) => {
    // 1. Highest Priority: Content richness
    const aHasImg = !!a.imageUrl;
    const aHasDesc = !!(a.description && a.description.trim().length > 0);
    const bHasImg = !!b.imageUrl;
    const bHasDesc = !!(b.description && b.description.trim().length > 0);
    
    // Score: 3 = Both, 2 = Image only, 1 = Description only, 0 = Neither
    const aScore = (aHasImg ? 2 : 0) + (aHasDesc ? 1 : 0);
    const bScore = (bHasImg ? 2 : 0) + (bHasDesc ? 1 : 0);
    
    if (aScore !== bScore) return bScore - aScore;

    // 2. Featured items
    if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
    
    // 3. Discounted items
    if (a.discount > 0 !== b.discount > 0) return a.discount > 0 ? -1 : 1;
    
    // 4. Bestsellers
    const aBS = a.badge === "Bestseller" ? 1 : 0;
    const bBS = b.badge === "Bestseller" ? 1 : 0;
    if (aBS !== bBS) return bBS - aBS;

    if (a.rating !== b.rating) return b.rating - a.rating;
    return a.sortOrder - b.sortOrder;
  });

  const renderedItemIds = new Set<string>();
  const categoryGroups = categories
    .map((cat: any) => {
      const childIds = allCategories
        .filter((c: any) => c.parentId === cat.id)
        .map((c: any) => c.id);
      const catItems = smartSorted.filter(
        (item: any) =>
          item.categoryId === cat.id || childIds.includes(item.categoryId),
      );
      catItems.forEach((i: any) => renderedItemIds.add(i.id));
      return { cat, items: catItems };
    })
    .filter((group: any) => group.items.length > 0);
  const otherItems = smartSorted.filter(
    (item: any) => !renderedItemIds.has(item.id),
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--canvas-sub)]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
          <p className="text-sm text-[var(--text-3)]">Loading menu...</p>
        </div>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--canvas-sub)] p-6">
        <div className="text-center max-w-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 mb-4">
            <X className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-[var(--text-1)] mb-1">
            Restaurant not found
          </h2>
          <p className="text-sm text-[var(--text-2)] mb-6">
            {error ||
              "We couldn't find the restaurant you&apos;re looking for."}
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--text-1)] px-6 py-3 text-sm font-bold text-[var(--canvas)] hover:bg-[#733e1b] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const themeStyle: React.CSSProperties = {
    ...(restaurant.primaryColor
      ? ({ "--menu-primary": restaurant.primaryColor } as React.CSSProperties)
      : {}),
    ...(restaurant.secondaryColor
      ? ({
          "--menu-secondary": restaurant.secondaryColor,
        } as React.CSSProperties)
      : {}),
    ...(restaurant.accentColor
      ? ({ "--menu-accent": restaurant.accentColor } as React.CSSProperties)
      : {}),
    fontFamily: "var(--font-poppins), sans-serif",
  };

  return (
    <div
      className="min-h-screen bg-[var(--canvas-sub)] flex justify-center w-full"
      style={themeStyle}
    >
      <div className="w-full max-w-5xl bg-[var(--canvas)] min-h-screen shadow-[0_0_40px_rgba(0,0,0,0.03)] relative flex flex-col">
        {restaurant.coverUrl && (
          <div className="relative w-full h-[180px] sm:h-[240px] md:h-[280px] shrink-0">
            <img
              src={restaurant.coverUrl}
              alt="Cover"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

            <div className="absolute bottom-6 left-6 right-6 flex items-end gap-3 sm:gap-4">
              <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-[var(--canvas)] p-1 shadow-lg shrink-0 overflow-hidden">
                <img
                  src={restaurant.imageUrl || PLACEHOLDER_IMG}
                  alt={restaurant.name}
                  className="h-full w-full object-cover rounded-xl"
                />
              </div>
              <div className="flex-1 pb-1">
                <h1 className="text-2xl sm:text-3xl font-black text-white leading-none tracking-tight shadow-black drop-shadow-md">
                  {restaurant.name}
                </h1>
                <div className="mt-2 flex items-center gap-3 text-white/90 text-[10px] sm:text-xs font-semibold">
                  <span className="flex items-center gap-1 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-md text-[var(--accent)]">
                    <Star className="h-3 w-3 text-[var(--accent)] fill-[var(--accent)]" />
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

        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
          className="sticky top-0 z-40 bg-[var(--canvas)]/95 backdrop-blur-3xl shadow-sm border-b border-black/[0.04]"
        >
          <div className="px-4 md:px-6 py-2 sm:py-3">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-alt)] text-[var(--text-2)] hover:bg-[var(--surface-alt)] transition-all shrink-0 shadow-sm"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <h1 className="text-base sm:text-lg font-black text-[var(--text-1)] truncate flex items-center gap-2">
                  {restaurant.name}
                  <span className="rounded bg-[var(--surface-alt)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[var(--text-2)]">
                    {restaurant.type}
                  </span>
                </h1>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--text-3)] mt-0.5">
                  {tableNo ? (
                    <span className="text-[#1ba672] font-extrabold tracking-tight">
                      Table {tableNo}
                    </span>
                  ) : roomNo ? (
                    <span className="text-[#1ba672] font-extrabold tracking-tight">
                      Room {roomNo}
                    </span>
                  ) : (
                    <span className="tracking-tight">Delivery & Takeaway</span>
                  )}
                  <span>•</span>
                  <span className="flex items-center gap-0.5 text-[var(--text-2)]">
                    <Star className="h-3 w-3 fill-[#1ba672] text-[#1ba672]" />
                    {restaurant.rating.toFixed(1)}
                  </span>
                  <span>•</span>
                  <span className="truncate max-w-[120px]">
                    {restaurant.address}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => {
                    if (activeOrder?.trackToken) {
                      router.push(`/order-track/${activeOrder.trackToken}`);
                    } else {
                      setShowTrackModal(true);
                    }
                  }}
                  className="flex items-center gap-2 h-11 px-6 rounded-full bg-[#1ba672] text-white hover:bg-[#168a5d] transition-all border-none font-black text-[15px] shadow-[0_4px_12px_rgba(27,166,114,0.3)]"
                  style={{ fontFamily: "var(--font-poppins)" }}
                  title="Track Order"
                >
                  Track Order
                </button>
                <SaveHeart 
                  type="restaurant" 
                  id={restaurant.id}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--surface-alt)] text-[var(--text-2)] hover:bg-[var(--border-soft)] transition-colors"
                />
                {restaurant.phone && (
                  <a
                    href={`tel:${restaurant.phone}`}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-green-50 text-green-600 hover:bg-green-100 transition-colors border border-green-200"
                    title="Call Restaurant"
                  >
                    <Phone className="h-4 w-4" />
                  </a>
                )}
                {isSignedIn && (
                  <button
                    onClick={() => setShowHistory(true)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--canvas-sub)] text-[var(--text-2)] hover:bg-[var(--surface-alt)] transition-colors border border-[var(--border)]"
                    title="My Order History"
                  >
                    <History className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="mt-3 flex items-center gap-6 overflow-x-auto no-scrollbar border-t border-[var(--border-soft)] pt-2.5 pb-0.5">
              <button
                onClick={() => setActiveTab("menu")}
                className={`whitespace-nowrap pb-1.5 border-b-[3px] text-sm transition-colors ${activeTab === "menu" ? "border-[var(--text-1)] font-black text-[var(--text-1)]" : "border-transparent font-bold text-[var(--text-3)] hover:text-[var(--text-1)]"}`}
              >
                Order Online
              </button>
              {isFeatureAvailable(restaurant.type, "table-reservations", {
                featuresEnabled: restaurant.featuresEnabled,
                featuresDisabled: restaurant.featuresDisabled,
              }) && (
                <button
                  onClick={() => setActiveTab("reserve")}
                  className={`whitespace-nowrap pb-1.5 border-b-[3px] text-sm transition-colors ${activeTab === "reserve" ? "border-[var(--text-1)] font-black text-[var(--text-1)]" : "border-transparent font-bold text-[var(--text-3)] hover:text-[var(--text-1)]"}`}
                >
                  Book a Table
                </button>
              )}
              {isFeatureAvailable(restaurant.type, "hotel-bookings", {
                featuresEnabled: restaurant.featuresEnabled,
                featuresDisabled: restaurant.featuresDisabled,
              }) && (
                <button
                  onClick={() => setActiveTab("rooms")}
                  className={`whitespace-nowrap pb-1.5 border-b-[3px] text-sm transition-colors ${activeTab === "rooms" ? "border-[var(--text-1)] font-black text-[var(--text-1)]" : "border-transparent font-bold text-[var(--text-3)] hover:text-[var(--text-1)]"}`}
                >
                  Rooms
                </button>
              )}
            </div>
          </div>
        </motion.header>

        <div className="relative z-10 flex-1 px-4 md:px-6 pb-24">
          {activeTab === "reserve" ? (
            <InlineReservationForm slug={slug} />
          ) : activeTab === "rooms" ? (
            // The booking experience already exists at /hotel/[slug] with the
            // gallery, room list, reviews and availability calendar. This tab
            // used to be a dead end reading "coming soon", which stranded anyone
            // who came here looking for a room.
            <HotelRoomsPanel slug={slug} name={restaurant.name} />
          ) : (
            <div className="flex flex-col md:flex-row gap-6 py-4 lg:py-6 w-full">
              <div className="flex-1 min-w-0 space-y-5">
                {restaurant.showStories && (
                  <ScrollStorySection fadeIn slideFrom="bottom" scrub={false}>
                    <MenuStories slug={slug} />
                  </ScrollStorySection>
                )}

                {isFeatureAvailable(restaurant.type, "display-counter", {
                  featuresEnabled: restaurant.featuresEnabled,
                  featuresDisabled: restaurant.featuresDisabled,
                }) && (
                  <DisplayCounterView
                    slug={slug}
                    onItemClick={(itemId, itemName) => {
                      const found = menuItems.find(
                        (m: any) =>
                          m.name.toLowerCase() === itemName.toLowerCase(),
                      );
                      if (found) setSelectedDish(found);
                    }}
                  />
                )}

                {hasSessionOrder && sessionOrder && (
                  <TableSessionBanner
                    tableNo={tableNo ?? sessionOrder.tableNo ?? 0}
                    itemCount={sessionOrder.items.reduce(
                      (s, i) => s + i.quantity,
                      0,
                    )}
                    total={sessionOrder.total}
                    status={sessionOrder.status}
                  />
                )}

                <div className="sticky top-[64px] sm:top-[72px] z-30 -mx-4 px-4 md:-ml-6 md:pl-6 md:mr-0 md:pr-0 pt-3 pb-3 bg-[var(--canvas)] space-y-4 shadow-sm border-b border-[var(--border)]">
                  <motion.div
                    className="relative group"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4, delay: 0.1 }}
                  >
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--text-3)]" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search for dishes, cuisines..."
                      className="w-full rounded-2xl bg-[var(--surface)] py-3.5 pl-12 pr-4 text-[15px] font-medium text-[var(--text-1)] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1ba672]/30 transition-all shadow-sm border border-[var(--border-soft)]"
                    />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4, delay: 0.15 }}
                    className="space-y-3"
                  >
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
                          className={`shrink-0 rounded-xl px-5 py-2 text-[13px] font-black tracking-wide transition-all border ${
                            activeCategory === ""
                              ? "bg-[#1ba672] text-white border-[#1ba672] shadow-md shadow-[#1ba672]/20"
                              : "bg-[var(--surface)] text-[var(--text-2)] border-[var(--border)] hover:border-[var(--border)] shadow-sm"
                          }`}
                        >
                          All
                        </button>
                        {categories.map((cat: any) => (
                          <button
                            key={cat.id}
                            onClick={() => {
                              setActiveCategory(
                                cat.name === activeCategory ? "" : cat.name,
                              );
                              setActiveSubCategory("");
                            }}
                            className={`shrink-0 rounded-xl px-5 py-2 text-[13px] font-black tracking-wide transition-all border flex items-center ${
                              activeCategory === cat.name
                                ? "bg-[#1ba672] text-white border-[#1ba672] shadow-md shadow-[#1ba672]/20"
                                : "bg-[var(--surface)] text-[var(--text-2)] border-[var(--border)] hover:border-[var(--border)] shadow-sm"
                            }`}
                          >
                            {stripEmojis(cat.name)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <AnimatePresence>
                      {activeCategory && subCategories.length > 0 && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                          className="overflow-hidden"
                        >
                          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
                            <button
                              onClick={() => setActiveSubCategory("")}
                              className={`shrink-0 rounded-full px-4 py-1.5 text-[10px] font-bold tracking-wide uppercase transition-all ${
                                activeSubCategory === ""
                                  ? "bg-[#1a1a1a] text-white shadow-sm"
                                  : "bg-[var(--canvas)] text-[var(--text-2)] border border-[var(--border)] hover:border-[var(--border)] hover:bg-[var(--canvas-sub)] hover:text-[var(--text-1)]"
                              }`}
                            >
                              All {stripEmojis(activeCategory)}
                            </button>
                            {subCategories.map((sub: any) => (
                              <button
                                key={sub.id}
                                onClick={() =>
                                  setActiveSubCategory(
                                    sub.name === activeSubCategory
                                      ? ""
                                      : sub.name,
                                  )
                                }
                                className={`shrink-0 rounded-full px-4 py-1.5 text-[10px] font-bold tracking-wide uppercase transition-all ${
                                  activeSubCategory === sub.name
                                    ? "bg-[#1a1a1a] text-white shadow-sm"
                                    : "bg-[var(--canvas)] text-[var(--text-2)] border border-[var(--border)] hover:border-[var(--border)] hover:bg-[var(--canvas-sub)] hover:text-[var(--text-1)]"
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

                  <motion.div
                    className="flex items-center justify-between"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4, delay: 0.2 }}
                  >
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className="flex items-center gap-1.5 rounded-xl px-4 py-2 bg-[var(--surface)] text-[var(--text-2)] border border-[var(--border)] hover:bg-[var(--canvas-sub)] shadow-sm text-xs font-black tracking-wide transition-colors"
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                      Filters
                      {showFilters ? (
                        <ChevronUp className="h-3 w-3 ml-1" />
                      ) : (
                        <ChevronDown className="h-3 w-3 ml-1" />
                      )}
                    </button>
                  </motion.div>

                  <AnimatePresence>
                    {showFilters && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="flex flex-wrap gap-2 pt-2 pb-1">
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
                            onClick={() =>
                              setFilterNoOnionGarlic(!filterNoOnionGarlic)
                            }
                            icon={<X className="h-3 w-3" />}
                            label="No Onion-Garlic"
                          />
                          <FilterPill
                            active={filterBestseller}
                            onClick={() =>
                              setFilterBestseller(!filterBestseller)
                            }
                            icon={
                              <span className="text-[10px] font-black">#</span>
                            }
                            label="Bestseller"
                          />
                          {menuItems.some((i: any) => i.isDrink) && (
                            <FilterPill
                              active={filterDrinks}
                              onClick={() => setFilterDrinks(!filterDrinks)}
                              icon={<Wine className="h-3 w-3" />}
                              label="Drinks"
                            />
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {!searchQuery && (
                  <FoodSlider
                    restaurantSlug={slug}
                    onSlideClick={(linkItemId) => {
                      const item = smartSorted.find((d) => d.id === linkItemId);
                      if (item) setSelectedDish(item);
                    }}
                  />
                )}

                {loyaltyInfo.enabled && !isSignedIn && activeTab === "menu" && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  >
                    <Link
                      href="/sign-in"
                      onClick={() => rememberIntendedRole("CUSTOMER")}
                      className="flex items-center gap-3 rounded-2xl bg-[var(--accent-muted)] border border-[var(--accent-border)] px-4 py-3 hover:bg-[var(--surface)] transition-colors"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)] shrink-0">
                        <Gift className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[var(--accent-text)]">
                          Sign up to earn loyalty points
                        </p>
                        <p className="text-[11px] text-[var(--accent)]">
                          Earn {loyaltyInfo.pointsPerCurrency} point
                          {loyaltyInfo.pointsPerCurrency === 1
                            ? ""
                            : "s"} per {cur} on every order
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-[var(--accent)] shrink-0" />
                    </Link>
                  </motion.div>
                )}

                {happyHourActive.isHappyNow &&
                  isFeatureAvailable(restaurant.type, "happy-hours", {
                    featuresEnabled: restaurant.featuresEnabled,
                    featuresDisabled: restaurant.featuresDisabled,
                  }) && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                      className="flex items-center gap-3 rounded-2xl bg-[var(--accent-muted)] border border-[var(--accent-border)] px-4 py-3"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)] shrink-0">
                        <Wine className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[var(--accent-text)]">
                          Happy Hour: {happyHourActive.name}
                        </p>
                        <p className="text-[11px] text-[var(--accent)]">
                          {happyHourActive.discountType === "PERCENTAGE"
                            ? `${happyHourActive.discountValue}% off`
                            : `Rs. ${happyHourActive.discountValue} off`}
                          {happyHourActive.endTime &&
                            ` until ${happyHourActive.endTime}`}
                        </p>
                      </div>
                    </motion.div>
                  )}

                {rushHour.isRushNow &&
                  rushHour.surgeEnabled &&
                  isFeatureAvailable(restaurant.type, "rush-hour", {
                    featuresEnabled: restaurant.featuresEnabled,
                    featuresDisabled: restaurant.featuresDisabled,
                  }) && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                      className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-red-50 to-[var(--accent-hover)] border border-[var(--accent-border)]0/60 px-4 py-3"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)] shrink-0">
                        <Flame className="h-4 w-4 text-[var(--accent)]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[var(--accent)]">
                          Rush Hour Pricing Active
                        </p>
                        <p className="text-[11px] text-[var(--accent)]">
                          Prices +{rushHour.surgePercent}% during peak hours
                        </p>
                      </div>
                    </motion.div>
                  )}

                {comboMeals.length > 0 &&
                  isFeatureAvailable(restaurant.type, "combo-meals", {
                    featuresEnabled: restaurant.featuresEnabled,
                    featuresDisabled: restaurant.featuresDisabled,
                  }) && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ type: "spring", bounce: 0.2, duration: 0.4, delay: 0.1 }}
                      className="space-y-3"
                    >
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-[var(--text-1)]" />
                        <h2 className="text-sm font-bold text-[var(--text-1)]">
                          Combo Deals
                        </h2>
                        <span className="text-[11px] font-semibold text-[var(--text-3)]">
                          {comboMeals.length} deal
                          {comboMeals.length > 1 ? "s" : ""}
                        </span>
                        <div className="flex-1 h-px bg-[var(--surface)]" />
                      </div>
                      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                        {comboMeals.map((combo: any) => (
                          <ComboDealCard
                            key={combo.id}
                            combo={combo}
                            restaurantId={restaurant.id}
                            restaurantSlug={restaurant.slug}
                            currency={cur}
                            surgeMultiplier={surgeMultiplier}
                            onSelectCombo={(c) => setSelectedCombo(c)}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}

                {/* Today's Specials — featured items for applicable types */}
                {specials.length > 0 &&
                  isFeatureAvailable(restaurant.type, "daily-specials", {
                    featuresEnabled: restaurant.featuresEnabled,
                    featuresDisabled: restaurant.featuresDisabled,
                  }) && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ type: "spring", bounce: 0.2, duration: 0.4, delay: 0.15 }}
                      className="space-y-3"
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-[var(--accent)]" />
                        <h2 className="text-sm font-bold text-[var(--text-1)]">
                          Today&apos;s Specials
                        </h2>
                        <span className="text-[11px] font-semibold text-[var(--text-3)]">
                          {specials.length}{" "}
                          {specials.length === 1 ? "pick" : "picks"}
                        </span>
                        <div className="flex-1 h-px bg-[var(--surface)]" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {specials.map((item: any) => (
                          <MenuItemCard
                            key={`special-${item.id}`}
                            item={item}
                            restaurantId={restaurant.id}
                            restaurantSlug={restaurant.slug}
                            restaurantCurrency={cur}
                            onSelect={(d) => setSelectedDish(d)}
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
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4, delay: 0.25 }}
                    className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-[#fef9ef] to-[#fef9ef] border border-[var(--accent-border)]/60 px-4 py-3"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-muted)] shrink-0">
                      <Tag className="h-4 w-4 text-[var(--accent-text)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[var(--text-1)]">
                        Coupons Available!
                      </p>
                      <p className="text-[11px] text-[var(--accent-text)]">
                        Apply a coupon code at checkout to get a discount
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Rooms section — for hotel/resort/guesthouse */}
                {rooms.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4, delay: 0.3 }}
                    className="space-y-3"
                  >
                    <button
                      onClick={() => setShowRooms(!showRooms)}
                      className="flex w-full items-center justify-between rounded-2xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] border border-[var(--accent-border)]/60 px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-muted)] shrink-0">
                          <BedDouble className="h-4 w-4 text-[var(--accent-text)]" />
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-bold text-[var(--accent-text)]">
                            {rooms.length} Room{rooms.length > 1 ? "s" : ""}{" "}
                            Available
                          </p>
                          <p className="text-[11px] text-[var(--accent-text)]">
                            Tap to browse & book rooms
                          </p>
                        </div>
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 text-[var(--accent)] transition-transform ${showRooms ? "rotate-180" : ""}`}
                      />
                    </button>

                    <AnimatePresence>
                      {showRooms && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-3 pt-1">
                            {rooms.map((room: any) => (
                              <div
                                key={room.id}
                                className="rounded-2xl border border-[var(--border-soft)] bg-[var(--canvas)] shadow-sm overflow-hidden"
                              >
                                {room.imageUrls[0] && (
                                  <div className="relative h-36 w-full overflow-hidden">
                                    <img
                                      src={room.imageUrls[0]}
                                      alt={
                                        room.name || `Room ${room.roomNumber}`
                                      }
                                      className="h-full w-full object-cover"
                                      loading="lazy"
                                    />
                                    <span className="absolute top-2 right-2 rounded-full bg-[var(--canvas)]/90 px-2.5 py-1 text-[11px] font-bold text-[var(--text-1)] shadow-sm">
                                      {formatPrice(room.price, cur)}/night
                                    </span>
                                  </div>
                                )}
                                <div className="p-4 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-bold text-[var(--text-1)]">
                                      {room.name || `Room ${room.roomNumber}`}
                                    </h4>
                                    <span
                                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                        room.type === "SUITE"
                                          ? "bg-purple-50 text-purple-700"
                                          : room.type === "DELUXE"
                                            ? "bg-[var(--accent-muted)] text-[var(--accent-text)]"
                                            : "bg-[var(--canvas-sub)] text-[var(--text-2)]"
                                      }`}
                                    >
                                      {room.type}
                                    </span>
                                  </div>
                                  {room.description && (
                                    <p className="text-[11px] text-[var(--text-2)] line-clamp-2">
                                      {room.description}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-3 text-[11px] text-[var(--text-3)]">
                                    <span className="flex items-center gap-1">
                                      <Users className="h-3 w-3" />
                                      Up to {room.maxGuests} guests
                                    </span>
                                    <span>Floor {room.floor}</span>
                                  </div>
                                  {room.amenities.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {room.amenities
                                        .slice(0, 4)
                                        .map((a: any) => (
                                          <span
                                            key={a}
                                            className="rounded-full bg-[var(--canvas-sub)] px-2 py-0.5 text-[9px] font-medium text-[var(--text-2)]"
                                          >
                                            {a}
                                          </span>
                                        ))}
                                      {room.amenities.length > 4 && (
                                        <span className="rounded-full bg-[var(--canvas-sub)] px-2 py-0.5 text-[9px] font-medium text-[var(--text-3)]">
                                          +{room.amenities.length - 4} more
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  {!room.imageUrls[0] && (
                                    <div className="flex items-center justify-between pt-1">
                                      <span className="text-sm font-bold text-[var(--accent)]">
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
                        className="py-12 text-center text-sm text-[var(--text-3)]"
                      >
                        No dishes found. Try a different filter.
                      </motion.p>
                    ) : activeCategory ? (
                      /* Single category selected */
                      <div key="single" className="space-y-3">
                        <h3
                          className="text-sm font-bold text-[var(--text-3)] uppercase tracking-wider"
                          style={{ fontFamily: "var(--font-poppins)" }}
                        >
                          {stripEmojis(activeCategory)}
                          {activeSubCategory && (
                            <span className="text-[var(--accent)]">
                              {" "}
                              / {activeSubCategory}
                            </span>
                          )}
                          <span className="ml-2 text-[var(--text-1)]">
                            ({smartSorted.length})
                          </span>
                        </h3>
                        <motion.div
                          variants={containerVariants}
                          initial="hidden"
                          animate="visible"
                          className="flex flex-col mt-2"
                        >
                          {smartSorted.map((item: any) => (
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
                        {categoryGroups.map(({ cat, items: catItems }: { cat: { id: string; name: string }; items: any[] }) => (
                          <div key={cat.id} className="space-y-3">
                            <div className="flex items-center gap-3">
                              <h3
                                className="text-sm font-bold text-[var(--text-1)]"
                                style={{ fontFamily: "var(--font-poppins)" }}
                              >
                                {stripEmojis(cat.name)}
                              </h3>
                              <span className="text-[11px] font-semibold text-[var(--text-3)]">
                                {catItems.length}{" "}
                                {catItems.length === 1 ? "item" : "items"}
                              </span>
                              <div className="flex-1 h-px bg-[var(--surface)]" />
                            </div>
                            <motion.div
                              variants={containerVariants}
                              initial="hidden"
                              animate="visible"
                              className="flex flex-col mt-2"
                            >
                              {catItems.map((item: any) => (
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
                        ))}
                        {otherItems.length > 0 && (
                          <div className="space-y-3">
                            <h3
                              className="text-sm font-bold text-[var(--text-3)] uppercase tracking-wider"
                              style={{ fontFamily: "var(--font-poppins)" }}
                            >
                              Other
                            </h3>
                            <motion.div
                              variants={containerVariants}
                              initial="hidden"
                              animate="visible"
                              className="flex flex-col mt-2"
                            >
                              {otherItems.map((item: any) => (
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

              <div className="hidden md:block w-[280px] lg:w-[320px] shrink-0">
                <div className="sticky top-[72px] pt-3 space-y-4">
                  <DesktopCartPreview
                    currency={cur}
                    onProceed={handleProceedToCheckout}
                    onOpenFull={() => setCartOpen(true)}
                  />
                  <LiveOrderWidget currency={cur} />
                </div>
              </div>
            </div>
          )}
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
            transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
          >
            <motion.button
              onClick={() => setCartOpen(true)}
              whileTap={{ scale: 0.97 }}
              className="flex w-full items-center justify-between bg-[#1ba672] px-4 py-3.5 pb-[max(1rem,env(safe-area-inset-bottom))] text-white shadow-[0_-4px_20px_rgba(0,0,0,0.15)] rounded-t-xl"
            >
              <div className="flex flex-col items-start text-left">
                <span className="text-sm font-extrabold tracking-tight">
                  {totalItems} {totalItems === 1 ? "ITEM" : "ITEMS"}
                </span>
                <span className="text-xs font-bold text-white/90">
                  {formatPrice(subtotal, cur)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-sm font-extrabold tracking-wide uppercase">
                View Cart
                <ChevronRight className="h-4 w-4 stroke-[3]" />
              </div>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedDish && (
          <FoodDetailPopup
            itemId={selectedDish.id}
            initialItem={dishToPopupItem(selectedDish, restaurant)}
            context="menu"
            allMenuItems={menuItems.map((m: any) =>
              dishToPopupItem(m, restaurant),
            )}
            surgeMultiplier={surgeMultiplier}
            updateUrl={false}
            onClose={() => setSelectedDish(null)}
            onSelectRelated={(rel) => {
              const found = menuItems.find((m: any) => m.id === rel.id);
              if (found) setSelectedDish(found);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedCombo && (
          <ComboDetailPopup
            combo={selectedCombo}
            restaurantId={restaurant.id}
            restaurantSlug={restaurant.slug}
            currency={cur}
            surgeMultiplier={surgeMultiplier}
            onClose={() => setSelectedCombo(null)}
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

      <CartSidebar
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onProceed={handleProceedToCheckout}
      />

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

      <OrderPlacedPopup
        open={showOrderPlaced}
        onClose={() => setShowOrderPlaced(false)}
        onTrack={() => {
          setShowOrderPlaced(false);
          if (lastTrackToken) router.push(`/order-track/${lastTrackToken}`);
        }}
        trackToken={lastTrackToken}
      />

      {/* Floating "Track Order" button - HIDDEN AS PER USER REQUEST */}
      {/* activeOrder &&
        activeOrder.trackToken &&
        activeOrder.status !== "REJECTED" && (
          <Link
            href={`/order-track/${activeOrder.trackToken}`}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-[var(--text-1)] px-5 py-3 text-sm font-bold text-[var(--canvas)] shadow-xl shadow-[var(--text-1)]/30 hover:bg-[var(--text-2)] active:scale-95 transition-all"
          >
            <Receipt className="h-4 w-4" />
            Track Order · {activeOrder.orderNo}
          </Link>
        ) */}

      {/* Customer chat — visible as soon as user lands on menu */}
      {restaurantId && (tableNo || roomNo || activeOrder) && (
        <ChatWidget
          orderId={activeOrder?.id}
          restaurantId={restaurantId}
          tableNo={tableNo}
          roomNo={roomNo}
          senderRole="CUSTOMER"
          senderName={
            tableNo
              ? `Table ${tableNo}`
              : roomNo
                ? `Room ${roomNo}`
                : "Customer"
          }
        />
      )}

      <OrderHistorySheet
        open={showHistory}
        onClose={() => setShowHistory(false)}
        restaurantSlug={slug}
        currency={restaurant?.currency ?? "NPR"}
      />

      {restaurant.footerText && (
        <div className="border-t border-[var(--border-soft)] px-6 py-4 text-center">
          <p className="text-xs text-[var(--text-3)]">
            {restaurant.footerText}
          </p>
        </div>
      )}

      <TrackOrderModal
        isOpen={showTrackModal}
        onClose={() => setShowTrackModal(false)}
      />
    </div>
  );
}

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
  PENDING: {
    label: "Pending",
    color: "text-[var(--accent-text)]",
    bg: "bg-[var(--accent-muted)]",
  },
  ACCEPTED: { label: "Accepted", color: "text-blue-700", bg: "bg-blue-50" },
  PREPARING: {
    label: "Preparing",
    color: "text-purple-700",
    bg: "bg-purple-50",
  },
  READY: {
    label: "Ready",
    color: "text-[var(--accent-text)]",
    bg: "bg-[var(--accent-muted)]",
  },
  DELIVERED: {
    label: "Delivered",
    color: "text-[var(--accent-text)]",
    bg: "bg-[var(--accent-muted)]",
  },
  CANCELLED: { label: "Cancelled", color: "text-red-700", bg: "bg-red-50" },
  REJECTED: { label: "Rejected", color: "text-red-700", bg: "bg-red-50" },
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
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!open) return;
    setTimeout(() => setLoading(true), 0);
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
            transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm bg-[var(--canvas)] shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-soft)] shrink-0">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-[var(--accent)]" />
                <h3 className="text-base font-bold text-[var(--text-1)]">
                  My Orders Here
                </h3>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-2 text-[var(--text-3)] hover:bg-[var(--surface)] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-[var(--text-3)]" />
                </div>
              ) : orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-[var(--text-3)]">
                  <Receipt className="h-12 w-12 mb-3 opacity-30" />
                  <p className="text-sm font-semibold text-[var(--text-2)]">
                    No orders yet
                  </p>
                  <p className="text-xs text-[var(--text-3)] mt-1">
                    Your orders at this place will appear here
                  </p>
                </div>
              ) : (
                orders.map((order) => {
                  const meta = H_STATUS[order.status] || H_STATUS.PENDING;
                  const expanded = !!expandedIds[order.id];
                  return (
                    <div
                      key={order.id}
                      className="rounded-2xl border border-[var(--border-soft)] bg-[var(--canvas)] shadow-sm overflow-hidden"
                    >
                      <button
                        onClick={() =>
                          setExpandedIds((prev) => ({
                            ...prev,
                            [order.id]: !prev[order.id],
                          }))
                        }
                        className="w-full p-4 text-left"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-bold text-[var(--text-1)]">
                            #{order.orderNo}
                          </p>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${meta.bg} ${meta.color}`}
                          >
                            {meta.label}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-3)]">
                          {order.items
                            .map((i: any) => `${i.quantity}x ${i.name}`)
                            .join(", ")}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-sm font-bold text-[var(--text-1)]">
                            {formatPrice(order.total, currency)}
                          </p>
                          <div className="flex items-center gap-1.5">
                            <p className="text-[10px] text-[var(--text-3)]">
                              {new Date(order.createdAt).toLocaleDateString(
                                "en-NP",
                                { month: "short", day: "numeric" },
                              )}
                            </p>
                            <ChevronDown
                              className={`h-3.5 w-3.5 text-[var(--text-3)] transition-transform ${expanded ? "rotate-180" : ""}`}
                            />
                          </div>
                        </div>
                      </button>

                      <AnimatePresence>
                        {expanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                            className="overflow-hidden"
                          >
                            <div className="border-t border-[var(--border-soft)] px-4 py-3 space-y-2">
                              {order.items.map((item: any) => (
                                <div
                                  key={item.id}
                                  className="flex items-center justify-between"
                                >
                                  <span className="text-xs text-[var(--text-2)]">
                                    {item.quantity}x {item.name}
                                  </span>
                                  <span className="text-xs font-medium text-[var(--text-2)]">
                                    {formatPrice(
                                      item.price * item.quantity,
                                      currency,
                                    )}
                                  </span>
                                </div>
                              ))}
                              <div className="border-t border-dashed border-[var(--border)] pt-2 flex justify-between">
                                <span className="text-xs font-bold text-[var(--text-1)]">
                                  Total
                                </span>
                                <span className="text-xs font-bold text-[var(--text-1)]">
                                  {formatPrice(order.total, currency)}
                                </span>
                              </div>
                              {order.payment && (
                                <p className="text-[10px] text-[var(--text-3)]">
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
