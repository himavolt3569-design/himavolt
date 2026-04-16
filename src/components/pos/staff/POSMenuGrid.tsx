"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search, X } from "lucide-react";
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
    <div className="flex flex-col h-full bg-[var(--canvas-sub)]">
      {/* Search bar */}
      <div className="shrink-0 px-4 pt-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-3)] pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search menu items..."
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] pl-9 pr-9 py-2.5 text-sm text-gray-800 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Category filter pills */}
      <div className="shrink-0 flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
        <button
          onClick={() => setActiveCategory("ALL")}
          className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold border transition-all ${
            activeCategory === "ALL"
              ? "bg-amber-600 text-white border-amber-600 shadow-sm"
              : "bg-[var(--canvas)] text-[var(--text-2)] border-[var(--border)] hover:border-gray-300 hover:text-[var(--text-2)]"
          }`}
        >
          All Items
        </button>
        {topCats.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold border transition-all ${
              activeCategory === cat.id
                ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                : "bg-[var(--canvas)] text-[var(--text-2)] border-[var(--border)] hover:border-gray-300 hover:text-[var(--text-2)]"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Items grid */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-[var(--text-3)] text-sm">
            No items found
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2.5">
            {filtered.map((item) => (
              <motion.button
                key={item.id}
                whileTap={{ scale: 0.96 }}
                onClick={() => onItemTap(item)}
                className="relative flex flex-col rounded-xl border border-[var(--border)] bg-[var(--canvas)] p-3 text-left shadow-sm hover:shadow-md hover:border-amber-300 hover:bg-amber-50/60 transition-all group"
              >
                {item.isVeg && (
                  <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-[#eaa94d] ring-2 ring-white" />
                )}
                <p className="text-xs font-semibold text-gray-800 line-clamp-2 leading-snug mb-2.5 pr-3 group-hover:text-amber-900 transition-colors">
                  {item.name}
                </p>
                <p className="text-sm font-bold text-amber-700 mt-auto">{formatPrice(item.price, currency)}</p>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
