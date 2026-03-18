"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Package,
  AlertTriangle,
  Trash2,
  X,
  Check,
  Loader2,
  Pencil,
  TrendingDown,
  Box,
  Filter,
} from "lucide-react";
import { useRestaurant } from "@/context/RestaurantContext";
import { formatPrice } from "@/lib/currency";

interface UsedInMenuItem {
  id: string;
  name: string;
  quantityUsed: number;
}

interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  minStock: number;
  costPerUnit: number;
  category: string;
  notes: string | null;
  updatedAt: string;
  usedInMenuItems?: UsedInMenuItem[];
}

const UNITS = ["kg", "g", "litre", "ml", "pcs", "packs", "dozen", "bottle"];
const CATEGORIES = [
  "General",
  "Vegetables",
  "Fruits",
  "Meat",
  "Dairy",
  "Spices",
  "Grains",
  "Beverages",
  "Oils",
  "Snacks",
  "Other",
];

async function apiFetch(url: string, opts?: RequestInit) {
  const res = await fetch(url, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts?.headers || {}) },
    credentials: "include",
  });
  if (!res.ok) throw new Error("Request failed");
  return res.json();
}

export default function StockTab() {
  const { selectedRestaurant, restaurants } = useRestaurant();
  const restaurant = selectedRestaurant ?? restaurants[0];
  const cur = selectedRestaurant?.currency ?? "NPR";
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "low" | "ok">("all");
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);

  const fetchItems = useCallback(async () => {
    if (!restaurant) return;
    try {
      const data = await apiFetch(
        `/api/restaurants/${restaurant.id}/inventory`,
      );
      setItems(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [restaurant]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // 30-second polling for auto-refresh of stock levels
  useEffect(() => {
    if (!restaurant) return;
    const interval = setInterval(() => {
      fetchItems();
    }, 30000);
    return () => clearInterval(interval);
  }, [restaurant, fetchItems]);

  if (!restaurant) return null;

  const filtered = items.filter((item) => {
    if (search && !item.name.toLowerCase().includes(search.toLowerCase()))
      return false;
    if (filterCat !== "all" && item.category !== filterCat) return false;
    if (filterStatus === "low" && item.quantity > item.minStock) return false;
    if (filterStatus === "ok" && item.quantity <= item.minStock) return false;
    return true;
  });

  const lowStockCount = items.filter((i) => i.quantity <= i.minStock).length;
  const totalValue = items.reduce(
    (sum, i) => sum + i.quantity * i.costPerUnit,
    0,
  );
  const categories = [...new Set(items.map((i) => i.category))];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-[#3e1e0c]">
            Stock / Inventory
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Track ingredients and supplies for{" "}
            <strong className="text-[#3e1e0c]">{restaurant.name}</strong>
          </p>
        </div>
        <button
          onClick={() => {
            setEditItem(null);
            setShowAdd(true);
          }}
          className="flex items-center gap-2 rounded-xl bg-[#3e1e0c] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#3e1e0c]/20 transition-all hover:bg-[#2d1508] active:scale-[0.97]"
        >
          <Plus className="h-4 w-4" />
          Add Item
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Total Items",
            value: items.length,
            color: "text-[#3e1e0c]",
            icon: Box,
            iconColor: "text-blue-500",
          },
          {
            label: "Low Stock",
            value: lowStockCount,
            color: lowStockCount > 0 ? "text-red-600" : "text-emerald-600",
            icon: AlertTriangle,
            iconColor: lowStockCount > 0 ? "text-red-500" : "text-emerald-500",
          },
          {
            label: "Categories",
            value: categories.length,
            color: "text-blue-600",
            icon: Filter,
            iconColor: "text-blue-500",
          },
          {
            label: "Total Value",
            value: formatPrice(totalValue, cur),
            color: "text-[#3e1e0c]",
            icon: TrendingDown,
            iconColor: "text-amber-500",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl bg-white border border-gray-100 p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-gray-500">
                {stat.label}
              </p>
              <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
            </div>
            <p className={`text-xl font-black ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items..."
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm font-medium text-[#3e1e0c] placeholder-gray-400 outline-none transition-all focus:border-[#eaa94d] focus:ring-2 focus:ring-[#eaa94d]/15"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {(["all", "low", "ok"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                filterStatus === s
                  ? "bg-[#3e1e0c] text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {s === "all" ? "All" : s === "low" ? "Low Stock" : "In Stock"}
            </button>
          ))}
        </div>
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600 outline-none focus:border-[#eaa94d]"
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Items List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <Package className="h-10 w-10 text-gray-300 mb-3" />
          <p className="font-bold text-gray-500">
            {items.length === 0 ? "No items yet" : "No items match filters"}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {items.length === 0
              ? "Add your first inventory item to start tracking"
              : "Try adjusting your search or filters"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {filtered.map((item, i) => {
              const isLow = item.quantity <= item.minStock;
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: i * 0.02 }}
                  className={`group flex items-center gap-4 rounded-2xl bg-white border p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-all hover:shadow-[0_4px_20px_rgba(0,0,0,0.07)] ${
                    isLow ? "border-red-200 bg-red-50/30" : "border-gray-100"
                  }`}
                >
                  {/* Icon */}
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                      isLow ? "bg-red-50" : "bg-emerald-50"
                    }`}
                  >
                    {isLow ? (
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                    ) : (
                      <Package className="h-5 w-5 text-emerald-600" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-[#3e1e0c] truncate">
                        {item.name}
                      </h4>
                      <span className="shrink-0 rounded-md bg-gray-100 border border-gray-200 px-2 py-0.5 text-[10px] font-bold text-gray-500">
                        {item.category}
                      </span>
                      {isLow && (
                        <span className="shrink-0 rounded-md bg-red-50 border border-red-200 px-2 py-0.5 text-[10px] font-bold text-red-600">
                          Low Stock
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      <span className="font-semibold text-[#3e1e0c]">
                        {item.quantity}
                      </span>{" "}
                      {item.unit} &middot; Min: {item.minStock} {item.unit}
                      {item.costPerUnit > 0 && (
                        <>
                          {" "}
                          &middot; {formatPrice(item.costPerUnit, cur)}/{item.unit}
                        </>
                      )}
                    </p>
                    {item.notes && (
                      <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                        {item.notes}
                      </p>
                    )}
                    {item.usedInMenuItems && item.usedInMenuItems.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        <span className="text-[10px] font-semibold text-amber-600">Used in:</span>
                        {item.usedInMenuItems.map((mi) => (
                          <span
                            key={mi.id}
                            className="shrink-0 rounded-md bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-700"
                          >
                            {mi.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Quantity controls */}
                  <div className="flex items-center gap-2">
                    <QuickAdjust
                      item={item}
                      restaurantId={restaurant.id}
                      onUpdate={fetchItems}
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setEditItem(item);
                        setShowAdd(true);
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-all"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={async () => {
                        await apiFetch(
                          `/api/restaurants/${restaurant.id}/inventory/${item.id}`,
                          { method: "DELETE" },
                        );
                        fetchItems();
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-all"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Add / Edit Modal */}
      <AddEditModal
        open={showAdd}
        onClose={() => {
          setShowAdd(false);
          setEditItem(null);
        }}
        restaurantId={restaurant.id}
        item={editItem}
        onSaved={fetchItems}
      />
    </div>
  );
}

/* ─── Quick Adjust ─────────────────────────────────────────────────── */
function QuickAdjust({
  item,
  restaurantId,
  onUpdate,
}: {
  item: InventoryItem;
  restaurantId: string;
  onUpdate: () => void;
}) {
  const [adjusting, setAdjusting] = useState(false);
  const [val, setVal] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async (newQty: number) => {
    if (newQty < 0) return;
    setSaving(true);
    try {
      await apiFetch(`/api/restaurants/${restaurantId}/inventory/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ quantity: newQty }),
      });
      onUpdate();
      setAdjusting(false);
      setVal("");
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  if (adjusting) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder={String(item.quantity)}
          autoFocus
          className="w-16 rounded-md border border-amber-300 bg-amber-50/50 px-2 py-1 text-xs font-bold text-[#3e1e0c] outline-none focus:ring-2 focus:ring-amber-200 text-center"
        />
        <button
          onClick={() => save(Number(val) || item.quantity)}
          disabled={saving}
          className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100 disabled:opacity-40 transition-all"
        >
          {saving ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Check className="h-3 w-3" />
          )}
        </button>
        <button
          onClick={() => {
            setAdjusting(false);
            setVal("");
          }}
          className="flex h-6 w-6 items-center justify-center rounded-md bg-gray-100 text-gray-500 hover:bg-gray-200 transition-all"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => save(Math.max(0, item.quantity - 1))}
        className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 font-bold text-sm transition-all"
      >
        −
      </button>
      <button
        onClick={() => setAdjusting(true)}
        className="min-w-[3rem] rounded-lg bg-gray-50 px-2 py-1 text-center text-sm font-bold text-[#3e1e0c] hover:bg-gray-100 transition-all cursor-pointer"
        title="Click to set quantity"
      >
        {item.quantity}
      </button>
      <button
        onClick={() => save(item.quantity + 1)}
        className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 font-bold text-sm transition-all"
      >
        +
      </button>
    </div>
  );
}

/* ─── Add / Edit Modal ─────────────────────────────────────────────── */
function AddEditModal({
  open,
  onClose,
  restaurantId,
  item,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  restaurantId: string;
  item: InventoryItem | null;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("kg");
  const [quantity, setQuantity] = useState("");
  const [minStock, setMinStock] = useState("");
  const [costPerUnit, setCostPerUnit] = useState("");
  const [category, setCategory] = useState("General");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (item) {
      setName(item.name);
      setUnit(item.unit);
      setQuantity(String(item.quantity));
      setMinStock(String(item.minStock));
      setCostPerUnit(String(item.costPerUnit));
      setCategory(item.category);
      setNotes(item.notes ?? "");
    } else {
      setName("");
      setUnit("kg");
      setQuantity("");
      setMinStock("5");
      setCostPerUnit("");
      setCategory("General");
      setNotes("");
    }
    setError("");
  }, [item, open]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const body = {
        name: name.trim(),
        unit,
        quantity: Number(quantity) || 0,
        minStock: Number(minStock) || 5,
        costPerUnit: Number(costPerUnit) || 0,
        category,
        notes: notes.trim() || null,
      };
      if (item) {
        await apiFetch(
          `/api/restaurants/${restaurantId}/inventory/${item.id}`,
          { method: "PATCH", body: JSON.stringify(body) },
        );
      } else {
        await apiFetch(`/api/restaurants/${restaurantId}/inventory`, {
          method: "POST",
          body: JSON.stringify(body),
        });
      }
      onSaved();
      onClose();
    } catch {
      setError("Failed to save item");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[3px]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{
              type: "spring",
              damping: 28,
              stiffness: 340,
              mass: 0.7,
            }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8 max-h-[90dvh]"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-extrabold text-[#3e1e0c]">
                {item ? "Edit Item" : "Add Inventory Item"}
              </h3>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-bold text-[#3e1e0c] mb-1.5">
                  Item Name <span className="text-[#eaa94d]">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Chicken, Rice, Cooking Oil"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-[#3e1e0c] placeholder-gray-400 outline-none transition-all focus:border-[#3e1e0c] focus:ring-2 focus:ring-[#3e1e0c]/15"
                />
              </div>

              {/* Unit + Category row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-[#3e1e0c] mb-1.5">
                    Unit
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-[#3e1e0c] outline-none focus:border-[#3e1e0c] focus:ring-2 focus:ring-[#3e1e0c]/15"
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#3e1e0c] mb-1.5">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-[#3e1e0c] outline-none focus:border-[#3e1e0c] focus:ring-2 focus:ring-[#3e1e0c]/15"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Quantity + Min Stock */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-[#3e1e0c] mb-1.5">
                    Current Qty
                  </label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="0"
                    min="0"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-[#3e1e0c] placeholder-gray-400 outline-none transition-all focus:border-[#3e1e0c] focus:ring-2 focus:ring-[#3e1e0c]/15"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#3e1e0c] mb-1.5">
                    Min Stock Alert
                  </label>
                  <input
                    type="number"
                    value={minStock}
                    onChange={(e) => setMinStock(e.target.value)}
                    placeholder="5"
                    min="0"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-[#3e1e0c] placeholder-gray-400 outline-none transition-all focus:border-[#3e1e0c] focus:ring-2 focus:ring-[#3e1e0c]/15"
                  />
                </div>
              </div>

              {/* Cost per unit */}
              <div>
                <label className="block text-sm font-bold text-[#3e1e0c] mb-1.5">
                  Cost per {unit}
                </label>
                <input
                  type="number"
                  value={costPerUnit}
                  onChange={(e) => setCostPerUnit(e.target.value)}
                  placeholder="0"
                  min="0"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-[#3e1e0c] placeholder-gray-400 outline-none transition-all focus:border-[#3e1e0c] focus:ring-2 focus:ring-[#3e1e0c]/15"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-bold text-[#3e1e0c] mb-1.5">
                  Notes
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes..."
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-[#3e1e0c] placeholder-gray-400 outline-none transition-all focus:border-[#3e1e0c] focus:ring-2 focus:ring-[#3e1e0c]/15"
                />
              </div>
            </div>

            {error && (
              <p className="mt-4 rounded-xl bg-red-50 border border-red-100 px-4 py-2.5 text-sm font-medium text-red-600">
                {error}
              </p>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={onClose}
                className="rounded-xl px-5 py-2.5 text-sm font-bold text-gray-500 hover:text-[#3e1e0c] hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!name.trim() || saving}
                className={`flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-white shadow-lg transition-all active:scale-[0.97] ${
                  name.trim() && !saving
                    ? "bg-[#3e1e0c] shadow-[#3e1e0c]/20 hover:bg-[#2d1508]"
                    : "bg-gray-300 shadow-none cursor-not-allowed"
                }`}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {item ? "Update" : "Add Item"}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
