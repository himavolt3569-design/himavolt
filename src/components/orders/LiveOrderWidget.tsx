"use client";

import { useOrder } from "@/context/OrderContext";
import { formatPrice } from "@/lib/currency";
import { Clock, CheckCircle2, ChefHat, XCircle, UtensilsCrossed } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export default function LiveOrderWidget({ currency = "NPR" }: { currency?: string }) {
  const { activeOrder } = useOrder();

  if (!activeOrder) return null;

  const ks = activeOrder.kitchenStatus;
  const isRejected = activeOrder.status === "REJECTED" || ks === "REJECTED";
  
  let statusInfo = { text: "Order Placed", color: "text-[var(--text-1)]", bg: "bg-[var(--surface-alt)]", icon: Clock };
  
  if (isRejected) {
    statusInfo = { text: "Rejected", color: "text-red-600", bg: "bg-red-100", icon: XCircle };
  } else if (ks === "SERVED" || activeOrder.status === "ACCEPTED" || activeOrder.status === "COMPLETED") {
    statusInfo = { text: "Served / Completed", color: "text-[var(--accent)]", bg: "bg-[var(--accent-muted)]", icon: CheckCircle2 };
  } else if (ks === "READY") {
    statusInfo = { text: "Ready to Serve", color: "text-blue-600", bg: "bg-blue-100", icon: UtensilsCrossed };
  } else if (ks === "PREPARING") {
    statusInfo = { text: "Preparing Now", color: "text-amber-600", bg: "bg-amber-100", icon: ChefHat };
  } else if (ks === "ACCEPTED") {
    statusInfo = { text: "Kitchen Accepted", color: "text-[var(--text-1)]", bg: "bg-[var(--surface)]", icon: CheckCircle2 };
  }

  const Icon = statusInfo.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 rounded-2xl border border-[var(--accent-border)] bg-gradient-to-b from-[var(--canvas)] to-[var(--accent-muted)] shadow-[0_4px_24px_rgba(27,166,114,0.08)] overflow-hidden"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--accent-border)] bg-white/50">
        <div className="flex items-center gap-2">
          <div className="relative">
            {!isRejected && statusInfo.text !== "Served / Completed" && (
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent)]"></span>
              </span>
            )}
            <Icon className={`h-5 w-5 ${statusInfo.color}`} />
          </div>
          <div>
            <h3 className="text-sm font-black text-[var(--text-1)] tracking-tight">Live Tracker</h3>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-3)]">
              {activeOrder.orderNo}
            </p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-bold ${statusInfo.bg} ${statusInfo.color}`}>
          {statusInfo.text}
        </div>
      </div>

      <div className="p-5 space-y-3 max-h-[220px] overflow-y-auto">
        <AnimatePresence>
          {activeOrder.items.map((item: any, i: number) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center justify-between text-sm"
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-[var(--text-2)]">{item.quantity}×</span>
                <span className="font-medium text-[var(--text-1)]">{item.name}</span>
              </div>
              <span className="font-semibold text-[var(--text-3)]">{formatPrice(item.price * item.quantity, currency)}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="px-5 py-3 border-t border-[var(--accent-border)] bg-white/60">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-[var(--text-2)]">Total</span>
          <span className="text-base font-black text-[var(--text-1)]">{formatPrice(activeOrder.total, currency)}</span>
        </div>
        {activeOrder.trackToken && (
          <Link
            href={`/order-track/${activeOrder.trackToken}`}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] py-3 text-xs font-bold text-white transition-all hover:bg-[var(--accent-hover)] shadow-md shadow-[var(--accent)]/20 active:scale-[0.98]"
          >
            Open Full Tracking Page
          </Link>
        )}
      </div>
    </motion.div>
  );
}
