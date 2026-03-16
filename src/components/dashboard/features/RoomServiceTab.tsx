"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BedDouble,
  Clock,
  Plus,
  ToggleLeft,
  ToggleRight,
  Utensils,
  Truck,
  CheckCircle2,
  ChefHat,
  Package,
  DollarSign,
  Trash2,
  Settings,
  X,
  Search,
} from "lucide-react";

type OrderStatus = "Received" | "Preparing" | "On the Way" | "Delivered";

interface RoomServiceOrder {
  id: string;
  roomNumber: string;
  items: { name: string; qty: number; price: number }[];
  timeOrdered: string;
  status: OrderStatus;
  assignedStaff: string;
  estimatedDelivery: string;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  availableForRoomService: boolean;
}

interface SurchargeSettings {
  type: "flat" | "percentage";
  value: number;
}

interface OperatingHours {
  start: string;
  end: string;
}

const STATUS_CONFIG: Record<
  OrderStatus,
  { bg: string; text: string; icon: typeof Clock }
> = {
  Received: { bg: "bg-orange-100", text: "text-orange-700", icon: Package },
  Preparing: { bg: "bg-amber-100", text: "text-amber-700", icon: ChefHat },
  "On the Way": { bg: "bg-blue-100", text: "text-blue-700", icon: Truck },
  Delivered: {
    bg: "bg-green-100",
    text: "text-green-700",
    icon: CheckCircle2,
  },
};

const STATUS_FLOW: OrderStatus[] = [
  "Received",
  "Preparing",
  "On the Way",
  "Delivered",
];

const STAFF_LIST = ["Rajan K.", "Sita M.", "Hari B.", "Anita G.", "Ram S."];

