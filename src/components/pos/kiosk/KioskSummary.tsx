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
      <h2 className="text-2xl font-black text-[var(--text-1)] mb-1.5">Order Summary</h2>
      <p className="text-[var(--text-3)] text-sm mb-8">Review your order before confirming</p>

      <div className="w-full max-w-lg space-y-4">
        {/* Order meta badges */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="flex items-center gap-1.5 rounded-full bg-[var(--accent-muted)] border border-[var(--accent-border)] px-4 py-2">
            {orderType === "DINE_IN" ? (
              <UtensilsCrossed className="h-3.5 w-3.5 text-[var(--accent-text)]" />
            ) : (
              <ShoppingBag className="h-3.5 w-3.5 text-[var(--accent-text)]" />
            )}
            <span className="text-xs font-bold text-[var(--accent-text)]">
              {orderType === "DINE_IN" ? `Dine In${tableNo ? ` · Table ${tableNo}` : ""}` : "Takeaway"}
            </span>
          </div>
          {guestName && (
            <div className="rounded-full bg-[var(--surface)] px-4 py-2">
              <span className="text-xs font-semibold text-[var(--text-2)]">{guestName}</span>
            </div>
          )}
        </div>

        {/* Items list */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--canvas)] overflow-hidden shadow-sm">
          <div className="divide-y divide-[var(--border)]">
            {items.map((item) => (
              <div key={item.menuItemId} className="flex items-center justify-between px-5 py-3.5">
                <div className="min-w-0 flex-1 mr-4">
                  <p className="text-sm font-semibold text-[var(--text-1)]">{item.name}</p>
                  {item.sizeLabel && (
                    <p className="text-[11px] text-[var(--text-3)]">{item.sizeLabel}</p>
                  )}
                  {item.addOnNames.length > 0 && (
                    <p className="text-[11px] text-[var(--text-3)]">+ {item.addOnNames.join(", ")}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[11px] text-[var(--text-3)]">x{item.quantity}</p>
                  <p className="text-sm font-bold text-[var(--text-1)]">{formatPrice(item.unitPrice * item.quantity, currency)}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t border-[var(--border)] bg-[var(--canvas-sub)] px-5 py-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-2)]">Subtotal</span>
              <span className="font-semibold text-[var(--text-2)]">{formatPrice(subtotal, currency)}</span>
            </div>
            {taxEnabled && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--text-2)]">Tax ({taxRate}%)</span>
                <span className="font-semibold text-[var(--text-2)]">{formatPrice(tax, currency)}</span>
              </div>
            )}
            {serviceChargeEnabled && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--text-2)]">Service Charge ({serviceChargeRate}%)</span>
                <span className="font-semibold text-[var(--text-2)]">{formatPrice(serviceCharge, currency)}</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
              <span className="text-base font-bold text-[var(--text-1)]">Total</span>
              <span className="text-xl font-black text-[var(--accent-text)]">{formatPrice(total, currency)}</span>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-[var(--text-3)]">Payment will be collected at the counter</p>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={onBack}
            disabled={submitting}
            className="flex items-center gap-2 rounded-xl border-2 border-[var(--border)] bg-[var(--canvas)] px-7 py-3.5 text-sm font-bold text-[var(--text-2)] hover:bg-[var(--canvas-sub)] transition-colors disabled:opacity-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <button
            onClick={onConfirm}
            disabled={submitting}
            className="flex-1 flex items-center justify-center gap-2.5 rounded-xl bg-[var(--accent-hover)] py-3.5 text-sm font-bold text-white hover:bg-[var(--accent)] transition-colors disabled:opacity-60 shadow-lg shadow-[var(--accent)]/20/25 active:scale-[0.98]"
          >
            <CheckCircle className="h-4 w-4" />
            {submitting ? "Placing Order..." : "Confirm Order"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
