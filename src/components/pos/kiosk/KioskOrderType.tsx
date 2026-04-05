"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { UtensilsCrossed, ShoppingBag, ArrowLeft, ArrowRight, User } from "lucide-react";

interface Props {
  tables: { tableNo: number; label: string | null }[];
  onConfirm: (type: "DINE_IN" | "TAKEAWAY", tableNo: number | null, guestName: string) => void;
  onBack: () => void;
}

export default function KioskOrderType({ tables, onConfirm, onBack }: Props) {
  const [orderType, setOrderType] = useState<"DINE_IN" | "TAKEAWAY" | null>(null);
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [guestName, setGuestName] = useState("");

  const canProceed = orderType === "TAKEAWAY" || (orderType === "DINE_IN" && selectedTable !== null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center justify-center min-h-full py-10 px-6"
    >
      <h2 className="text-3xl font-black text-gray-900 mb-2">How would you like your order?</h2>
      <p className="text-gray-500 mb-8">Select your order type</p>

      {/* Order type cards */}
      <div className="grid grid-cols-2 gap-6 w-full max-w-xl mb-8">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => { setOrderType("DINE_IN"); setSelectedTable(null); }}
          className={`flex flex-col items-center gap-4 rounded-3xl border-3 p-8 transition-all ${
            orderType === "DINE_IN"
              ? "border-amber-500 bg-amber-50 shadow-lg"
              : "border-gray-200 bg-white hover:border-gray-300"
          }`}
        >
          <div className={`flex h-20 w-20 items-center justify-center rounded-2xl ${
            orderType === "DINE_IN" ? "bg-amber-600" : "bg-gray-100"
          }`}>
            <UtensilsCrossed className={`h-10 w-10 ${orderType === "DINE_IN" ? "text-white" : "text-gray-400"}`} />
          </div>
          <span className="text-xl font-bold text-gray-900">Dine In</span>
          <span className="text-sm text-gray-500">Eat at the restaurant</span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setOrderType("TAKEAWAY")}
          className={`flex flex-col items-center gap-4 rounded-3xl border-3 p-8 transition-all ${
            orderType === "TAKEAWAY"
              ? "border-amber-500 bg-amber-50 shadow-lg"
              : "border-gray-200 bg-white hover:border-gray-300"
          }`}
        >
          <div className={`flex h-20 w-20 items-center justify-center rounded-2xl ${
            orderType === "TAKEAWAY" ? "bg-amber-600" : "bg-gray-100"
          }`}>
            <ShoppingBag className={`h-10 w-10 ${orderType === "TAKEAWAY" ? "text-white" : "text-gray-400"}`} />
          </div>
          <span className="text-xl font-bold text-gray-900">Takeaway</span>
          <span className="text-sm text-gray-500">Pick up and go</span>
        </motion.button>
      </div>

      {/* Table selector for dine-in */}
      {orderType === "DINE_IN" && tables.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="w-full max-w-xl mb-6"
        >
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">Select Your Table</h3>
          <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-3">
            {tables.map((t) => (
              <motion.button
                key={t.tableNo}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedTable(t.tableNo)}
                className={`flex flex-col items-center justify-center rounded-2xl border-2 py-4 transition-all ${
                  selectedTable === t.tableNo
                    ? "border-amber-500 bg-amber-600 text-white"
                    : "border-gray-200 bg-white text-gray-700 hover:border-amber-300"
                }`}
              >
                <span className="text-lg font-black">{t.tableNo}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Guest name (optional) */}
      {orderType && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-full max-w-xl mb-8"
        >
          <label className="text-sm font-bold text-gray-700 uppercase tracking-wider block mb-2">
            Your Name (optional)
          </label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Enter your name for the order"
              className="w-full rounded-2xl border-2 border-gray-200 bg-white pl-12 pr-4 py-4 text-base font-medium focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200 transition-all"
            />
          </div>
        </motion.div>
      )}

      {/* Navigation */}
      <div className="flex items-center gap-4 w-full max-w-xl">
        <button
          onClick={onBack}
          className="flex items-center gap-2 rounded-2xl border-2 border-gray-200 bg-white px-8 py-4 text-base font-bold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          Back
        </button>
        <button
          onClick={() => canProceed && onConfirm(orderType!, selectedTable, guestName.trim())}
          disabled={!canProceed}
          className="flex-1 flex items-center justify-center gap-3 rounded-2xl bg-amber-700 py-4 text-lg font-bold text-white hover:bg-amber-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-amber-700/20"
        >
          Continue
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </motion.div>
  );
}
