"use client";

import { motion } from "framer-motion";
import { HandMetal, UtensilsCrossed } from "lucide-react";

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
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-amber-950 via-amber-900 to-amber-950"
      onClick={onStart}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 25px 25px, white 1px, transparent 0)", backgroundSize: "50px 50px" }} />
      </div>

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        className="relative z-10 flex flex-col items-center text-center px-8"
      >
        {imageUrl ? (
          <img src={imageUrl} alt={restaurantName} className="h-28 w-28 rounded-3xl object-cover shadow-2xl mb-8 border-4 border-white/20" />
        ) : (
          <div className="h-28 w-28 rounded-3xl bg-white/10 flex items-center justify-center mb-8 border-4 border-white/20">
            <UtensilsCrossed className="h-14 w-14 text-amber-300" />
          </div>
        )}

        <h1 className="text-4xl md:text-5xl font-black text-white mb-3 tracking-tight">
          {restaurantName}
        </h1>
        <p className="text-amber-300/80 text-lg mb-12 font-medium">
          Self-service ordering
        </p>

        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="flex items-center gap-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 px-10 py-5 cursor-pointer hover:bg-white/20 transition-colors"
        >
          <HandMetal className="h-7 w-7 text-amber-300" />
          <span className="text-xl font-bold text-white">Touch to Start</span>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
