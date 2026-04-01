"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Utensils,
  Search,
  Plus,
  Minus,
  X,
  Send,
  Loader2,
  ShoppingCart,
  CheckCircle2,
  TableProperties,
  ChevronDown,
} from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { formatPrice } from "@/lib/currency";

interface MenuCategory {
  id: string;
  name: string;
  parentId: string | null;
}

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  isAvailable: boolean;
  categoryId: string;
  category: { name: string };
}

interface TableRecord {
  id: string;
  tableNo: number;
  label: string | null;
  capacity: number;
}

interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
}

interface CreatedOrder {
  orderNo: string;
  total: number;
}

async function staffFetch<T = unknown>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts?.headers || {}) },
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export default function WaiterOrderTab({ restaurantId }: { restaurantId: string }) {
  const { showToast } = useToast();

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [tables, setTables] = useState<TableRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | "ALL">("ALL");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [guestName, setGuestName] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<CreatedOrder | null>(null);
  const [showTablePicker, setShowTablePicker] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [itemsData, catsData, tablesData] = await Promise.all([
        staffFetch<MenuItem[]>(`/api/restaurants/${restaurantId}/menu`),
        staffFetch<MenuCategory[]>(`/api/restaurants/${restaurantId}/categories`),
        staffFetch<{ tables: TableRecord[] }>(`/api/restaurants/${restaurantId}/tables`),
      ]);
      setMenuItems(Array.isArray(itemsData) ? itemsData.filter((i) => i.isAvailable) : []);
      setCategories(Array.isArray(catsData) ? catsData : []);
      const rawTables = tablesData as unknown;
      setTables(
        Array.isArray(rawTables)
          ? rawTables
          : (rawTables as { tables?: TableRecord[] }).tables ?? [],
      );
    } catch {
      showToast("Failed to load menu", "error");
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === item.id);
      if (existing) return prev.map((c) => (c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c));
      return [...prev, { menuItemId: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
  };

  const updateQty = (menuItemId: string, delta: number) => {
    setCart((prev) => {
      const updated = prev.map((c) =>
        c.menuItemId === menuItemId ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c,
      );
      return updated.filter((c) => c.quantity > 0);
    });
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);
  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  const topCategories = categories.filter((c) => c.parentId === null);

  const filteredItems = menuItems.filter((item) => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (activeCategory === "ALL") return true;
    // Check if item belongs to the selected top-level category or any of its children
    const childIds = categories
      .filter((c) => c.parentId === activeCategory)
      .map((c) => c.id);
    return item.categoryId === activeCategory || childIds.includes(item.categoryId);
  });

  const handleSubmit = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      const created = await staffFetch<CreatedOrder>(`/api/restaurants/${restaurantId}/orders`, {
        method: "POST",
        body: JSON.stringify({
          type: selectedTable ? "DINE_IN" : "TAKEAWAY",
          paymentMethod: "CASH",
          tableNo: selectedTable ?? undefined,
          guestName: guestName.trim() || undefined,
          note: note.trim() || undefined,
          items: cart.map((c) => ({ menuItemId: c.menuItemId, quantity: c.quantity })),
        }),
      });
      setCreatedOrder(created);
      setCart([]);
      setSelectedTable(null);
      setGuestName("");
      setNote("");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to create order", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleNewOrder = () => {
    setCreatedOrder(null);
  };

  if (createdOrder) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-20 text-center"
      >
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-xl font-black text-gray-900">Order Sent to Kitchen!</h2>
        <p className="mt-2 text-sm text-gray-500">
          Order <span className="font-bold text-amber-700">#{createdOrder.orderNo}</span> has been created.
        </p>
        <p className="mt-1 text-sm text-gray-500">
          Total: <span className="font-bold">{formatPrice(createdOrder.total, "NPR")}</span>
        </p>
        <button
          onClick={handleNewOrder}
          className="mt-8 rounded-xl bg-amber-700 px-8 py-3 text-sm font-bold text-white hover:bg-amber-600 transition-colors"
        >
          + New Order
        </button>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-200px)]">
      {/* Left: Menu browser */}
      <div className="flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-amber-950">New Order</h2>
            <p className="text-sm text-gray-400">Browse menu and build the order</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search menu items..."
            className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#eaa94d]/30 transition-all"
          />
        </div>

        {/* Category filter */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setActiveCategory("ALL")}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              activeCategory === "ALL"
                ? "bg-amber-700 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            All
          </button>
          {topCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                activeCategory === cat.id
                  ? "bg-amber-700 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Items grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl border border-gray-100 bg-gray-100 h-24" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Utensils className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">No items found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredItems.map((item) => {
              const inCart = cart.find((c) => c.menuItemId === item.id);
              return (
                <motion.button
                  key={item.id}
                  onClick={() => addToCart(item)}
                  whileTap={{ scale: 0.97 }}
                  className={`relative rounded-2xl border bg-white p-3 text-left shadow-sm transition-all hover:shadow-md ${
                    inCart ? "border-amber-300 bg-amber-50" : "border-gray-200"
                  }`}
                >
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="mb-2 h-16 w-full rounded-xl object-cover"
                    />
                  )}
                  <p className="text-xs font-bold text-gray-800 line-clamp-2">{item.name}</p>
                  <p className="mt-1 text-xs font-semibold text-amber-700">{formatPrice(item.price, "NPR")}</p>
                  {inCart && (
                    <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-amber-600 text-[10px] font-black text-white">
                      {inCart.quantity}
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      {/* Right: Cart & order details */}
      <div className="lg:w-80 space-y-4">
        {/* Table selector */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Table</label>
          <div className="relative">
            <button
              onClick={() => setShowTablePicker(!showTablePicker)}
              className="w-full flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm transition-all hover:border-amber-300"
            >
              <div className="flex items-center gap-2">
                <TableProperties className="h-4 w-4 text-gray-400" />
                <span className={selectedTable ? "font-semibold text-gray-800" : "text-gray-400"}>
                  {selectedTable ? `Table ${selectedTable}` : "Select table (optional)"}
                </span>
              </div>
              <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${showTablePicker ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
              {showTablePicker && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="absolute top-full left-0 right-0 z-10 mt-1 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden"
                >
                  <button
                    onClick={() => { setSelectedTable(null); setShowTablePicker(false); }}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    No table (Takeaway)
                  </button>
                  {tables.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => { setSelectedTable(t.tableNo); setShowTablePicker(false); }}
                      className={`w-full px-4 py-2.5 text-left text-sm font-medium hover:bg-amber-50 transition-colors ${
                        selectedTable === t.tableNo ? "bg-amber-50 text-amber-700" : "text-gray-700"
                      }`}
                    >
                      Table {t.tableNo}{t.label ? ` — ${t.label}` : ""}
                      <span className="ml-1 text-xs text-gray-400">({t.capacity} pax)</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Guest name */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Guest Name</label>
            <input
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Optional"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#eaa94d]/30 focus:bg-white transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Note</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. No spicy, extra sauce"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#eaa94d]/30 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Cart */}
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Cart
              {cartCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700">
                  {cartCount}
                </span>
              )}
            </h3>
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                className="text-xs text-red-400 hover:text-red-600 transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-300">
              <ShoppingCart className="h-8 w-8 mb-2" />
              <p className="text-xs font-medium">No items yet</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
                {cart.map((item) => (
                  <div key={item.menuItemId} className="flex items-center justify-between px-4 py-2.5">
                    <div className="min-w-0 mr-2">
                      <p className="text-xs font-semibold text-gray-800 truncate">{item.name}</p>
                      <p className="text-xs text-gray-400">{formatPrice(item.price, "NPR")}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => updateQty(item.menuItemId, -1)}
                        className="flex h-6 w-6 items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center text-xs font-bold">{item.quantity}</span>
                      <button
                        onClick={() => updateQty(item.menuItemId, 1)}
                        className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-700 transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
                <span className="text-sm font-bold text-gray-700">Total</span>
                <span className="text-base font-black text-amber-950">{formatPrice(cartTotal, "NPR")}</span>
              </div>
            </>
          )}
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={cart.length === 0 || submitting}
          className="w-full rounded-xl bg-amber-700 py-3.5 text-sm font-bold text-white hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-amber-700/20"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {submitting ? "Sending..." : `Send to Kitchen · ${formatPrice(cartTotal, "NPR")}`}
        </button>
      </div>
    </div>
  );
}
