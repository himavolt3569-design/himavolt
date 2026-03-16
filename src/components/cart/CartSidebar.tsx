"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Minus, ShoppingBag, Trash2 } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/currency";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef, useEffect } from "react";

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

const panelVariants = {
  hidden: { x: "100%" },
  visible: {
    x: 0,
    transition: { type: "spring" as const, damping: 30, stiffness: 300 },
  },
  exit: {
    x: "100%",
    transition: {
      duration: 0.25,
      ease: [0.4, 0, 1, 1] as [number, number, number, number],
    },
  },
};

export default function CartSidebar({
  open,
  onClose,
  onProceed,
}: {
  open: boolean;
  onClose: () => void;
  onProceed?: () => void;
}) {
  const { items, increaseQty, decreaseQty, removeItem, subtotal, totalItems, currency } =
    useCart();
  const priceRef = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      if (priceRef.current && totalItems > 0) {
        gsap.fromTo(
          priceRef.current,
          { scale: 1.1, color: "#FF9933" },
          { scale: 1, color: "#1F2A2A", duration: 0.4, ease: "back.out(2)" },
        );
      }
    },
    { dependencies: [subtotal, open] },
  );

  useEffect(() => {
    if (open && items.length === 0) {
      const timer = setTimeout(() => onClose(), 300);
      return () => clearTimeout(timer);
    }
  }, [open, items.length, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
            className="fixed inset-0 z-90 bg-black/50 backdrop-blur-[2px]"
          />
          <motion.aside
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed top-0 right-0 bottom-0 z-95 w-full max-w-[420px] bg-white shadow-2xl flex flex-col md:border-l md:border-gray-200"
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <ShoppingBag className="h-5 w-5 text-[#FF9933]" />
                <h2 className="text-lg font-bold text-[#1F2A2A]">
                  Your Cart
                  {totalItems > 0 && (
                    <span className="ml-2 text-sm font-medium text-gray-400">
                      ({totalItems} {totalItems === 1 ? "item" : "items"})
                    </span>
                  )}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {items.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
                <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <ShoppingBag className="h-8 w-8 text-gray-300" />
                </div>
                <p className="text-base font-bold text-[#1F2A2A] mb-1">
                  Your cart is empty
                </p>
                <p className="text-sm text-gray-400">
                  Add items from the menu to get started
                </p>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto px-6 py-4">
                  <div className="flex flex-col gap-1">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-b-0"
                      >
                        <div className="h-14 w-14 rounded-xl overflow-hidden shrink-0">
                          <img
                            src={item.image}
                            alt={item.name}
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-[#1F2A2A] truncate">
                            {item.name}
                          </p>
                          <p className="text-sm font-semibold text-[#FF9933]">
                            {formatPrice(item.price * item.quantity, currency)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => decreaseQty(item.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-7 text-center text-sm font-bold text-[#1F2A2A]">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => increaseQty(item.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FF9933] text-white hover:bg-[#ff8811] transition-colors"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-gray-100 px-6 py-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500">
                      Subtotal
                    </span>
                    <span
                      ref={priceRef}
                      className="text-lg font-bold text-[#1F2A2A]"
                    >
                      {formatPrice(subtotal, currency)}
                    </span>
                  </div>
                  <button
                    onClick={onProceed}
                    className="w-full rounded-xl bg-[#FF9933] py-4 text-base font-bold text-white transition-all hover:bg-[#ff8811] active:scale-[0.98] shadow-lg shadow-[#FF9933]/25"
                  >
                    Proceed to Order
                  </button>
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
