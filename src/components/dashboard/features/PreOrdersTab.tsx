"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  X,
  Clock,
  Calendar,
  Phone,
  User,
  ShoppingBag,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  Check,
  Pause,
  Play,
  AlertCircle,
  Package,
  Timer,
  Search,
  Filter,
} from "lucide-react";

interface PreOrderItem {
  id: string;
  customerName: string;
  phone: string;
  items: string[];
  pickupDate: string;
  pickupTimeSlot: string;
  specialInstructions: string;
  depositAmount: number;
  totalAmount: number;
  status: "Pending" | "Baking" | "Ready" | "Picked Up";
  createdAt: string;
}

const BAKERY_ITEMS = [
  "Sourdough Bread",
  "Croissants",
  "Cinnamon Rolls",
  "Baguette",
  "Danish Pastry",
  "Chocolate Cake",
  "Blueberry Muffins",
  "Focaccia",
  "Brioche",
  "Rye Bread",
  "Scones",
  "Macarons",
];

const TIME_SLOTS = [
  "7:00 AM - 8:00 AM",
  "8:00 AM - 9:00 AM",
  "9:00 AM - 10:00 AM",
  "10:00 AM - 11:00 AM",
  "11:00 AM - 12:00 PM",
  "12:00 PM - 1:00 PM",
  "1:00 PM - 2:00 PM",
  "2:00 PM - 3:00 PM",
  "3:00 PM - 4:00 PM",
  "4:00 PM - 5:00 PM",
];

const STATUS_COLORS: Record<PreOrderItem["status"], string> = {
  Pending: "bg-amber-100 text-amber-700 border-amber-200",
  Baking: "bg-orange-100 text-orange-700 border-orange-200",
  Ready: "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Picked Up": "bg-gray-100 text-gray-500 border-gray-200",
};

const STATUS_FLOW: PreOrderItem["status"][] = ["Pending", "Baking", "Ready", "Picked Up"];

