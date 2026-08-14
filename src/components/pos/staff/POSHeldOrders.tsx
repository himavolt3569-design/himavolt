"use client";

import { motion, AnimatePresence } from "framer-motion";
import { PauseCircle, Play, Trash2, Clock } from "lucide-react";
import { formatPrice } from "@/lib/currency";
import { useToast } from "@/context/ToastContext";
import type { POSOrder } from "@/hooks/usePOSOrders";

interface Props {
  restaurantId: string;
  currency: string;
  orders: POSOrder[];
  onOptimisticUpdate: (orderId: string, patch: Partial<POSOrder>) => void;
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

export default function POSHeldOrders({ restaurantId, currency, orders, onOptimisticUpdate, onRecall }: Props) {
  const { showToast } = useToast();

  const heldOrders = orders.filter((o) => o.isHeld);

  const recallOrder = (order: POSOrder) => {
    // Optimistic: remove from held list instantly, navigate to register
    onOptimisticUpdate(order.id, { isHeld: false });
    onRecall(order);
    // API call in background
    staffFetch(`/api/restaurants/${restaurantId}/orders/held`, {
      method: "PATCH",
      body: JSON.stringify({ orderId: order.id, isHeld: false }),
    }).catch(() => {
      showToast(`Failed to recall order #${order.orderNo}`, "error");
    });
  };

  const voidOrder = (order: POSOrder) => {
    if (!confirm(`Void held order #${order.orderNo}?`)) return;
    // Optimistic: remove from held list instantly
    onOptimisticUpdate(order.id, { status: "CANCELLED", isHeld: false });
    staffFetch(`/api/restaurants/${restaurantId}/orders/${order.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "CANCELLED" }),
    }).catch(() => {
      showToast(`Failed to void order #${order.orderNo}`, "error");
    });
  };

  const timeSince = (dateStr: string) => {
    // Relative-time label; the list re-renders when held orders change, which
    // is what keeps these fresh.
    // eslint-disable-next-line react-hooks/purity
    const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
  };

  return (
    <div className="h-full bg-[var(--canvas-sub)] overflow-y-auto">
      <div className="px-6 py-5">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="rounded-xl bg-amber-100 p-2.5">
            <PauseCircle className="h-5 w-5 text-amber-700" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[var(--text-1)]">Held Orders</h2>
            <p className="text-xs text-[var(--text-3)] mt-0.5">Parked orders waiting to be recalled</p>
          </div>
        </div>

        {heldOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-[var(--text-3)]">
            <div className="rounded-full bg-[var(--surface)] p-4">
              <PauseCircle className="h-8 w-8 opacity-50" />
            </div>
            <p className="text-sm font-medium">No held orders</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence>
              {heldOrders.map((order) => (
                <motion.div
                  key={order.id}
                  layout
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  className="rounded-xl border border-amber-200 bg-[var(--canvas)] overflow-hidden shadow-sm"
                >
                  {/* Card header */}
                  <div className="px-4 py-3.5 border-b border-amber-100 bg-amber-50/60">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-[var(--text-1)]">#{order.orderNo}</span>
                      <div className="flex items-center gap-1.5 text-xs text-amber-600">
                        <Clock className="h-3 w-3" />
                        <span>{timeSince(order.createdAt)}</span>
                      </div>
                    </div>
                    {(order.guestName || order.tableNo) && (
                      <div className="flex items-center gap-2 text-xs text-[var(--text-2)]">
                        {order.guestName && <span>{order.guestName}</span>}
                        {order.tableNo && <span>Table {order.tableNo}</span>}
                      </div>
                    )}
                  </div>

                  {/* Card body */}
                  <div className="p-4 space-y-3">
                    <div className="space-y-1">
                      {order.items.slice(0, 5).map((item) => (
                        <p key={item.id} className="text-xs text-[var(--text-2)] leading-snug">
                          <span className="font-semibold text-[var(--text-1)]">{item.quantity}x</span> {item.name}
                        </p>
                      ))}
                      {order.items.length > 5 && (
                        <p className="text-xs text-[var(--text-3)]">+{order.items.length - 5} more items</p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-[var(--border-soft)]">
                      <p className="text-base font-bold text-amber-700">{formatPrice(order.total, currency)}</p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => recallOrder(order)}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-amber-600 py-2.5 text-xs font-semibold text-white hover:bg-amber-500 active:scale-95 transition-all"
                      >
                        <Play className="h-3.5 w-3.5" />
                        Recall
                      </button>
                      <button
                        onClick={() => voidOrder(order)}
                        className="flex items-center justify-center rounded-lg border border-red-100 bg-red-50 px-3 py-2.5 text-xs text-red-500 hover:bg-red-100 active:scale-95 transition-all"
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
    </div>
  );
}
