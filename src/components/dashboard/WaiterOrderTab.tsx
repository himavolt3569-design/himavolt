"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch, peekApiCache } from "@/lib/api-client";
import {
  Utensils,
  Search,
  Plus,
  Minus,
  Send,
  ShoppingCart,
  CheckCircle2,
  TableProperties,
  ChevronDown,
  PersonStanding,
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

type DeliveryMode = "kitchen" | "direct";

export default function WaiterOrderTab({ restaurantId }: { restaurantId: string }) {
  const { showToast } = useToast();

  const menuPath = `/api/restaurants/${restaurantId}/menu`;
  const catPath = `/api/restaurants/${restaurantId}/categories`;
  // Seed from the in-memory API cache so the item grid paints instantly on open.
  const [menuItems, setMenuItems] = useState<MenuItem[]>(
    () => (peekApiCache<MenuItem[]>(menuPath) ?? []).filter((i) => i.isAvailable),
  );
  const [categories, setCategories] = useState<MenuCategory[]>(
    () => peekApiCache<MenuCategory[]>(catPath) ?? [],
  );
  const [tables, setTables] = useState<TableRecord[]>([]);
  const [loading, setLoading] = useState(() => !peekApiCache(menuPath));

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | "ALL">("ALL");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [guestName, setGuestName] = useState("");
  const [note, setNote] = useState("");
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("kitchen");
  const [createdOrder, setCreatedOrder] = useState<{ order: CreatedOrder; mode: DeliveryMode } | null>(null);
  const [showTablePicker, setShowTablePicker] = useState(false);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // Cached GETs: a re-opened order screen serves items instantly, then
      // revalidates. Menu mutations elsewhere invalidate this prefix.
      const [itemsData, catsData, tablesData] = await Promise.all([
        apiFetch<MenuItem[]>(`/api/restaurants/${restaurantId}/menu`, { cacheTtl: 120_000 }),
        apiFetch<MenuCategory[]>(`/api/restaurants/${restaurantId}/categories`, { cacheTtl: 120_000 }),
        apiFetch<unknown>(`/api/restaurants/${restaurantId}/tables`, { cacheTtl: 60_000 }),
      ]);
      setMenuItems(Array.isArray(itemsData) ? itemsData.filter((i) => i.isAvailable) : []);
      setCategories(Array.isArray(catsData) ? catsData : []);
      const rawTables = tablesData as { tables?: TableRecord[] } | TableRecord[];
      setTables(Array.isArray(rawTables) ? rawTables : rawTables.tables ?? []);
    } catch {
      if (!silent) showToast("Failed to load menu", "error");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [restaurantId, showToast]);

  useEffect(() => {
    fetchData(!!peekApiCache(menuPath));
  }, [fetchData, menuPath]);

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === item.id);
      if (existing) return prev.map((c) => (c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c));
      return [...prev, { menuItemId: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
  };

  const updateQty = (menuItemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => (c.menuItemId === menuItemId ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c))
        .filter((c) => c.quantity > 0),
    );
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);
  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);
  const topCategories = categories.filter((c) => c.parentId === null);

  const filteredItems = menuItems.filter((item) => {
    if (!item.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (activeCategory === "ALL") return true;
    const childIds = categories.filter((c) => c.parentId === activeCategory).map((c) => c.id);
    return item.categoryId === activeCategory || childIds.includes(item.categoryId);
  });

  const handleSubmit = async (mode: DeliveryMode) => {
    if (cart.length === 0) return;
    const extraNote = mode === "direct" ? "[Waiter delivering directly]" : undefined;
    const fullNote = [note.trim(), extraNote].filter(Boolean).join(" — ") || undefined;
    const body = {
      type: selectedTable ? "DINE_IN" : "TAKEAWAY",
      paymentMethod: "CASH",
      tableNo: selectedTable ?? undefined,
      guestName: guestName.trim() || undefined,
      note: fullNote,
      items: cart.map((c) => ({
        menuItemId: c.menuItemId,
        name: c.name,
        price: c.price,
        quantity: c.quantity,
      })),
    };

    // Snapshot for rollback, then show the success screen INSTANTLY (the order
    // number fills in when the server confirms) and clear the form so the
    // waiter can start the next order without waiting on the network.
    const snapshot = { cart, selectedTable, guestName, note };
    setCreatedOrder({ order: { orderNo: "…", total: cartTotal }, mode });
    setCart([]);
    setSelectedTable(null);
    setGuestName("");
    setNote("");

    try {
      const created = await staffFetch<CreatedOrder>(`/api/restaurants/${restaurantId}/orders`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setCreatedOrder({ order: created, mode }); // reconcile real order no/total
    } catch (err) {
      // Rollback: restore the cart and surface the error.
      setCreatedOrder(null);
      setCart(snapshot.cart);
      setSelectedTable(snapshot.selectedTable);
      setGuestName(snapshot.guestName);
      setNote(snapshot.note);
      showToast(err instanceof Error ? err.message : "Failed to create order", "error");
    }
  };

  const handleNewOrder = () => setCreatedOrder(null);

  if (createdOrder) {
    const isDirect = createdOrder.mode === "direct";
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-20 text-center"
      >
        <div className={`mb-5 flex h-16 w-16 items-center justify-center rounded-full ${isDirect ? "bg-blue-100" : "bg-[var(--accent-muted)]"}`}>
          {isDirect
            ? <PersonStanding className="h-8 w-8 text-blue-600" />
            : <CheckCircle2 className="h-8 w-8 text-[var(--accent-text)]" />
          }
        </div>
        <h2 className="text-xl font-black text-[var(--text-1)]">
          {isDirect ? "Order Recorded!" : "Order Sent to Kitchen!"}
        </h2>
        <p className="mt-2 text-sm text-[var(--text-2)]">
          Order <span className="font-bold text-[var(--accent-text)]">#{createdOrder.order.orderNo}</span> has been created.
        </p>
        {isDirect && (
          <p className="mt-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg px-3 py-1.5">
            You are delivering this order directly to the kitchen
          </p>
        )}
        <p className="mt-2 text-sm text-[var(--text-2)]">
          Total: <span className="font-bold">{formatPrice(createdOrder.order.total, "NPR")}</span>
        </p>
        <button
          onClick={handleNewOrder}
          className="mt-8 rounded-xl bg-[var(--accent-hover)] px-8 py-3 text-sm font-bold text-white hover:bg-[var(--accent-hover)] transition-colors"
        >
          + New Order
        </button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Order context bar — table & guest pinned to the top for quick access */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--canvas)] p-3">
        <h2 className="shrink-0 pr-1 text-base font-bold text-[var(--text-1)]">New Order</h2>
        <div className="relative min-w-[200px] flex-1">
          <button
            onClick={() => setShowTablePicker(!showTablePicker)}
            className="w-full flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] px-4 py-2.5 text-sm transition-all hover:border-[var(--accent-border)]"
          >
            <div className="flex items-center gap-2">
              <TableProperties className="h-4 w-4 text-[var(--text-3)]" />
              <span className={selectedTable ? "font-semibold text-[var(--text-1)]" : "text-[var(--text-3)]"}>
                {selectedTable ? `Table ${selectedTable}` : "Select table (optional)"}
              </span>
            </div>
            <ChevronDown className={`h-4 w-4 text-[var(--text-3)] transition-transform ${showTablePicker ? "rotate-180" : ""}`} />
          </button>
          <AnimatePresence>
            {showTablePicker && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="absolute top-full left-0 right-0 z-30 mt-1 rounded-xl border border-[var(--border)] bg-[var(--canvas)] shadow-lg overflow-hidden max-h-52 overflow-y-auto"
              >
                <button
                  onClick={() => { setSelectedTable(null); setShowTablePicker(false); }}
                  className="w-full px-4 py-2.5 text-left text-sm text-[var(--text-2)] hover:bg-[var(--canvas-sub)] transition-colors"
                >
                  No table (Takeaway)
                </button>
                {tables.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { setSelectedTable(t.tableNo); setShowTablePicker(false); }}
                    className={`w-full px-4 py-2.5 text-left text-sm font-medium hover:bg-[var(--accent-muted)] transition-colors ${
                      selectedTable === t.tableNo ? "bg-[var(--accent-muted)] text-[var(--accent-text)]" : "text-[var(--text-2)]"
                    }`}
                  >
                    Table {t.tableNo}{t.label ? ` — ${t.label}` : ""}
                    <span className="ml-1 text-xs text-[var(--text-3)]">({t.capacity} pax)</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <input
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          placeholder="Guest name (optional)"
          className="min-w-[160px] flex-1 rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)] focus:bg-[var(--canvas)] transition-all"
        />
      </div>

      <div className="flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-260px)]">
        <div className="flex-1 space-y-4">

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-3)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search menu items..."
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)] transition-all"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setActiveCategory("ALL")}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              activeCategory === "ALL" ? "bg-[var(--accent-hover)] text-white" : "bg-[var(--surface)] text-[var(--text-2)] hover:bg-[var(--surface-alt)]"
            }`}
          >
            All
          </button>
          {topCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                activeCategory === cat.id ? "bg-[var(--accent-hover)] text-white" : "bg-[var(--surface)] text-[var(--text-2)] hover:bg-[var(--surface-alt)]"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {!loading && filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-[var(--text-3)]">
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
                  className={`relative rounded-2xl border bg-[var(--canvas)] p-3 text-left shadow-sm transition-all hover:shadow-md ${
                    inCart ? "border-[var(--accent-border)] bg-[var(--accent-muted)]" : "border-[var(--border)]"
                  }`}
                >
                  {item.imageUrl && (
                    <img src={item.imageUrl} alt={item.name} className="mb-2 h-16 w-full rounded-xl object-cover" />
                  )}
                  <p className="text-xs font-bold text-[var(--text-1)] line-clamp-2">{item.name}</p>
                  <p className="mt-1 text-xs font-semibold text-[var(--accent-text)]">{formatPrice(item.price, "NPR")}</p>
                  {inCart && (
                    <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent-hover)] text-[10px] font-black text-white">
                      {inCart.quantity}
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      {/* Right: Cart & order details (table & guest live in the top bar) */}
      <div className="lg:w-80 space-y-4">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--canvas)] p-4">
          <label className="text-xs font-bold text-[var(--text-2)] uppercase tracking-wider block mb-1.5">Note</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. No spicy, extra sauce"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)] focus:bg-[var(--canvas)] transition-all"
          />
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--canvas)] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-soft)]">
            <h3 className="text-sm font-bold text-[var(--text-2)] flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Cart
              {cartCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent-muted)] text-[10px] font-bold text-[var(--accent-text)]">
                  {cartCount}
                </span>
              )}
            </h3>
            {cart.length > 0 && (
              <button onClick={() => setCart([])} className="text-xs text-red-400 hover:text-red-600 transition-colors">
                Clear
              </button>
            )}
          </div>

          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-[var(--text-3)]">
              <ShoppingCart className="h-8 w-8 mb-2" />
              <p className="text-xs font-medium">No items yet</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-[var(--border)] max-h-64 overflow-y-auto">
                {cart.map((item) => (
                  <div key={item.menuItemId} className="flex items-center justify-between px-4 py-2.5">
                    <div className="min-w-0 mr-2">
                      <p className="text-xs font-semibold text-[var(--text-1)] truncate">{item.name}</p>
                      <p className="text-xs text-[var(--text-3)]">{formatPrice(item.price, "NPR")}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => updateQty(item.menuItemId, -1)}
                        className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-alt)] transition-colors"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center text-xs font-bold">{item.quantity}</span>
                      <button
                        onClick={() => updateQty(item.menuItemId, 1)}
                        className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--accent-muted)] hover:bg-[var(--accent-muted)] text-[var(--accent-text)] transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-soft)] bg-[var(--canvas-sub)]">
                <span className="text-sm font-bold text-[var(--text-2)]">Total</span>
                <span className="text-base font-black text-[var(--text-1)]">{formatPrice(cartTotal, "NPR")}</span>
              </div>
            </>
          )}
        </div>

        <div className="space-y-2">
          <button
            onClick={() => handleSubmit("kitchen")}
            disabled={cart.length === 0}
            className="w-full rounded-xl bg-[var(--accent-hover)] py-3.5 text-sm font-bold text-white hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-[var(--accent)]/20/20"
          >
            <Send className="h-4 w-4" />
            {`Send to Kitchen · ${formatPrice(cartTotal, "NPR")}`}
          </button>

          <button
            onClick={() => handleSubmit("direct")}
            disabled={cart.length === 0}
            className="w-full rounded-xl border-2 border-blue-200 bg-blue-50 py-3 text-sm font-bold text-blue-700 hover:bg-blue-100 hover:border-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <PersonStanding className="h-4 w-4" />
            Direct — I&apos;ll go to kitchen
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
