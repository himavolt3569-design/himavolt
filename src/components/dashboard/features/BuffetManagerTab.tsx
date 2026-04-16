"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatPrice, getCurrencySymbol } from "@/lib/currency";
import { useRestaurant } from "@/context/RestaurantContext";
import {
  ChefHat,
  Plus,
  Clock,
  Trash2,
  RefreshCw,
  Save,
  X,
  AlertTriangle,
  Utensils,
  Coffee,
  Sun,
  Moon,
} from "lucide-react";

type MealType = "breakfast" | "lunch" | "dinner";

interface BuffetItem {
  id: string;
  name: string;
  category: string;
  quantityTotal: number;
  quantityRemaining: number;
  lastRefilled: string;
  costPerKg: number;
}

interface BuffetTemplate {
  id: string;
  name: string;
  mealType: MealType;
  items: string[];
}

const CATEGORIES = ["Starters", "Main Course", "Rice & Bread", "Desserts", "Beverages", "Salads", "Soups"];

const MEAL_ICONS: Record<MealType, typeof Coffee> = {
  breakfast: Coffee,
  lunch: Sun,
  dinner: Moon,
};

const MEAL_COLORS: Record<MealType, string> = {
  breakfast: "text-[var(--accent)] bg-[var(--accent-muted)]",
  lunch: "text-[var(--accent)] bg-[var(--accent)]",
  dinner: "text-indigo-500 bg-indigo-50",
};