export default function PreOrdersTab() {
  const [orders, setOrders] = useState<PreOrderItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeView, setActiveView] = useState<"list" | "calendar">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<PreOrderItem["status"] | "All">("All");
  const [acceptingPreOrders, setAcceptingPreOrders] = useState(true);

  // Capacity settings
  const [maxOrdersPerDay, setMaxOrdersPerDay] = useState(20);
  const [maxOrdersPerSlot, setMaxOrdersPerSlot] = useState(5);
  const [notifyHoursBefore, setNotifyHoursBefore] = useState(2);

  // Form state
  const [formData, setFormData] = useState({
    customerName: "",
    phone: "",
    items: [] as string[],
    pickupDate: "",
    pickupTimeSlot: "",
    specialInstructions: "",
    depositAmount: 0,
    totalAmount: 0,
  });

  // Calendar state
  const [calendarMonth, setCalendarMonth] = useState(new Date(2026, 2)); // March 2026

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "All" || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateOrder = () => {
    if (!formData.customerName || !formData.pickupDate || formData.items.length === 0) return;
    const newOrder: PreOrderItem = {
      id: `PO-${String(orders.length + 1).padStart(3, "0")}`,
      ...formData,
      status: "Pending",
      createdAt: new Date().toISOString().split("T")[0],
    };
    setOrders([newOrder, ...orders]);
    setFormData({
      customerName: "",
      phone: "",
      items: [],
      pickupDate: "",
      pickupTimeSlot: "",
      specialInstructions: "",
      depositAmount: 0,
      totalAmount: 0,
    });
    setShowForm(false);
  };

  const updateOrderStatus = (id: string, direction: "next" | "prev") => {
    setOrders(
      orders.map((o) => {
        if (o.id !== id) return o;
        const idx = STATUS_FLOW.indexOf(o.status);
        if (direction === "next" && idx < STATUS_FLOW.length - 1) {
          return { ...o, status: STATUS_FLOW[idx + 1] };
        }
        if (direction === "prev" && idx > 0) {
          return { ...o, status: STATUS_FLOW[idx - 1] };
        }
        return o;
      })
    );
  };

  const toggleItemSelection = (item: string) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.includes(item)
        ? prev.items.filter((i) => i !== item)
        : [...prev.items, item],
    }));
  };

  // Calendar helpers
  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const getOrdersForDate = (day: number) => {
    const dateStr = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return orders.filter((o) => o.pickupDate === dateStr);
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(calendarMonth);
    const firstDay = getFirstDayOfMonth(calendarMonth);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dayOrders = getOrdersForDate(day);
      const isToday =
        day === 15 && calendarMonth.getMonth() === 2 && calendarMonth.getFullYear() === 2026;

      days.push(
        <div
          key={day}
          className={`h-24 border border-rose-100 rounded-lg p-1.5 ${
            isToday ? "bg-rose-50 border-rose-300" : "bg-white"
          }`}
        >
          <span
            className={`text-xs font-medium ${isToday ? "text-rose-600" : "text-gray-600"}`}
          >
            {day}
          </span>
          <div className="mt-1 space-y-0.5">
            {dayOrders.slice(0, 2).map((o) => (
              <div
                key={o.id}
                className={`text-[10px] px-1 py-0.5 rounded truncate ${STATUS_COLORS[o.status]}`}
              >
                {o.customerName.split(" ")[0]} - {o.pickupTimeSlot.split(" - ")[0]}
              </div>
            ))}
            {dayOrders.length > 2 && (
              <div className="text-[10px] text-gray-400 px-1">
                +{dayOrders.length - 2} more
              </div>
            )}
          </div>
        </div>
      );
    }

    return days;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Pre-Orders</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Schedule pickups for fresh baked goods
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAcceptingPreOrders(!acceptingPreOrders)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              acceptingPreOrders
                ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                : "bg-red-100 text-red-700 hover:bg-red-200"
            }`}
          >
            {acceptingPreOrders ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            {acceptingPreOrders ? "Accepting Orders" : "Orders Paused"}
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500 text-white hover:bg-rose-600 transition-colors text-sm font-medium shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Pre-Order
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white rounded-xl border border-rose-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Settings className="w-4 h-4 text-rose-500" />
                Capacity & Notification Settings
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Max Orders Per Day
                  </label>
                  <input
                    type="number"
                    value={maxOrdersPerDay}
                    onChange={(e) => setMaxOrdersPerDay(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Max Orders Per Time Slot
                  </label>
                  <input
                    type="number"
                    value={maxOrdersPerSlot}
                    onChange={(e) => setMaxOrdersPerSlot(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    <Bell className="w-3 h-3 inline mr-1" />
                    Notify Customer (hours before pickup)
                  </label>
                  <input
                    type="number"
                    value={notifyHoursBefore}
                    onChange={(e) => setNotifyHoursBefore(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View Toggle & Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveView("list")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeView === "list"
                ? "bg-rose-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <ShoppingBag className="w-4 h-4 inline mr-1.5" />
            Orders List
          </button>
          <button
            onClick={() => setActiveView("calendar")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeView === "calendar"
                ? "bg-rose-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <Calendar className="w-4 h-4 inline mr-1.5" />
            Calendar View
          </button>
        </div>

        {activeView === "list" && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as PreOrderItem["status"] | "All")}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white"
            >
              <option value="All">All Status</option>
              {STATUS_FLOW.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Calendar View */}
      {activeView === "calendar" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-rose-100 shadow-sm p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() =>
                setCalendarMonth(
                  new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1)
                )
              }
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h3 className="text-sm font-semibold text-gray-700">
              {calendarMonth.toLocaleString("default", { month: "long", year: "numeric" })}
            </h3>
            <button
              onClick={() =>
                setCalendarMonth(
                  new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1)
                )
              }
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">{renderCalendar()}</div>
        </motion.div>
      )}

      {/* Orders List */}
      {activeView === "list" && (
        <div className="space-y-3">
          <AnimatePresence>
            {filteredOrders.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12 bg-white rounded-xl border border-rose-100"
              >
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">No pre-orders found</p>
              </motion.div>
            ) : (
              filteredOrders.map((order, index) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white rounded-xl border border-rose-100 shadow-sm p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xs font-mono text-gray-400">{order.id}</span>
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${
                            STATUS_COLORS[order.status]
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>
                      <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                        <User className="w-4 h-4 text-rose-400" />
                        {order.customerName}
                      </h4>
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" />
                        {order.phone}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {order.items.map((item) => (
                          <span
                            key={item}
                            className="text-xs bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                      {order.specialInstructions && (
                        <p className="text-xs text-gray-500 mt-2 italic flex items-start gap-1">
                          <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0 text-amber-500" />
                          {order.specialInstructions}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-right">
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {order.pickupDate}
                        </p>
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {order.pickupTimeSlot}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-800">
                          ${order.totalAmount.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-400">
                          Deposit: ${order.depositAmount.toFixed(2)}
                        </p>
                      </div>
                      {order.status !== "Picked Up" && (
                        <div className="flex items-center gap-1.5 mt-1">
                          {order.status !== "Pending" && (
                            <button
                              onClick={() => updateOrderStatus(order.id, "prev")}
                              className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                            >
                              Back
                            </button>
                          )}
                          <button
                            onClick={() => updateOrderStatus(order.id, "next")}
                            className="text-xs px-3 py-1.5 rounded-lg bg-rose-500 text-white hover:bg-rose-600 transition-colors flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" />
                            {order.status === "Pending"
                              ? "Start Baking"
                              : order.status === "Baking"
                              ? "Mark Ready"
                              : "Picked Up"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      )}

      {/* New Pre-Order Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between p-5 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-800">New Pre-Order</h3>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Customer Name *
                    </label>
                    <input
                      type="text"
                      value={formData.customerName}
                      onChange={(e) =>
                        setFormData({ ...formData, customerName: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                      placeholder="Full name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Phone
                    </label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                      placeholder="555-0000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2">
                    Items *
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {BAKERY_ITEMS.map((item) => (
                      <button
                        key={item}
                        onClick={() => toggleItemSelection(item)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                          formData.items.includes(item)
                            ? "bg-rose-500 text-white border-rose-500"
                            : "bg-white text-gray-600 border-gray-200 hover:border-rose-300"
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Pickup Date *
                    </label>
                    <input
                      type="date"
                      value={formData.pickupDate}
                      onChange={(e) =>
                        setFormData({ ...formData, pickupDate: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Time Slot
                    </label>
                    <select
                      value={formData.pickupTimeSlot}
                      onChange={(e) =>
                        setFormData({ ...formData, pickupTimeSlot: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white"
                    >
                      <option value="">Select slot</option>
                      {TIME_SLOTS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Special Instructions
                  </label>
                  <textarea
                    value={formData.specialInstructions}
                    onChange={(e) =>
                      setFormData({ ...formData, specialInstructions: e.target.value })
                    }
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none"
                    placeholder="Any special requests..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Deposit Amount ($)
                    </label>
                    <input
                      type="number"
                      value={formData.depositAmount}
                      onChange={(e) =>
                        setFormData({ ...formData, depositAmount: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                      min={0}
                      step={0.01}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Total Amount ($)
                    </label>
                    <input
                      type="number"
                      value={formData.totalAmount}
                      onChange={(e) =>
                        setFormData({ ...formData, totalAmount: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                      min={0}
                      step={0.01}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100">
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateOrder}
                  className="px-5 py-2 rounded-xl bg-rose-500 text-white text-sm font-medium hover:bg-rose-600 transition-colors shadow-sm"
                >
                  Create Pre-Order
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
