"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  ChefHat,
  PackageCheck,
  Truck,
  X,
  AlertTriangle,
  ArrowLeft,
  Loader2,
  Timer,
  ClipboardCheck,
} from "lucide-react";
import { useOrder, type OrderStatus as OrderStatusType } from "@/context/OrderContext";
import { formatPrice } from "@/lib/currency";
import gsap from "gsap";

const STEPS: { label: string; icon: typeof Clock }[] = [
  { label: "Placed",    icon: CheckCircle2   },
  { label: "Accepted",  icon: ClipboardCheck },
];

function statusToStep(status: OrderStatusType): number {
  switch (status) {
    case "PENDING":   return 0;
    case "ACCEPTED":  return 1;
    default:          return -1;
  }
}

export default function OrderStatus({ onClose, currency = "NPR" }: { onClose: () => void; currency?: string }) {
  const { activeOrder, cancelOrder } = useOrder();
  const [showCancel, setShowCancel] = useState(false);
  const clockRef = useRef<HTMLDivElement>(null);
  const handRef = useRef<HTMLDivElement>(null);

  const currentIdx = activeOrder ? statusToStep(activeOrder.status) : -1;
  const isCancelled =
    activeOrder?.status === "REJECTED";

  useEffect(() => {}, [activeOrder?.status]);

  if (!activeOrder) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--canvas)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  const handleCancel = () => {
    cancelOrder();
    setShowCancel(false);
    onClose();
  };

  return (
    <div className="min-h-screen bg-[var(--canvas)]">
      <div className="sticky top-0 z-10 flex items-center justify-between bg-[var(--canvas)] border-b border-[var(--border-soft)] px-5 py-4">
        <button
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--text-2)] hover:bg-[var(--surface-alt)] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="text-center">
          <h2 className="text-sm font-bold text-[var(--text-1)]">Order #{activeOrder.orderNo}</h2>
          <p className="text-[11px] text-[var(--text-3)]">Live tracking</p>
        </div>
        <div className="w-9" />
      </div>

      <div className="mx-auto max-w-lg px-5 py-8 space-y-8">
        <div className="text-center">
          {isCancelled ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 15, stiffness: 200 }}
              className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100 mb-4"
            >
              <AlertTriangle className="h-10 w-10 text-red-500" />
            </motion.div>
          ) : activeOrder.status === "ACCEPTED" ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 15, stiffness: 200 }}
              className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[var(--text-1)] mb-4"
            >
              <CheckCircle2 className="h-10 w-10 text-white" />
            </motion.div>
          ) : (
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[var(--accent-muted)] mb-4">
              {(() => {
                const Icon = STEPS[currentIdx]?.icon ?? Clock;
                return <Icon className="h-10 w-10 text-[var(--accent)]" />;
              })()}
            </div>
          )}

          <h2 className="text-xl font-bold text-[var(--text-1)]">
            {isCancelled
              ? "Order Rejected"
              : activeOrder.status === "PENDING"
                ? "Order Placed"
                : "Order Accepted"}
          </h2>
          <p className="mt-1 text-sm text-[var(--text-3)]">
            {activeOrder.status === "PENDING"   && "Waiting for the restaurant to confirm…"}
            {activeOrder.status === "ACCEPTED"  && "Your order has been confirmed!"}
            {activeOrder.status === "REJECTED"  && "The restaurant was unable to fulfil your order"}
          </p>
        </div>

        <div className="flex items-start justify-between gap-1">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            const isActive = !isCancelled && i <= currentIdx;
            const isCurrent = !isCancelled && i === currentIdx;

            return (
              <div key={i} className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                <div className="relative">
                  <motion.div
                    initial={false}
                    animate={{
                      scale: isCurrent ? 1.15 : 1,
                      backgroundColor: isActive ? "#3e1e0c" : "#f3f4f6",
                    }}
                    transition={{ type: "spring", damping: 20 }}
                    className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full"
                  >
                    <Icon
                      className={`h-4 w-4 ${isActive ? "text-white" : "text-[var(--text-3)]"}`}
                    />
                  </motion.div>
                  {isCurrent && (
                    <motion.div
                      animate={{ scale: [1, 1.6, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-0 rounded-full bg-[var(--text-1)]"
                    />
                  )}
                </div>
                <span
                  className={`text-[9px] font-bold text-center leading-tight ${
                    isActive ? "text-[var(--text-1)]" : "text-[var(--text-3)]"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        <div className="relative h-1.5 rounded-full bg-[var(--surface-alt)] overflow-hidden">
          <motion.div
            initial={false}
            animate={{ width: `${((currentIdx + 1) / STEPS.length) * 100}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute inset-y-0 left-0 rounded-full bg-[var(--text-1)]"
          />
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--canvas-sub)] p-5 space-y-3">
          <h3 className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider">
            Order Summary
          </h3>
          {activeOrder.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between py-1.5">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent-muted)] text-[10px] font-bold text-[var(--accent)]">
                  {item.quantity}
                </span>
                <span className="text-sm font-medium text-[var(--text-1)]">{item.name}</span>
              </div>
              <span className="text-sm font-bold text-[var(--text-2)]">
                {formatPrice(item.price * item.quantity, currency)}
              </span>
            </div>
          ))}
          <div className="border-t border-[var(--border)] pt-3 flex items-center justify-between">
            <span className="text-sm font-bold text-[var(--text-1)]">Total</span>
            <span className="text-base font-extrabold text-[var(--accent)]">
              {formatPrice(activeOrder.total, currency)}
            </span>
          </div>
        </div>

        {!isCancelled && activeOrder.status === "PENDING" && (
          <button
            onClick={() => setShowCancel(true)}
            className="w-full rounded-xl border-2 border-red-200 py-3.5 text-sm font-bold text-red-500 transition-all hover:bg-red-50 active:scale-[0.98]"
          >
            Cancel Order
          </button>
        )}
      </div>

      <AnimatePresence>
        {showCancel && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCancel(false)}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring" as const, damping: 25 }}
              className="fixed left-1/2 top-1/2 z-50 w-[90%] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-[var(--canvas)] p-6 shadow-2xl"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
                  <AlertTriangle className="h-7 w-7 text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-[var(--text-1)]">Cancel Order?</h3>
                <p className="text-sm text-[var(--text-2)]">
                  This action cannot be undone. Your order will be cancelled immediately.
                </p>
                <div className="flex w-full gap-3">
                  <button
                    onClick={() => setShowCancel(false)}
                    className="flex-1 rounded-xl border border-[var(--border)] py-3 text-sm font-bold text-[var(--text-2)] hover:bg-[var(--canvas-sub)] transition-colors"
                  >
                    Keep Order
                  </button>
                  <button
                    onClick={handleCancel}
                    className="flex-1 rounded-xl bg-red-500 py-3 text-sm font-bold text-white hover:bg-red-600 transition-colors"
                  >
                    Yes, Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
