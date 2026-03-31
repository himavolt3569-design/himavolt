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
  const { orders, acceptOrder, markReady, markDelivered, updatingIds } = useLiveOrders();
  const { showToast } = useToast();
  const restaurant = selectedRestaurant ?? restaurants[0];

  const [quickCounterEnabled, setQuickCounterEnabled] = useState(true);
  const [tokenSystemEnabled, setTokenSystemEnabled] = useState(true);
  const [avgPickupTime, setAvgPickupTime] = useState(8);
  const [stations, setStations] = useState<CounterStation[]>([]);
  const [newStationName, setNewStationName] = useState("");

  // New order form state
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
      o.status !== "DELIVERED" &&
      o.status !== "REJECTED" &&
      o.status !== "CANCELLED",
  );

  const pendingOrders = counterOrders.filter((o) => o.status === "PENDING");
  const activeOrders = counterOrders.filter((o) => ["ACCEPTED", "PREPARING"].includes(o.status));
  const readyOrders = counterOrders.filter((o) => o.status === "READY");

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

  const handleForwardBilling = async (order: LiveOrder) => {
    await markReady(order.id);
    showToast(`Order #${order.orderNo} sent to billing`);
  };

  const handleMarkDelivered = async (order: LiveOrder) => {
    await markDelivered(order.id);
  };

  const filteredMenu = menuItems.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()),
  );

  const statusColor = (status: string) => {
    switch (status) {
      case "PENDING": return "bg-orange-100 text-orange-700";
      case "ACCEPTED": return "bg-blue-100 text-blue-700";
      case "PREPARING": return "bg-amber-100 text-amber-700";
      case "READY": return "bg-green-100 text-green-700";
      default: return "bg-gray-100 text-gray-500";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-100 rounded-xl">
            <Zap className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Quick Counter</h2>
            <p className="text-sm text-gray-500">Fast order processing & pickup flow</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowNewOrder(true)}
            className="flex items-center gap-2 rounded-xl bg-amber-700 px-4 py-2 text-sm font-bold text-white hover:bg-amber-600 shadow-md shadow-amber-700/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            New Order
          </button>
          <button
            onClick={() => setQuickCounterEnabled(!quickCounterEnabled)}
            className="flex items-center gap-2 text-sm font-medium"
          >
            {quickCounterEnabled ? (
              <ToggleRight className="w-8 h-8 text-amber-500" />
            ) : (
              <ToggleLeft className="w-8 h-8 text-gray-400" />
            )}
            <span className={quickCounterEnabled ? "text-amber-600" : "text-gray-400"}>
              {quickCounterEnabled ? "Active" : "Inactive"}
            </span>
          </button>
        </div>
      </div>

      {quickCounterEnabled && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {/* Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Pending", value: pendingOrders.length, icon: Package, color: "text-orange-600 bg-orange-50" },
              { label: "Ready for Pickup", value: readyOrders.length, icon: Bell, color: "text-green-600 bg-green-50" },
              { label: "Est. Wait", value: `${estimatedWait} min`, icon: Timer, color: "text-orange-600 bg-orange-50" },
              { label: "Active Counters", value: stations.filter((s) => s.active).length, icon: Users, color: "text-blue-600 bg-blue-50" },
            ].map((stat) => (
              <motion.div
                key={stat.label}
                whileHover={{ scale: 1.02 }}
                className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${stat.color}`}>
                    <stat.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{stat.label}</p>
                    <p className="text-lg font-bold text-gray-900">{stat.value}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Settings Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Settings */}
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-5">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Settings</h3>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  Average Pickup Time (minutes)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={1}
                    max={30}
                    value={avgPickupTime}
                    onChange={(e) => setAvgPickupTime(Number(e.target.value))}
                    className="flex-1 accent-amber-500"
                  />
                  <span className="text-lg font-bold text-amber-600 w-12 text-center">{avgPickupTime}</span>
                </div>
              </div>
              <div className="flex items-center justify-between py-3 border-t border-gray-50">
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium text-gray-700">Token / Ticket Number System</span>
                </div>
                <button onClick={() => setTokenSystemEnabled(!tokenSystemEnabled)}>
                  {tokenSystemEnabled ? (
                    <ToggleRight className="w-7 h-7 text-amber-500" />
                  ) : (
                    <ToggleLeft className="w-7 h-7 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Counter Stations */}
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Counter Stations</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Counter 3"
                  value={newStationName}
                  onChange={(e) => setNewStationName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addStation()}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
                <button
                  onClick={addStation}
                  className="px-3 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
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
                      className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
                    >
                      <span className="text-sm font-medium text-gray-700">{station.name}</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => toggleStation(station.id)}>
                          {station.active ? (
                            <ToggleRight className="w-6 h-6 text-amber-500" />
                          ) : (
                            <ToggleLeft className="w-6 h-6 text-gray-400" />
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
                  <p className="text-xs text-gray-400 text-center py-4">No stations added yet</p>
                )}
              </div>
            </div>
          </div>

          {/* Live Counter Orders */}
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Counter Orders
                {counterOrders.length > 0 && (
                  <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700">
                    {counterOrders.length}
                  </span>
                )}
              </h3>
            </div>

            {counterOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <ShoppingCart className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm font-medium">No active counter orders</p>
                <p className="text-xs mt-1">New orders from the counter will appear here</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
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
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 hover:bg-gray-50/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          {tokenSystemEnabled && (
                            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                              <span className="text-sm font-bold text-amber-700">#{order.orderNo}</span>
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-800">
                              {order.user?.name ?? order.items.map((i) => i.name).join(", ")}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-gray-400">{formatPrice(order.total, "NPR")}</span>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusColor(order.status)}`}>
                                {order.status}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Forwarding buttons */}
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
                          {(order.status === "ACCEPTED" || order.status === "PREPARING") && (
                            <button
                              onClick={() => handleForwardBilling(order)}
                              disabled={busy}
                              className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                            >
                              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Receipt className="h-3 w-3" />}
                              Billing
                            </button>
                          )}
                          {order.status === "READY" && (
                            <button
                              onClick={() => handleMarkDelivered(order)}
                              disabled={busy}
                              className="flex items-center gap-1.5 rounded-lg bg-gray-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-gray-800 disabled:opacity-50 transition-colors"
                            >
                              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                              Delivered
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

      {/* New Order Modal */}
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
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[95%] max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
                <h3 className="text-base font-bold text-amber-950">New Counter Order</h3>
                <button
                  onClick={() => { setShowNewOrder(false); setCart([]); setSearch(""); }}
                  className="rounded-full p-2 text-gray-400 hover:bg-gray-100 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="overflow-y-auto flex-1">
                <div className="p-5 space-y-4">
                  {/* Guest name */}
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Guest Name (optional)</label>
                    <input
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="e.g. Table 3, John"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#eaa94d]/30 focus:bg-white transition-all"
                    />
                  </div>

                  {/* Menu search */}
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Add Items</label>
                    <div className="relative mb-2">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search menu items..."
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#eaa94d]/30 focus:bg-white transition-all"
                      />
                    </div>

                    {loadingMenu ? (
                      <div className="flex justify-center py-6">
                        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                      </div>
                    ) : (
                      <div className="max-h-48 overflow-y-auto space-y-1 rounded-xl border border-gray-100 bg-gray-50 p-2">
                        {filteredMenu.length === 0 ? (
                          <p className="text-xs text-gray-400 text-center py-4">No items found</p>
                        ) : (
                          filteredMenu.slice(0, 20).map((item) => {
                            const inCart = cart.find((c) => c.menuItemId === item.id);
                            return (
                              <button
                                key={item.id}
                                onClick={() => addToCart(item)}
                                className="w-full flex items-center justify-between rounded-lg px-3 py-2 hover:bg-white transition-colors text-left"
                              >
                                <span className="text-sm font-medium text-gray-800">{item.name}</span>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-xs text-gray-500">{formatPrice(item.price, "NPR")}</span>
                                  {inCart ? (
                                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700">
                                      {inCart.quantity}
                                    </span>
                                  ) : (
                                    <Plus className="h-3.5 w-3.5 text-gray-400" />
                                  )}
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>

                  {/* Cart */}
                  {cart.length > 0 && (
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Order Summary</label>
                      <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
                        {cart.map((item) => (
                          <div key={item.menuItemId} className="flex items-center justify-between px-4 py-2.5 bg-white">
                            <div>
                              <p className="text-sm font-semibold text-gray-800">{item.name}</p>
                              <p className="text-xs text-gray-400">{formatPrice(item.price, "NPR")} × {item.quantity}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-amber-700">{formatPrice(item.price * item.quantity, "NPR")}</span>
                              <button
                                onClick={() => removeFromCart(item.menuItemId)}
                                className="rounded-lg p-1 text-red-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50">
                          <span className="text-sm font-bold text-gray-700">Total</span>
                          <span className="text-base font-black text-amber-950">{formatPrice(cartTotal, "NPR")}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 pb-5 pt-2 border-t border-gray-100 shrink-0">
                <button
                  onClick={handleCreateOrder}
                  disabled={cart.length === 0 || submitting}
                  className="w-full rounded-xl bg-amber-700 py-3 text-sm font-bold text-white hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
