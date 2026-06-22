"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GlassWater,
  Coffee,
  Wine,
  Plus,
  Trash2,
  Loader2,
  Save,
  Package,
  X,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Camera,
} from "lucide-react";
import { useRestaurant } from "@/context/RestaurantContext";
import { useToast } from "@/context/ToastContext";
import { apiFetch, peekApiCache } from "@/lib/api-client";
import { formatPrice } from "@/lib/currency";
import ImagePicker from "@/components/shared/ImagePicker";
import { SkeletonCard } from "@/components/shared/Skeleton";

type DrinkCategory = "COLD" | "HOT" | "ALCOHOL";

interface DrinkItem {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  isAvailable: boolean;
  isDrink: boolean;
  drinkCategory: DrinkCategory | null;
  stockEnabled: boolean;
  stockQuantity: number;
  categoryId: string;
}

interface MenuCategory {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
}

const DRINK_CAT_CONFIG = {
  COLD:    { label: "Cold Drinks", icon: GlassWater, color: "blue" },
  HOT:     { label: "Hot Drinks",  icon: Coffee,     color: "amber" },
  ALCOHOL: { label: "Alcohol",     icon: Wine,       color: "purple" },
} as const;

// Full literal class strings per drink-category color (Tailwind v4 can't see interpolated names)
const DRINK_CAT_BADGE_STYLES: Record<string, string> = {
  blue: "bg-blue-50 text-blue-600",
  amber: "bg-amber-50 text-amber-600",
  purple: "bg-purple-50 text-purple-600",
};

const BLANK_FORM = {
  name: "",
  description: "",
  price: "",
  drinkCategory: "COLD" as DrinkCategory,
  stockEnabled: false,
  stockQuantity: "",
  imageUrl: "",
};

