"use client";

import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle, Loader2, UtensilsCrossed, ShoppingBag } from "lucide-react";
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center justify-center min-h-full py-10 px-6"
    >
      <h2 className="text-3xl font-black text-gray-900 mb-2">Order Summary</h2>
      <p className="text-gray-500 mb-8">Review your order before confirming</p>

      <div className="w-full max-w-lg space-y-4">
        {/* Order type badge */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="flex items-center gap-2 rounded-full bg-amber-100 px-5 py-2.5">
            {orderType === "DINE_IN" ? (
              <UtensilsCrossed className="h-4 w-4 text-amber-700" />
            ) : (
              <ShoppingBag className="h-4 w-4 text-amber-700" />
            )}
            <span className="text-sm font-bold text-amber-800">
              {orderType === "DINE_IN" ? `Dine In${tableNo ? ` - Table ${tableNo}` : ""}` : "Takeaway"}
            </span>
          </div>
          {guestName && (
            <div className="rounded-full bg-gray-100 px-4 py-2.5">
              <span className="text-sm font-medium text-gray-700">{guestName}</span>
            </div>
          )}
        </div>

        {/* Items */}
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="divide-y divide-gray-50">
            {items.map((item) => (
              <div key={item.menuItemId} className="flex items-center justify-between px-5 py-4">
                <div className="min-w-0 flex-1 mr-4">
                  <p className="text-sm font-bold text-gray-900">{item.name}</p>
                  {item.sizeLabel && (
                    <p className="text-xs text-gray-500">Size: {item.sizeLabel}</p>
                  )}
                  {item.addOnNames.length > 0 && (
                    <p className="text-xs text-gray-500">+ {item.addOnNames.join(", ")}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-500">x{item.quantity}</p>
                  <p className="text-sm font-bold text-gray-900">{formatPrice(item.unitPrice * item.quantity, currency)}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t border-gray-200 bg-gray-50 px-5 py-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-semibold text-gray-800">{formatPrice(subtotal, currency)}</span>
            </div>
            {taxEnabled && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Tax ({taxRate}%)</span>
                <span className="font-semibold text-gray-800">{formatPrice(tax, currency)}</span>
              </div>
            )}
            {serviceChargeEnabled && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Service Charge ({serviceChargeRate}%)</span>
                <span className="font-semibold text-gray-800">{formatPrice(serviceCharge, currency)}</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
              <span className="text-lg font-bold text-gray-900">Total</span>
              <span className="text-2xl font-black text-amber-700">{formatPrice(total, currency)}</span>
            </div>
          </div>
        </div>

        <p className="text-center text-sm text-gray-400">Payment will be collected at the counter</p>

        {/* Actions */}
        <div className="flex items-center gap-4 pt-4">
          <button
            onClick={onBack}
            disabled={submitting}
            className="flex items-center gap-2 rounded-2xl border-2 border-gray-200 bg-white px-8 py-4 text-base font-bold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <ArrowLeft className="h-5 w-5" />
            Back
          </button>
          <button
            onClick={onConfirm}
            disabled={submitting}
            className="flex-1 flex items-center justify-center gap-3 rounded-2xl bg-amber-700 py-4 text-lg font-bold text-white hover:bg-amber-600 transition-colors disabled:opacity-60 shadow-lg shadow-amber-700/20"
          >
            {submitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <CheckCircle className="h-5 w-5" />
            )}
            {submitting ? "Placing Order..." : "Confirm Order"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
