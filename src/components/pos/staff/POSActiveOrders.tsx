"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw, CheckCircle2, Clock, ChefHat, Truck, XCircle,
  Filter, Bell,
} from "lucide-react";
import { formatPrice } from "@/lib/currency";
import { playSound } from "@/lib/sounds";

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

interface LiveOrder {
  id: string;
  orderNo: string;
  tableNo: number | null;
  guestName: string | null;
  status: string;
  total: number;
  type: string;
  note: string | null;
  createdAt: string;
  items: OrderItem[];
  payment?: { method: string; status: string } | null;
}

interface Props {
  restaurantId: string;
  currency: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  PENDING: { label: "New", color: "bg-orange-100 text-orange-700 border-orange-200", icon: Bell },
  ACCEPTED: { label: "Accepted", color: "bg-blue-100 text-blue-700 border-blue-200", icon: CheckCircle2 },
  PREPARING: { label: "Preparing", color: "bg-amber-100 text-amber-700 border-amber-200", icon: ChefHat },
  READY: { label: "Ready", color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle2 },
  DELIVERED: { label: "Delivered", color: "bg-gray-100 text-gray-600 border-gray-200", icon: Truck },
  CANCELLED: { label: "Cancelled", color: "bg-red-100 text-red-600 border-red-200", icon: XCircle },
};

const FILTER_STATUSES = ["ALL", "PENDING", "ACCEPTED", "PREPARING", "READY", "DELIVERED"];

async function staffFetch<T = unknown>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...opts, credentials: "include", headers: { "Content-Type": "application/json", ...(opts?.headers || {}) } });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

export default function POSActiveOrders({ restaurantId, currency }: Props) {
  const [orders, setOrders] = useState<LiveOrder[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const prevCountRef = useCallback(() => orders.filter((o) => o.status === "PENDING").length, [orders]);

  const fetchOrders = useCallback(async () => {
    try {
      const data = await staffFetch<LiveOrder[]>(`/api/restaurants/${restaurantId}/orders?live=1&limit=50`);
      const arr = Array.isArray(data) ? data : [];
      // Play sound for new PENDING orders
      const newPending = arr.filter((o) => o.status === "PENDING").length;
      if (newPending > prevCountRef()) {
        playSound("newOrder");
      }
      setOrders(arr);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    fetchOrders();
    const id = setInterval(fetchOrders, 10000);
    return () => clearInterval(id);
  }, [fetchOrders]);

  const updateStatus = async (orderId: string, status: string) => {
    try {
      await staffFetch(`/api/restaurants/${restaurantId}/orders/${orderId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status } : o));
    } catch {
      // silent
    }
  };

  const timeAgo = (dateStr: string) => {
    const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
  };

  const filtered = filter === "ALL" ? orders : orders.filter((o) => o.status === filter);

  const nextStatus: Record<string, string> = {
    PENDING: "ACCEPTED",
    ACCEPTED: "PREPARING",
    PREPARING: "READY",
    READY: "DELIVERED",
  };

  const actionLabels: Record<string, string> = {
    PENDING: "Accept",
    ACCEPTED: "Start Preparing",
    PREPARING: "Mark Ready",
    READY: "Mark Delivered",
  };

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h2 className="text-lg font-bold text-gray-900">Active Orders</h2>
        <button
          onClick={fetchOrders}
          className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-200"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 shrink-0 overflow-x-auto scrollbar-hide">
        {FILTER_STATUSES.map((s) => {
          const count = s === "ALL" ? orders.length : orders.filter((o) => o.status === s).length;
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                filter === s ? "bg-amber-700 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {s === "ALL" ? "All" : STATUS_CONFIG[s]?.label ?? s}
              <span className={`inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                filter === s ? "bg-white/20 text-white" : "bg-gray-200 text-gray-600"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Orders grid */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl border border-gray-100 bg-gray-100 h-48" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <p className="text-sm">No orders{filter !== "ALL" ? ` with status ${filter}` : ""}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            <AnimatePresence>
              {filtered.map((order) => {
                const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.PENDING;
                const Icon = cfg.icon;
                const next = nextStatus[order.status];
                return (
                  <motion.div
                    key={order.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm"
                  >
                    {/* Status header */}
                    <div className={`flex items-center justify-between px-3 py-2 border-b ${cfg.color}`}>
                      <div className="flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5" />
                        <span className="text-xs font-bold">{cfg.label}</span>
                      </div>
                      <span className="text-[10px] font-medium">{timeAgo(order.createdAt)}</span>
                    </div>

                    <div className="p-3 space-y-2">
                      {/* Order info */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-black text-gray-900">#{order.orderNo}</span>
                        <span className="text-xs font-bold text-amber-700">{formatPrice(order.total, currency)}</span>
                      </div>

                      {(order.tableNo || order.guestName) && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          {order.tableNo && <span>Table {order.tableNo}</span>}
                          {order.guestName && <span>{order.guestName}</span>}
                        </div>
                      )}

                      {/* Items */}
                      <div className="space-y-0.5">
                        {order.items.slice(0, 4).map((item) => (
                          <p key={item.id} className="text-xs text-gray-600">
                            <span className="font-semibold">{item.quantity}x</span> {item.name}
                          </p>
                        ))}
                        {order.items.length > 4 && (
                          <p className="text-xs text-gray-400">+{order.items.length - 4} more</p>
                        )}
                      </div>

                      {/* Action buttons */}
                      {next && (
                        <div className="flex gap-2 pt-1">
                          {order.status === "PENDING" && (
                            <button
                              onClick={() => updateStatus(order.id, "REJECTED")}
                              className="flex-1 rounded-lg bg-red-50 py-2 text-xs font-bold text-red-600 hover:bg-red-100 transition-colors"
                            >
                              Reject
                            </button>
                          )}
                          <button
                            onClick={() => updateStatus(order.id, next)}
                            className="flex-1 rounded-lg bg-amber-600 py-2 text-xs font-bold text-white hover:bg-amber-500 transition-colors"
                          >
                            {actionLabels[order.status]}
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
