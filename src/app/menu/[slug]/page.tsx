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

function DishDetail({
  dish,
  restaurantId,
  restaurantSlug,
  onClose,
}: {
  dish: MenuItem;
  restaurantId: string;
  restaurantSlug: string;
  onClose: () => void;
}) {
  const { addItem, getItemQty } = useCart();
  const { showToast } = useToast();
  const [qty, setQty] = useState(1);
  const [sizeIdx, setSizeIdx] = useState(0);
  const [selectedAddOns, setSelectedAddOns] = useState<Set<string>>(new Set());
  const priceRef = useRef<HTMLParagraphElement>(null);

  const sizeAdd = dish.sizes.length > 0 ? dish.sizes[sizeIdx].priceAdd : 0;
  const addOnTotal = dish.addOns
    .filter((a) => selectedAddOns.has(a.id))
    .reduce((s, a) => s + a.price, 0);
  const unitPrice = dish.price + sizeAdd + addOnTotal;
  const total = unitPrice * qty;

  useEffect(() => {
    if (priceRef.current) {
      gsap.fromTo(
        priceRef.current,
        { scale: 1.3, color: "#FF9933" },
        { scale: 1, color: "#1F2A2A", duration: 0.35, ease: "back.out(2)" },
      );
    }
  }, [total]);

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
      );
    }
    showToast(`${dish.name} added to cart!`);
  };

  const cartQty = getItemQty(dish.id);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <motion.div
        className="relative w-full aspect-video overflow-hidden bg-gray-100"
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
        <motion.button
          onClick={onClose}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
          className="absolute top-4 left-4 flex h-9 w-9 items-center justify-center rounded-xl bg-white/90 backdrop-blur-sm shadow-md text-gray-700 hover:bg-white hover:text-[#1F2A2A] transition-all"
        >
          <X className="h-4 w-4" />
        </motion.button>
        {dish.badge && (
          <motion.span
            className="absolute top-4 right-4 rounded-full bg-[#FF9933] px-3 py-1 text-[11px] font-bold text-white shadow-md"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              delay: 0.2,
              type: "spring",
              stiffness: 500,
              damping: 15,
            }}
          >
            {dish.badge}
          </motion.span>
        )}
      </motion.div>

      <div className="flex-1 px-5 py-5 space-y-5">
        <motion.div
          initial={{ opacity: 0, y: 16, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div className="flex items-center gap-2 mb-1">
            {dish.isVeg ? <VegIcon /> : <NonVegIcon />}
            {dish.hasEgg && <Egg className="h-3.5 w-3.5 text-yellow-500" />}
          </div>
          <h2 className="text-xl font-bold text-[#1F2A2A]">{dish.name}</h2>
          <p className="mt-1 text-sm text-gray-500 leading-relaxed">
            {dish.description}
          </p>
          <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-[#FF9933] text-[#FF9933]" />
              <span className="font-bold text-[#1F2A2A]">
                {dish.rating.toFixed(1)}
              </span>
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {dish.prepTime}
            </span>
            {cartQty > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 15 }}
                className="rounded-full bg-[#0A4D3C] px-2 py-0.5 text-[10px] font-bold text-white"
              >
                {cartQty} in cart
              </motion.span>
            )}
          </div>
        </motion.div>

        <motion.div
          className="flex items-end justify-between"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <div>
            <span className="text-xs text-gray-400">Price</span>
            <p
              className="text-2xl font-extrabold text-[#1F2A2A]"
              ref={priceRef}
            >
              Rs. {total}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              whileTap={{ scale: 0.85 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
            >
              <Minus className="h-4 w-4" />
            </motion.button>
            <motion.span
              key={qty}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              className="w-8 text-center text-sm font-bold"
            >
              {qty}
            </motion.span>
            <motion.button
              onClick={() => setQty((q) => q + 1)}
              whileTap={{ scale: 0.85 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FF9933] text-white hover:bg-[#ff8811] transition-colors"
            >
              <Plus className="h-4 w-4" />
            </motion.button>
          </div>
        </motion.div>

        {dish.sizes.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Choose Size
            </h4>
            <SizeSelector
              sizes={dish.sizes}
              selected={sizeIdx}
              onSelect={setSizeIdx}
            />
          </div>
        )}

        {dish.addOns.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.35 }}
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
                      : "bg-gray-50 border border-transparent hover:bg-gray-100"
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
                            transition={{
                              type: "spring",
                              stiffness: 500,
                              damping: 15,
                            }}
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
                    +Rs. {a.price}
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

        <motion.button
          onClick={handleAdd}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          whileHover={{
            scale: 1.01,
            boxShadow: "0 12px 24px -6px rgba(255,153,51,0.35)",
          }}
          whileTap={{ scale: 0.97 }}
          className="relative w-full rounded-xl bg-[#FF9933] py-4 text-base font-bold text-white overflow-hidden shadow-lg shadow-[#FF9933]/20"
        >
          {/* Shimmer */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent"
            initial={{ x: "-100%" }}
            animate={{ x: "200%" }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              repeatDelay: 4,
              ease: "easeInOut",
            }}
          />
          <span className="relative z-[1]">Add to Cart — Rs. {total}</span>
        </motion.button>
      </div>
    </div>
  );
}

