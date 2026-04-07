"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PauseCircle, Play, Trash2, Clock, Loader2 } from "lucide-react";
import { formatPrice } from "@/lib/currency";
import { useToast } from "@/context/ToastContext";
import type { POSOrder } from "@/hooks/usePOSOrders";

interface Props {
  restaurantId: string;
  currency: string;
  orders: POSOrder[];
  onRecall: (order: POSOrder) => void;
}

async function staffFetch<T = unknown>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...opts, credentials: "include", headers: { "Content-Type": "application/json", ...(opts?.headers || {}) } });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed" }));
    throw new Error(err.error || "Failed");
  }
  return res.json();
}

export default function POSHeldOrders({ restaurantId, currency, orders, onRecall }: Props) {
  const { showToast } = useToast();
  const [actionId, setActionId] = useState<string | null>(null);

  const heldOrders = orders.filter((o) => o.isHeld);

  const recallOrder = async (order: POSOrder) => {
    setActionId(order.id);
    try {
      await staffFetch(`/api/restaurants/${restaurantId}/orders/held`, {
        method: "PATCH",
        body: JSON.stringify({ orderId: order.id, isHeld: false }),
      });
      showToast(`Order #${order.orderNo} recalled`, "success");
      onRecall(order);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to recall", "error");
    } finally {
      setActionId(null);
    }
  };

  const voidOrder = async (order: POSOrder) => {
    if (!confirm(`Void held order #${order.orderNo}?`)) return;
    setActionId(order.id);
    try {
      await staffFetch(`/api/restaurants/${restaurantId}/orders/${order.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "CANCELLED" }),
      });
      showToast(`Order #${order.orderNo} cancelled`, "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to void", "error");
    } finally {
      setActionId(null);
    }
  };

  const timeSince = (dateStr: string) => {
    const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
  };

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <PauseCircle className="h-5 w-5 text-amber-700" />
        <div>
          <h2 className="text-lg font-bold text-gray-900">Held Orders</h2>
          <p className="text-xs text-gray-500">Parked orders waiting to be recalled</p>
        </div>
      </div>

      {heldOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-gray-400">
          <PauseCircle className="h-10 w-10 mb-2 opacity-40" />
          <p className="text-sm font-medium">No held orders</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence>
            {heldOrders.map((order) => (
              <motion.div
                key={order.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="rounded-xl border-2 border-amber-200 bg-amber-50 overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-amber-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-gray-900">#{order.orderNo}</span>
                    <div className="flex items-center gap-1 text-[10px] text-amber-700">
                      <Clock className="h-3 w-3" />
                      {timeSince(order.createdAt)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-600">
                    {order.guestName && <span>{order.guestName}</span>}
                    {order.tableNo && <span>Table {order.tableNo}</span>}
                  </div>
                </div>

                <div className="p-4 space-y-2">
                  {order.items.slice(0, 5).map((item) => (
                    <p key={item.id} className="text-xs text-gray-700">
                      <span className="font-semibold">{item.quantity}x</span> {item.name}
                    </p>
                  ))}
                  {order.items.length > 5 && (
                    <p className="text-xs text-gray-400">+{order.items.length - 5} more</p>
                  )}

                  <div className="pt-2 border-t border-amber-200">
                    <p className="text-sm font-bold text-amber-800">{formatPrice(order.total, currency)}</p>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => recallOrder(order)}
                      disabled={actionId === order.id}
                      className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-amber-600 py-2.5 text-xs font-bold text-white hover:bg-amber-500 disabled:opacity-50"
                    >
                      {actionId === order.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                      Recall
                    </button>
                    <button
                      onClick={() => voidOrder(order)}
                      disabled={actionId === order.id}
                      className="flex items-center justify-center gap-1 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-xs font-bold text-red-600 hover:bg-red-100 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
