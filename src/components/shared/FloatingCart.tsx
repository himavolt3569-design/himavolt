"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/context/CartContext";

export default function FloatingCart({ onOpen }: { onOpen: () => void }) {
  const { items } = useCart();
  const total = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <AnimatePresence>
      {total > 0 && (
        <motion.button
          initial={{ scale: 0, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          onClick={onOpen}
          className="fixed bottom-20 sm:bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl bg-[var(--accent)] px-5 py-3.5 text-white font-bold shadow-2xl shadow-[var(--accent)]/30 hover:bg-[var(--accent-hover)] active:scale-[0.97] transition-colors"
          aria-label="View cart"
        >
          <ShoppingCart className="h-5 w-5" strokeWidth={2.2} />
          <span className="text-sm">
            {total} item{total > 1 ? "s" : ""} in cart
          </span>
          <span className="text-sm font-normal opacity-80">View</span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
