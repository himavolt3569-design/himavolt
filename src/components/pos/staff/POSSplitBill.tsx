"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  X, Plus, Trash2, DollarSign, Wallet, Banknote, Loader2, CheckCircle2,
} from "lucide-react";
import { formatPrice } from "@/lib/currency";
import { useToast } from "@/context/ToastContext";

interface SplitEntry {
  method: string;
  amount: string;
}

interface Props {
  orderId: string;
  orderNo: string;
  total: number;
  restaurantId: string;
  currency: string;
  onClose: () => void;
  onDone: () => void;
}

const METHODS = [
  { id: "CASH", label: "Cash", icon: DollarSign },
  { id: "ESEWA", label: "eSewa", icon: Wallet },
  { id: "KHALTI", label: "Khalti", icon: Wallet },
  { id: "BANK", label: "Bank", icon: Banknote },
];

export default function POSSplitBill({ orderId, orderNo, total, restaurantId, currency, onClose, onDone }: Props) {
  const { showToast } = useToast();
  const [splits, setSplits] = useState<SplitEntry[]>([
    { method: "CASH", amount: "" },
    { method: "CASH", amount: "" },
  ]);
  const [submitting, setSubmitting] = useState(false);

  const addSplit = () => setSplits((prev) => [...prev, { method: "CASH", amount: "" }]);

  const removeSplit = (idx: number) => {
    if (splits.length <= 2) return;
    setSplits((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateSplit = (idx: number, field: keyof SplitEntry, value: string) => {
    setSplits((prev) => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const splitAmounts = splits.map((s) => parseFloat(s.amount) || 0);
  const splitTotal = splitAmounts.reduce((sum, a) => sum + a, 0);
  const remaining = total - splitTotal;
  const isValid = Math.abs(remaining) < 0.01 && splits.every((s) => parseFloat(s.amount) > 0);

  const submit = async () => {
    if (!isValid) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/restaurants/${restaurantId}/billing/split`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          splits: splits.map((s) => ({ method: s.method, amount: parseFloat(s.amount) })),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed" }));
        throw new Error(err.error || "Failed to split bill");
      }
      showToast("Split payment collected", "success");
      onDone();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Split Bill</h2>
            <p className="text-xs text-gray-500">Order #{orderNo} &middot; Total: {formatPrice(total, currency)}</p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Splits */}
        <div className="p-5 space-y-3 max-h-[50vh] overflow-y-auto">
          {splits.map((split, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <select
                value={split.method}
                onChange={(e) => updateSplit(idx, "method", e.target.value)}
                className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-200"
              >
                {METHODS.map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
              <div className="relative flex-1">
                <input
                  type="number"
                  min="0"
                  value={split.amount}
                  onChange={(e) => updateSplit(idx, "amount", e.target.value)}
                  placeholder="Amount"
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-200"
                />
              </div>
              {splits.length > 2 && (
                <button
                  onClick={() => removeSplit(idx)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}

          <button
            onClick={addSplit}
            className="flex items-center gap-1.5 text-xs font-bold text-amber-700 hover:text-amber-600"
          >
            <Plus className="h-3.5 w-3.5" />
            Add another payment
          </button>
        </div>

        {/* Summary */}
        <div className="px-5 py-4 border-t border-gray-200 bg-gray-50 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Split total</span>
            <span className={`font-bold ${Math.abs(remaining) < 0.01 ? "text-green-600" : "text-red-600"}`}>
              {formatPrice(splitTotal, currency)}
            </span>
          </div>
          {Math.abs(remaining) >= 0.01 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Remaining</span>
              <span className="font-bold text-red-600">{formatPrice(remaining, currency)}</span>
            </div>
          )}

          <button
            onClick={submit}
            disabled={!isValid || submitting}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-green-600 py-3 text-sm font-bold text-white hover:bg-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-3"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {submitting ? "Processing..." : "Confirm Split Payment"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
