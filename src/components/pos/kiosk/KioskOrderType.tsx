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
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className="flex flex-col items-center justify-center min-h-full py-10 px-6"
    >
      <h2 className="text-2xl font-black text-gray-900 mb-1.5">How would you like your order?</h2>
      <p className="text-gray-400 text-sm mb-8">Select your preference to continue</p>

      {/* Order type cards */}
      <div className="grid grid-cols-2 gap-4 w-full max-w-lg mb-8">
        {[
          { type: "DINE_IN" as const, label: "Dine In", sub: "Eat at the restaurant", icon: UtensilsCrossed },
          { type: "TAKEAWAY" as const, label: "Takeaway", sub: "Pick up and go", icon: ShoppingBag },
        ].map(({ type, label, sub, icon: Icon }) => {
          const active = orderType === type;
          return (
            <motion.button
              key={type}
              whileTap={{ scale: 0.97 }}
              onClick={() => { setOrderType(type); setSelectedTable(null); }}
              className={`flex flex-col items-center gap-4 rounded-2xl border-2 p-8 transition-all ${
                active
                  ? "border-amber-400 bg-amber-50 shadow-lg shadow-amber-100"
                  : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <div className={`flex h-16 w-16 items-center justify-center rounded-2xl ${
                active ? "bg-amber-600" : "bg-gray-100"
              }`}>
                <Icon className={`h-8 w-8 ${active ? "text-white" : "text-gray-400"}`} />
              </div>
              <div className="text-center">
                <p className={`text-lg font-bold ${active ? "text-amber-800" : "text-gray-900"}`}>{label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Table selector */}
      {orderType === "DINE_IN" && tables.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="w-full max-w-lg mb-6"
        >
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Select Your Table</h3>
          <div className="grid grid-cols-6 sm:grid-cols-8 gap-2.5">
            {tables.map((t) => (
              <motion.button
                key={t.tableNo}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedTable(t.tableNo)}
                className={`flex items-center justify-center rounded-xl border-2 py-3.5 transition-all ${
                  selectedTable === t.tableNo
                    ? "border-amber-500 bg-amber-600 text-white shadow-md shadow-amber-200"
                    : "border-gray-200 bg-white text-gray-700 hover:border-amber-300 hover:bg-amber-50"
                }`}
              >
                <span className="text-base font-black">{t.tableNo}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Guest name */}
      {orderType && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-full max-w-lg mb-8"
        >
          <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-2">
            Your Name (optional)
          </label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Enter your name for the order"
              className="w-full rounded-xl border-2 border-gray-200 bg-white pl-11 pr-4 py-3.5 text-sm font-medium focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
            />
          </div>
        </motion.div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 w-full max-w-lg">
        <button
          onClick={onBack}
          className="flex items-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-7 py-3.5 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <button
          onClick={() => canProceed && onConfirm(orderType!, selectedTable, guestName.trim())}
          disabled={!canProceed}
          className="flex-1 flex items-center justify-center gap-2.5 rounded-xl bg-amber-600 py-3.5 text-sm font-bold text-white hover:bg-amber-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-amber-600/25 active:scale-[0.98]"
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}