export default function RoomServiceTab() {
  const [is24_7, setIs24_7] = useState(true);
  const [operatingHours, setOperatingHours] = useState<OperatingHours>({
    start: "06:00",
    end: "23:00",
  });
  const [surcharge, setSurcharge] = useState<SurchargeSettings>({
    type: "flat",
    value: 5.0,
  });
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<RoomServiceOrder[]>([]);
  const [activeView, setActiveView] = useState<"orders" | "menu" | "settings">("orders");
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [newOrderRoom, setNewOrderRoom] = useState("");
  const [newOrderItems, setNewOrderItems] = useState<{ name: string; qty: number; price: number }[]>([]);
  const [menuSearch, setMenuSearch] = useState("");
  const [orderFilter, setOrderFilter] = useState<OrderStatus | "All">("All");

  const toggleMenuItemAvailability = (id: string) => {
    setMenuItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, availableForRoomService: !item.availableForRoomService }
          : item
      )
    );
  };

  const advanceOrderStatus = (orderId: string) => {
    setOrders((prev) =>
      prev.map((order) => {
        if (order.id !== orderId) return order;
        const idx = STATUS_FLOW.indexOf(order.status);
        if (idx < STATUS_FLOW.length - 1) {
          return { ...order, status: STATUS_FLOW[idx + 1] };
        }
        return order;
      })
    );
  };

  const assignStaff = (orderId: string, staff: string) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId ? { ...order, assignedStaff: staff } : order
      )
    );
  };

  const addItemToNewOrder = (item: MenuItem) => {
    setNewOrderItems((prev) => {
      const existing = prev.find((i) => i.name === item.name);
      if (existing) {
        return prev.map((i) =>
          i.name === item.name ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [...prev, { name: item.name, qty: 1, price: item.price }];
    });
  };

  const removeItemFromNewOrder = (name: string) => {
    setNewOrderItems((prev) => prev.filter((i) => i.name !== name));
  };

  const submitNewOrder = () => {
    if (!newOrderRoom || newOrderItems.length === 0) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    const estDelivery = new Date(now.getTime() + 30 * 60000);
    const estStr = estDelivery.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    const newOrder: RoomServiceOrder = {
      id: `rs${Date.now()}`,
      roomNumber: newOrderRoom,
      items: [...newOrderItems],
      timeOrdered: timeStr,
      status: "Received",
      assignedStaff: "Unassigned",
      estimatedDelivery: estStr,
    };
    setOrders((prev) => [newOrder, ...prev]);
    setNewOrderRoom("");
    setNewOrderItems([]);
    setShowNewOrder(false);
  };

  const filteredOrders =
    orderFilter === "All"
      ? orders
      : orders.filter((o) => o.status === orderFilter);

  const filteredMenu = menuItems.filter((item) =>
    item.name.toLowerCase().includes(menuSearch.toLowerCase())
  );

  const availableForOrder = menuItems.filter((m) => m.availableForRoomService);

  const activeOrders = orders.filter((o) => o.status !== "Delivered").length;
  const totalRevenue = orders.reduce(
    (sum, o) => sum + o.items.reduce((s, i) => s + i.price * i.qty, 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-stone-800">Room Service</h2>
          <p className="text-sm text-stone-500">
            Manage room service orders and menu availability
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowNewOrder(true)}
            className="flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-amber-700"
          >
            <Plus className="h-4 w-4" />
            New Order
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        {[
          {
            label: "Active Orders",
            value: activeOrders,
            icon: Package,
            color: "text-orange-600",
            bg: "bg-orange-50",
          },
          {
            label: "Today's Revenue",
            value: `$${totalRevenue.toFixed(2)}`,
            icon: DollarSign,
            color: "text-green-600",
            bg: "bg-green-50",
          },
          {
            label: "24/7 Service",
            value: is24_7 ? "Active" : "Scheduled",
            icon: Clock,
            color: "text-blue-600",
            bg: "bg-blue-50",
          },
          {
            label: "Menu Items",
            value: menuItems.filter((m) => m.availableForRoomService).length,
            icon: Utensils,
            color: "text-amber-600",
            bg: "bg-amber-50",
          },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-xl ${stat.bg} border border-stone-100 p-4 shadow-sm`}
          >
            <div className="flex items-center gap-3">
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
              <div>
                <p className="text-xs font-medium text-stone-500">
                  {stat.label}
                </p>
                <p className={`text-lg font-bold ${stat.color}`}>
                  {stat.value}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-1 rounded-xl bg-stone-100 p-1">
        {(["orders", "menu", "settings"] as const).map((view) => (
          <button
            key={view}
            onClick={() => setActiveView(view)}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium capitalize transition ${
              activeView === view
                ? "bg-white text-stone-800 shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            {view === "orders"
              ? "Active Orders"
              : view === "menu"
                ? "Menu Items"
                : "Settings"}
          </button>
        ))}
      </div>

      {/* Orders View */}
      <AnimatePresence mode="wait">
        {activeView === "orders" && (
          <motion.div
            key="orders"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Order Filter */}
            <div className="flex flex-wrap gap-2">
              {(["All", ...STATUS_FLOW] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setOrderFilter(status)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    orderFilter === status
                      ? "bg-amber-600 text-white"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                  }`}
                >
                  {status}
                  {status !== "All" && (
                    <span className="ml-1">
                      ({orders.filter((o) => o.status === status).length})
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Orders List */}
            <div className="space-y-3">
              {filteredOrders.map((order) => {
                const cfg = STATUS_CONFIG[order.status];
                const Icon = cfg.icon;
                const orderTotal = order.items.reduce(
                  (s, i) => s + i.price * i.qty,
                  0
                );
                return (
                  <motion.div
                    key={order.id}
                    layout
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                            <BedDouble className="h-5 w-5 text-amber-700" />
                          </div>
                          <div>
                            <p className="font-semibold text-stone-800">
                              Room {order.roomNumber}
                            </p>
                            <p className="text-xs text-stone-500">
                              Ordered at {order.timeOrdered}
                            </p>
                          </div>
                          <span
                            className={`ml-auto flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${cfg.bg} ${cfg.text}`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            {order.status}
                          </span>
                        </div>

                        <div className="rounded-lg bg-stone-50 p-3">
                          <p className="mb-2 text-xs font-medium text-stone-500">
                            Items
                          </p>
                          {order.items.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between py-1 text-sm"
                            >
                              <span className="text-stone-700">
                                {item.name} x{item.qty}
                              </span>
                              <span className="font-medium text-stone-800">
                                ${(item.price * item.qty).toFixed(2)}
                              </span>
                            </div>
                          ))}
                          <div className="mt-2 flex items-center justify-between border-t border-stone-200 pt-2 text-sm">
                            <span className="font-medium text-stone-600">
                              Total
                            </span>
                            <span className="font-bold text-stone-800">
                              ${orderTotal.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-stone-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            Est. delivery: {order.estimatedDelivery}
                          </span>
                          <span className="flex items-center gap-1">
                            Staff:{" "}
                            <select
                              value={order.assignedStaff}
                              onChange={(e) =>
                                assignStaff(order.id, e.target.value)
                              }
                              className="rounded border border-stone-200 bg-white px-2 py-0.5 text-xs text-stone-700"
                            >
                              <option value="Unassigned">Unassigned</option>
                              {STAFF_LIST.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </span>
                        </div>
                      </div>

                      {order.status !== "Delivered" && (
                        <button
                          onClick={() => advanceOrderStatus(order.id)}
                          className="rounded-lg bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-100"
                        >
                          {order.status === "Received"
                            ? "Start Preparing"
                            : order.status === "Preparing"
                              ? "Send Out"
                              : "Mark Delivered"}
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
              {filteredOrders.length === 0 && (
                <div className="rounded-xl bg-stone-50 py-12 text-center text-stone-400">
                  No orders matching this filter.
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Menu View */}
        {activeView === "menu" && (
          <motion.div
            key="menu"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Search menu items..."
                value={menuSearch}
                onChange={(e) => setMenuSearch(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-10 pr-4 text-sm text-stone-700 placeholder:text-stone-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
              />
            </div>

            <div className="space-y-2">
              {filteredMenu.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-5 py-4 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <Utensils className="h-4 w-4 text-stone-400" />
                    <div>
                      <p className="text-sm font-medium text-stone-800">
                        {item.name}
                      </p>
                      <p className="text-xs text-stone-500">
                        {item.category} &middot; ${item.price.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleMenuItemAvailability(item.id)}
                    className="flex items-center gap-2"
                  >
                    {item.availableForRoomService ? (
                      <ToggleRight className="h-7 w-7 text-amber-600" />
                    ) : (
                      <ToggleLeft className="h-7 w-7 text-stone-300" />
                    )}
                    <span
                      className={`text-xs font-medium ${item.availableForRoomService ? "text-amber-600" : "text-stone-400"}`}
                    >
                      {item.availableForRoomService ? "Available" : "Off"}
                    </span>
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Settings View */}
        {activeView === "settings" && (
          <motion.div
            key="settings"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* 24/7 Toggle */}
            <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-amber-600" />
                  <div>
                    <p className="font-medium text-stone-800">
                      24/7 Room Service
                    </p>
                    <p className="text-sm text-stone-500">
                      Allow room service orders around the clock
                    </p>
                  </div>
                </div>
                <button onClick={() => setIs24_7(!is24_7)}>
                  {is24_7 ? (
                    <ToggleRight className="h-8 w-8 text-amber-600" />
                  ) : (
                    <ToggleLeft className="h-8 w-8 text-stone-300" />
                  )}
                </button>
              </div>

              {!is24_7 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-4 flex items-center gap-4 border-t border-stone-100 pt-4"
                >
                  <div>
                    <label className="mb-1 block text-xs font-medium text-stone-500">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={operatingHours.start}
                      onChange={(e) =>
                        setOperatingHours((h) => ({
                          ...h,
                          start: e.target.value,
                        }))
                      }
                      className="rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-700 focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-stone-500">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={operatingHours.end}
                      onChange={(e) =>
                        setOperatingHours((h) => ({
                          ...h,
                          end: e.target.value,
                        }))
                      }
                      className="rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-700 focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                </motion.div>
              )}
            </div>

            {/* Surcharge Settings */}
            <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <DollarSign className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="font-medium text-stone-800">
                    Room Service Surcharge
                  </p>
                  <p className="text-sm text-stone-500">
                    Additional fee applied to room service orders
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex gap-1 rounded-lg bg-stone-100 p-1">
                  <button
                    onClick={() =>
                      setSurcharge((s) => ({ ...s, type: "flat" }))
                    }
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                      surcharge.type === "flat"
                        ? "bg-white text-stone-800 shadow-sm"
                        : "text-stone-500"
                    }`}
                  >
                    Flat Fee
                  </button>
                  <button
                    onClick={() =>
                      setSurcharge((s) => ({ ...s, type: "percentage" }))
                    }
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                      surcharge.type === "percentage"
                        ? "bg-white text-stone-800 shadow-sm"
                        : "text-stone-500"
                    }`}
                  >
                    Percentage
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">
                    {surcharge.type === "flat" ? "$" : ""}
                  </span>
                  <input
                    type="number"
                    value={surcharge.value}
                    onChange={(e) =>
                      setSurcharge((s) => ({
                        ...s,
                        value: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-24 rounded-lg border border-stone-200 py-2 pl-7 pr-3 text-sm text-stone-700 focus:border-amber-400 focus:outline-none"
                  />
                  {surcharge.type === "percentage" && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">
                      %
                    </span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Order Modal */}
      <AnimatePresence>
        {showNewOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setShowNewOrder(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
            >
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-bold text-stone-800">
                  New Room Service Order
                </h3>
                <button
                  onClick={() => setShowNewOrder(false)}
                  className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-stone-700">
                    Room Number
                  </label>
                  <input
                    type="text"
                    value={newOrderRoom}
                    onChange={(e) => setNewOrderRoom(e.target.value)}
                    placeholder="e.g., 301"
                    className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm text-stone-700 placeholder:text-stone-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-stone-700">
                    Select Items
                  </label>
                  <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-stone-200 p-2">
                    {availableForOrder.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => addItemToNewOrder(item)}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-stone-700 transition hover:bg-amber-50"
                      >
                        <span>{item.name}</span>
                        <span className="text-stone-400">
                          ${item.price.toFixed(2)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {newOrderItems.length > 0 && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-stone-700">
                      Order Items
                    </label>
                    <div className="space-y-1 rounded-xl bg-amber-50 p-3">
                      {newOrderItems.map((item) => (
                        <div
                          key={item.name}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-stone-700">
                            {item.name} x{item.qty}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-stone-800">
                              ${(item.price * item.qty).toFixed(2)}
                            </span>
                            <button
                              onClick={() => removeItemFromNewOrder(item.name)}
                              className="text-stone-400 hover:text-red-500"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={submitNewOrder}
                  disabled={!newOrderRoom || newOrderItems.length === 0}
                  className="w-full rounded-xl bg-amber-600 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Submit Order
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
