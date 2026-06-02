"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Truck,
  Clock,
  ChevronUp,
  ChevronDown,
  Package,
  Gauge,
  ToggleLeft,
  ToggleRight,
  Users,
  Timer,
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  MapPin,
  Zap,
  TrendingUp,
} from "lucide-react";
import NotPersistedBanner from "./_NotPersistedBanner";

type DeliveryStatus =
  | "Preparing"
  | "Ready for Pickup"
  | "Out for Delivery"
  | "Delivered";

interface DeliveryOrder {
  id: string;
  orderNumber: string;
  items: string[];
  customerAddress: string;
  deliveryPartner: string;
  status: DeliveryStatus;
  timeElapsedMin: number;
  priority: number;
}

const STATUS_COLORS: Record<DeliveryStatus, string> = {
  Preparing: "bg-[var(--accent-muted)] text-[var(--accent-text)]",
  "Ready for Pickup": "bg-blue-100 text-blue-700",
  "Out for Delivery": "bg-violet-100 text-violet-700",
  Delivered: "bg-[var(--accent-muted)] text-[var(--accent-text)]",
};

const STATUS_ICONS: Record<DeliveryStatus, React.ReactNode> = {
  Preparing: <Clock className="w-3.5 h-3.5" />,
  "Ready for Pickup": <Package className="w-3.5 h-3.5" />,
  "Out for Delivery": <Truck className="w-3.5 h-3.5" />,
  Delivered: <CheckCircle2 className="w-3.5 h-3.5" />,
};

const DELIVERY_PARTNERS = [
  "Rajesh K.",
  "Sita M.",
  "Arjun P.",
  "Deepa S.",
  "Unassigned",
];

