"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search, X, Leaf } from "lucide-react";
import { formatPrice } from "@/lib/currency";

interface Category {
  id: string;
  name: string;
  parentId: string | null;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  isAvailable: boolean;
  isVeg: boolean;
  categoryId: string;
  category: { name: string };
}

interface Props {
  items: MenuItem[];
  categories: Category[];
  currency: string;
  onItemTap: (item: MenuItem) => void;
}

const CATEGORY_COLORS = [
  "bg-blue-50 border-blue-200 text-blue-700",
  "bg-green-50 border-green-200 text-green-700",
  "bg-purple-50 border-purple-200 text-purple-700",
  "bg-orange-50 border-orange-200 text-orange-700",
  "bg-pink-50 border-pink-200 text-pink-700",
  "bg-teal-50 border-teal-200 text-teal-700",
  "bg-indigo-50 border-indigo-200 text-indigo-700",
  "bg-rose-50 border-rose-200 text-rose-700",
];

export default function POSMenuGrid({ items, categories, currency, onItemTap }: Props) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | "ALL">("ALL");

  const topCats = categories.filter((c) => c.parentId === null);

  const filtered = items.filter((item) => {
    if (!item.isAvailable) return false;
    if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (activeCategory === "ALL") return true;
    const childIds = categories.filter((c) => c.parentId === activeCategory).map((c) => c.id);
    return item.categoryId === activeCategory || childIds.includes(item.categoryId);
  });

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="shrink-0 px-4 pt-3 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items..."
            className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-8 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 transition-all"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-3.5 w-3.5 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Category tabs */}
      <div className="shrink-0 flex gap-2 px-4 pb-2 overflow-x-auto scrollbar-hide">
        <button
          onClick={() => setActiveCategory("ALL")}
          className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
            activeCategory === "ALL" ? "bg-amber-700 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          All
        </button>
        {topCats.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              activeCategory === cat.id ? "bg-amber-700 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Items grid */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">No items found</div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
            {filtered.map((item, idx) => {
              const catIdx = topCats.findIndex((c) => c.id === item.categoryId);
              const colorClass = CATEGORY_COLORS[catIdx >= 0 ? catIdx % CATEGORY_COLORS.length : 0];

              return (
                <motion.button
                  key={item.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onItemTap(item)}
                  className={`relative rounded-xl border p-2.5 text-left transition-all hover:shadow-md ${colorClass}`}
                >
                  {item.isVeg && <Leaf className="absolute top-1.5 right-1.5 h-3 w-3 text-green-600" />}
                  <p className="text-xs font-bold line-clamp-2 leading-tight mb-1">{item.name}</p>
                  <p className="text-xs font-black opacity-80">{formatPrice(item.price, currency)}</p>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
