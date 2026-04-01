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

function CountdownTimer({
  estimatedTime,
  startedAt,
}: {
  estimatedTime: number;
  startedAt: string;
}) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    function calc() {
      const start = new Date(startedAt).getTime();
      const end = start + estimatedTime * 60 * 1000;
      const diff = Math.max(0, Math.floor((end - Date.now()) / 1000));
      setRemaining(diff);
    }
    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [estimatedTime, startedAt]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const progress = Math.max(0, Math.min(1, 1 - remaining / (estimatedTime * 60)));

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-24 w-24">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="#f3f4f6" strokeWidth="6" />
          <motion.circle
            cx="50" cy="50" r="42" fill="none" stroke="#eaa94d" strokeWidth="6"
            strokeLinecap="round" strokeDasharray={264}
            animate={{ strokeDashoffset: 264 * (1 - progress) }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Timer className="h-3.5 w-3.5 text-[#eaa94d] mb-0.5" />
          <span className="text-xl font-black text-[#3e1e0c] tabular-nums">
            {mins}:{secs.toString().padStart(2, "0")}
          </span>
          <span className="text-[10px] font-medium text-gray-400">remaining</span>
        </div>
      </div>
      {remaining === 0 && (
        <p className="mt-2 text-xs font-bold text-[#eaa94d]">Should be ready any moment!</p>
      )}
    </div>
  );
}

const STEPS: { label: string; icon: typeof Clock }[] = [
  { label: "Placed",    icon: CheckCircle2   },
  { label: "Accepted",  icon: ClipboardCheck },
  { label: "Preparing", icon: ChefHat        },
  { label: "Ready",     icon: PackageCheck   },
  { label: "Delivered", icon: Truck          },
];

