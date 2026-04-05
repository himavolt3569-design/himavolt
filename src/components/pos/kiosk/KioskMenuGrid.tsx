"use client";

import { motion } from "framer-motion";
import { Leaf, Flame, Plus } from "lucide-react";
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
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <p className="text-lg font-medium">No items available</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {items.map((item) => {
        const inCart = cart.find((c) => c.menuItemId === item.id);
        const hasSizes = item.sizes.length > 0;
        const discountedPrice = item.discount > 0 ? item.price * (1 - item.discount / 100) : item.price;

        return (
          <motion.div
            key={item.id}
            whileTap={{ scale: 0.97 }}
            onClick={() => onItemTap(item)}
            className={`relative rounded-2xl border-2 bg-white overflow-hidden shadow-sm cursor-pointer transition-all hover:shadow-lg ${
              inCart ? "border-amber-400 ring-2 ring-amber-200" : "border-gray-100"
            }`}
          >
            {/* Image */}
            <div className="relative h-36 bg-gray-100">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50">
                  <span className="text-4xl">🍽️</span>
                </div>
              )}

              {/* Discount badge */}
              {item.discount > 0 && (
                <div className="absolute top-2 left-2 rounded-lg bg-red-500 px-2 py-1 text-xs font-bold text-white">
                  {item.discount}% OFF
                </div>
              )}

              {/* Cart count badge */}
              {inCart && (
                <div className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-amber-600 text-sm font-black text-white shadow-lg">
                  {inCart.quantity}
                </div>
              )}

              {/* Quick add button (only for items without sizes) */}
              {!hasSizes && (
                <button
                  onClick={(e) => { e.stopPropagation(); onQuickAdd(item); }}
                  className="absolute bottom-2 right-2 flex h-10 w-10 items-center justify-center rounded-full bg-amber-600 text-white shadow-lg hover:bg-amber-700 transition-colors"
                >
                  <Plus className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Content */}
            <div className="p-3">
              <div className="flex items-center gap-1.5 mb-1">
                {item.isVeg && <Leaf className="h-3.5 w-3.5 text-green-600" />}
                {item.spiceLevel > 0 && <Flame className="h-3.5 w-3.5 text-red-500" />}
              </div>
              <h3 className="text-sm font-bold text-gray-900 line-clamp-2 leading-tight">{item.name}</h3>

              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-base font-black text-amber-700">
                  {formatPrice(discountedPrice, currency)}
                </span>
                {item.discount > 0 && (
                  <span className="text-xs text-gray-400 line-through">
                    {formatPrice(item.price, currency)}
                  </span>
                )}
              </div>

              {hasSizes && (
                <p className="mt-1 text-xs text-amber-600 font-medium">
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
