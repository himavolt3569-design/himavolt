"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/context/ToastContext";
import { useOrder } from "@/context/OrderContext";
import {
  menuItems,
  menuCategories,
  pairings,
  type MenuItem,
  type MenuCategory,
} from "@/lib/menuData";
import gsap from "gsap";
import Link from "next/link";
import OrderStatus from "@/components/OrderStatus";
import CartSidebar from "@/components/CartSidebar";

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
  sizes: NonNullable<MenuItem["sizes"]>;
  selected: number;
  onSelect: (i: number) => void;
}) {
  return (
    <div className="flex gap-2">
      {sizes.map((s, i) => (
        <button
          key={s.grams}
          onClick={() => onSelect(i)}
          className={`rounded-full px-4 py-2 text-xs font-bold transition-all ${
            selected === i
              ? "bg-[#FF9933] text-white shadow-lg shadow-[#FF9933]/25"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {s.grams}
        </button>
      ))}
    </div>
  );
}

function DishDetail({
  dish,
  onClose,
}: {
  dish: MenuItem;
  onClose: () => void;
}) {
  const { addItem, getItemQty } = useCart();
  const { showToast } = useToast();
  const [qty, setQty] = useState(1);
  const [sizeIdx, setSizeIdx] = useState(0);
  const [selectedAddOns, setSelectedAddOns] = useState<Set<number>>(new Set());
  const priceRef = useRef<HTMLParagraphElement>(null);

  const sizeAdd = dish.sizes ? dish.sizes[sizeIdx].priceAdd : 0;
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

  const toggleAddOn = (id: number) => {
    setSelectedAddOns((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = () => {
    for (let i = 0; i < qty; i++) {
      addItem({ id: dish.id, name: dish.name, price: unitPrice, image: dish.image });
    }
    showToast(`${dish.name} added to cart!`);
  };

  const cartQty = getItemQty(dish.id);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="relative w-full aspect-video overflow-hidden bg-gray-100">
        <img
          src={dish.image}
          alt={dish.name}
          className="h-full w-full object-cover"
        />
        <button
          onClick={onClose}
          className="absolute top-4 left-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-md text-gray-700 hover:bg-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
        {dish.badge && (
          <span className="absolute top-4 right-4 rounded-full bg-[#FF9933] px-3 py-1 text-[11px] font-bold text-white shadow-md">
            {dish.badge}
          </span>
        )}
      </div>

      <div className="flex-1 px-5 py-5 space-y-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {dish.isVeg ? <VegIcon /> : <NonVegIcon />}
            {dish.hasEgg && <Egg className="h-3.5 w-3.5 text-yellow-500" />}
          </div>
          <h2 className="text-xl font-bold text-[#1F2A2A]">{dish.name}</h2>
          <p className="mt-1 text-sm text-gray-500 leading-relaxed">{dish.description}</p>
          <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-[#FF9933] text-[#FF9933]" />
              <span className="font-bold text-[#1F2A2A]">{dish.rating}</span>
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {dish.time}
            </span>
            {cartQty > 0 && (
              <span className="rounded-full bg-[#0A4D3C] px-2 py-0.5 text-[10px] font-bold text-white">
                {cartQty} in cart
              </span>
            )}
          </div>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <span className="text-xs text-gray-400">Price</span>
            <p className="text-2xl font-extrabold text-[#1F2A2A]" ref={priceRef}>
              Rs. {total}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-8 text-center text-sm font-bold">{qty}</span>
            <button
              onClick={() => setQty((q) => q + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FF9933] text-white hover:bg-[#ff8811] transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {dish.sizes && (
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
          <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Build Your Meal
            </h4>
            <div className="space-y-2">
              {dish.addOns.map((a) => (
                <label
                  key={a.id}
                  className={`flex items-center justify-between rounded-xl px-4 py-3 cursor-pointer transition-all ${
                    selectedAddOns.has(a.id)
                      ? "bg-[#FF9933]/10 border border-[#FF9933]/30"
                      : "bg-gray-50 border border-transparent hover:bg-gray-100"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all ${
                        selectedAddOns.has(a.id)
                          ? "border-[#FF9933] bg-[#FF9933]"
                          : "border-gray-300"
                      }`}
                    >
                      {selectedAddOns.has(a.id) && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <span className="text-sm font-medium text-[#1F2A2A]">{a.name}</span>
                  </div>
                  <span className="text-sm font-bold text-gray-500">+Rs. {a.price}</span>
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

        <button
          onClick={handleAdd}
          className="w-full rounded-xl bg-[#FF9933] py-4 text-base font-bold text-white transition-all hover:bg-[#ff8811] active:scale-[0.98] shadow-lg shadow-[#FF9933]/25"
        >
          Add to Cart — Rs. {total}
        </button>
      </div>
    </div>
  );
}

function MenuItemCard({
  item,
  onSelect,
}: {
  item: MenuItem;
  onSelect: (item: MenuItem) => void;
}) {
  const { addItem, getItemQty } = useCart();
  const { showToast } = useToast();
  const btnRef = useRef<HTMLButtonElement>(null);
  const qty = getItemQty(item.id);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    addItem({ id: item.id, name: item.name, price: item.price, image: item.image });
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onClick={() => onSelect(item)}
      className="group relative flex gap-4 rounded-2xl bg-white p-3 cursor-pointer transition-shadow hover:shadow-lg border border-gray-100"
    >
      <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-gray-100">
        <img
          src={item.image}
          alt={item.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {item.badge && (
          <span
            className={`absolute top-1.5 left-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold text-white shadow ${
              item.badge === "Bestseller"
                ? "bg-[#FF9933]"
                : item.badge === "Most Liked"
                  ? "bg-[#0A4D3C]"
                  : "bg-purple-500"
            }`}
          >
            {item.badge === "Bestseller" ? "# Bestseller" : item.badge}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-between min-w-0 py-0.5">
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            {item.isVeg ? <VegIcon /> : <NonVegIcon />}
            {item.hasEgg && <Egg className="h-3 w-3 text-yellow-500" />}
          </div>
          <h3 className="text-sm font-bold text-[#1F2A2A] truncate pr-8">{item.name}</h3>
          <p className="mt-0.5 text-[11px] text-gray-400 line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        </div>
        <div className="flex items-end justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-extrabold text-[#1F2A2A]">Rs. {item.price}</span>
            <span className="flex items-center gap-0.5 text-[11px] text-gray-400">
              <Star className="h-3 w-3 fill-[#FF9933] text-[#FF9933]" />
              {item.rating}
            </span>
            <span className="flex items-center gap-0.5 text-[11px] text-gray-400">
              <Clock className="h-3 w-3" />
              {item.time}
            </span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
        {qty > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0A4D3C] text-[10px] font-bold text-white"
          >
            {qty}
          </motion.span>
        )}
        <button
          ref={btnRef}
          onClick={handleQuickAdd}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FF9933] text-white shadow-md hover:bg-[#ff8811] transition-colors"
        >
          <Plus className="h-4 w-4" strokeWidth={3} />
        </button>
      </div>
    </motion.div>
  );
}

function PairingCard({ item }: { item: (typeof pairings)[number] }) {
  const { addItem } = useCart();
  const { showToast } = useToast();

  return (
    <div className="shrink-0 w-36 snap-start">
      <div className="relative h-28 w-full overflow-hidden rounded-xl bg-gray-100 mb-2">
        <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
        <button
          onClick={() => {
            addItem({ id: item.id, name: item.name, price: item.price, image: item.image });
            showToast(`${item.name} added!`);
          }}
          className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-md text-[#FF9933] hover:bg-[#FF9933] hover:text-white transition-all"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={3} />
        </button>
      </div>
      <p className="text-xs font-bold text-[#1F2A2A] truncate">{item.name}</p>
      <p className="text-xs font-semibold text-gray-400">Rs. {item.price}</p>
    </div>
  );
}

export default function MenuPage() {
  const [activeCategory, setActiveCategory] = useState<MenuCategory>("Main Dishes");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDish, setSelectedDish] = useState<MenuItem | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [showOrder, setShowOrder] = useState(false);
  const [filterVeg, setFilterVeg] = useState(false);
  const [filterNonVeg, setFilterNonVeg] = useState(false);
  const [filterEgg, setFilterEgg] = useState(false);
  const [filterNoOnionGarlic, setFilterNoOnionGarlic] = useState(false);
  const [filterBestseller, setFilterBestseller] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);
  const { totalItems, items, subtotal, clearCart } = useCart();
  const { placeOrder, activeOrder } = useOrder();

  const handleProceedOrder = useCallback(() => {
    if (items.length === 0) return;
    placeOrder(
      items.map((i) => ({ name: i.name, qty: i.quantity, price: i.price })),
      subtotal,
    );
    clearCart();
    setCartOpen(false);
    setShowOrder(true);
  }, [items, subtotal, placeOrder, clearCart]);

  useEffect(() => {
    if (activeOrder?.step === "delivered") {
      const t = setTimeout(() => setShowOrder(false), 3000);
      return () => clearTimeout(t);
    }
  }, [activeOrder?.step]);

  const filteredItems = menuItems.filter((item) => {
    if (activeCategory === "Alcohol" ? item.category !== "Alcohol" : item.category !== activeCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !item.name.toLowerCase().includes(q) &&
        !item.description.toLowerCase().includes(q) &&
        !item.tags.some((t) => t.includes(q))
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

  if (showOrder && activeOrder) {
    return <OrderStatus onClose={() => setShowOrder(false)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="flex h-16 items-center gap-4">
            <Link
              href="/"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-[#1F2A2A] truncate">
                  The Tech Cafe
                </h1>
                <span className="flex items-center gap-0.5 shrink-0 rounded-full bg-[#0A4D3C] px-2 py-0.5 text-[10px] font-bold text-white">
                  <Star className="h-2.5 w-2.5 fill-white" />
                  4.7
                </span>
              </div>
              <p className="text-[11px] text-gray-400 font-medium">
                Open until 11:00 PM
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href="tel:+9771234567"
                className="hidden sm:flex h-9 items-center gap-1.5 rounded-full bg-gray-100 px-3 text-xs font-bold text-gray-600 hover:bg-gray-200 transition-colors"
              >
                <Phone className="h-3.5 w-3.5" />
                Call
              </a>
              <a
                href="#"
                className="hidden sm:flex h-9 items-center gap-1.5 rounded-full bg-gray-100 px-3 text-xs font-bold text-gray-600 hover:bg-gray-200 transition-colors"
              >
                <Globe className="h-3.5 w-3.5" />
                Website
              </a>
              <button
                onClick={() => setCartOpen(true)}
                className="relative flex h-9 items-center gap-1.5 rounded-full bg-[#FF9933] px-4 text-xs font-bold text-white shadow-md hover:bg-[#ff8811] transition-colors"
              >
                <ShoppingBag className="h-4 w-4" />
                <span className="hidden sm:inline">Cart</span>
                {totalItems > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-[#FF9933]"
                  >
                    {totalItems}
                  </motion.span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="flex flex-col lg:flex-row gap-6 py-4 lg:py-6">
          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search dishes, cuisines..."
                className="w-full rounded-xl bg-white py-3 pl-11 pr-4 text-sm font-medium text-[#1F2A2A] placeholder-gray-400 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#FF9933]/30 focus:border-[#FF9933]/30 transition-all"
              />
            </div>

            {/* Category tabs */}
            <div ref={tabsRef} className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {menuCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`shrink-0 rounded-full px-5 py-2.5 text-xs font-bold transition-all ${
                    activeCategory === cat
                      ? "bg-[#0A4D3C] text-white shadow-md"
                      : "bg-white text-gray-500 border border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
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
            </div>

            {/* Hero dish (first item or selected category's top-rated) */}
            {filteredItems.length > 0 && !searchQuery && (
              <HeroDish
                dish={filteredItems.find((d) => d.badge === "Bestseller") ?? filteredItems[0]}
                onSelect={(d) => setSelectedDish(d)}
              />
            )}

            {/* Dish list */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                {activeCategory}
                <span className="ml-2 text-[#1F2A2A]">({filteredItems.length})</span>
              </h3>
              <AnimatePresence mode="popLayout">
                {filteredItems.length === 0 ? (
                  <motion.p
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="py-12 text-center text-sm text-gray-400"
                  >
                    No dishes found. Try a different filter.
                  </motion.p>
                ) : (
                  filteredItems.map((item) => (
                    <MenuItemCard
                      key={item.id}
                      item={item}
                      onSelect={(d) => setSelectedDish(d)}
                    />
                  ))
                )}
              </AnimatePresence>
            </div>

            {/* Pairings */}
            <div className="pt-4">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
                Recommended Pairings
              </h3>
              <div className="flex gap-3 overflow-x-auto scrollbar-hide snap-x pb-2">
                {pairings.map((p) => (
                  <PairingCard key={p.id} item={p} />
                ))}
              </div>
            </div>
          </div>

          {/* Desktop cart sidebar */}
          <div className="hidden lg:block w-[340px] shrink-0">
            <div className="sticky top-[80px]">
              <DesktopCartPreview
                onProceed={handleProceedOrder}
                onOpenFull={() => setCartOpen(true)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile cart bar */}
      {totalItems > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-30 lg:hidden">
          <button
            onClick={() => setCartOpen(true)}
            className="flex w-full items-center justify-between bg-[#0A4D3C] px-5 py-4 text-white shadow-xl"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs font-bold">
                {totalItems}
              </span>
              <span className="text-sm font-bold">
                {totalItems} {totalItems === 1 ? "item" : "items"} | Rs. {subtotal}
              </span>
            </div>
            <div className="flex items-center gap-1 text-sm font-bold">
              View Cart
              <ChevronRight className="h-4 w-4" />
            </div>
          </button>
        </div>
      )}

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
              transition={{ type: "spring" as const, damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md bg-white shadow-2xl overflow-hidden"
            >
              <DishDetail
                dish={selectedDish}
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
        onProceed={handleProceedOrder}
      />
    </div>
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
    <div
      onClick={() => onSelect(dish)}
      className="relative overflow-hidden rounded-2xl bg-white border border-gray-100 cursor-pointer group"
    >
      <div className="relative aspect-[2.2/1] md:aspect-3/1 overflow-hidden">
        <img
          src={dish.image}
          alt={dish.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
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
          <h2 className="text-lg md:text-xl font-bold text-white">{dish.name}</h2>
          <p className="text-xs text-white/70 line-clamp-1 mt-0.5">{dish.description}</p>
          <span
            ref={priceRef}
            className="mt-1.5 inline-block text-xl font-extrabold text-[#FF9933]"
          >
            Rs. {dish.price}
          </span>
        </div>
      </div>
    </div>
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
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[11px] font-bold transition-all ${
        active
          ? "bg-[#0A4D3C] text-white shadow-sm"
          : "bg-white text-gray-500 border border-gray-200 hover:border-gray-300"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function DesktopCartPreview({
  onProceed,
  onOpenFull,
}: {
  onProceed: () => void;
  onOpenFull: () => void;
}) {
  const { items, subtotal, totalItems, increaseQty, decreaseQty, removeItem } = useCart();

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
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
          <p className="text-xs font-medium text-gray-400">Your cart is empty</p>
          <p className="text-[11px] text-gray-300 mt-0.5">Add dishes from the menu</p>
        </div>
      ) : (
        <>
          <div className="max-h-[320px] overflow-y-auto px-5 py-3 space-y-1">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 py-2">
                <div className="h-10 w-10 rounded-lg overflow-hidden shrink-0">
                  <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-[#1F2A2A] truncate">{item.name}</p>
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
                  <span className="w-5 text-center text-[11px] font-bold">{item.quantity}</span>
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
              <span className="text-xs font-medium text-gray-500">Subtotal</span>
              <span className="text-sm font-bold text-[#1F2A2A]">Rs. {subtotal}</span>
            </div>
            <button
              onClick={onProceed}
              className="w-full rounded-xl bg-[#FF9933] py-3.5 text-sm font-bold text-white transition-all hover:bg-[#ff8811] active:scale-[0.98] shadow-md shadow-[#FF9933]/25"
            >
              Proceed to Order
            </button>
          </div>
        </>
      )}
    </div>
  );
}
