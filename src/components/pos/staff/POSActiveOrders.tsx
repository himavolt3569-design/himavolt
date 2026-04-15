"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, Clock, ChefHat, Truck, XCircle,
  Bell, Wifi, WifiOff,
} from "lucide-react";
import { formatPrice } from "@/lib/currency";
import type { SSEStatus } from "@/hooks/useSSE";
import type { POSOrder } from "@/hooks/usePOSOrders";

interface Props {
  restaurantId: string;
  currency: string;
  orders: POSOrder[];
  connectionStatus: SSEStatus;
  onOptimisticUpdate: (orderId: string, patch: Partial<POSOrder>) => void;
}

const STATUS_CONFIG: Record<string, { label: string; border: string; badge: string; icon: typeof Clock }> = {
  PENDING:   { label: "New",       border: "border-l-orange-400",  badge: "bg-orange-100 text-orange-700",  icon: Bell },
  ACCEPTED:  { label: "Accepted",  border: "border-l-blue-400",    badge: "bg-blue-100 text-blue-700",      icon: CheckCircle2 },
  PREPARING: { label: "Preparing", border: "border-l-amber-400",   badge: "bg-amber-100 text-amber-700",    icon: ChefHat },
  READY:     { label: "Ready",     border: "border-l-green-400",   badge: "bg-[#fef3dc] text-[#b25c1c]",    icon: CheckCircle2 },
  DELIVERED: { label: "Delivered", border: "border-l-gray-300",    badge: "bg-gray-100 text-gray-500",      icon: Truck },
  CANCELLED: { label: "Cancelled", border: "border-l-red-300",     badge: "bg-red-100 text-red-600",        icon: XCircle },
};

const FILTER_STATUSES = ["ALL", "PENDING", "ACCEPTED", "PREPARING", "READY", "DELIVERED"];

async function staffFetch<T = unknown>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...opts, credentials: "include", headers: { "Content-Type": "application/json", ...(opts?.headers || {}) } });
  if (!res.ok) {
    let msg = "Request failed";
    try { const body = await res.json(); if (body?.error) msg = body.error; } catch { /* ignore */ }
    throw new Error(msg);
  }
  return res.json();
}

export default function POSActiveOrders({ restaurantId, currency, orders, connectionStatus, onOptimisticUpdate }: Props) {
  const [filter, setFilter] = useState("ALL");

  const [toast, setToast] = useState<string | null>(null);

  const updateStatus = async (orderId: string, status: string) => {
    onOptimisticUpdate(orderId, { status });
    try {
      await staffFetch(`/api/restaurants/${restaurantId}/orders/${orderId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
    } catch (err) {
      // Show error — SSE will reconcile the true state
      const msg = err instanceof Error ? err.message : "Action failed";
      setToast(msg);
      setTimeout(() => setToast(null), 4000);
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
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="shrink-0 px-6 pt-5 pb-4 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Active Orders</h2>
          <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
            connectionStatus === "connected"
              ? "bg-[#fef9ef] text-[#b25c1c]"
              : connectionStatus === "connecting"
              ? "bg-amber-50 text-amber-700"
              : "bg-red-50 text-red-600"
          }`}>
            {connectionStatus === "connected"
              ? <Wifi className="h-3 w-3" />
              : <WifiOff className="h-3 w-3" />}
            {connectionStatus === "connected"
              ? "Live"
              : connectionStatus === "connecting"
              ? "Connecting"
              : "Reconnecting"}
          </span>
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {FILTER_STATUSES.map((s) => {
            const count = s === "ALL" ? orders.length : orders.filter((o) => o.status === s).length;
            const active = filter === s;
            return (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold border transition-all ${
                  active
                    ? "bg-amber-600 text-white border-amber-600"
                    : "bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700"
                }`}
              >
                {s === "ALL" ? "All" : (STATUS_CONFIG[s]?.label ?? s)}
                <span className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                  active ? "bg-white/25 text-white" : "bg-gray-100 text-gray-500"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Orders grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-gray-400">
            <p className="text-sm">No orders{filter !== "ALL" ? ` with status ${STATUS_CONFIG[filter]?.label ?? filter}` : ""}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence>
              {filtered.map((order) => {
                const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.PENDING;
                const Icon = cfg.icon;
                const next = nextStatus[order.status];
                return (
                  <motion.div
                    key={order.id}
                    layout
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    className={`rounded-xl border border-gray-200 border-l-4 ${cfg.border} bg-white overflow-hidden shadow-sm`}
                  >
                    {/* Card header */}
                    <div className="px-4 pt-3.5 pb-3 border-b border-gray-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-gray-900">#{order.orderNo}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${cfg.badge}`}>
                          {cfg.label}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <Clock className="h-3 w-3" />
                          <span>{timeAgo(order.createdAt)}</span>
                        </div>
                        <span className="text-sm font-bold text-amber-700">{formatPrice(order.total, currency)}</span>
                      </div>
                    </div>

                    {/* Card body */}
                    <div className="px-4 py-3 space-y-2">
                      {(order.tableNo || order.guestName) && (
                        <div className="flex items-center gap-2 text-xs text-gray-500 pb-1.5 border-b border-gray-50">
                          {order.tableNo && <span className="font-medium">Table {order.tableNo}</span>}
                          {order.guestName && <span className="truncate">{order.guestName}</span>}
                        </div>
                      )}

                      <div className="space-y-1">
                        {order.items.slice(0, 4).map((item) => (
                          <p key={item.id} className="text-xs text-gray-600 leading-snug">
                            <span className="font-semibold text-gray-800">{item.quantity}x</span> {item.name}
                          </p>
                        ))}
                        {order.items.length > 4 && (
                          <p className="text-xs text-gray-400">+{order.items.length - 4} more items</p>
                        )}
                      </div>

                      {next && (() => {
                        const isUnpaid = order.status === "PENDING" && order.payment && order.payment.status !== "COMPLETED";
                        return isUnpaid ? (
                          <div className="pt-2 space-y-2">
                            <div className={`rounded-lg p-2 text-[10px] font-semibold ${
                              order.payment?.status === "AWAITING_VERIFICATION"
                                ? "bg-blue-50 text-blue-700 border border-blue-100"
                                : order.payment?.status === "FAILED" || order.payment?.status === "EXPIRED" || order.payment?.status === "CANCELLED"
                                ? "bg-red-50 text-red-700 border border-red-100"
                                : "bg-amber-50 text-amber-700 border border-amber-100"
                            }`}>
                              {order.payment?.status === "AWAITING_VERIFICATION" ? "Verification Pending"
                                : order.payment?.status === "FAILED" ? "Payment Failed"
                                : order.payment?.status === "EXPIRED" ? "Payment Expired"
                                : order.payment?.status === "CANCELLED" ? "Payment Cancelled"
                                : "Payment Pending"} — {order.payment?.method}
                            </div>
                            <button
                              onClick={() => updateStatus(order.id, "REJECTED")}
                              className="w-full rounded-lg bg-red-50 border border-red-100 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2 pt-2">
                            {order.status === "PENDING" && (
                              <button
                                onClick={() => updateStatus(order.id, "REJECTED")}
                                className="flex-1 rounded-lg bg-red-50 border border-red-100 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors"
                              >
                                Reject
                              </button>
                            )}
                            <button
                              onClick={() => updateStatus(order.id, next)}
                              className="flex-1 rounded-lg bg-amber-600 py-2 text-xs font-semibold text-white hover:bg-amber-500 transition-colors"
                            >
                              {actionLabels[order.status]}
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Error toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-xl max-w-sm text-center"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
