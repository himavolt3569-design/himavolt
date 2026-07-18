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
  GlassWater,
} from "lucide-react";
import { useRestaurant, useResolvedRestaurantId } from "@/context/RestaurantContext";
import {
  useRestaurantResource,
  useInvalidateResource,
} from "@/hooks/useRestaurantResource";
import { formatPrice } from "@/lib/currency";
import { apiFetch } from "@/lib/api-client";
import DrinksTab from "./DrinksTab";

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
  isDrink: boolean;
  drinkCategory: string | null;
  sellingPrice: number | null;
  showOnMenu: boolean;
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
/** Stable empty reference so `items` doesn't change identity every render. */
const EMPTY_ITEMS: InventoryItem[] = [];

/** Placeholder rows shown while inventory is in flight. */
function StockListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Loading inventory">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-16 animate-pulse rounded-xl bg-[var(--surface)] ring-1 ring-[var(--border)]"
        />
      ))}
    </div>
  );
}

export default function StockTab({
  initialStockTab,
}: {
  /** Deep-link entry point: /dashboard/drinks opens the Drinks tab directly.
   *  (Previously passed but ignored — StockTab took no props.) */
  initialStockTab?: "inventory" | "drinks";
} = {}) {
  const [tab, setTab] = useState<"inventory" | "drinks">(
    initialStockTab === "drinks" ? "drinks" : "inventory",
  );

  const TABS = [
    { id: "inventory" as const, label: "Inventory", Icon: Package },
    { id: "drinks" as const, label: "Drinks", Icon: GlassWater },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Inventory / Drinks switcher — full width on mobile so both tabs fit. */}
      <div className="flex items-center gap-1 rounded-xl bg-[var(--surface)] p-1 w-full sm:w-fit">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex flex-1 sm:flex-initial items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all ${
              tab === id
                ? "bg-[var(--canvas)] text-[var(--text-1)] shadow-sm"
                : "text-[var(--text-2)] hover:text-[var(--text-1)]"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </button>
        ))}
      </div>

      {tab === "inventory" ? <InventoryView /> : <DrinksTab />}
    </div>
  );
}

