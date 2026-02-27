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
} from "lucide-react";
import { useOrder, type OrderStep } from "@/context/OrderContext";
import gsap from "gsap";

const STEPS: { key: OrderStep; label: string; icon: typeof Clock }[] = [
  { key: "ordered", label: "Order Placed", icon: CheckCircle2 },
  { key: "preparing", label: "Preparing", icon: ChefHat },
  { key: "ready", label: "Ready", icon: PackageCheck },
  { key: "delivered", label: "Delivered", icon: Truck },
];

function stepIndex(step: OrderStep) {
  return STEPS.findIndex((s) => s.key === step);
}

export default function OrderStatus({ onClose }: { onClose: () => void }) {
  const { activeOrder, cancelOrder } = useOrder();
  const [showCancel, setShowCancel] = useState(false);
  const clockRef = useRef<HTMLDivElement>(null);
  const handRef = useRef<HTMLDivElement>(null);

  const currentIdx = activeOrder ? stepIndex(activeOrder.step) : -1;

  useEffect(() => {
    if (activeOrder?.step === "preparing" && clockRef.current && handRef.current) {
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
  }, [activeOrder?.step]);

  if (!activeOrder) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-6">
        <div className="text-center">
          <p className="text-lg font-bold text-[#1F2A2A]">No active order</p>
          <button
            onClick={onClose}
            className="mt-4 rounded-xl bg-[#0A4D3C] px-6 py-3 text-sm font-bold text-white hover:bg-[#083a2d] transition-colors"
          >
            Back to Menu
          </button>
        </div>
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
          <h2 className="text-sm font-bold text-[#1F2A2A]">Order {activeOrder.id}</h2>
          <p className="text-[11px] text-gray-400">Live tracking</p>
        </div>
        <div className="w-9" />
      </div>

      <div className="mx-auto max-w-lg px-5 py-8 space-y-8">
        {/* Main status */}
        <div className="text-center">
          {activeOrder.step === "preparing" ? (
            <div
              ref={clockRef}
              className="mx-auto relative flex h-20 w-20 items-center justify-center rounded-full border-[3px] border-[#FF9933] bg-white shadow-xl mb-4"
            >
              <div className="absolute top-1/2 left-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FF9933] z-10" />
              <div
                ref={handRef}
                className="absolute bottom-1/2 left-1/2 h-6 w-[2px] -translate-x-1/2 rounded-full bg-[#FF9933] origin-bottom"
              />
            </div>
          ) : activeOrder.step === "delivered" ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 15, stiffness: 200 }}
              className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#0A4D3C] mb-4"
            >
              <CheckCircle2 className="h-10 w-10 text-white" />
            </motion.div>
          ) : (
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#FF9933]/10 mb-4">
              {(() => {
                const Icon = STEPS[currentIdx]?.icon ?? Clock;
                return <Icon className="h-10 w-10 text-[#FF9933]" />;
              })()}
            </div>
          )}

          <h2 className="text-xl font-bold text-[#1F2A2A]">
            {STEPS[currentIdx]?.label ?? "Processing"}
          </h2>
          <p className="mt-1 text-sm text-gray-400">
            {activeOrder.step === "ordered" && "Your order has been received by the restaurant"}
            {activeOrder.step === "preparing" && "The chef is working on your delicious food"}
            {activeOrder.step === "ready" && "Your food is ready for pickup!"}
            {activeOrder.step === "delivered" && "Enjoy your meal!"}
          </p>
        </div>

        {/* Steps timeline */}
        <div className="flex items-start justify-between px-2">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            const isActive = i <= currentIdx;
            const isCurrent = i === currentIdx;

            return (
              <div key={step.key} className="flex flex-col items-center gap-2 flex-1">
                <div className="relative">
                  <motion.div
                    initial={false}
                    animate={{
                      scale: isCurrent ? 1.15 : 1,
                      backgroundColor: isActive ? "#0A4D3C" : "#f3f4f6",
                    }}
                    transition={{ type: "spring", damping: 20 }}
                    className="flex h-10 w-10 items-center justify-center rounded-full"
                  >
                    <Icon
                      className={`h-5 w-5 ${isActive ? "text-white" : "text-gray-400"}`}
                    />
                  </motion.div>
                  {isCurrent && (
                    <motion.div
                      animate={{ scale: [1, 1.6, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-0 rounded-full bg-[#0A4D3C]"
                    />
                  )}
                </div>
                <span
                  className={`text-[10px] font-bold text-center leading-tight ${
                    isActive ? "text-[#0A4D3C]" : "text-gray-400"
                  }`}
                >
                  {step.label}
                </span>
                {i < STEPS.length - 1 && (
                  <div
                    className={`absolute hidden`}
                  />
                )}
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
            className="absolute inset-y-0 left-0 rounded-full bg-[#0A4D3C]"
          />
        </div>

        {/* Order items */}
        <div className="rounded-2xl border border-gray-200 bg-gray-50/50 p-5 space-y-3">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            Order Summary
          </h3>
          {activeOrder.items.map((item, i) => (
            <div key={i} className="flex items-center justify-between py-1.5">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#FF9933]/10 text-[10px] font-bold text-[#FF9933]">
                  {item.qty}
                </span>
                <span className="text-sm font-medium text-[#1F2A2A]">{item.name}</span>
              </div>
              <span className="text-sm font-bold text-gray-500">
                Rs. {item.price * item.qty}
              </span>
            </div>
          ))}
          <div className="border-t border-gray-200 pt-3 flex items-center justify-between">
            <span className="text-sm font-bold text-[#1F2A2A]">Total</span>
            <span className="text-base font-extrabold text-[#FF9933]">
              Rs. {activeOrder.total}
            </span>
          </div>
        </div>

        {/* Cancel button */}
        {activeOrder.step !== "delivered" && (
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
                <h3 className="text-lg font-bold text-[#1F2A2A]">Cancel Order?</h3>
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
