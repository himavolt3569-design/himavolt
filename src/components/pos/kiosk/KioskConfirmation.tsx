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
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-green-50 to-white"
      onClick={onReset}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
        className="flex h-28 w-28 items-center justify-center rounded-full bg-green-100 mb-8"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.3 }}
        >
          <CheckCircle2 className="h-16 w-16 text-green-600" />
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-center"
      >
        <h1 className="text-4xl font-black text-gray-900 mb-2">Order Placed!</h1>
        <p className="text-lg text-gray-500 mb-8">Your order has been sent to the kitchen</p>

        <div className="rounded-3xl bg-white border-2 border-gray-100 shadow-xl px-12 py-8 mb-8">
          <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Order Number</p>
          <p className="text-5xl font-black text-amber-700 mb-4">#{orderNo}</p>
          <div className="h-px bg-gray-200 my-4" />
          <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Total</p>
          <p className="text-2xl font-black text-gray-900">{formatPrice(total, currency)}</p>
        </div>

        <p className="text-gray-400 text-sm">Please pay at the counter</p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="mt-8 text-xs text-gray-300"
        >
          This screen will reset automatically...
        </motion.p>
      </motion.div>
    </motion.div>
  );
}
