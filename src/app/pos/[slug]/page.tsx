"use client";

import { useState, useEffect, useCallback, use } from "react";
import { AnimatePresence } from "framer-motion";
import { Search, X } from "lucide-react";
import KioskWelcome from "@/components/pos/kiosk/KioskWelcome";
import KioskCategoryBar from "@/components/pos/kiosk/KioskCategoryBar";
import KioskMenuGrid from "@/components/pos/kiosk/KioskMenuGrid";
import KioskItemDetail from "@/components/pos/kiosk/KioskItemDetail";
import KioskCart, { type KioskCartItem } from "@/components/pos/kiosk/KioskCart";
import KioskOrderType from "@/components/pos/kiosk/KioskOrderType";
import KioskSummary from "@/components/pos/kiosk/KioskSummary";
import KioskConfirmation from "@/components/pos/kiosk/KioskConfirmation";
import KioskIdleOverlay, { useIdleDetection } from "@/components/pos/kiosk/KioskIdleOverlay";

/* ── Types ───────────────────────────────────────────���─────────────── */

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  parentId: string | null;
}

interface MenuSize {
  id: string;
  label: string;
  grams: string;
  priceAdd: number;
}

interface MenuAddOn {
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
  isVeg: boolean;
  spiceLevel: number;
  discount: number;
  sizes: MenuSize[];
  addOns: MenuAddOn[];
  category: { id: string; name: string };
}

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  currency: string;
  taxRate: number;
  taxEnabled: boolean;
  serviceChargeRate: number;
  serviceChargeEnabled: boolean;
  categories: Category[];
  isOpen: boolean;
}

type Screen = "WELCOME" | "MENU" | "ORDER_TYPE" | "SUMMARY" | "CONFIRMED";

/* ── Page ──────────────────────────────────────────────────────────���─ */