function MenuItemCard({
  item,
  restaurantId,
  restaurantSlug,
  onSelect,
}: {
  item: MenuItem;
  restaurantId: string;
  restaurantSlug: string;
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
      onClick={() => onSelect(item)}
      whileHover={{ y: -3, boxShadow: "0 8px 30px rgba(0,0,0,0.08)" }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="group relative flex gap-4 rounded-2xl bg-white p-3 cursor-pointer border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
    >
      <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-gray-100">
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
                ? "bg-[#FF9933]"
                : item.badge === "Most Liked"
                  ? "bg-[#0A4D3C]"
                  : "bg-purple-500"
            }`}
          >
            {item.badge === "Bestseller" ? "# Bestseller" : item.badge}
          </motion.span>
        )}
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
            className="absolute bottom-1.5 left-1.5 rounded-md bg-[#E23744] px-1.5 py-0.5 text-[9px] font-extrabold text-white shadow"
          >
            {item.discountLabel}
          </motion.span>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-between min-w-0 py-0.5">
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            {item.isVeg ? <VegIcon /> : <NonVegIcon />}
            {item.hasEgg && <Egg className="h-3 w-3 text-yellow-500" />}
          </div>
          <h3 className="text-sm font-bold text-[#1F2A2A] truncate pr-8 flex items-center gap-1">
            {item.name}
            {item.isFeatured && (
              <Star className="h-3 w-3 fill-[#FF9933] text-[#FF9933] shrink-0" />
            )}
          </h3>
          <p className="mt-0.5 text-[11px] text-gray-400 line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        </div>
        <div className="flex items-end justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-extrabold text-[#1F2A2A]">
              Rs. {item.price}
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
        </div>
      </div>

      <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
        {qty > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 15 }}
            className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0A4D3C] text-[10px] font-bold text-white"
          >
            {qty}
          </motion.span>
        )}
        <motion.button
          ref={btnRef}
          onClick={handleQuickAdd}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.85 }}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FF9933] text-white shadow-md shadow-[#FF9933]/20 hover:bg-[#ff8811]"
        >
          <Plus className="h-4 w-4" strokeWidth={3} />
        </motion.button>
      </div>
    </motion.div>
  );
}

function HeroDish({
  dish,
  onSelect,
}: {
  dish: MenuItem;
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
            Rs. {dish.price}
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
  onProceed,
  onOpenFull,
}: {
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
                    Rs. {item.price * item.quantity}
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
                Rs. {subtotal}
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
  const { activeOrder } = useOrder();

  const restaurantId = restaurant?.id ?? null;

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
    <div className="min-h-screen bg-[#F7F8FA]">
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
                  <span className="ml-2 text-[#FF9933] font-bold">
                    Table {tableNo}
                  </span>
                )}
                {roomNo && (
                  <span className="ml-2 text-[#FF9933] font-bold">
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

      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="flex flex-col lg:flex-row gap-6 py-4 lg:py-6">
          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Stories */}
            <MenuStories slug={slug} />

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

            {/* Hero dish */}
            {smartSorted.length > 0 && !searchQuery && (
              <HeroDish
                dish={
                  smartSorted.find((d) => d.badge === "Bestseller") ??
                  smartSorted[0]
                }
                onSelect={(d) => setSelectedDish(d)}
              />
            )}

            {/* Dish list */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                {activeCategory || "All Items"}
                <span className="ml-2 text-[#1F2A2A]">
                  ({smartSorted.length})
                </span>
              </h3>
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
                ) : (
                  <motion.div
                    key="list"
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
                        onSelect={(d) => setSelectedDish(d)}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Desktop cart sidebar */}
          <div className="hidden lg:block w-[340px] shrink-0">
            <div className="sticky top-[80px]">
              <DesktopCartPreview
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
                  {totalItems} {totalItems === 1 ? "item" : "items"} | Rs.{" "}
                  {subtotal}
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

      {/* Dish detail sheet */}
      <AnimatePresence>
        {selectedDish && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDish(null)}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]"
            />
            <motion.div
              key="detail-panel"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{
                type: "spring" as const,
                damping: 30,
                stiffness: 300,
              }}
              className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md bg-white shadow-2xl overflow-hidden"
            >
              <DishDetail
                dish={selectedDish}
                restaurantId={restaurant.id}
                restaurantSlug={restaurant.slug}
                onClose={() => setSelectedDish(null)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
          onOrderPlaced={handleOrderPlaced}
        />
      )}
    </div>
  );
}
