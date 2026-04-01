"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatPrice } from "@/lib/currency";
import { useRestaurant } from "@/context/RestaurantContext";
import { apiFetch } from "@/lib/api-client";
import {
  Monitor,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  Tag,
  Plus,
  Trash2,
  Sparkles,
  AlertCircle,
  Loader2,
} from "lucide-react";

type ItemStatus = "available" | "just-baked" | "last-few" | "sold-out";

interface DisplayItem {
  id: string;
  name: string;
  category: string;
  price: number;
  status: ItemStatus;
  showPrice: boolean;
  sortOrder: number;
  imageUrl: string | null;
}

interface DisplayConfig {
  isEnabled: boolean;
  autoHideSoldOut: boolean;
}

const CATEGORIES = ["General", "Breads", "Pastries", "Cakes", "Cookies", "Savory", "Beverages", "Snacks", "Tandoori", "Momo", "Rice", "Noodles"];

const STATUS_CONFIG: Record<ItemStatus, { label: string; color: string; bg: string }> = {
  available: { label: "Available", color: "text-green-600", bg: "bg-green-50" },
  "just-baked": { label: "Fresh Now", color: "text-amber-600", bg: "bg-amber-50" },
  "last-few": { label: "Last Few", color: "text-orange-600", bg: "bg-orange-50" },
  "sold-out": { label: "Sold Out", color: "text-red-600", bg: "bg-red-50" },
};

