"use client";

import { motion } from "framer-motion";
import { Plus, Utensils } from "lucide-react";
import { formatPrice } from "@/lib/currency";

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  isVeg: boolean;
  spiceLevel: number;
  discount: number;
  sizes: { id: string; label: string; grams: string; priceAdd: number }[];
  addOns: { id: string; name: string; price: number }[];
  category: { id: string; name: string };
}

interface CartItem {
  menuItemId: string;
  quantity: number;
}

interface Props {
  items: MenuItem[];
  cart: CartItem[];
  currency: string;
  onItemTap: (item: MenuItem) => void;
  onQuickAdd: (item: MenuItem) => void;
}

export default function KioskMenuGrid({ items, cart, currency, onItemTap, onQuickAdd }: Props) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[var(--text-3)]">
        <Utensils className="h-12 w-12 mb-4" />
        <p className="text-base font-medium text-[var(--text-3)]">No items available</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {items.map((item) => {
        const cartEntries = cart.filter((c) => c.menuItemId.startsWith(item.id + "_") || c.menuItemId === item.id);
        const inCartQty = cartEntries.reduce((sum, c) => sum + c.quantity, 0);
        const inCart = inCartQty > 0;
        const hasSizes = item.sizes.length > 0;
        const discountedPrice = item.discount > 0 ? item.price * (1 - item.discount / 100) : item.price;

        return (
          <motion.div
            key={item.id}
            whileTap={{ scale: 0.97 }}
            onClick={() => onItemTap(item)}
            className={`relative rounded-2xl border bg-[var(--canvas)] overflow-hidden shadow-sm cursor-pointer transition-all hover:shadow-md ${
              inCart ? "border-[var(--accent-border)] ring-2 ring-[var(--accent-border)]" : "border-[var(--border-soft)]"
            }`}
          >
            {/* Image */}
            <div className="relative h-36 bg-[var(--canvas-sub)]">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)]">
                  <Utensils className="h-10 w-10 text-[var(--accent)]" />
                </div>
              )}

              {item.discount > 0 && (
                <div className="absolute top-2 left-2 rounded-lg bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white">
                  {item.discount}% OFF
                </div>
              )}

              {inCart && (
                <div className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent-hover)] text-xs font-black text-white shadow-md">
                  {inCartQty}
                </div>
              )}

              {!hasSizes && (
                <button
                  onClick={(e) => { e.stopPropagation(); onQuickAdd(item); }}
                  className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent-hover)] text-white shadow-md hover:bg-[var(--accent)] transition-colors active:scale-95"
                >
                  <Plus className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Info */}
            <div className="p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                {item.isVeg && (
                  <span className="h-2 w-2 rounded-full bg-[var(--accent)] shrink-0" />
                )}
                {item.spiceLevel > 0 && (
                  <span className="h-2 w-2 rounded-full bg-red-400 shrink-0" />
                )}
              </div>
              <h3 className="text-sm font-bold text-[var(--text-1)] line-clamp-2 leading-tight">{item.name}</h3>

              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-sm font-black text-[var(--accent-text)]">
                  {formatPrice(discountedPrice, currency)}
                </span>
                {item.discount > 0 && (
                  <span className="text-xs text-[var(--text-3)] line-through">
                    {formatPrice(item.price, currency)}
                  </span>
                )}
              </div>

              {hasSizes && (
                <p className="mt-1 text-[11px] text-[var(--accent-text)] font-semibold">
                  {item.sizes.length} size{item.sizes.length > 1 ? "s" : ""} available
                </p>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
