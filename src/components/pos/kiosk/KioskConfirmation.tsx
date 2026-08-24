"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { formatPrice } from "@/lib/currency";

interface Props {
  orderNo: string;
  total: number;
  currency: string;
  onReset: () => void;
}

export default function KioskConfirmation({ orderNo, total, currency, onReset }: Props) {
  useEffect(() => {
    const timer = setTimeout(onReset, 10000);
    return () => clearTimeout(timer);
  }, [onReset]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--canvas)]"
      onClick={onReset}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#d1fae5_0%,transparent_60%)] pointer-events-none" />

      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", bounce: 0.2, duration: 0.4, delay: 0.1 }}
        className="relative z-10 flex h-24 w-24 items-center justify-center rounded-full bg-[var(--accent-muted)] ring-8 ring-[var(--accent-border)] mb-8"
      >
        <CheckCircle2 className="h-14 w-14 text-[var(--accent-hover)]" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", bounce: 0.2, duration: 0.4, delay: 0.3 }}
        className="relative z-10 text-center"
      >
        <h1 className="text-4xl font-black text-[var(--text-1)] mb-2">Order Placed!</h1>
        <p className="text-base text-[var(--text-3)] mb-10">Your order has been sent to the kitchen</p>

        <div className="rounded-2xl bg-[var(--canvas)] border border-[var(--border-soft)] shadow-xl px-12 py-8 mb-8 inline-block">
          <p className="text-[11px] font-bold text-[var(--text-3)] uppercase tracking-widest mb-2">Order Number</p>
          <p className="text-5xl font-black text-[var(--accent-text)] mb-5">#{orderNo}</p>
          <div className="h-px bg-[var(--surface)] mb-4" />
          <p className="text-[11px] font-bold text-[var(--text-3)] uppercase tracking-widest mb-1">Total</p>
          <p className="text-2xl font-black text-[var(--text-1)]">{formatPrice(total, currency)}</p>
        </div>

        <p className="text-sm text-[var(--text-3)]">Please pay at the counter</p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: "spring", bounce: 0.2, duration: 0.4, delay: 2.5 }}
          className="mt-8 text-xs text-[var(--text-3)]"
        >
          This screen will reset automatically...
        </motion.p>
      </motion.div>
    </motion.div>
  );
}
