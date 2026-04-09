"use client";

import { motion } from "framer-motion";
import { UtensilsCrossed, ArrowRight } from "lucide-react";

interface Props {
  restaurantName: string;
  imageUrl: string | null;
  onStart: () => void;
}

export default function KioskWelcome({ restaurantName, imageUrl, onStart }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white"
      onClick={onStart}
    >
      {/* Subtle background texture */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#fef3c7_0%,transparent_60%)] pointer-events-none" />

      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        className="relative z-10 flex flex-col items-center text-center px-8"
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={restaurantName}
            className="h-24 w-24 rounded-2xl object-cover shadow-xl mb-8 ring-4 ring-amber-100"
          />
        ) : (
          <div className="h-24 w-24 rounded-2xl bg-amber-50 flex items-center justify-center mb-8 ring-4 ring-amber-100 shadow-lg">
            <UtensilsCrossed className="h-11 w-11 text-amber-400" />
          </div>
        )}

        <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-3 tracking-tight leading-tight">
          {restaurantName}
        </h1>
        <p className="text-gray-400 text-base mb-14 font-medium">
          Self-service ordering
        </p>

        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
          className="flex items-center gap-3 rounded-2xl bg-amber-600 px-10 py-5 cursor-pointer hover:bg-amber-500 transition-colors shadow-xl shadow-amber-600/30"
        >
          <span className="text-xl font-bold text-white">Tap to Order</span>
          <ArrowRight className="h-6 w-6 text-white" />
        </motion.div>

        <p className="mt-8 text-xs text-gray-300 font-medium tracking-wide">
          Touch anywhere to begin
        </p>
      </motion.div>
    </motion.div>
  );
}
