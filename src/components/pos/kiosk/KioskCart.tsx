"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Minus, ShoppingCart, Trash2, ArrowRight } from "lucide-react";
import { formatPrice } from "@/lib/currency";

export interface KioskCartItem {
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  sizeLabel: string | null;
  addOnNames: string[];
}

interface Props {
  items: KioskCartItem[];
  currency: string;
  onUpdateQty: (menuItemId: string, delta: number) => void;
  onRemove: (menuItemId: string) => void;
  onClear: () => void;
  onCheckout: () => void;
}

export default function KioskCart({ items, currency, onUpdateQty, onRemove, onClear, onCheckout }: Props) {
  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <ShoppingCart className="h-4 w-4 text-amber-600" />
          <h2 className="text-sm font-bold text-gray-900">Your Order</h2>
          {totalItems > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-600 px-1.5 text-[11px] font-bold text-white">
              {totalItems}
            </span>
          )}
        </div>
        {items.length > 0 && (
          <button onClick={onClear} className="text-xs font-medium text-gray-400 hover:text-red-500 transition-colors">
            Clear
          </button>
        )}
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-300 px-6">
            <ShoppingCart className="h-14 w-14 mb-4 opacity-30" />
            <p className="text-sm font-semibold text-gray-400">Cart is empty</p>
            <p className="text-xs mt-1 text-gray-300 text-center">Tap items from the menu to add them</p>
          </div>
        ) : (
          <AnimatePresence>
            {items.map((item) => (
              <motion.div
                key={item.menuItemId}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                className="flex items-start gap-3 px-5 py-3.5 border-b border-gray-50 hover:bg-gray-50/60 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                  {item.sizeLabel && (
                    <p className="text-[11px] text-gray-400 mt-0.5">{item.sizeLabel}</p>
                  )}
                  {item.addOnNames.length > 0 && (
                    <p className="text-[11px] text-gray-400 mt-0.5">+ {item.addOnNames.join(", ")}</p>
                  )}
                  <p className="text-sm font-bold text-amber-700 mt-1">
                    {formatPrice(item.unitPrice * item.quantity, currency)}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                  <button
                    onClick={() => onUpdateQty(item.menuItemId, -1)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors active:scale-95"
                  >
                    <Minus className="h-3.5 w-3.5 text-gray-600" />
                  </button>
                  <span className="w-7 text-center text-sm font-black text-gray-900">{item.quantity}</span>
                  <button
                    onClick={() => onUpdateQty(item.menuItemId, 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 hover:bg-amber-100 transition-colors active:scale-95"
                  >
                    <Plus className="h-3.5 w-3.5 text-amber-700" />
                  </button>
                  <button
                    onClick={() => onRemove(item.menuItemId)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Checkout */}
      {items.length > 0 && (
        <div className="shrink-0 border-t border-gray-100 p-5 space-y-3 bg-gray-50/60">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-600">Subtotal</span>
            <span className="text-lg font-black text-gray-900">{formatPrice(subtotal, currency)}</span>
          </div>
          <button
            onClick={onCheckout}
            className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-amber-600 py-3.5 text-base font-bold text-white hover:bg-amber-500 transition-colors shadow-lg shadow-amber-600/25 active:scale-[0.98]"
          >
            Proceed to Checkout
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