export default function DisplayCounterTab() {
  const { selectedRestaurant } = useRestaurant();
  const cur = selectedRestaurant?.currency ?? "NPR";
  const restaurantId = selectedRestaurant?.id;

  const [items, setItems] = useState<DisplayItem[]>([]);
  const [config, setConfig] = useState<DisplayConfig>({ isEnabled: false, autoHideSoldOut: false });
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [previewMode, setPreviewMode] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", category: "General", price: 0 });
  const [saving, setSaving] = useState(false);

  // Load data from API
  const loadData = useCallback(async () => {
    if (!restaurantId) return;
    try {
      const data = await apiFetch<{ items: DisplayItem[]; config: DisplayConfig }>(
        `/api/restaurants/${restaurantId}/display-counter`
      );
      setItems(data.items);
      setConfig(data.config);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateConfig = async (updates: Partial<DisplayConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    await apiFetch(`/api/restaurants/${restaurantId}/display-counter`, {
      method: "POST",
      body: { config: newConfig, _action: "updateConfig" },
    }).catch(() => setConfig(config));
  };

  const addItem = async () => {
    if (!newItem.name.trim() || !restaurantId) return;
    setSaving(true);
    try {
      const item = await apiFetch<DisplayItem>(
        `/api/restaurants/${restaurantId}/display-counter`,
        { method: "POST", body: newItem }
      );
      setItems((prev) => [...prev, item]);
      setNewItem({ name: "", category: "General", price: 0 });
      setShowAddForm(false);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const updateItem = async (id: string, updates: Partial<DisplayItem>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...updates } : i)));
    await apiFetch(`/api/restaurants/${restaurantId}/display-counter`, {
      method: "PATCH" as "POST",
      body: { itemId: id, ...updates },
    }).catch(() => loadData());
  };

  const deleteItem = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await apiFetch(`/api/restaurants/${restaurantId}/display-counter?itemId=${id}`, {
      method: "DELETE",
    }).catch(() => loadData());
  };

  const handleMoveUp = async (id: string) => {
    const idx = items.findIndex((i) => i.id === id);
    if (idx <= 0) return;
    const newItems = [...items];
    const thisOrder = newItems[idx].sortOrder;
    newItems[idx].sortOrder = newItems[idx - 1].sortOrder;
    newItems[idx - 1].sortOrder = thisOrder;
    newItems.sort((a, b) => a.sortOrder - b.sortOrder);
    setItems(newItems);
    await apiFetch(`/api/restaurants/${restaurantId}/display-counter`, {
      method: "PATCH" as "POST",
      body: { reorder: newItems.map((i) => ({ id: i.id, sortOrder: i.sortOrder })) },
    }).catch(() => loadData());
  };

  const handleMoveDown = async (id: string) => {
    const idx = items.findIndex((i) => i.id === id);
    if (idx >= items.length - 1) return;
    const newItems = [...items];
    const thisOrder = newItems[idx].sortOrder;
    newItems[idx].sortOrder = newItems[idx + 1].sortOrder;
    newItems[idx + 1].sortOrder = thisOrder;
    newItems.sort((a, b) => a.sortOrder - b.sortOrder);
    setItems(newItems);
    await apiFetch(`/api/restaurants/${restaurantId}/display-counter`, {
      method: "PATCH" as "POST",
      body: { reorder: newItems.map((i) => ({ id: i.id, sortOrder: i.sortOrder })) },
    }).catch(() => loadData());
  };

  const displayItems = items
    .filter((i) => {
      if (config.autoHideSoldOut && i.status === "sold-out") return false;
      if (selectedCategory !== "all" && i.category !== selectedCategory) return false;
      return true;
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const availableCount = items.filter((i) => i.status !== "sold-out").length;
  const freshCount = items.filter((i) => i.status === "just-baked").length;
  const soldOutCount = items.filter((i) => i.status === "sold-out").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-pink-400" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Monitor className="h-5 w-5 text-pink-500" />
            Display Counter
          </h2>
          <p className="text-sm text-gray-500 mt-1">Manage showcase items visible to your customers</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 rounded-xl bg-pink-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-pink-600 transition-all"
          >
            <Plus className="h-4 w-4" />
            Add Item
          </button>
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

      {/* Display mode toggles */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex items-center gap-3 rounded-xl bg-white p-4 ring-1 ring-gray-100 shadow-sm flex-1">
          <Monitor className="h-5 w-5 text-pink-500" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800">Display Counter Mode</p>
            <p className="text-xs text-gray-400">Enable customer-facing display</p>
          </div>
          <button
            onClick={() => updateConfig({ isEnabled: !config.isEnabled })}
            className={`relative h-6 w-11 rounded-full transition-colors ${config.isEnabled ? "bg-pink-500" : "bg-gray-200"}`}
          >
            <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${config.isEnabled ? "translate-x-5" : ""}`} />
          </button>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-white p-4 ring-1 ring-gray-100 shadow-sm flex-1">
          <AlertCircle className="h-5 w-5 text-gray-400" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800">Auto-hide Sold Out</p>
            <p className="text-xs text-gray-400">Remove sold out items from display</p>
          </div>
          <button
            onClick={() => updateConfig({ autoHideSoldOut: !config.autoHideSoldOut })}
            className={`relative h-6 w-11 rounded-full transition-colors ${config.autoHideSoldOut ? "bg-pink-500" : "bg-gray-200"}`}
          >
            <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${config.autoHideSoldOut ? "translate-x-5" : ""}`} />
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
          <p className="text-2xl font-bold text-amber-500">{freshCount}</p>
          <p className="text-[11px] text-gray-500">Fresh Now</p>
        </div>
        <div className="rounded-xl bg-white ring-1 ring-gray-100 p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-red-500">{soldOutCount}</p>
          <p className="text-[11px] text-gray-500">Sold Out</p>
        </div>
      </div>

      {/* Add Item Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl bg-white ring-1 ring-gray-100 p-5 shadow-sm space-y-4">
              <p className="text-sm font-bold text-gray-800">Add New Display Item</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Item name"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-400/20 focus:border-pink-400"
                />
                <select
                  value={newItem.category}
                  onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-400/20 focus:border-pink-400"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Price"
                  value={newItem.price || ""}
                  onChange={(e) => setNewItem({ ...newItem, price: Number(e.target.value) })}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-400/20 focus:border-pink-400"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={addItem}
                  disabled={saving || !newItem.name.trim()}
                  className="rounded-lg bg-pink-500 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-600 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                onChange={(e) => updateItem(item.id, { status: e.target.value as ItemStatus })}
                className="rounded-lg bg-gray-50 px-2 py-1.5 text-xs ring-1 ring-gray-200 outline-none focus:ring-pink-400"
              >
                <option value="available">Available</option>
                <option value="just-baked">Fresh Now</option>
                <option value="last-few">Last Few</option>
                <option value="sold-out">Sold Out</option>
              </select>

              {/* Price toggle */}
              <button
                onClick={() => updateItem(item.id, { showPrice: !item.showPrice })}
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                  item.showPrice ? "bg-pink-50 text-pink-500" : "bg-gray-50 text-gray-300"
                }`}
                title={item.showPrice ? "Hide price" : "Show price"}
              >
                {item.showPrice ? <Tag className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              </button>

              {/* Delete */}
              <button
                onClick={() => deleteItem(item.id)}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all"
                title="Remove item"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          );
        })}
      </div>

      {displayItems.length === 0 && (
        <div className="text-center py-16">
          <Monitor className="h-10 w-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No items to display</p>
          <p className="text-xs text-gray-300 mt-1">Add items to your display counter to get started</p>
        </div>
      )}
    </div>
  );
}
