"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatPrice } from "@/lib/currency";
import { useRestaurant } from "@/context/RestaurantContext";
import {
  Monitor,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  Tag,
  X,
  Sparkles,
  Clock,
  AlertCircle,
} from "lucide-react";

type ItemStatus = "available" | "just-baked" | "last-few" | "sold-out";

interface DisplayItem {
  id: string;
  name: string;
  category: string;
  price: number;
  status: ItemStatus;
  showPrice: boolean;
  order: number;
}

const CATEGORIES = ["Breads", "Pastries", "Cakes", "Cookies", "Savory", "Beverages"];

const STATUS_CONFIG: Record<ItemStatus, { label: string; color: string; bg: string }> = {
  available: { label: "Available", color: "text-green-600", bg: "bg-green-50" },
  "just-baked": { label: "Just Baked", color: "text-amber-600", bg: "bg-amber-50" },
  "last-few": { label: "Last Few", color: "text-orange-600", bg: "bg-orange-50" },
  "sold-out": { label: "Sold Out", color: "text-red-600", bg: "bg-red-50" },
};

export default function DisplayCounterTab() {
  const { selectedRestaurant } = useRestaurant();
  const cur = selectedRestaurant?.currency ?? "NPR";
  const [items, setItems] = useState<DisplayItem[]>([]);
  const [displayMode, setDisplayMode] = useState(true);
  const [autoRemoveSoldOut, setAutoRemoveSoldOut] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [previewMode, setPreviewMode] = useState(false);

  const displayItems = items
    .filter((i) => {
      if (autoRemoveSoldOut && i.status === "sold-out") return false;
      if (selectedCategory !== "all" && i.category !== selectedCategory) return false;
      return true;
    })
    .sort((a, b) => a.order - b.order);

  const handleStatusChange = (id: string, status: ItemStatus) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
  };

  const handleTogglePrice = (id: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, showPrice: !i.showPrice } : i)));
  };

  const handleMoveUp = (id: string) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      if (idx <= 0) return prev;
      const newItems = [...prev];
      const thisOrder = newItems[idx].order;
      newItems[idx].order = newItems[idx - 1].order;
      newItems[idx - 1].order = thisOrder;
      return newItems.sort((a, b) => a.order - b.order);
    });
  };

  const handleMoveDown = (id: string) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      if (idx >= prev.length - 1) return prev;
      const newItems = [...prev];
      const thisOrder = newItems[idx].order;
      newItems[idx].order = newItems[idx + 1].order;
      newItems[idx + 1].order = thisOrder;
      return newItems.sort((a, b) => a.order - b.order);
    });
  };

  const availableCount = items.filter((i) => i.status !== "sold-out").length;
  const justBakedCount = items.filter((i) => i.status === "just-baked").length;
  const soldOutCount = items.filter((i) => i.status === "sold-out").length;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Monitor className="h-5 w-5 text-pink-500" />
            Display Counter
          </h2>
          <p className="text-sm text-gray-500 mt-1">Manage showcase items for walk-in customers</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
              previewMode ? "bg-pink-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <Eye className="h-4 w-4" />
            {previewMode ? "Exit Preview" : "Preview"}
          </button>
        </div>
      </div>

      {/* Display mode toggle */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex items-center gap-3 rounded-xl bg-white p-4 ring-1 ring-gray-100 shadow-sm flex-1">
          <Monitor className="h-5 w-5 text-pink-500" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800">Display Counter Mode</p>
            <p className="text-xs text-gray-400">Enable customer-facing display</p>
          </div>
          <button
            onClick={() => setDisplayMode(!displayMode)}
            className={`relative h-6 w-11 rounded-full transition-colors ${displayMode ? "bg-pink-500" : "bg-gray-200"}`}
          >
            <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${displayMode ? "translate-x-5" : ""}`} />
          </button>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-white p-4 ring-1 ring-gray-100 shadow-sm flex-1">
          <AlertCircle className="h-5 w-5 text-gray-400" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800">Auto-hide Sold Out</p>
            <p className="text-xs text-gray-400">Remove sold out items from display</p>
          </div>
          <button
            onClick={() => setAutoRemoveSoldOut(!autoRemoveSoldOut)}
            className={`relative h-6 w-11 rounded-full transition-colors ${autoRemoveSoldOut ? "bg-pink-500" : "bg-gray-200"}`}
          >
            <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${autoRemoveSoldOut ? "translate-x-5" : ""}`} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl bg-white ring-1 ring-gray-100 p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-green-500">{availableCount}</p>
          <p className="text-[11px] text-gray-500">Available</p>
        </div>
        <div className="rounded-xl bg-white ring-1 ring-gray-100 p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-amber-500">{justBakedCount}</p>
          <p className="text-[11px] text-gray-500">Just Baked</p>
        </div>
        <div className="rounded-xl bg-white ring-1 ring-gray-100 p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-red-500">{soldOutCount}</p>
          <p className="text-[11px] text-gray-500">Sold Out</p>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-1.5 flex-wrap">
        <button
          onClick={() => setSelectedCategory("all")}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
            selectedCategory === "all" ? "bg-pink-100 text-pink-700" : "bg-gray-50 text-gray-500 hover:bg-gray-100"
          }`}
        >
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setSelectedCategory(c)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              selectedCategory === c ? "bg-pink-100 text-pink-700" : "bg-gray-50 text-gray-500 hover:bg-gray-100"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Preview Mode */}
      <AnimatePresence>
        {previewMode && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="rounded-2xl bg-gradient-to-br from-pink-50 to-amber-50 p-6 ring-1 ring-pink-100"
          >
            <p className="text-center text-xs font-bold text-pink-400 uppercase tracking-widest mb-4">Customer Display Preview</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {displayItems.filter((i) => i.status !== "sold-out").map((item) => {
                const sc = STATUS_CONFIG[item.status];
                return (
                  <div key={item.id} className="rounded-xl bg-white p-4 shadow-sm text-center">
                    <div className="h-16 w-16 mx-auto rounded-xl bg-pink-50 flex items-center justify-center mb-2">
                      <Sparkles className="h-6 w-6 text-pink-300" />
                    </div>
                    <p className="text-sm font-bold text-gray-800">{item.name}</p>
                    {item.showPrice && <p className="text-sm font-bold text-pink-500 mt-1">{formatPrice(item.price, cur)}</p>}
                    {item.status !== "available" && (
                      <span className={`inline-block mt-1.5 text-[9px] font-bold ${sc.color} ${sc.bg} px-2 py-0.5 rounded-full`}>
                        {sc.label}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Item List */}
      <div className="space-y-2">
        {displayItems.map((item, idx) => {
          const sc = STATUS_CONFIG[item.status];
          return (
            <motion.div
              key={item.id}
              layout
              className={`flex items-center gap-4 rounded-xl bg-white ring-1 ring-gray-100 p-3.5 shadow-sm ${
                item.status === "sold-out" ? "opacity-50" : ""
              }`}
            >
              {/* Reorder */}
              <div className="flex flex-col gap-0.5 shrink-0">
                <button onClick={() => handleMoveUp(item.id)} className="text-gray-300 hover:text-gray-500 transition-colors" disabled={idx === 0}>
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => handleMoveDown(item.id)} className="text-gray-300 hover:text-gray-500 transition-colors" disabled={idx === displayItems.length - 1}>
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Item info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-800">{item.name}</p>
                  <span className={`text-[9px] font-bold ${sc.color} ${sc.bg} px-1.5 py-0.5 rounded`}>{sc.label}</span>
                </div>
                <p className="text-[11px] text-gray-400">{item.category} · {formatPrice(item.price, cur)}</p>
              </div>

              {/* Status selector */}
              <select
                value={item.status}
                onChange={(e) => handleStatusChange(item.id, e.target.value as ItemStatus)}
                className="rounded-lg bg-gray-50 px-2 py-1.5 text-xs ring-1 ring-gray-200 outline-none focus:ring-pink-400"
              >
                <option value="available">Available</option>
                <option value="just-baked">Just Baked</option>
                <option value="last-few">Last Few</option>
                <option value="sold-out">Sold Out</option>
              </select>

              {/* Price toggle */}
              <button
                onClick={() => handleTogglePrice(item.id)}
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                  item.showPrice ? "bg-pink-50 text-pink-500" : "bg-gray-50 text-gray-300"
                }`}
                title={item.showPrice ? "Hide price" : "Show price"}
              >
                {item.showPrice ? <Tag className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              </button>
            </motion.div>
          );
        })}
      </div>

      {displayItems.length === 0 && (
        <div className="text-center py-16">
          <Monitor className="h-10 w-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No items to display</p>
        </div>
      )}
    </div>
  );
}