function InventoryView() {
  const { selectedRestaurant, restaurants } = useRestaurant();
  const restaurant = selectedRestaurant ?? restaurants[0];
  const cur = selectedRestaurant?.currency ?? "NPR";
  // Resolve from the persisted selection too, so the inventory request goes out
  // on the first render instead of waiting a full /api/restaurants round-trip.
  const rid = useResolvedRestaurantId(restaurant?.id);

  // Standard resource load: snapshot-backed (instant repeat paint), single
  // cache, honest loading signal. Replaces a hand-rolled useState + useEffect +
  // setInterval that had no loading state at all — so `items` was [] on first
  // render and the view asserted "No items yet" over a stocked venue.
  const inventoryQuery = useRestaurantResource<InventoryItem[]>({
    resource: "inventory",
    restaurantId: rid,
    path: (r) => `/api/restaurants/${r}/inventory`,
    select: (raw) => (Array.isArray(raw) ? (raw as InventoryItem[]) : []),
    refetchInterval: 30_000, // stock levels move; keep the old poll cadence
  });
  const items = inventoryQuery.data ?? EMPTY_ITEMS;
  const loading = inventoryQuery.isFirstLoad;
  // No optimistic setter here — this view's mutation handlers reconcile by
  // refetching (fetchItems below) rather than patching the list in place.
  const invalidateInventory = useInvalidateResource("inventory", rid);

  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "low" | "ok">("all");
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [filterType, setFilterType] = useState<"all" | "drinks" | "ingredients">("all");

  // Refetch handle kept under the old name so the mutation handlers below don't
  // change. The manual useEffect fetch + 30s setInterval it replaces are now
  // handled by useRestaurantResource (refetchInterval above).
  const fetchItems = useCallback(
    (_fresh = false) => invalidateInventory(),
    [invalidateInventory],
  );

  // NOTE: this used to be `if (!restaurant) return null` — a hard blank screen
  // for the entire ~1.5s while RestaurantContext resolved. Rendering nothing is
  // not a loading state; it reads as a broken page. We now render the real
  // chrome with a skeleton body, and only bail once we know there is genuinely
  // no restaurant to show.
  const noRestaurantAtAll = !rid && !loading;
  if (noRestaurantAtAll) return null;

  const filtered = items.filter((item) => {
    if (search && !item.name.toLowerCase().includes(search.toLowerCase()))
      return false;
    if (filterCat !== "all" && item.category !== filterCat) return false;
    if (filterStatus === "low" && item.quantity > item.minStock) return false;
    if (filterStatus === "ok" && item.quantity <= item.minStock) return false;
    if (filterType === "drinks" && !item.isDrink) return false;
    if (filterType === "ingredients" && item.isDrink) return false;
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
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-[var(--text-1)]">
            Stock / Inventory
          </h2>
          <p className="mt-1 text-sm text-[var(--text-2)]">
            Track ingredients and supplies for{" "}
            <strong className="text-[var(--text-1)]">{restaurant?.name ?? "…"}</strong>
          </p>
        </div>
        <button
          onClick={() => {
            setEditItem(null);
            setShowAdd(true);
          }}
          className="flex items-center gap-2 rounded-xl bg-[var(--text-1)] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-[var(--text-1)]/20 transition-all hover:bg-[#2d1508] active:scale-[0.97]"
        >
          <Plus className="h-4 w-4" />
          Add Item
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Total Items",
            value: items.length,
            color: "text-[var(--text-1)]",
            icon: Box,
            iconColor: "text-blue-500",
          },
          {
            label: "Low Stock",
            value: lowStockCount,
            color: lowStockCount > 0 ? "text-red-600" : "text-[var(--accent-text)]",
            icon: AlertTriangle,
            iconColor: lowStockCount > 0 ? "text-red-500" : "text-[var(--accent-hover)]",
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
            color: "text-[var(--text-1)]",
            icon: TrendingDown,
            iconColor: "text-[var(--accent)]",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl bg-[var(--canvas)] border border-[var(--border-soft)] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-[var(--text-2)]">
                {stat.label}
              </p>
              <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
            </div>
            <p className={`text-xl font-black ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-3)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items..."
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] py-2.5 pl-10 pr-4 text-sm font-medium text-[var(--text-1)] placeholder-gray-400 outline-none transition-all focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {(["all", "low", "ok"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                filterStatus === s
                  ? "bg-[var(--text-1)] text-white"
                  : "bg-[var(--surface)] text-[var(--text-2)] hover:bg-[var(--surface-alt)]"
              }`}
            >
              {s === "all" ? "All" : s === "low" ? "Low Stock" : "In Stock"}
            </button>
          ))}
          <span className="w-px bg-[var(--surface-alt)] mx-1 shrink-0" />
          {(["all", "drinks", "ingredients"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                filterType === t
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--surface)] text-[var(--text-2)] hover:bg-[var(--surface-alt)]"
              }`}
            >
              {t === "all" ? "All Types" : t === "drinks" ? "Drinks" : "Ingredients"}
            </button>
          ))}
        </div>
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-[var(--canvas)] px-3 py-2 text-xs font-bold text-[var(--text-2)] outline-none focus:border-[var(--accent)]"
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        // Never "No items yet" while loading — that is a claim about the venue's
        // stock, and we cannot make it until the list resolves.
        <StockListSkeleton />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <Package className="h-10 w-10 text-[var(--text-3)] mb-3" />
          <p className="font-bold text-[var(--text-2)]">
            {items.length === 0 ? "No items yet" : "No items match filters"}
          </p>
          <p className="text-sm text-[var(--text-3)] mt-1">
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
                  className={`group flex items-center gap-4 rounded-2xl bg-[var(--canvas)] border p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-all hover:shadow-[0_4px_20px_rgba(0,0,0,0.07)] ${
                    isLow ? "border-red-200 bg-red-50/30" : "border-[var(--border-soft)]"
                  }`}
                >
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                      isLow ? "bg-red-50" : "bg-[var(--accent-muted)]"
                    }`}
                  >
                    {isLow ? (
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                    ) : (
                      <Package className="h-5 w-5 text-[var(--accent-text)]" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-[var(--text-1)] truncate">
                        {item.name}
                      </h4>
                      <span className="shrink-0 rounded-md bg-[var(--surface)] border border-[var(--border)] px-2 py-0.5 text-[10px] font-bold text-[var(--text-2)]">
                        {item.category}
                      </span>
                      {item.isDrink && (
                        <span className="shrink-0 rounded-md bg-purple-50 border border-purple-200 px-2 py-0.5 text-[10px] font-bold text-purple-600">
                          {item.drinkCategory || "Drink"}
                        </span>
                      )}
                      {item.showOnMenu && (
                        <span className="shrink-0 rounded-md bg-[var(--accent-muted)] border border-[var(--accent-border)] px-2 py-0.5 text-[10px] font-bold text-[var(--accent-text)]">
                          On Menu
                        </span>
                      )}
                      {isLow && (
                        <span className="shrink-0 rounded-md bg-red-50 border border-red-200 px-2 py-0.5 text-[10px] font-bold text-red-600">
                          Low Stock
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-2)] mt-0.5">
                      <span className="font-semibold text-[var(--text-1)]">
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
                    {item.sellingPrice != null && item.sellingPrice > 0 && (
                      <p className="text-[11px] text-[var(--accent-text)] font-semibold mt-0.5">
                        Sells at: {formatPrice(item.sellingPrice, cur)}
                      </p>
                    )}
                    {item.notes && (
                      <p className="text-[11px] text-[var(--text-3)] mt-0.5 truncate">
                        {item.notes}
                      </p>
                    )}
                    {item.usedInMenuItems && item.usedInMenuItems.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        <span className="text-[10px] font-semibold text-[var(--accent-text)]">Used in:</span>
                        {item.usedInMenuItems.map((mi) => (
                          <span
                            key={mi.id}
                            className="shrink-0 rounded-md bg-[var(--accent-muted)] border border-[var(--accent-border)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--accent-text)]"
                          >
                            {mi.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <QuickAdjust
                      item={item}
                      restaurantId={rid as string}
                      onUpdate={fetchItems}
                    />
                  </div>

                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setEditItem(item);
                        setShowAdd(true);
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-muted)] text-[var(--accent-text)] hover:bg-[var(--accent-muted)] transition-all"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={async () => {
                        await apiFetch(
                          `/api/restaurants/${rid}/inventory/${item.id}`,
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
        restaurantId={rid as string}
        item={editItem}
        onSaved={fetchItems}
      />
    </div>
  );
}

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
        body: { quantity: newQty },
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
          className="w-16 rounded-md border border-[var(--accent-border)] bg-[var(--accent-muted)] px-2 py-1 text-xs font-bold text-[var(--text-1)] outline-none focus:ring-2 focus:ring-[var(--accent-border)] text-center"
        />
        <button
          onClick={() => save(Number(val) || item.quantity)}
          disabled={saving}
          className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--accent-muted)] text-[var(--accent-text)] hover:bg-[var(--accent-muted)] disabled:opacity-40 transition-all"
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
          className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--surface)] text-[var(--text-2)] hover:bg-[var(--surface-alt)] transition-all"
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
        className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--surface)] text-[var(--text-2)] hover:bg-[var(--surface-alt)] font-bold text-sm transition-all"
      >
        −
      </button>
      <button
        onClick={() => setAdjusting(true)}
        className="min-w-[3rem] rounded-lg bg-[var(--canvas-sub)] px-2 py-1 text-center text-sm font-bold text-[var(--text-1)] hover:bg-[var(--surface)] transition-all cursor-pointer"
        title="Click to set quantity"
      >
        {item.quantity}
      </button>
      <button
        onClick={() => save(item.quantity + 1)}
        className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--surface)] text-[var(--text-2)] hover:bg-[var(--surface-alt)] font-bold text-sm transition-all"
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
        quantity: quantity === "" ? 0 : Number(quantity),
        minStock: minStock === "" ? 5 : Number(minStock),
        costPerUnit: costPerUnit === "" ? 0 : Number(costPerUnit),
        category,
        notes: notes.trim() || null,
        // Drinks are managed in the dedicated Drinks tab now. Inventory items
        // default to non-drink; on edit we preserve any existing flags so we
        // never mutate legacy data by removing the toggles from this form.
        isDrink: item?.isDrink ?? false,
        drinkCategory: item?.drinkCategory ?? null,
        sellingPrice: item?.sellingPrice ?? null,
        showOnMenu: item?.showOnMenu ?? false,
      };
      if (item) {
        await apiFetch(
          `/api/restaurants/${restaurantId}/inventory/${item.id}`,
          { method: "PATCH", body },
        );
      } else {
        await apiFetch(`/api/restaurants/${restaurantId}/inventory`, {
          method: "POST",
          body,
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
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl bg-[var(--canvas)] p-6 shadow-2xl sm:p-8 max-h-[90dvh]"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-extrabold text-[var(--text-1)]">
                {item ? "Edit Item" : "Add Inventory Item"}
              </h3>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-3)] hover:bg-[var(--canvas-sub)] hover:text-[var(--text-2)] transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-[var(--text-1)] mb-1.5">
                  Item Name <span className="text-[var(--accent)]">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Chicken, Rice, Cooking Oil"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] px-4 py-3 text-sm font-medium text-[var(--text-1)] placeholder-gray-400 outline-none transition-all focus:border-[#3e1e0c] focus:ring-2 focus:ring-[var(--text-1)]/15"
                />
              </div>

              {/* Unit + Category row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-[var(--text-1)] mb-1.5">
                    Unit
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] px-4 py-3 text-sm font-medium text-[var(--text-1)] outline-none focus:border-[#3e1e0c] focus:ring-2 focus:ring-[var(--text-1)]/15"
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-[var(--text-1)] mb-1.5">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] px-4 py-3 text-sm font-medium text-[var(--text-1)] outline-none focus:border-[#3e1e0c] focus:ring-2 focus:ring-[var(--text-1)]/15"
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
                  <label className="block text-sm font-bold text-[var(--text-1)] mb-1.5">
                    Current Qty
                  </label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="0"
                    min="0"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] px-4 py-3 text-sm font-medium text-[var(--text-1)] placeholder-gray-400 outline-none transition-all focus:border-[#3e1e0c] focus:ring-2 focus:ring-[var(--text-1)]/15"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[var(--text-1)] mb-1.5">
                    Min Stock Alert
                  </label>
                  <input
                    type="number"
                    value={minStock}
                    onChange={(e) => setMinStock(e.target.value)}
                    placeholder="5"
                    min="0"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] px-4 py-3 text-sm font-medium text-[var(--text-1)] placeholder-gray-400 outline-none transition-all focus:border-[#3e1e0c] focus:ring-2 focus:ring-[var(--text-1)]/15"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-[var(--text-1)] mb-1.5">
                  Cost per {unit}
                </label>
                <input
                  type="number"
                  value={costPerUnit}
                  onChange={(e) => setCostPerUnit(e.target.value)}
                  placeholder="0"
                  min="0"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] px-4 py-3 text-sm font-medium text-[var(--text-1)] placeholder-gray-400 outline-none transition-all focus:border-[#3e1e0c] focus:ring-2 focus:ring-[var(--text-1)]/15"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-[var(--text-1)] mb-1.5">
                  Notes
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes..."
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] px-4 py-3 text-sm font-medium text-[var(--text-1)] placeholder-gray-400 outline-none transition-all focus:border-[#3e1e0c] focus:ring-2 focus:ring-[var(--text-1)]/15"
                />
              </div>

              <p className="text-xs text-[var(--text-3)]">
                Selling drinks to customers? Add them in the{" "}
                <span className="font-semibold text-[var(--text-2)]">Drinks</span> tab —
                they appear on the menu automatically.
              </p>
            </div>

            {error && (
              <p className="mt-4 rounded-xl bg-red-50 border border-red-100 px-4 py-2.5 text-sm font-medium text-red-600">
                {error}
              </p>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={onClose}
                className="rounded-xl px-5 py-2.5 text-sm font-bold text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--canvas-sub)] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!name.trim() || saving}
                className={`flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-white shadow-lg transition-all active:scale-[0.97] ${
                  name.trim() && !saving
                    ? "bg-[var(--text-1)] shadow-[var(--text-1)]/20 hover:bg-[#2d1508]"
                    : "bg-[var(--border)] shadow-none cursor-not-allowed"
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