export default function DrinksTab() {
  const { selectedRestaurant, restaurants } = useRestaurant();
  const { showToast } = useToast();
  const restaurant = selectedRestaurant ?? restaurants[0];

  // Seed from the warm GET cache so re-opening Drinks paints instantly.
  const drinksPath = restaurant ? `/api/restaurants/${restaurant.id}/menu?isDrink=true` : "";
  const [drinks, setDrinks] = useState<DrinkItem[]>(
    () => peekApiCache<DrinkItem[]>(drinksPath)?.filter((i) => i.isDrink) ?? [],
  );
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(() => !peekApiCache(drinksPath));
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [activeSection, setActiveSection] = useState<DrinkCategory | "ALL">("ALL");
  const [stockEdits, setStockEdits] = useState<Record<string, string>>({});
  const [savingStock, setSavingStock] = useState<string | null>(null);
  const [showImagePicker, setShowImagePicker] = useState(false);

  const fetchData = useCallback(async () => {
    if (!restaurant) return;
    // Only show the skeleton on a cold cache — a warm tab already painted.
    if (!peekApiCache(`/api/restaurants/${restaurant.id}/menu?isDrink=true`)) setLoading(true);
    try {
      const [itemsData, catsData] = await Promise.all([
        apiFetch<DrinkItem[]>(`/api/restaurants/${restaurant.id}/menu?isDrink=true`),
        apiFetch<MenuCategory[]>(`/api/restaurants/${restaurant.id}/categories`),
      ]);
      setDrinks(Array.isArray(itemsData) ? itemsData.filter((i) => i.isDrink) : []);
      setCategories(Array.isArray(catsData) ? catsData : []);
    } catch {
      showToast("Failed to load drinks", "error");
    } finally {
      setLoading(false);
    }
  }, [restaurant?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Find or create the "Drinks" parent category id
  const getDrinksCategoryId = useCallback((): string | null => {
    const parent = categories.find(
      (c) => c.parentId === null && c.name.toLowerCase() === "drinks"
    );
    if (!parent) return null;

    const subMap: Record<DrinkCategory, string> = {
      COLD: "cold",
      HOT: "hot",
      ALCOHOL: "alcohol",
    };

    const sub = categories.find(
      (c) =>
        c.parentId === parent.id &&
        c.name.toLowerCase() === (subMap[form.drinkCategory] || form.drinkCategory.toLowerCase())
    );
    return sub?.id ?? parent.id;
  }, [categories, form.drinkCategory]);

  const handleAddDrink = async () => {
    if (!restaurant || !form.name.trim() || !form.price) return;

    const categoryId = getDrinksCategoryId();
    if (!categoryId) {
      showToast("Please generate categories for your place first (Menu tab → Generate Categories)", "error");
      return;
    }

    setSubmitting(true);
    try {
      const newItem = await apiFetch<DrinkItem>(`/api/restaurants/${restaurant.id}/menu`, {
        method: "POST",
        body: {
          name: form.name.trim(),
          description: form.description.trim() || "–",
          price: parseFloat(form.price),
          categoryId,
          isDrink: true,
          drinkCategory: form.drinkCategory,
          stockEnabled: form.stockEnabled,
          stockQuantity: form.stockEnabled ? parseFloat(form.stockQuantity || "0") : 0,
          imageUrl: form.imageUrl || undefined,
        },
      });
      setDrinks((prev) => [...prev, newItem]);
      setForm(BLANK_FORM);
      setShowForm(false);
      showToast(`${newItem.name} added to drinks!`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to add drink", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item: DrinkItem) => {
    if (!restaurant) return;
    const snapshot = drinks;
    setDrinks((prev) => prev.filter((d) => d.id !== item.id)); // optimistic remove
    try {
      await apiFetch(`/api/restaurants/${restaurant.id}/menu/${item.id}`, { method: "DELETE" });
    } catch {
      setDrinks(snapshot); // rollback
      showToast("Failed to delete", "error");
    }
  };

  const handleSaveStock = async (item: DrinkItem) => {
    if (!restaurant) return;
    const qty = parseFloat(stockEdits[item.id] ?? String(item.stockQuantity));
    if (isNaN(qty)) return;
    setSavingStock(item.id);
    try {
      await apiFetch(`/api/restaurants/${restaurant.id}/menu/${item.id}`, {
        method: "PATCH",
        body: { stockQuantity: qty, stockEnabled: true },
      });
      setDrinks((prev) =>
        prev.map((d) => (d.id === item.id ? { ...d, stockQuantity: qty, stockEnabled: true } : d))
      );
      setStockEdits((prev) => { const n = { ...prev }; delete n[item.id]; return n; });
      showToast("Stock updated");
    } catch {
      showToast("Failed to update stock", "error");
    } finally {
      setSavingStock(null);
    }
  };

  const filteredDrinks =
    activeSection === "ALL" ? drinks : drinks.filter((d) => d.drinkCategory === activeSection);

  if (!restaurant) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[var(--text-3)]">
        <GlassWater className="h-10 w-10 mb-3" />
        <p className="text-sm font-medium">Select a restaurant first</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[var(--text-1)]">Drinks</h2>
          <p className="text-sm text-[var(--text-3)]">
            Manage Cold, Hot & Alcohol drinks with optional stock tracking.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-xl bg-[var(--accent-hover)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--accent-hover)] shadow-md shadow-[var(--accent)]/20/20 transition-all active:scale-[0.97]"
        >
          <Plus className="h-4 w-4" />
          Add Drink
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(["ALL", "COLD", "HOT", "ALCOHOL"] as const).map((sec) => {
          const cfg = sec !== "ALL" ? DRINK_CAT_CONFIG[sec] : null;
          const count = sec === "ALL" ? drinks.length : drinks.filter((d) => d.drinkCategory === sec).length;
          return (
            <button
              key={sec}
              onClick={() => setActiveSection(sec)}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                activeSection === sec
                  ? "bg-[var(--accent-hover)] text-white"
                  : "bg-[var(--surface)] text-[var(--text-2)] hover:bg-[var(--surface-alt)]"
              }`}
            >
              {cfg ? <cfg.icon className="h-3.5 w-3.5" /> : <GlassWater className="h-3.5 w-3.5" />}
              {cfg ? cfg.label : "All Drinks"}
              <span className="rounded-full bg-[var(--canvas)]/20 px-1.5 py-0.5 text-[10px] font-bold">{count}</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {showForm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowForm(false)}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[95%] max-w-md rounded-2xl bg-[var(--canvas)] shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-soft)]">
                <h3 className="text-base font-bold text-[var(--text-1)]">Add Drink Item</h3>
                <button onClick={() => setShowForm(false)} className="rounded-full p-2 text-[var(--text-3)] hover:bg-[var(--surface)] transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-xs font-bold text-[var(--text-2)] uppercase tracking-wider block mb-2">Category</label>
                  <div className="flex gap-2">
                    {(["COLD", "HOT", "ALCOHOL"] as DrinkCategory[]).map((cat) => {
                      const cfg = DRINK_CAT_CONFIG[cat];
                      return (
                        <button
                          key={cat}
                          onClick={() => setForm((f) => ({ ...f, drinkCategory: cat }))}
                          className={`flex-1 flex flex-col items-center gap-1 rounded-xl py-2.5 text-xs font-bold border-2 transition-all ${
                            form.drinkCategory === cat
                              ? "border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--accent-text)]"
                              : "border-[var(--border)] bg-[var(--canvas-sub)] text-[var(--text-2)] hover:border-[var(--border)]"
                          }`}
                        >
                          <cfg.icon className="h-5 w-5" />
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[var(--text-2)] uppercase tracking-wider block mb-1.5">Photo (optional)</label>
                  <div className="flex items-center gap-3">
                    <div className="relative h-16 w-16 shrink-0 rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--canvas-sub)] flex items-center justify-center overflow-hidden">
                      {form.imageUrl ? (
                        <img src={form.imageUrl} alt="preview" className="h-full w-full object-cover" />
                      ) : (
                        (() => { const I = DRINK_CAT_CONFIG[form.drinkCategory].icon; return <I className="h-7 w-7 text-[var(--text-3)]" />; })()
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={() => setShowImagePicker(true)}
                        className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--canvas)] px-3 py-1.5 text-xs font-semibold text-[var(--text-2)] hover:bg-[var(--canvas-sub)] transition-colors"
                      >
                        <Camera className="h-3.5 w-3.5" />
                        {form.imageUrl ? "Change photo" : "Upload photo"}
                      </button>
                      {form.imageUrl && (
                        <button
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, imageUrl: "" }))}
                          className="text-xs text-red-400 hover:text-red-600 transition-colors text-left"
                        >
                          Remove photo
                        </button>
                      )}
                    </div>
                  </div>
                  <ImagePicker
                    open={showImagePicker}
                    currentImage={form.imageUrl || null}
                    onSelect={(url) => {
                      setForm((f) => ({ ...f, imageUrl: url }));
                      setShowImagePicker(false);
                    }}
                    onClose={() => setShowImagePicker(false)}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[var(--text-2)] uppercase tracking-wider block mb-1.5">Name</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Chilled Pepsi, Masala Tea, Beer"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)] focus:bg-[var(--canvas)] transition-all"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[var(--text-2)] uppercase tracking-wider block mb-1.5">Price (NPR)</label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)] focus:bg-[var(--canvas)] transition-all"
                  />
                </div>

                <div className="rounded-xl border border-[var(--border)] p-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.stockEnabled}
                      onChange={(e) => setForm((f) => ({ ...f, stockEnabled: e.target.checked }))}
                      className="h-4 w-4 rounded accent-[var(--accent)]"
                    />
                    <span className="text-sm font-semibold text-[var(--text-2)] flex items-center gap-1.5">
                      <Package className="h-4 w-4 text-[var(--text-3)]" />
                      Track stock quantity
                    </span>
                  </label>
                  {form.stockEnabled && (
                    <div className="mt-3">
                      <label className="text-xs font-bold text-[var(--text-2)] uppercase tracking-wider block mb-1.5">Initial Stock</label>
                      <input
                        type="number"
                        value={form.stockQuantity}
                        onChange={(e) => setForm((f) => ({ ...f, stockQuantity: e.target.value }))}
                        placeholder="e.g. 24"
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)] focus:bg-[var(--canvas)] transition-all"
                      />
                      <p className="text-[11px] text-[var(--text-3)] mt-1">Stock will auto-decrease when orders include this drink.</p>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleAddDrink}
                  disabled={!form.name.trim() || !form.price || submitting}
                  className="w-full rounded-xl bg-[var(--accent-hover)] py-3 text-sm font-bold text-white hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {submitting ? "Adding..." : "Add Drink"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {loading && drinks.length === 0 ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filteredDrinks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-[var(--text-3)]">
          <GlassWater className="h-12 w-12 mb-3 opacity-40" />
          <p className="text-sm font-semibold text-[var(--text-2)]">No drinks yet</p>
          <p className="text-xs text-[var(--text-3)] mt-1">Add Cold, Hot or Alcohol drinks to your menu</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDrinks.map((item) => {
            const cfg = item.drinkCategory ? DRINK_CAT_CONFIG[item.drinkCategory] : DRINK_CAT_CONFIG.COLD;
            const isLowStock = item.stockEnabled && item.stockQuantity <= 3;
            const editedQty = stockEdits[item.id];
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--canvas)] px-4 py-3 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 shrink-0 rounded-xl overflow-hidden bg-[var(--surface)] flex items-center justify-center">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                    ) : (
                      <cfg.icon className="h-5 w-5 text-[var(--text-3)]" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[var(--text-1)] truncate">{item.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-[var(--text-2)] font-semibold">
                        {formatPrice(item.price, "NPR")}
                      </span>
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${DRINK_CAT_BADGE_STYLES[cfg.color]}`}>
                        {cfg.label}
                      </span>
                      {isLowStock && (
                        <span className="flex items-center gap-0.5 text-[10px] font-bold text-red-500">
                          <AlertTriangle className="h-3 w-3" />
                          Low stock ({item.stockQuantity})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {item.stockEnabled && (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={editedQty ?? String(item.stockQuantity)}
                        onChange={(e) => setStockEdits((prev) => ({ ...prev, [item.id]: e.target.value }))}
                        className="w-16 rounded-lg border border-[var(--border)] bg-[var(--canvas-sub)] px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-[var(--accent-border)]"
                        title="Stock quantity"
                      />
                      {editedQty !== undefined && (
                        <button
                          onClick={() => handleSaveStock(item)}
                          disabled={savingStock === item.id}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent-muted)] text-[var(--accent-text)] hover:bg-[var(--accent-muted)] transition-colors"
                        >
                          {savingStock === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                        </button>
                      )}
                    </div>
                  )}
                  <button
                    onClick={() => handleDelete(item)}
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {drinks.some((d) => d.stockEnabled) && (
        <div className="rounded-2xl border border-[var(--accent-border)] bg-[var(--accent-muted)] p-4">
          <h4 className="text-xs font-bold text-[var(--accent-text)] uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5" />
            Stock Overview
          </h4>
          <div className="grid grid-cols-3 gap-3">
            {(["COLD", "HOT", "ALCOHOL"] as DrinkCategory[]).map((cat) => {
              const catDrinks = drinks.filter((d) => d.drinkCategory === cat && d.stockEnabled);
              if (!catDrinks.length) return null;
              const cfg = DRINK_CAT_CONFIG[cat];
              const total = catDrinks.reduce((s, d) => s + d.stockQuantity, 0);
              const lowItems = catDrinks.filter((d) => d.stockQuantity <= 3).length;
              return (
                <div key={cat} className="rounded-xl bg-[var(--canvas)] border border-[var(--accent-border)] p-3 text-center">
                  <div className="flex justify-center mb-1"><cfg.icon className="h-6 w-6 text-[var(--accent-text)]" /></div>
                  <p className="text-[11px] font-bold text-[var(--accent-text)] mt-1">{cfg.label}</p>
                  <p className="text-lg font-black text-[var(--text-1)]">{total}</p>
                  {lowItems > 0 && (
                    <p className="text-[10px] font-bold text-red-500">{lowItems} low</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