export default function KioskPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  // Data
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<{ tableNo: number; label: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [screen, setScreen] = useState<Screen>("WELCOME");
  const [activeCategory, setActiveCategory] = useState<string | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [cart, setCart] = useState<KioskCartItem[]>([]);
  const [orderType, setOrderType] = useState<"DINE_IN" | "TAKEAWAY">("DINE_IN");
  const [tableNo, setTableNo] = useState<number | null>(null);
  const [guestName, setGuestName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<{ orderNo: string; total: number } | null>(null);
  const [isIdle, setIsIdle] = useState(false);

  // Load data
  useEffect(() => {
    async function load() {
      try {
        const [restRes, menuRes] = await Promise.all([
          fetch(`/api/public/restaurants/${slug}`),
          fetch(`/api/public/restaurants/${slug}/menu`),
        ]);
        if (!restRes.ok) throw new Error("Restaurant not found");
        const restData = await restRes.json();
        const menuData = await menuRes.json();

        setRestaurant(restData);
        setMenuItems(Array.isArray(menuData) ? menuData : []);

        // Try loading tables (may need restaurant id)
        try {
          const tablesRes = await fetch(`/api/restaurants/${restData.id}/tables`);
          if (tablesRes.ok) {
            const tablesData = await tablesRes.json();
            const raw = Array.isArray(tablesData) ? tablesData : tablesData.tables ?? [];
            setTables(raw.map((t: { tableNo: number; label: string | null }) => ({ tableNo: t.tableNo, label: t.label })));
          }
        } catch {
          // Tables are optional for kiosk
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  // Reset everything
  const resetAll = useCallback(() => {
    setScreen("WELCOME");
    setActiveCategory("ALL");
    setSearch("");
    setSelectedItem(null);
    setCart([]);
    setOrderType("DINE_IN");
    setTableNo(null);
    setGuestName("");
    setSubmitting(false);
    setConfirmedOrder(null);
    setIsIdle(false);
  }, []);

  // Idle detection (60s)
  useIdleDetection(60000, () => {
    if (screen !== "WELCOME" && screen !== "CONFIRMED") {
      setIsIdle(true);
    }
  });

  // Filter menu items
  const categories = restaurant?.categories ?? [];
  const filteredItems = menuItems.filter((item) => {
    if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (activeCategory === "ALL") return true;
    const childIds = categories.filter((c) => c.parentId === activeCategory).map((c) => c.id);
    return item.category.id === activeCategory || childIds.includes(item.category.id);
  });

  // Cart operations
  const addToCart = (item: MenuItem, qty: number, sizeId: string | null, addOnIds: string[]) => {
    const size = sizeId ? item.sizes.find((s) => s.id === sizeId) : null;
    const addOns = item.addOns.filter((a) => addOnIds.includes(a.id));
    const basePrice = item.discount > 0 ? item.price * (1 - item.discount / 100) : item.price;
    const unitPrice = basePrice + (size?.priceAdd ?? 0) + addOns.reduce((sum, a) => sum + a.price, 0);

    // Create a unique key based on item + size + addons
    const key = `${item.id}_${sizeId ?? "none"}_${addOnIds.sort().join(",")}`;

    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === key);
      if (existing) {
        return prev.map((c) => c.menuItemId === key ? { ...c, quantity: c.quantity + qty } : c);
      }
      return [...prev, {
        menuItemId: key,
        name: item.name + (size ? ` (${size.label})` : ""),
        unitPrice,
        quantity: qty,
        sizeLabel: size?.label ?? null,
        addOnNames: addOns.map((a) => a.name),
      }];
    });
  };

  const quickAdd = (item: MenuItem) => {
    addToCart(item, 1, item.sizes[0]?.id ?? null, []);
  };

  const updateQty = (menuItemId: string, delta: number) => {
    setCart((prev) =>
      prev.map((c) => c.menuItemId === menuItemId ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c)
        .filter((c) => c.quantity > 0)
    );
  };

  const removeItem = (menuItemId: string) => {
    setCart((prev) => prev.filter((c) => c.menuItemId !== menuItemId));
  };

  // Place order
  const placeOrder = async () => {
    if (!restaurant || cart.length === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/restaurants/${restaurant.id}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: orderType,
          paymentMethod: "COUNTER",
          tableNo: orderType === "DINE_IN" ? tableNo : undefined,
          guestName: guestName || undefined,
          note: "Self-service kiosk order",
          items: cart.map((c) => ({
            menuItemId: c.menuItemId.split("_")[0], // extract original item id
            name: c.name,
            price: c.unitPrice,
            quantity: c.quantity,
            addOns: c.addOnNames.length > 0 ? c.addOnNames.join(", ") : undefined,
          })),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to place order" }));
        throw new Error(err.error || "Failed to place order");
      }
      const order = await res.json();
      setConfirmedOrder({ orderNo: order.orderNo, total: order.total });
      setScreen("CONFIRMED");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to place order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Render ────────────────────────────────────��─────────────────── */

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-4 border-amber-200 border-t-amber-600 animate-spin" />
          <p className="text-sm font-medium text-gray-500">Loading menu...</p>
        </div>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-xl font-bold text-gray-900 mb-2">Unable to load</p>
          <p className="text-sm text-gray-500">{error || "Restaurant not found"}</p>
        </div>
      </div>
    );
  }

  if (!restaurant.isOpen) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-4xl mb-4">🔒</p>
          <p className="text-xl font-bold text-gray-900 mb-2">{restaurant.name}</p>
          <p className="text-sm text-gray-500">Currently closed for orders</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 select-none">
      {/* Idle overlay */}
      <KioskIdleOverlay
        isIdle={isIdle}
        onIdle={() => setIsIdle(true)}
        onActive={() => setIsIdle(false)}
        onReset={resetAll}
      />

      <AnimatePresence mode="wait">
        {/* Welcome screen */}
        {screen === "WELCOME" && (
          <KioskWelcome
            restaurantName={restaurant.name}
            imageUrl={restaurant.imageUrl}
            onStart={() => setScreen("MENU")}
          />
        )}

        {/* Confirmation screen */}
        {screen === "CONFIRMED" && confirmedOrder && (
          <KioskConfirmation
            orderNo={confirmedOrder.orderNo}
            total={confirmedOrder.total}
            currency={restaurant.currency}
            onReset={resetAll}
          />
        )}
      </AnimatePresence>

      {/* Main menu screen */}
      {screen === "MENU" && (
        <div className="flex h-screen">
          {/* Left: Menu area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="shrink-0 bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-xl font-black text-gray-900">{restaurant.name}</h1>
                  <p className="text-sm text-gray-500">Choose your items</p>
                </div>
                <button
                  onClick={resetAll}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>

              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search menu items..."
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 pl-12 pr-10 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300 transition-all"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2">
                    <X className="h-4 w-4 text-gray-400" />
                  </button>
                )}
              </div>

              {/* Categories */}
              <KioskCategoryBar
                categories={categories}
                activeId={activeCategory}
                onSelect={setActiveCategory}
              />
            </div>

            {/* Menu grid (scrollable) */}
            <div className="flex-1 overflow-y-auto p-6">
              <KioskMenuGrid
                items={filteredItems}
                cart={cart.map((c) => ({ menuItemId: c.menuItemId, quantity: c.quantity }))}
                currency={restaurant.currency}
                onItemTap={(item) => setSelectedItem(item)}
                onQuickAdd={quickAdd}
              />
            </div>
          </div>

          {/* Right: Cart panel */}
          <div className="w-[380px] shrink-0">
            <KioskCart
              items={cart}
              currency={restaurant.currency}
              onUpdateQty={updateQty}
              onRemove={removeItem}
              onClear={() => setCart([])}
              onCheckout={() => setScreen("ORDER_TYPE")}
            />
          </div>
        </div>
      )}

      {/* Order type screen */}
      {screen === "ORDER_TYPE" && (
        <div className="min-h-screen flex items-center justify-center">
          <KioskOrderType
            tables={tables}
            onConfirm={(type, tbl, name) => {
              setOrderType(type);
              setTableNo(tbl);
              setGuestName(name);
              setScreen("SUMMARY");
            }}
            onBack={() => setScreen("MENU")}
          />
        </div>
      )}

      {/* Summary screen */}
      {screen === "SUMMARY" && (
        <div className="min-h-screen flex items-center justify-center">
          <KioskSummary
            items={cart}
            orderType={orderType}
            tableNo={tableNo}
            guestName={guestName}
            currency={restaurant.currency}
            taxRate={restaurant.taxRate}
            taxEnabled={restaurant.taxEnabled}
            serviceChargeRate={restaurant.serviceChargeRate}
            serviceChargeEnabled={restaurant.serviceChargeEnabled}
            submitting={submitting}
            onConfirm={placeOrder}
            onBack={() => setScreen("ORDER_TYPE")}
          />
        </div>
      )}

      {/* Item detail modal */}
      <AnimatePresence>
        {selectedItem && (
          <KioskItemDetail
            item={selectedItem}
            currency={restaurant.currency}
            onClose={() => setSelectedItem(null)}
            onAdd={addToCart}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
