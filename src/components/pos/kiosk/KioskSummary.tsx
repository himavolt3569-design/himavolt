"use client";

import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle, UtensilsCrossed, ShoppingBag } from "lucide-react";
import { formatPrice } from "@/lib/currency";
import type { KioskCartItem } from "./KioskCart";

interface Props {
  items: KioskCartItem[];
  orderType: "DINE_IN" | "TAKEAWAY";
  tableNo: number | null;
  guestName: string;
  currency: string;
  taxRate: number;
  taxEnabled: boolean;
  serviceChargeRate: number;
  serviceChargeEnabled: boolean;
  submitting: boolean;
  onConfirm: () => void;
  onBack: () => void;
}

export default function KioskSummary({
  items, orderType, tableNo, guestName, currency,
  taxRate, taxEnabled, serviceChargeRate, serviceChargeEnabled,
  submitting, onConfirm, onBack,
}: Props) {
  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const tax = taxEnabled ? subtotal * (taxRate / 100) : 0;
  const serviceCharge = serviceChargeEnabled ? subtotal * (serviceChargeRate / 100) : 0;
  const total = subtotal + tax + serviceCharge;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className="flex flex-col items-center justify-center min-h-full py-10 px-6"
    >
      <h2 className="text-2xl font-black text-gray-900 mb-1.5">Order Summary</h2>
      <p className="text-gray-400 text-sm mb-8">Review your order before confirming</p>

      <div className="w-full max-w-lg space-y-4">
        {/* Order meta badges */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-4 py-2">
            {orderType === "DINE_IN" ? (
              <UtensilsCrossed className="h-3.5 w-3.5 text-amber-600" />
            ) : (
              <ShoppingBag className="h-3.5 w-3.5 text-amber-600" />
            )}
            <span className="text-xs font-bold text-amber-700">
              {orderType === "DINE_IN" ? `Dine In${tableNo ? ` · Table ${tableNo}` : ""}` : "Takeaway"}
            </span>
          </div>
          {guestName && (
            <div className="rounded-full bg-gray-100 px-4 py-2">
              <span className="text-xs font-semibold text-gray-600">{guestName}</span>
            </div>
          )}
        </div>

        {/* Items list */}
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
          <div className="divide-y divide-gray-50">
            {items.map((item) => (
              <div key={item.menuItemId} className="flex items-center justify-between px-5 py-3.5">
                <div className="min-w-0 flex-1 mr-4">
                  <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                  {item.sizeLabel && (
                    <p className="text-[11px] text-gray-400">{item.sizeLabel}</p>
                  )}
                  {item.addOnNames.length > 0 && (
                    <p className="text-[11px] text-gray-400">+ {item.addOnNames.join(", ")}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[11px] text-gray-400">x{item.quantity}</p>
                  <p className="text-sm font-bold text-gray-900">{formatPrice(item.unitPrice * item.quantity, currency)}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t border-gray-200 bg-gray-50 px-5 py-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-semibold text-gray-700">{formatPrice(subtotal, currency)}</span>
            </div>
            {taxEnabled && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Tax ({taxRate}%)</span>
                <span className="font-semibold text-gray-700">{formatPrice(tax, currency)}</span>
              </div>
            )}
            {serviceChargeEnabled && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Service Charge ({serviceChargeRate}%)</span>
                <span className="font-semibold text-gray-700">{formatPrice(serviceCharge, currency)}</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
              <span className="text-base font-bold text-gray-900">Total</span>
              <span className="text-xl font-black text-amber-700">{formatPrice(total, currency)}</span>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400">Payment will be collected at the counter</p>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={onBack}
            disabled={submitting}
            className="flex items-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-7 py-3.5 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <button
            onClick={onConfirm}
            disabled={submitting}
            className="flex-1 flex items-center justify-center gap-2.5 rounded-xl bg-amber-600 py-3.5 text-sm font-bold text-white hover:bg-amber-500 transition-colors disabled:opacity-60 shadow-lg shadow-amber-600/25 active:scale-[0.98]"
          >
            <CheckCircle className="h-4 w-4" />
            {submitting ? "Placing Order..." : "Confirm Order"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