function statusToStep(status: OrderStatusType): number {
  switch (status) {
    case "PENDING":   return 0;
    case "ACCEPTED":  return 1;
    case "PREPARING": return 2;
    case "READY":     return 3;
    case "DELIVERED": return 4;
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
    activeOrder?.status === "CANCELLED" || activeOrder?.status === "REJECTED";

  useEffect(() => {
    if (activeOrder?.status === "PREPARING" && clockRef.current && handRef.current) {
      const ctx = gsap.context(() => {
        gsap.to(handRef.current!, {
          rotation: 360,
          duration: 1.5,
          repeat: -1,
          ease: "linear",
          transformOrigin: "bottom center",
        });
        gsap.fromTo(
          clockRef.current!,
          { scale: 0.95 },
          { scale: 1.05, yoyo: true, repeat: -1, duration: 0.8, ease: "power1.inOut" },
        );
      });
      return () => ctx.revert();
    }
  }, [activeOrder?.status]);

  if (!activeOrder) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-[#eaa94d]" />
      </div>
    );
  }

  const handleCancel = () => {
    cancelOrder();
    setShowCancel(false);
    onClose();
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between bg-white border-b border-gray-100 px-5 py-4">
        <button
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="text-center">
          <h2 className="text-sm font-bold text-[#3e1e0c]">Order #{activeOrder.orderNo}</h2>
          <p className="text-[11px] text-gray-400">Live tracking</p>
        </div>
        <div className="w-9" />
      </div>

      <div className="mx-auto max-w-lg px-5 py-8 space-y-8">
        {/* Main status */}
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
          ) : activeOrder.status === "PREPARING" ? (
            <div
              ref={clockRef}
              className="mx-auto relative flex h-20 w-20 items-center justify-center rounded-full border-[3px] border-[#eaa94d] bg-white shadow-xl mb-4"
            >
              <div className="absolute top-1/2 left-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#eaa94d] z-10" />
              <div
                ref={handRef}
                className="absolute bottom-1/2 left-1/2 h-6 w-[2px] -translate-x-1/2 rounded-full bg-[#eaa94d] origin-bottom"
              />
            </div>
          ) : activeOrder.status === "DELIVERED" ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 15, stiffness: 200 }}
              className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#3e1e0c] mb-4"
            >
              <CheckCircle2 className="h-10 w-10 text-white" />
            </motion.div>
          ) : (
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#eaa94d]/10 mb-4">
              {(() => {
                const Icon = STEPS[currentIdx]?.icon ?? Clock;
                return <Icon className="h-10 w-10 text-[#eaa94d]" />;
              })()}
            </div>
          )}

          <h2 className="text-xl font-bold text-[#3e1e0c]">
            {isCancelled
              ? activeOrder.status === "REJECTED"
                ? "Order Rejected"
                : "Order Cancelled"
              : activeOrder.status === "PENDING"
                ? "Order Placed"
                : activeOrder.status === "ACCEPTED"
                  ? "Order Accepted"
                  : activeOrder.status === "PREPARING"
                    ? "Being Prepared"
                    : activeOrder.status === "READY"
                      ? "Ready for Pickup"
                      : "Delivered"}
          </h2>
          <p className="mt-1 text-sm text-gray-400">
            {activeOrder.status === "PENDING"   && "Waiting for the restaurant to confirm…"}
            {activeOrder.status === "ACCEPTED"  && "Your order has been confirmed!"}
            {activeOrder.status === "PREPARING" && "The chef is working on your food"}
            {activeOrder.status === "READY"     && "Your food is ready for pickup!"}
            {activeOrder.status === "DELIVERED" && "Enjoy your meal!"}
            {activeOrder.status === "CANCELLED" && "Your order has been cancelled"}
            {activeOrder.status === "REJECTED"  && "The restaurant was unable to fulfil your order"}
          </p>
        </div>

        {/* Countdown timer */}
        {!isCancelled && activeOrder.estimatedTime && (activeOrder.preparingAt || activeOrder.acceptedAt) && (
          <div className="flex justify-center">
            <CountdownTimer
              estimatedTime={activeOrder.estimatedTime}
              startedAt={activeOrder.preparingAt || activeOrder.acceptedAt!}
            />
          </div>
        )}

        {/* Steps timeline */}
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
                    className="flex h-9 w-9 items-center justify-center rounded-full"
                  >
                    <Icon
                      className={`h-4 w-4 ${isActive ? "text-white" : "text-gray-400"}`}
                    />
                  </motion.div>
                  {isCurrent && (
                    <motion.div
                      animate={{ scale: [1, 1.6, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-0 rounded-full bg-[#3e1e0c]"
                    />
                  )}
                </div>
                <span
                  className={`text-[9px] font-bold text-center leading-tight ${
                    isActive ? "text-[#3e1e0c]" : "text-gray-400"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="relative h-1.5 rounded-full bg-gray-200 overflow-hidden">
          <motion.div
            initial={false}
            animate={{ width: `${((currentIdx + 1) / STEPS.length) * 100}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute inset-y-0 left-0 rounded-full bg-[#3e1e0c]"
          />
        </div>

        {/* Order items */}
        <div className="rounded-2xl border border-gray-200 bg-gray-50/50 p-5 space-y-3">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            Order Summary
          </h3>
          {activeOrder.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between py-1.5">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#eaa94d]/10 text-[10px] font-bold text-[#eaa94d]">
                  {item.quantity}
                </span>
                <span className="text-sm font-medium text-[#3e1e0c]">{item.name}</span>
              </div>
              <span className="text-sm font-bold text-gray-500">
                {formatPrice(item.price * item.quantity, currency)}
              </span>
            </div>
          ))}
          <div className="border-t border-gray-200 pt-3 flex items-center justify-between">
            <span className="text-sm font-bold text-[#3e1e0c]">Total</span>
            <span className="text-base font-extrabold text-[#eaa94d]">
              {formatPrice(activeOrder.total, currency)}
            </span>
          </div>
        </div>

        {/* Cancel button */}
        {!isCancelled && activeOrder.status !== "DELIVERED" && (
          <button
            onClick={() => setShowCancel(true)}
            className="w-full rounded-xl border-2 border-red-200 py-3.5 text-sm font-bold text-red-500 transition-all hover:bg-red-50 active:scale-[0.98]"
          >
            Cancel Order
          </button>
        )}
      </div>

      {/* Cancel confirmation modal */}
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
              className="fixed left-1/2 top-1/2 z-50 w-[90%] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
                  <AlertTriangle className="h-7 w-7 text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-[#3e1e0c]">Cancel Order?</h3>
                <p className="text-sm text-gray-500">
                  This action cannot be undone. Your order will be cancelled immediately.
                </p>
                <div className="flex w-full gap-3">
                  <button
                    onClick={() => setShowCancel(false)}
                    className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
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
