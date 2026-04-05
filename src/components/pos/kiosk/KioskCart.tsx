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
    <div className="flex flex-col h-full bg-white border-l border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <ShoppingCart className="h-5 w-5 text-amber-700" />
          <h2 className="text-lg font-bold text-gray-900">Your Order</h2>
          {totalItems > 0 && (
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-600 text-xs font-bold text-white">
              {totalItems}
            </span>
          )}
        </div>
        {items.length > 0 && (
          <button onClick={onClear} className="text-xs font-medium text-red-400 hover:text-red-600 transition-colors">
            Clear All
          </button>
        )}
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-300 px-6">
            <ShoppingCart className="h-16 w-16 mb-4 opacity-40" />
            <p className="text-base font-medium">Your cart is empty</p>
            <p className="text-sm mt-1">Tap items from the menu to add them</p>
          </div>
        ) : (
          <AnimatePresence>
            {items.map((item) => (
              <motion.div
                key={item.menuItemId}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-start gap-3 px-5 py-4 border-b border-gray-50"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{item.name}</p>
                  {item.sizeLabel && (
                    <p className="text-xs text-gray-500 mt-0.5">Size: {item.sizeLabel}</p>
                  )}
                  {item.addOnNames.length > 0 && (
                    <p className="text-xs text-gray-500 mt-0.5">+ {item.addOnNames.join(", ")}</p>
                  )}
                  <p className="text-sm font-bold text-amber-700 mt-1">
                    {formatPrice(item.unitPrice * item.quantity, currency)}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onUpdateQty(item.menuItemId, -1)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
                  >
                    <Minus className="h-4 w-4 text-gray-600" />
                  </button>
                  <span className="w-8 text-center text-base font-black text-gray-900">{item.quantity}</span>
                  <button
                    onClick={() => onUpdateQty(item.menuItemId, 1)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 hover:bg-amber-200 transition-colors"
                  >
                    <Plus className="h-4 w-4 text-amber-700" />
                  </button>
                  <button
                    onClick={() => onRemove(item.menuItemId)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Footer */}
      {items.length > 0 && (
        <div className="shrink-0 border-t border-gray-200 p-5 space-y-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-gray-700">Subtotal</span>
            <span className="text-xl font-black text-gray-900">{formatPrice(subtotal, currency)}</span>
          </div>
          <button
            onClick={onCheckout}
            className="w-full flex items-center justify-center gap-3 rounded-2xl bg-amber-700 py-4 text-lg font-bold text-white hover:bg-amber-600 transition-colors shadow-lg shadow-amber-700/20"
          >
            Proceed to Checkout
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}
