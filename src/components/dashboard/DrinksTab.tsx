"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassWater, Coffee, Wine, Plus, Pencil, Trash2, Loader2, Package, X, AlertTriangle, Camera, Check } from "lucide-react";
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
  bottleCount: number | null;
  volumeMl: number | null;
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
  bottleCount: "",
  volumeMl: "",
  // Orderable stock count — the field that auto-decrements on each order.
  // Stock tracking turns ON implicitly when this has a value; blank = untracked.
  stockQuantity: "",
  isAvailable: true,
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
  const [editingDrink, setEditingDrink] = useState<DrinkItem | null>(null);
  const [form, setForm] = useState(BLANK_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [activeSection, setActiveSection] = useState<DrinkCategory | "ALL">("ALL");
  const [stockEdits, setStockEdits] = useState<Record<string, string>>({});
  const [savingStock, setSavingStock] = useState<string | null>(null);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [suggestions, setSuggestions] = useState<{ id: string; thumb: string; url: string }[]>([]);
  const [suggesting, setSuggesting] = useState(false);

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

  useEffect(() => {
    const q = form.name.trim();
    if (!q || q.length < 2) {
      setSuggestions([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setSuggesting(true);
      try {
        const res = await fetch(`/api/image-search?q=${encodeURIComponent(q + " drink")}`, { signal: ctrl.signal });
        const data = await res.json();
        if (res.ok && data.images) {
          setSuggestions(data.images.slice(0, 6));
        }
      } catch {
        // ignore
      } finally {
        setSuggesting(false);
      }
    }, 400);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [form.name]);

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

  const openAdd = () => {
    setEditingDrink(null);
    setForm(BLANK_FORM);
    setShowForm(true);
  };

  const openEdit = (item: DrinkItem) => {
    setEditingDrink(item);
    setForm({
      name: item.name,
      description: item.description ?? "",
      price: String(item.price),
      drinkCategory: item.drinkCategory ?? "COLD",
      bottleCount: item.bottleCount != null ? String(item.bottleCount) : "",
      volumeMl: item.volumeMl != null ? String(item.volumeMl) : "",
      stockQuantity: item.stockEnabled ? String(item.stockQuantity) : "",
      isAvailable: item.isAvailable,
      imageUrl: item.imageUrl ?? "",
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingDrink(null);
  };

  const handleSubmit = async () => {
    if (!restaurant || !form.name.trim() || !form.price) return;

    const categoryId = getDrinksCategoryId();
    if (!categoryId) {
      showToast("Add drink categories first (Menu tab) before adding drinks", "error");
      return;
    }

    // Stock tracking is implicit: a stock count makes the drink stock-tracked
    // (auto-decrements on order); leaving it blank sells it without tracking.
    const stockTracked = form.stockQuantity.trim() !== "";
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || "–",
      price: parseFloat(form.price),
      categoryId,
      isDrink: true,
      drinkCategory: form.drinkCategory,
      bottleCount: form.bottleCount ? parseInt(form.bottleCount, 10) : null,
      volumeMl: form.volumeMl ? parseInt(form.volumeMl, 10) : null,
      stockEnabled: stockTracked,
      stockQuantity: stockTracked ? parseFloat(form.stockQuantity || "0") : 0,
      imageUrl: form.imageUrl || null,
    };

    setSubmitting(true);
    try {
      if (editingDrink) {
        const updated = await apiFetch<DrinkItem>(
          `/api/restaurants/${restaurant.id}/menu/${editingDrink.id}`,
          { method: "PATCH", body: { ...payload, isAvailable: form.isAvailable } },
        );
        setDrinks((prev) => prev.map((d) => (d.id === editingDrink.id ? updated : d)));
        showToast(`${updated.name} updated`);
      } else {
        const newItem = await apiFetch<DrinkItem>(
          `/api/restaurants/${restaurant.id}/menu`,
          { method: "POST", body: payload },
        );
        setDrinks((prev) => [...prev, newItem]);
        showToast(`${newItem.name} added to drinks!`);
      }
      setForm(BLANK_FORM);
      setEditingDrink(null);
      setShowForm(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save drink", "error");
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
            Manage Cold, Hot & Alcohol drinks. Set a stock count to auto-track on orders.
          </p>
        </div>
        <button
          onClick={openAdd}
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
              onClick={closeForm}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", damping: 30, stiffness: 350 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[90] w-[95%] max-w-md rounded-2xl bg-[var(--canvas)] shadow-2xl overflow-y-auto max-h-[92dvh]"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-soft)]">
                <h3 className="text-base font-bold text-[var(--text-1)]">{editingDrink ? "Edit Drink" : "Add Drink Item"}</h3>
                <button onClick={closeForm} className="rounded-full p-2 text-[var(--text-3)] hover:bg-[var(--surface)] transition-colors">
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

                <div className="flex flex-col sm:flex-row gap-4 items-start">
                  <button
                    type="button"
                    onClick={() => setShowImagePicker(true)}
                    className="shrink-0 group relative h-24 w-full sm:w-24 rounded-xl overflow-hidden bg-[var(--canvas-sub)] border border-[var(--border)] hover:border-[var(--accent-border)] transition-colors"
                  >
                    {form.imageUrl ? (
                      <>
                        <img src={form.imageUrl} alt="preview" className="h-full w-full object-cover" />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Camera className="h-5 w-5 text-white" />
                        </div>
                      </>
                    ) : (
                      <div className="h-full w-full flex flex-col items-center justify-center gap-1">
                        <Camera className="h-5 w-5 text-[var(--text-3)]" />
                        <span className="text-[9px] font-medium text-[var(--text-3)]">Add Photo</span>
                      </div>
                    )}
                  </button>
                  <ImagePicker
                    open={showImagePicker}
                    currentImage={form.imageUrl || null}
                    onSelect={(url) => {
                      setForm((f) => ({ ...f, imageUrl: url }));
                      setShowImagePicker(false);
                    }}
                    onClose={() => setShowImagePicker(false)}
                    type="drink"
                  />

                  <div className="flex-1 space-y-3 min-w-0 w-full">
                    <div className="space-y-1.5">
                      <input
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        placeholder="Drink name *"
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] px-4 py-2.5 text-sm font-semibold text-[var(--text-1)] placeholder-gray-300 focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent-border)] transition-all"
                      />
                      <AnimatePresence>
                        {(suggestions.length > 0 || suggesting) && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1">
                              {suggesting && suggestions.length === 0 && (
                                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[var(--text-3)] px-1">
                                  <Loader2 className="h-3 w-3 animate-spin" /> Suggesting images...
                                </div>
                              )}
                              {suggestions.map((img) => (
                                <button
                                  key={img.id}
                                  type="button"
                                  onClick={() => setForm((f) => ({ ...f, imageUrl: img.url }))}
                                  className="shrink-0 h-10 w-10 sm:h-11 sm:w-11 rounded-lg overflow-hidden border-2 border-transparent hover:border-[var(--accent)] transition-all bg-[var(--canvas-sub)] shadow-sm"
                                  title="Click to use this image"
                                >
                                  <img src={img.thumb} alt="Suggestion" className="h-full w-full object-cover" />
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
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

                {/* Orderable stock — the single source of truth that decrements
                    automatically on each order. Implicit tracking: a value here
                    turns tracking ON; blank = sells without stock tracking. */}
                <div className="rounded-xl border border-[var(--border)] p-3">
                  <label className="text-xs font-bold text-[var(--text-2)] uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                    <Package className="h-3.5 w-3.5 text-[var(--text-3)]" />
                    Stock count (orderable)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.stockQuantity}
                    onChange={(e) => setForm((f) => ({ ...f, stockQuantity: e.target.value }))}
                    placeholder="e.g. 24"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)] focus:bg-[var(--canvas)] transition-all"
                  />
                  <p className="text-[11px] text-[var(--text-3)] mt-1.5">
                    {form.stockQuantity.trim() !== ""
                      ? "Auto-decreases by 1 per unit ordered. Hits 0 → hidden from the menu."
                      : "Leave blank to sell without stock tracking (never auto-decrements)."}
                  </p>
                </div>

                {/* Reference-only packaging info — NOT used for decrement. */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-[var(--text-2)] uppercase tracking-wider block mb-1.5">Bottles <span className="font-normal normal-case text-[var(--text-3)]">(ref)</span></label>
                    <input
                      type="number"
                      min="0"
                      value={form.bottleCount}
                      onChange={(e) => setForm((f) => ({ ...f, bottleCount: e.target.value }))}
                      placeholder="e.g. 24"
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)] focus:bg-[var(--canvas)] transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[var(--text-2)] uppercase tracking-wider block mb-1.5">Volume (ml) <span className="font-normal normal-case text-[var(--text-3)]">(ref)</span></label>
                    <input
                      type="number"
                      min="0"
                      value={form.volumeMl}
                      onChange={(e) => setForm((f) => ({ ...f, volumeMl: e.target.value }))}
                      placeholder="e.g. 250"
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)] focus:bg-[var(--canvas)] transition-all"
                    />
                  </div>
                  <p className="col-span-2 text-[11px] text-[var(--text-3)] -mt-1">
                    For your records only — bottles/ml are <strong>not</strong> deducted when drinks are ordered.
                  </p>
                </div>

                {/* Availability is editable on existing drinks. */}
                {editingDrink && (
                  <div className="flex items-center justify-between rounded-xl border border-[var(--border)] px-4 py-3">
                    <div>
                      <p className="text-sm font-bold text-[var(--text-1)]">Available on menu</p>
                      <p className="text-xs text-[var(--text-3)]">Turn off to hide without deleting.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, isAvailable: !f.isAvailable }))}
                      className={`relative h-6 w-11 rounded-full transition-colors ${form.isAvailable ? "bg-[var(--accent)]" : "bg-[var(--border)]"}`}
                    >
                      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-[var(--surface)] shadow transition-all ${form.isAvailable ? "left-[calc(100%-1.375rem)]" : "left-0.5"}`} />
                    </button>
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={!form.name.trim() || !form.price || submitting}
                  className="w-full rounded-xl bg-[var(--accent-hover)] py-3 text-sm font-bold text-white hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {submitting ? "Saving..." : editingDrink ? "Save Changes" : "Add Drink"}
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
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--canvas)] px-3 py-3 sm:px-4 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.02)] hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="h-12 w-12 shrink-0 rounded-2xl overflow-hidden bg-gradient-to-br from-[var(--surface)] to-[var(--surface-alt)] border border-[var(--border)] flex items-center justify-center shadow-sm">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                    ) : (
                      <cfg.icon className="h-5 w-5 text-[var(--text-3)]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-extrabold text-[var(--text-1)] truncate leading-tight">{item.name}</p>
                    <div className="flex items-center flex-wrap gap-1.5 mt-1">
                      <span className="text-[11px] text-[var(--text-2)] font-bold bg-[var(--surface)] px-1.5 py-0.5 rounded-md">
                        {formatPrice(item.price, "NPR")}
                      </span>
                      <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${DRINK_CAT_BADGE_STYLES[cfg.color]}`}>
                        {cfg.label}
                      </span>
                      {isLowStock && (
                        <span className="flex items-center gap-0.5 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-md border border-red-100">
                          <AlertTriangle className="h-2.5 w-2.5" />
                          Low ({item.stockQuantity})
                        </span>
                      )}
                      {!item.isAvailable && (
                        <span className="rounded-md bg-[var(--surface)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--text-3)] border border-[var(--border)]">
                          Unavailable
                        </span>
                      )}
                      {(item.bottleCount != null || item.volumeMl != null) && (
                        <span className="text-[10px] text-[var(--text-3)] font-medium">
                          {[item.bottleCount != null ? `${item.bottleCount} btl` : null, item.volumeMl != null ? `${item.volumeMl}ml` : null]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 border-t border-[var(--border)]/60 pt-3 sm:border-0 sm:pt-0">
                  {item.stockEnabled && (
                    <div className="flex items-center gap-1.5 bg-[var(--canvas-sub)] pl-2 pr-1 py-1 rounded-full border border-[var(--border)]">
                      <span className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider ml-1">Stock</span>
                      <div className="flex items-center relative">
                        <input
                          type="number"
                          value={editedQty ?? String(item.stockQuantity)}
                          onChange={(e) => setStockEdits((prev) => ({ ...prev, [item.id]: e.target.value }))}
                          className="w-12 h-6 rounded-full bg-[var(--surface)] px-1 text-[11px] font-bold text-center text-[var(--text-1)] border border-[var(--border)] focus:border-[var(--accent)] focus:outline-none transition-all shadow-sm"
                          title="Stock quantity"
                        />
                        {editedQty !== undefined && (
                          <button
                            onClick={() => handleSaveStock(item)}
                            disabled={savingStock === item.id}
                            className="absolute -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-md hover:bg-[var(--accent-hover)] transition-all scale-110"
                          >
                            {savingStock === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEdit(item)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--surface)] text-[var(--text-2)] hover:bg-[var(--surface-alt)] hover:text-[var(--text-1)] transition-colors"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
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