export default function BuffetManagerTab() {
  const { selectedRestaurant } = useRestaurant();
  const cur = selectedRestaurant?.currency ?? "NPR";
  const [items, setItems] = useState<BuffetItem[]>([]);
  const [templates, setTemplates] = useState<BuffetTemplate[]>([]);
  const [activeMeal, setActiveMeal] = useState<MealType>("lunch");
  const [showAddItem, setShowAddItem] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState(CATEGORIES[0]);
  const [newQuantity, setNewQuantity] = useState("");
  const [newCost, setNewCost] = useState("");
  const [wasteLog, setWasteLog] = useState<{ item: string; qty: number; time: string }[]>([]);
  const [showWaste, setShowWaste] = useState(false);
  const [wasteItem, setWasteItem] = useState("");
  const [wasteQty, setWasteQty] = useState("");
  const [costPerPlate, setCostPerPlate] = useState(0);

  const totalCost = items.reduce((sum, i) => sum + i.quantityTotal * i.costPerKg, 0);
  const estimatedPlates = 80;
  const calculatedCostPerPlate = Math.round(totalCost / estimatedPlates);

  const lowStockItems = items.filter((i) => (i.quantityRemaining / i.quantityTotal) < 0.25);

  const handleAddItem = () => {
    if (!newName || !newQuantity) return;
    setItems((prev) => [
      ...prev,
      {
        id: `i${Date.now()}`,
        name: newName,
        category: newCategory,
        quantityTotal: parseFloat(newQuantity),
        quantityRemaining: parseFloat(newQuantity),
        lastRefilled: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
        costPerKg: parseFloat(newCost) || 0,
      },
    ]);
    setNewName("");
    setNewQuantity("");
    setNewCost("");
    setShowAddItem(false);
  };

  const handleRefill = (id: string) => {
    setItems((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
              ...i,
              quantityRemaining: i.quantityTotal,
              lastRefilled: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
            }
          : i,
      ),
    );
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleLogWaste = () => {
    if (!wasteItem || !wasteQty) return;
    setWasteLog((prev) => [
      { item: wasteItem, qty: parseFloat(wasteQty), time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) },
      ...prev,
    ]);
    setWasteItem("");
    setWasteQty("");
    setShowWaste(false);
  };

  const grouped = CATEGORIES.reduce<Record<string, BuffetItem[]>>((acc, cat) => {
    const catItems = items.filter((i) => i.category === cat);
    if (catItems.length > 0) acc[cat] = catItems;
    return acc;
  }, {});

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-1)] flex items-center gap-2">
            <ChefHat className="h-5 w-5 text-indigo-500" />
            Buffet Manager
          </h2>
          <p className="text-sm text-[var(--text-2)] mt-1">Track buffet items, refills, and waste</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowWaste(true)}
            className="flex items-center gap-2 rounded-xl bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold text-[var(--text-2)] hover:bg-[var(--surface-alt)] transition-all"
          >
            <Trash2 className="h-4 w-4" />
            Log Waste
          </button>
          <button
            onClick={() => setShowAddItem(true)}
            className="flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400 transition-all active:scale-[0.97]"
          >
            <Plus className="h-4 w-4" />
            Add Item
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        {(["breakfast", "lunch", "dinner"] as MealType[]).map((meal) => {
          const Icon = MEAL_ICONS[meal];
          const isActive = activeMeal === meal;
          return (
            <button
              key={meal}
              onClick={() => setActiveMeal(meal)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold capitalize transition-all ${
                isActive
                  ? `${MEAL_COLORS[meal]} ring-1 ring-current/20`
                  : "bg-[var(--canvas-sub)] text-[var(--text-2)] hover:bg-[var(--surface)]"
              }`}
            >
              <Icon className="h-4 w-4" />
              {meal}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl bg-[var(--canvas)] ring-1 ring-[var(--border)] p-4 shadow-sm">
          <p className="text-[11px] font-medium text-[var(--text-2)] mb-1">Total Items</p>
          <p className="text-lg font-bold text-[var(--text-1)]">{items.length}</p>
        </div>
        <div className="rounded-xl bg-[var(--canvas)] ring-1 ring-[var(--border)] p-4 shadow-sm">
          <p className="text-[11px] font-medium text-[var(--text-2)] mb-1">Low Stock</p>
          <p className="text-lg font-bold text-[var(--accent)]">{lowStockItems.length}</p>
        </div>
        <div className="rounded-xl bg-[var(--canvas)] ring-1 ring-[var(--border)] p-4 shadow-sm">
          <p className="text-[11px] font-medium text-[var(--text-2)] mb-1">Est. Cost/Plate</p>
          <p className="text-lg font-bold text-[var(--text-1)]">{formatPrice(calculatedCostPerPlate, cur)}</p>
        </div>
        <div className="rounded-xl bg-[var(--canvas)] ring-1 ring-[var(--border)] p-4 shadow-sm">
          <p className="text-[11px] font-medium text-[var(--text-2)] mb-1">Waste Today</p>
          <p className="text-lg font-bold text-rose-500">{wasteLog.length} items</p>
        </div>
      </div>

      {lowStockItems.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl bg-[var(--accent-muted)] p-4 ring-1 ring-[var(--accent-border)]">
          <AlertTriangle className="h-4 w-4 text-[var(--accent)] mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-[var(--accent-text)]">Low stock items need refilling</p>
            <p className="text-xs text-[var(--accent-text)] mt-0.5">
              {lowStockItems.map((i) => i.name).join(", ")}
            </p>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showAddItem && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="rounded-xl bg-[var(--canvas)] ring-1 ring-[var(--border)] p-5 shadow-md space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[var(--text-1)]">Add Buffet Item</h3>
                <button onClick={() => setShowAddItem(false)} className="text-[var(--text-3)] hover:text-[var(--text-2)]"><X className="h-4 w-4" /></button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-2)] mb-1">Item Name</label>
                  <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g., Butter Chicken" className="w-full rounded-lg bg-[var(--canvas-sub)] px-3 py-2.5 text-sm ring-1 ring-[var(--border)] outline-none focus:ring-indigo-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-2)] mb-1">Category</label>
                  <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="w-full rounded-lg bg-[var(--canvas-sub)] px-3 py-2.5 text-sm ring-1 ring-[var(--border)] outline-none focus:ring-indigo-400">
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-2)] mb-1">Quantity (kg/pcs)</label>
                  <input type="number" value={newQuantity} onChange={(e) => setNewQuantity(e.target.value)} placeholder="0" className="w-full rounded-lg bg-[var(--canvas-sub)] px-3 py-2.5 text-sm ring-1 ring-[var(--border)] outline-none focus:ring-indigo-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-2)] mb-1">{`Cost per kg/unit (${getCurrencySymbol(cur)})`}</label>
                  <input type="number" value={newCost} onChange={(e) => setNewCost(e.target.value)} placeholder="0" className="w-full rounded-lg bg-[var(--canvas-sub)] px-3 py-2.5 text-sm ring-1 ring-[var(--border)] outline-none focus:ring-indigo-400" />
                </div>
              </div>
              <div className="flex justify-end">
                <button onClick={handleAddItem} disabled={!newName || !newQuantity} className="flex items-center gap-2 rounded-lg bg-indigo-500 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-400 disabled:bg-[var(--surface-alt)] disabled:text-[var(--text-3)] transition-all">
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showWaste && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="rounded-xl bg-[var(--canvas)] ring-1 ring-[var(--border)] p-5 shadow-md space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[var(--text-1)]">Log Waste</h3>
                <button onClick={() => setShowWaste(false)} className="text-[var(--text-3)] hover:text-[var(--text-2)]"><X className="h-4 w-4" /></button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-2)] mb-1">Item</label>
                  <select value={wasteItem} onChange={(e) => setWasteItem(e.target.value)} className="w-full rounded-lg bg-[var(--canvas-sub)] px-3 py-2.5 text-sm ring-1 ring-[var(--border)] outline-none focus:ring-indigo-400">
                    <option value="">Select item</option>
                    {items.map((i) => <option key={i.id} value={i.name}>{i.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-2)] mb-1">Quantity Wasted</label>
                  <input type="number" value={wasteQty} onChange={(e) => setWasteQty(e.target.value)} placeholder="0" className="w-full rounded-lg bg-[var(--canvas-sub)] px-3 py-2.5 text-sm ring-1 ring-[var(--border)] outline-none focus:ring-indigo-400" />
                </div>
              </div>
              <div className="flex justify-end">
                <button onClick={handleLogWaste} disabled={!wasteItem || !wasteQty} className="flex items-center gap-2 rounded-lg bg-rose-500 px-5 py-2 text-sm font-semibold text-white hover:bg-rose-400 disabled:bg-[var(--surface-alt)] disabled:text-[var(--text-3)] transition-all">
                  <Trash2 className="h-3.5 w-3.5" />
                  Log
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {Object.entries(grouped).map(([category, catItems]) => (
        <div key={category}>
          <h3 className="text-sm font-bold text-[var(--text-2)] mb-2 flex items-center gap-2">
            <Utensils className="h-3.5 w-3.5 text-[var(--text-3)]" />
            {category}
          </h3>
          <div className="space-y-2">
            {catItems.map((item) => {
              const pct = (item.quantityRemaining / item.quantityTotal) * 100;
              const isLow = pct < 25;
              return (
                <div key={item.id} className="flex items-center gap-4 rounded-xl bg-[var(--canvas)] ring-1 ring-[var(--border)] p-3.5 shadow-sm">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-[var(--text-1)]">{item.name}</p>
                      {isLow && <span className="text-[9px] font-bold bg-[var(--accent-muted)] text-[var(--accent-text)] px-1.5 py-0.5 rounded">LOW</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <div className="h-2 w-32 rounded-full bg-[var(--surface)] overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${isLow ? "bg-[var(--accent)]" : "bg-indigo-400"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-[var(--text-2)]">
                        {item.quantityRemaining} / {item.quantityTotal}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1 text-[10px] text-[var(--text-3)]">
                      <Clock className="h-2.5 w-2.5" />
                      Refilled {item.lastRefilled}
                    </div>
                    <p className="text-[10px] text-[var(--text-3)] mt-0.5">{formatPrice(item.costPerKg, cur)}/unit</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => handleRefill(item.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500 hover:bg-indigo-100 transition-all"
                      title="Refill"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--canvas-sub)] text-[var(--text-3)] hover:bg-red-50 hover:text-red-500 transition-all"
                      title="Remove"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div>
        <h3 className="text-sm font-bold text-[var(--text-1)] mb-3 flex items-center gap-2">
          <Save className="h-3.5 w-3.5 text-[var(--text-3)]" />
          Buffet Templates
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {templates.map((t) => {
            const Icon = MEAL_ICONS[t.mealType];
            return (
              <div key={t.id} className="rounded-xl bg-[var(--canvas)] ring-1 ring-[var(--border)] p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${MEAL_COLORS[t.mealType]}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[var(--text-1)]">{t.name}</p>
                    <p className="text-[10px] text-[var(--text-3)] capitalize">{t.mealType} · {t.items.length} items</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {t.items.map((item) => (
                    <span key={item} className="text-[10px] bg-[var(--canvas-sub)] text-[var(--text-2)] px-2 py-0.5 rounded-full ring-1 ring-[var(--border)]">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {wasteLog.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-[var(--text-1)] mb-3 flex items-center gap-2">
            <Trash2 className="h-3.5 w-3.5 text-rose-400" />
            Waste Log Today
          </h3>
          <div className="space-y-1.5">
            {wasteLog.map((w, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-rose-50/50 px-4 py-2.5 ring-1 ring-rose-100">
                <span className="text-sm font-medium text-[var(--text-2)]">{w.item}</span>
                <div className="flex items-center gap-3 text-xs text-[var(--text-2)]">
                  <span>{w.qty} units</span>
                  <span>{w.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
