"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X, Plus, Minus, ShoppingCart, Check, Utensils } from "lucide-react";
import { formatPrice } from "@/lib/currency";

interface Size {
  id: string;
  label: string;
  grams: string;
  priceAdd: number;
}

interface AddOn {
  id: string;
  name: string;
  price: number;
}

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  isVeg: boolean;
  spiceLevel: number;
  discount: number;
  sizes: Size[];
  addOns: AddOn[];
  category: { id: string; name: string };
}

interface Props {
  item: MenuItem;
  currency: string;
  onClose: () => void;
  onAdd: (item: MenuItem, qty: number, sizeId: string | null, addOnIds: string[]) => void;
}

export default function KioskItemDetail({ item, currency, onClose, onAdd }: Props) {
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string | null>(
    item.sizes.length > 0 ? item.sizes[0].id : null
  );
  const [selectedAddOns, setSelectedAddOns] = useState<Set<string>>(new Set());

  const basePrice = item.discount > 0 ? item.price * (1 - item.discount / 100) : item.price;
  const sizeExtra = selectedSize
    ? item.sizes.find((s) => s.id === selectedSize)?.priceAdd ?? 0
    : 0;
  const addOnTotal = item.addOns
    .filter((a) => selectedAddOns.has(a.id))
    .reduce((sum, a) => sum + a.price, 0);
  const unitPrice = basePrice + sizeExtra + addOnTotal;
  const totalPrice = unitPrice * quantity;

  const toggleAddOn = (id: string) => {
    setSelectedAddOns((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-[var(--canvas)] rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="h-56 bg-[var(--surface)] shrink-0">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] text-[var(--accent)]">
              <Utensils className="h-16 w-16" />
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Name & description */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              {item.isVeg && (
                <span className="h-2 w-2 rounded-full bg-[#eaa94d] shrink-0" />
              )}
              {item.spiceLevel > 0 && (
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(item.spiceLevel, 3) }).map((_, i) => (
                    <span key={i} className="h-2 w-2 rounded-full bg-red-400 shrink-0" />
                  ))}
                </div>
              )}
            </div>
            <h2 className="text-2xl font-black text-[var(--text-1)]">{item.name}</h2>
            {item.description && (
              <p className="mt-1 text-sm text-[var(--text-2)]">{item.description}</p>
            )}
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-xl font-black text-[var(--accent-text)]">{formatPrice(basePrice, currency)}</span>
              {item.discount > 0 && (
                <span className="text-sm text-[var(--text-3)] line-through">{formatPrice(item.price, currency)}</span>
              )}
            </div>
          </div>

          {item.sizes.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-[var(--text-2)] uppercase tracking-wider mb-3">Choose Size</h3>
              <div className="grid grid-cols-2 gap-3">
                {item.sizes.map((size) => (
                  <button
                    key={size.id}
                    onClick={() => setSelectedSize(size.id)}
                    className={`rounded-2xl border-2 p-4 text-left transition-all ${
                      selectedSize === size.id
                        ? "border-[var(--accent)] bg-[var(--accent-muted)]"
                        : "border-[var(--border)] hover:border-[var(--border)]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-[var(--text-1)]">{size.label}</span>
                      {selectedSize === size.id && <Check className="h-4 w-4 text-[var(--accent-text)]" />}
                    </div>
                    <p className="text-xs text-[var(--text-2)] mt-0.5">{size.grams}</p>
                    {size.priceAdd > 0 && (
                      <p className="text-xs font-bold text-[var(--accent-text)] mt-1">+{formatPrice(size.priceAdd, currency)}</p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Add-ons */}
          {item.addOns.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-[var(--text-2)] uppercase tracking-wider mb-3">Add-ons</h3>
              <div className="space-y-2">
                {item.addOns.map((addon) => (
                  <button
                    key={addon.id}
                    onClick={() => toggleAddOn(addon.id)}
                    className={`w-full flex items-center justify-between rounded-2xl border-2 p-4 transition-all ${
                      selectedAddOns.has(addon.id)
                        ? "border-[var(--accent)] bg-[var(--accent-muted)]"
                        : "border-[var(--border)] hover:border-[var(--border)]"
                    }`}
                  >
                    <span className="text-sm font-bold text-[var(--text-1)]">{addon.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[var(--accent-text)]">+{formatPrice(addon.price, currency)}</span>
                      <div className={`h-6 w-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                        selectedAddOns.has(addon.id)
                          ? "border-[var(--accent)] bg-[var(--accent)]"
                          : "border-[var(--border)]"
                      }`}>
                        {selectedAddOns.has(addon.id) && <Check className="h-3.5 w-3.5 text-white" />}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-sm font-bold text-[var(--text-2)] uppercase tracking-wider mb-3">Quantity</h3>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-[var(--border)] bg-[var(--canvas)] hover:bg-[var(--canvas-sub)] transition-colors"
              >
                <Minus className="h-6 w-6 text-[var(--text-2)]" />
              </button>
              <span className="text-3xl font-black text-[var(--text-1)] w-12 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-[var(--accent-border)] bg-[var(--accent-muted)] hover:bg-[var(--accent-muted)] transition-colors"
              >
                <Plus className="h-6 w-6 text-[var(--accent-text)]" />
              </button>
            </div>
          </div>
        </div>

        <div className="shrink-0 p-4 border-t border-[var(--border-soft)] bg-[var(--canvas-sub)]">
          <button
            onClick={() => {
              onAdd(item, quantity, selectedSize, Array.from(selectedAddOns));
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-[var(--accent-hover)] py-4 text-base font-bold text-white hover:bg-[var(--accent)] transition-colors shadow-lg shadow-[var(--accent)]/20/25 active:scale-[0.98]"
          >
            <ShoppingCart className="h-4 w-4" />
            Add to Cart — {formatPrice(totalPrice, currency)}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