export default function DeliveryOpsTab() {
  const [deliveryOnly, setDeliveryOnly] = useState(true);
  const [autoAccept, setAutoAccept] = useState(false);
  const [peakThrottle, setPeakThrottle] = useState(false);
  const [maxOrdersPerHour, setMaxOrdersPerHour] = useState(30);
  const [maxConcurrent, setMaxConcurrent] = useState(15);
  const [currentLoad, setCurrentLoad] = useState(9);
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [avgDeliveryTime] = useState(34);

  const loadPercent = Math.min(
    Math.round((currentLoad / maxConcurrent) * 100),
    100
  );

  const movePriority = (index: number, direction: "up" | "down") => {
    const newOrders = [...orders];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newOrders.length) return;
    [newOrders[index], newOrders[swapIndex]] = [
      newOrders[swapIndex],
      newOrders[index],
    ];
    newOrders.forEach((o, i) => (o.priority = i + 1));
    setOrders(newOrders);
  };

  const updateStatus = (id: string, status: DeliveryStatus) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status } : o))
    );
  };

  const assignPartner = (id: string, partner: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, deliveryPartner: partner } : o))
    );
  };

  const activeOrders = orders.filter((o) => o.status !== "Delivered");
  const deliveredCount = orders.filter((o) => o.status === "Delivered").length;

  return (
    <div className="space-y-6">
      <NotPersistedBanner />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-1)]">
            Delivery Operations
          </h2>
          <p className="text-sm text-[var(--text-2)] mt-1">
            Manage delivery-only kitchen operations
          </p>
        </div>
        <div className="flex items-center gap-2 bg-violet-50 px-4 py-2 rounded-xl">
          <Truck className="w-5 h-5 text-violet-600" />
          <span className="text-sm font-semibold text-violet-700">
            {activeOrders.length} Active Orders
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          layout
          className="bg-[var(--canvas)] rounded-xl shadow-sm border border-[var(--border-soft)] p-5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-100 rounded-lg">
                <Truck className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text-1)]">
                  Delivery-Only Mode
                </p>
                <p className="text-xs text-[var(--text-2)]">
                  No dine-in or pickup
                </p>
              </div>
            </div>
            <button
              onClick={() => setDeliveryOnly(!deliveryOnly)}
              className="focus:outline-none"
            >
              {deliveryOnly ? (
                <ToggleRight className="w-10 h-10 text-violet-600" />
              ) : (
                <ToggleLeft className="w-10 h-10 text-[var(--text-3)]" />
              )}
            </button>
          </div>
        </motion.div>

        <motion.div
          layout
          className="bg-[var(--canvas)] rounded-xl shadow-sm border border-[var(--border-soft)] p-5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[var(--accent-muted)] rounded-lg">
                <Zap className="w-5 h-5 text-[var(--accent-text)]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text-1)]">
                  Auto-Accept Orders
                </p>
                <p className="text-xs text-[var(--text-2)]">
                  Instantly accept incoming
                </p>
              </div>
            </div>
            <button
              onClick={() => setAutoAccept(!autoAccept)}
              className="focus:outline-none"
            >
              {autoAccept ? (
                <ToggleRight className="w-10 h-10 text-[var(--accent-text)]" />
              ) : (
                <ToggleLeft className="w-10 h-10 text-[var(--text-3)]" />
              )}
            </button>
          </div>
        </motion.div>

        <motion.div
          layout
          className="bg-[var(--canvas)] rounded-xl shadow-sm border border-[var(--border-soft)] p-5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[var(--accent-muted)] rounded-lg">
                <AlertTriangle className="w-5 h-5 text-[var(--accent-text)]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text-1)]">
                  Peak Hour Throttle
                </p>
                <p className="text-xs text-[var(--text-2)]">
                  Limit: {maxOrdersPerHour}/hr
                </p>
              </div>
            </div>
            <button
              onClick={() => setPeakThrottle(!peakThrottle)}
              className="focus:outline-none"
            >
              {peakThrottle ? (
                <ToggleRight className="w-10 h-10 text-[var(--accent-text)]" />
              ) : (
                <ToggleLeft className="w-10 h-10 text-[var(--text-3)]" />
              )}
            </button>
          </div>
          {peakThrottle && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-3 pt-3 border-t border-[var(--border-soft)]"
            >
              <label className="text-xs text-[var(--text-2)]">
                Max orders per hour
              </label>
              <input
                type="number"
                value={maxOrdersPerHour}
                onChange={(e) =>
                  setMaxOrdersPerHour(Number(e.target.value) || 1)
                }
                className="mt-1 w-full px-3 py-1.5 border border-[var(--border)] rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
              />
            </motion.div>
          )}
        </motion.div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[var(--canvas)] rounded-xl shadow-sm border border-[var(--border-soft)] p-4 text-center">
          <TrendingUp className="w-5 h-5 text-violet-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-[var(--text-1)]">{avgDeliveryTime}</p>
          <p className="text-xs text-[var(--text-2)]">Avg Delivery (min)</p>
        </div>
        <div className="bg-[var(--canvas)] rounded-xl shadow-sm border border-[var(--border-soft)] p-4 text-center">
          <CircleDot className="w-5 h-5 text-blue-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-[var(--text-1)]">
            {activeOrders.length}
          </p>
          <p className="text-xs text-[var(--text-2)]">In Progress</p>
        </div>
        <div className="bg-[var(--canvas)] rounded-xl shadow-sm border border-[var(--border-soft)] p-4 text-center">
          <CheckCircle2 className="w-5 h-5 text-[var(--accent-hover)] mx-auto mb-1" />
          <p className="text-2xl font-bold text-[var(--text-1)]">{deliveredCount}</p>
          <p className="text-xs text-[var(--text-2)]">Delivered Today</p>
        </div>
        <div className="bg-[var(--canvas)] rounded-xl shadow-sm border border-[var(--border-soft)] p-4 text-center">
          <Users className="w-5 h-5 text-[var(--accent)] mx-auto mb-1" />
          <p className="text-2xl font-bold text-[var(--text-1)]">
            {DELIVERY_PARTNERS.length - 1}
          </p>
          <p className="text-xs text-[var(--text-2)]">Active Partners</p>
        </div>
      </div>

      <motion.div
        layout
        className="bg-[var(--canvas)] rounded-xl shadow-sm border border-[var(--border-soft)] p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-100 rounded-lg">
              <Gauge className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-1)]">
                Kitchen Capacity
              </h3>
              <p className="text-xs text-[var(--text-2)]">
                {currentLoad} of {maxConcurrent} concurrent orders
              </p>
            </div>
          </div>
          <span
            className={`text-sm font-bold ${
              loadPercent > 80
                ? "text-red-600"
                : loadPercent > 50
                ? "text-[var(--accent-text)]"
                : "text-[var(--accent-text)]"
            }`}
          >
            {loadPercent}%
          </span>
        </div>

        <div className="w-full bg-[var(--surface)] rounded-full h-4 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${loadPercent}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={`h-full rounded-full ${
              loadPercent > 80
                ? "bg-red-500"
                : loadPercent > 50
                ? "bg-[var(--accent)]"
                : "bg-violet-500"
            }`}
          />
        </div>

        <div className="flex items-center gap-4 mt-4">
          <div className="flex-1">
            <label className="text-xs text-[var(--text-2)]">Max Concurrent</label>
            <input
              type="number"
              value={maxConcurrent}
              onChange={(e) =>
                setMaxConcurrent(Math.max(1, Number(e.target.value) || 1))
              }
              className="mt-1 w-full px-3 py-1.5 border border-[var(--border)] rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-[var(--text-2)]">Current Load</label>
            <input
              type="number"
              value={currentLoad}
              onChange={(e) =>
                setCurrentLoad(
                  Math.max(0, Math.min(maxConcurrent, Number(e.target.value) || 0))
                )
              }
              className="mt-1 w-full px-3 py-1.5 border border-[var(--border)] rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
            />
          </div>
        </div>
      </motion.div>

      {/* Active Delivery Orders / Priority Queue */}
      <motion.div
        layout
        className="bg-[var(--canvas)] rounded-xl shadow-sm border border-[var(--border-soft)] p-6"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 bg-violet-100 rounded-lg">
            <Package className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-1)]">
              Order Priority Queue
            </h3>
            <p className="text-xs text-[var(--text-2)]">
              Reorder with arrows, update status, assign partners
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {orders.map((order, idx) => (
              <motion.div
                key={order.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className={`border rounded-xl p-4 ${
                  order.status === "Delivered"
                    ? "border-[var(--border-soft)] bg-[var(--canvas-sub)] opacity-60"
                    : "border-[var(--border)] bg-[var(--canvas)]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center gap-0.5 pt-1">
                    <button
                      onClick={() => movePriority(idx, "up")}
                      disabled={idx === 0}
                      className="p-0.5 rounded hover:bg-violet-100 disabled:opacity-20 disabled:cursor-not-allowed text-[var(--text-3)] hover:text-violet-600 transition-colors"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-bold text-[var(--text-3)] w-5 text-center">
                      {idx + 1}
                    </span>
                    <button
                      onClick={() => movePriority(idx, "down")}
                      disabled={idx === orders.length - 1}
                      className="p-0.5 rounded hover:bg-violet-100 disabled:opacity-20 disabled:cursor-not-allowed text-[var(--text-3)] hover:text-violet-600 transition-colors"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-[var(--text-1)] text-sm">
                        {order.orderNumber}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          STATUS_COLORS[order.status]
                        }`}
                      >
                        {STATUS_ICONS[order.status]}
                        {order.status}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-[var(--text-3)]">
                        <Timer className="w-3 h-3" />
                        {order.timeElapsedMin}m
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-2)] mt-1 truncate">
                      {order.items.join(", ")}
                    </p>
                    <div className="flex items-center gap-1 mt-1 text-xs text-[var(--text-2)]">
                      <MapPin className="w-3 h-3" />
                      {order.customerAddress}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    <select
                      value={order.status}
                      onChange={(e) =>
                        updateStatus(
                          order.id,
                          e.target.value as DeliveryStatus
                        )
                      }
                      className="text-xs border border-[var(--border)] rounded-lg px-2 py-1 focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none bg-[var(--canvas)]"
                    >
                      <option value="Preparing">Preparing</option>
                      <option value="Ready for Pickup">Ready for Pickup</option>
                      <option value="Out for Delivery">Out for Delivery</option>
                      <option value="Delivered">Delivered</option>
                    </select>
                    <select
                      value={order.deliveryPartner}
                      onChange={(e) =>
                        assignPartner(order.id, e.target.value)
                      }
                      className="text-xs border border-[var(--border)] rounded-lg px-2 py-1 focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none bg-[var(--canvas)]"
                    >
                      {DELIVERY_PARTNERS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
