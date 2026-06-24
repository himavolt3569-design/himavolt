"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  Plus,
  Trash2,
  Clock,
  ChevronRight,
  ToggleLeft,
  ToggleRight,
  Hash,
  Users,
  Timer,
  Bell,
  CheckCircle2,
  Loader2,
  Package,
  Search,
  X,
  ShoppingCart,
  Send,
  ChefHat,
  Receipt,
} from "lucide-react";
import { useRestaurant } from "@/context/RestaurantContext";
import { useLiveOrders, type LiveOrder } from "@/context/LiveOrdersContext";
import { apiFetch } from "@/lib/api-client";
import { useToast } from "@/context/ToastContext";
import { formatPrice } from "@/lib/currency";

interface CounterStation {
  id: string;
  name: string;
  active: boolean;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  categoryId: string;
  isAvailable: boolean;
}

interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
}

export default function QuickCounterTab() {
  const { selectedRestaurant, restaurants } = useRestaurant();
  const { orders, acceptOrder, rejectOrder, refresh, updatingIds } = useLiveOrders();
  const { showToast } = useToast();
  const restaurant = selectedRestaurant ?? restaurants[0];

  const [quickCounterEnabled, setQuickCounterEnabled] = useState(true);
  const [tokenSystemEnabled, setTokenSystemEnabled] = useState(true);
  const [avgPickupTime, setAvgPickupTime] = useState(8);
  const [stations, setStations] = useState<CounterStation[]>([]);
  const [newStationName, setNewStationName] = useState("");

  const [showNewOrder, setShowNewOrder] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [guestName, setGuestName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Filter live orders to counter-relevant ones (TAKEAWAY type, active statuses)
  const counterOrders = orders.filter(
    (o) =>
      (o.type === "TAKEAWAY" || o.type === "COUNTER") &&
      o.status !== "ACCEPTED" &&
      o.status !== "REJECTED",
  );

  const pendingOrders = counterOrders.filter((o) => o.status === "PENDING");
  const activeOrders = counterOrders.filter((o) => ["ACCEPTED"].includes(o.status));
  const readyOrders = counterOrders.filter((o) => o.status === "ACCEPTED");

  const estimatedWait =
    activeOrders.length > 0 && stations.filter((s) => s.active).length > 0
      ? Math.round((activeOrders.length * avgPickupTime) / stations.filter((s) => s.active).length)
      : 0;

  const fetchMenu = useCallback(async () => {
    if (!restaurant) return;
    setLoadingMenu(true);
    try {
      const data = await apiFetch<MenuItem[]>(`/api/restaurants/${restaurant.id}/menu?isDrink=false`);
      setMenuItems(Array.isArray(data) ? data.filter((i) => i.isAvailable) : []);
    } catch {
      /* ignore */
    } finally {
      setLoadingMenu(false);
    }
  }, [restaurant?.id]);

  useEffect(() => {
    if (showNewOrder && menuItems.length === 0) fetchMenu();
  }, [showNewOrder]);

  const addStation = () => {
    if (!newStationName.trim()) return;
    setStations((prev) => [...prev, { id: Date.now().toString(), name: newStationName.trim(), active: true }]);
    setNewStationName("");
  };

  const removeStation = (id: string) => setStations((prev) => prev.filter((s) => s.id !== id));
  const toggleStation = (id: string) =>
    setStations((prev) => prev.map((s) => (s.id === id ? { ...s, active: !s.active } : s)));

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === item.id);
      if (existing) return prev.map((c) => (c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c));
      return [...prev, { menuItemId: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
  };

  const removeFromCart = (menuItemId: string) => setCart((prev) => prev.filter((c) => c.menuItemId !== menuItemId));

  const cartTotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);

  const handleCreateOrder = async () => {
    if (!restaurant || cart.length === 0) return;
    setSubmitting(true);
    try {
      await apiFetch(`/api/restaurants/${restaurant.id}/orders`, {
        method: "POST",
        body: {
          type: "TAKEAWAY",
          paymentMethod: "DIRECT",
          guestName: guestName.trim() || undefined,
          items: cart.map((c) => ({ menuItemId: c.menuItemId, quantity: c.quantity })),
        },
      });
      showToast("Counter order created!");
      setCart([]);
      setGuestName("");
      setSearch("");
      setShowNewOrder(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to create order", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleForwardKitchen = async (order: LiveOrder) => {
    await acceptOrder(order.id);
    showToast(`Order #${order.orderNo} forwarded to kitchen`);
  };


  const filteredMenu = menuItems.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()),
  );

  const statusColor = (status: string) => {
    switch (status) {
      case "PENDING": return "bg-[var(--accent)] text-[var(--accent)]";
      case "ACCEPTED": return "bg-blue-100 text-blue-700";
      case "PREPARING": return "bg-[var(--accent-muted)] text-[var(--accent-text)]";
      case "READY": return "bg-[var(--accent-muted)] text-[var(--accent-text)]";
      default: return "bg-[var(--surface)] text-[var(--text-2)]";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[var(--accent-muted)] rounded-xl">
            <Zap className="w-6 h-6 text-[var(--accent-text)]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--text-1)]">Quick Counter</h2>
            <p className="text-sm text-[var(--text-2)]">Fast order processing & pickup flow</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowNewOrder(true)}
            className="flex items-center gap-2 rounded-xl bg-[var(--accent-hover)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--accent-hover)] shadow-md shadow-[var(--accent)]/20/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            New Order
          </button>
          <button
            onClick={() => setQuickCounterEnabled(!quickCounterEnabled)}
            className="flex items-center gap-2 text-sm font-medium"
          >
            {quickCounterEnabled ? (
              <ToggleRight className="w-8 h-8 text-[var(--accent)]" />
            ) : (
              <ToggleLeft className="w-8 h-8 text-[var(--text-3)]" />
            )}
            <span className={quickCounterEnabled ? "text-[var(--accent-text)]" : "text-[var(--text-3)]"}>
              {quickCounterEnabled ? "Active" : "Inactive"}
            </span>
          </button>
        </div>
      </div>

      {quickCounterEnabled && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Pending", value: pendingOrders.length, icon: Package, color: "text-[var(--accent)] bg-[var(--accent)]" },
              { label: "Ready for Pickup", value: readyOrders.length, icon: Bell, color: "text-[var(--accent-text)] bg-[var(--accent-muted)]" },
              { label: "Est. Wait", value: `${estimatedWait} min`, icon: Timer, color: "text-[var(--accent)] bg-[var(--accent)]" },
              { label: "Active Counters", value: stations.filter((s) => s.active).length, icon: Users, color: "text-blue-600 bg-blue-50" },
            ].map((stat) => (
              <motion.div
                key={stat.label}
                whileHover={{ scale: 1.02 }}
                className="bg-[var(--canvas)] border border-[var(--border-soft)] rounded-xl p-4 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${stat.color}`}>
                    <stat.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-2)]">{stat.label}</p>
                    <p className="text-lg font-bold text-[var(--text-1)]">{stat.value}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[var(--canvas)] border border-[var(--border-soft)] rounded-xl p-5 shadow-sm space-y-5">
              <h3 className="text-sm font-semibold text-[var(--text-2)] uppercase tracking-wide">Settings</h3>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--text-2)] flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[var(--accent)]" />
                  Average Pickup Time (minutes)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={1}
                    max={30}
                    value={avgPickupTime}
                    onChange={(e) => setAvgPickupTime(Number(e.target.value))}
                    className="flex-1 accent-[var(--accent)]"
                  />
                  <span className="text-lg font-bold text-[var(--accent-text)] w-12 text-center">{avgPickupTime}</span>
                </div>
              </div>
              <div className="flex items-center justify-between py-3 border-t border-[var(--border-soft)]">
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-[var(--accent)]" />
                  <span className="text-sm font-medium text-[var(--text-2)]">Token / Ticket Number System</span>
                </div>
                <button onClick={() => setTokenSystemEnabled(!tokenSystemEnabled)}>
                  {tokenSystemEnabled ? (
                    <ToggleRight className="w-7 h-7 text-[var(--accent)]" />
                  ) : (
                    <ToggleLeft className="w-7 h-7 text-[var(--text-3)]" />
                  )}
                </button>
              </div>
            </div>

            <div className="bg-[var(--canvas)] border border-[var(--border-soft)] rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-[var(--text-2)] uppercase tracking-wide">Counter Stations</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Counter 3"
                  value={newStationName}
                  onChange={(e) => setNewStationName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addStation()}
                  className="flex-1 border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)]"
                />
                <button
                  onClick={addStation}
                  className="px-3 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                <AnimatePresence>
                  {stations.map((station) => (
                    <motion.div
                      key={station.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center justify-between bg-[var(--canvas-sub)] rounded-lg px-3 py-2"
                    >
                      <span className="text-sm font-medium text-[var(--text-2)]">{station.name}</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => toggleStation(station.id)}>
                          {station.active ? (
                            <ToggleRight className="w-6 h-6 text-[var(--accent)]" />
                          ) : (
                            <ToggleLeft className="w-6 h-6 text-[var(--text-3)]" />
                          )}
                        </button>
                        <button
                          onClick={() => removeStation(station.id)}
                          className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {stations.length === 0 && (
                  <p className="text-xs text-[var(--text-3)] text-center py-4">No stations added yet</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-[var(--canvas)] border border-[var(--border-soft)] rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border-soft)]">
              <h3 className="text-sm font-semibold text-[var(--text-2)] uppercase tracking-wide">
                Counter Orders
                {counterOrders.length > 0 && (
                  <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent-muted)] text-[10px] font-bold text-[var(--accent-text)]">
                    {counterOrders.length}
                  </span>
                )}
              </h3>
            </div>

            {counterOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-[var(--text-3)]">
                <ShoppingCart className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm font-medium">No active counter orders</p>
                <p className="text-xs mt-1">New orders from the counter will appear here</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                <AnimatePresence>
                  {counterOrders.map((order) => {
                    const busy = updatingIds.has(order.id);
                    return (
                      <motion.div
                        key={order.id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, x: 40 }}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 hover:bg-[var(--surface)]/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          {tokenSystemEnabled && (
                            <div className="w-10 h-10 rounded-lg bg-[var(--accent-muted)] flex items-center justify-center shrink-0">
                              <span className="text-sm font-bold text-[var(--accent-text)]">#{order.orderNo}</span>
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[var(--text-1)]">
                              {order.user?.name ?? order.items.map((i) => i.name).join(", ")}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-[var(--text-3)]">{formatPrice(order.total, "NPR")}</span>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusColor(order.status)}`}>
                                {order.status}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {order.status === "PENDING" && (
                            <button
                              onClick={() => handleForwardKitchen(order)}
                              disabled={busy}
                              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                            >
                              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <ChefHat className="h-3 w-3" />}
                              Kitchen
                            </button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {showNewOrder && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowNewOrder(false); setCart([]); setSearch(""); }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[95%] max-w-lg rounded-2xl bg-[var(--canvas)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-soft)] shrink-0">
                <h3 className="text-base font-bold text-[var(--text-1)]">New Counter Order</h3>
                <button
                  onClick={() => { setShowNewOrder(false); setCart([]); setSearch(""); }}
                  className="rounded-full p-2 text-[var(--text-3)] hover:bg-[var(--surface)] transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="overflow-y-auto flex-1">
                <div className="p-5 space-y-4">
                  <div>
                    <label className="text-xs font-bold text-[var(--text-2)] uppercase tracking-wider block mb-1.5">Guest Name (optional)</label>
                    <input
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="e.g. Table 3, John"
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)] focus:bg-[var(--canvas)] transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[var(--text-2)] uppercase tracking-wider block mb-1.5">Add Items</label>
                    <div className="relative mb-2">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-3)]" />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search menu items..."
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)] focus:bg-[var(--canvas)] transition-all"
                      />
                    </div>

                    {loadingMenu ? (
                      <div className="flex justify-center py-6">
                        <Loader2 className="h-5 w-5 animate-spin text-[var(--text-3)]" />
                      </div>
                    ) : (
                      <div className="max-h-48 overflow-y-auto space-y-1 rounded-xl border border-[var(--border-soft)] bg-[var(--canvas-sub)] p-2">
                        {filteredMenu.length === 0 ? (
                          <p className="text-xs text-[var(--text-3)] text-center py-4">No items found</p>
                        ) : (
                          filteredMenu.slice(0, 20).map((item) => {
                            const inCart = cart.find((c) => c.menuItemId === item.id);
                            return (
                              <button
                                key={item.id}
                                onClick={() => addToCart(item)}
                                className="w-full flex items-center justify-between rounded-lg px-3 py-2 hover:bg-[var(--canvas)] transition-colors text-left"
                              >
                                <span className="text-sm font-medium text-[var(--text-1)]">{item.name}</span>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-xs text-[var(--text-2)]">{formatPrice(item.price, "NPR")}</span>
                                  {inCart ? (
                                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent-muted)] text-[10px] font-bold text-[var(--accent-text)]">
                                      {inCart.quantity}
                                    </span>
                                  ) : (
                                    <Plus className="h-3.5 w-3.5 text-[var(--text-3)]" />
                                  )}
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>

                  {cart.length > 0 && (
                    <div>
                      <label className="text-xs font-bold text-[var(--text-2)] uppercase tracking-wider block mb-1.5">Order Summary</label>
                      <div className="rounded-xl border border-[var(--border)] divide-y divide-[var(--border)] overflow-hidden">
                        {cart.map((item) => (
                          <div key={item.menuItemId} className="flex items-center justify-between px-4 py-2.5 bg-[var(--canvas)]">
                            <div>
                              <p className="text-sm font-semibold text-[var(--text-1)]">{item.name}</p>
                              <p className="text-xs text-[var(--text-3)]">{formatPrice(item.price, "NPR")} × {item.quantity}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-[var(--accent-text)]">{formatPrice(item.price * item.quantity, "NPR")}</span>
                              <button
                                onClick={() => removeFromCart(item.menuItemId)}
                                className="rounded-lg p-1 text-red-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                        <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--canvas-sub)]">
                          <span className="text-sm font-bold text-[var(--text-2)]">Total</span>
                          <span className="text-base font-black text-[var(--text-1)]">{formatPrice(cartTotal, "NPR")}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="px-5 pb-5 pt-2 border-t border-[var(--border-soft)] shrink-0">
                <button
                  onClick={handleCreateOrder}
                  disabled={cart.length === 0 || submitting}
                  className="w-full rounded-xl bg-[var(--accent-hover)] py-3 text-sm font-bold text-white hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {submitting ? "Creating..." : `Create Order · ${formatPrice(cartTotal, "NPR")}`}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
