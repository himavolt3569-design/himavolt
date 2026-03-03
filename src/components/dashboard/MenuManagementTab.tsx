"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Leaf,
  Flame,
  Search,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Camera,
  FolderPlus,
  Tag,
  Sparkles,
} from "lucide-react";
import { useRestaurant } from "@/context/RestaurantContext";
import { apiFetch } from "@/lib/api-client";
import { useToast } from "@/context/ToastContext";
import ImagePicker from "@/components/shared/ImagePicker";
import gsap from "gsap";

interface MenuCategory {
  id: string;
  name: string;
  slug: string;
}

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  rating: number;
  prepTime: string | null;
  isVeg: boolean;
  hasEgg: boolean;
  hasOnionGarlic: boolean;
  isAvailable: boolean;
  badge: string | null;
  tags: string[];
  sortOrder: number;
  categoryId: string;
  category: { name: string; slug: string };
  sizes: unknown[];
  addOns: unknown[];
}

function PriceInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-gray-400 select-none">
        Rs.
      </span>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => {
          const v = e.target.value.replace(/[^0-9.]/g, "");
          if (v.split(".").length <= 2) onChange(v);
        }}
        placeholder={placeholder ?? "0"}
        className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm font-semibold text-gompa-slate placeholder-gray-300 focus:outline-none focus:border-everest-pine/40 focus:ring-1 focus:ring-everest-pine/10 transition-all"
      />
    </div>
  );
}

function MenuItemRow({
  item,
  onSave,
  onDelete,
  onToggle,
}: {
  item: MenuItem;
  onSave: (updated: Partial<MenuItem>) => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const { showToast } = useToast();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(item.name);
  const [editPrice, setEditPrice] = useState(String(item.price));
  const [editVeg, setEditVeg] = useState(item.isVeg);
  const [editImageUrl, setEditImageUrl] = useState(item.imageUrl || "");
  const [showImagePicker, setShowImagePicker] = useState(false);
  const saveRef = useRef<HTMLButtonElement>(null);

  const handleSave = () => {
    onSave({
      name: editName,
      price: Number(editPrice) || 0,
      isVeg: editVeg,
      ...(editImageUrl !== (item.imageUrl || "") ? { imageUrl: editImageUrl || null } : {}),
    });
    setEditing(false);
    showToast("Menu updated!");
    if (saveRef.current) {
      gsap.fromTo(
        saveRef.current,
        { scale: 1.2, backgroundColor: "#0A4D3C" },
        { scale: 1, duration: 0.3, ease: "back.out(2)" },
      );
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className={`group rounded-lg border bg-white transition-all ${
        item.isAvailable ? "border-gray-200 hover:border-gray-300" : "border-gray-100 opacity-50"
      }`}
    >
      <div className="flex items-center gap-3 px-3.5 py-3">
        {/* Image */}
        <button
          onClick={() => { if (editing) setShowImagePicker(true); }}
          className={`h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-gray-50 relative group/img ${editing ? "cursor-pointer border border-dashed border-gray-300 hover:border-everest-pine/40" : ""}`}
        >
          {(editing ? editImageUrl : item.imageUrl) ? (
            <img
              src={editing ? editImageUrl : item.imageUrl!}
              alt={item.name}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              <Camera className="h-3.5 w-3.5 text-gray-300" />
            </div>
          )}
          {editing && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity rounded-lg">
              <Camera className="h-3.5 w-3.5 text-white" />
            </div>
          )}
        </button>
        <ImagePicker
          open={showImagePicker}
          currentImage={editImageUrl || null}
          onSelect={(url) => setEditImageUrl(url)}
          onClose={() => setShowImagePicker(false)}
        />

        {editing ? (
          <div className="flex flex-1 flex-col gap-2 min-w-0">
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-sm font-semibold text-gompa-slate focus:outline-none focus:border-everest-pine/40 focus:ring-1 focus:ring-everest-pine/10 transition-all"
            />
            <div className="flex gap-2 flex-wrap">
              <div className="w-24">
                <PriceInput value={editPrice} onChange={setEditPrice} />
              </div>
              <button
                onClick={() => setEditVeg(!editVeg)}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-semibold transition-all border ${
                  editVeg
                    ? "border-green-200 bg-green-50 text-green-700"
                    : "border-red-200 bg-red-50 text-red-600"
                }`}
              >
                {editVeg ? <Leaf className="h-2.5 w-2.5" /> : <Flame className="h-2.5 w-2.5" />}
                {editVeg ? "Veg" : "Non-Veg"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold text-gompa-slate truncate">
                {item.name}
              </span>
              {item.badge && (
                <span className="rounded bg-saffron-flame/10 px-1.5 py-0.5 text-[10px] font-semibold text-saffron-flame leading-none">
                  {item.badge}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs font-semibold text-gompa-slate">
                Rs. {item.price}
              </span>
              <span className="text-gray-300">·</span>
              <span className="text-[11px] text-gray-400">{item.category.name}</span>
              <span className="text-gray-300">·</span>
              {item.isVeg ? (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-green-600">
                  <Leaf className="h-2.5 w-2.5" /> Veg
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-red-500">
                  <Flame className="h-2.5 w-2.5" /> Non-Veg
                </span>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center gap-1 shrink-0">
          {editing ? (
            <>
              <button
                ref={saveRef}
                onClick={handleSave}
                className="flex h-7 w-7 items-center justify-center rounded-md bg-everest-pine text-white hover:bg-everest-pine/90 transition-colors"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setEditing(false)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onToggle}
                className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                  item.isAvailable
                    ? "text-green-600 hover:bg-green-50"
                    : "text-gray-300 hover:bg-gray-50"
                }`}
              >
                {item.isAvailable ? (
                  <ToggleRight className="h-4 w-4" />
                ) : (
                  <ToggleLeft className="h-4 w-4" />
                )}
              </button>
              <button
                onClick={() => setEditing(true)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-gray-100 hover:text-gray-600 transition-all"
              >
                <Pencil className="h-3 w-3" />
              </button>
              <button
                onClick={onDelete}
                className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 transition-all"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function AddDishForm({
  categories,
  onAdd,
  onCancel,
}: {
  categories: MenuCategory[];
  onAdd: (item: { name: string; price: number; categoryId: string; isVeg: boolean; description: string; imageUrl?: string }) => void;
  onCancel: () => void;
}) {
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [isVeg, setIsVeg] = useState(true);
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [showImagePicker, setShowImagePicker] = useState(false);

  const handleSubmit = () => {
    const numPrice = Number(price);
    if (!name.trim()) {
      showToast("Dish name is required");
      return;
    }
    if (!numPrice || numPrice <= 0) {
      showToast("Enter a valid price");
      return;
    }
    if (!categoryId) {
      showToast("Select a category");
      return;
    }
    onAdd({ name: name.trim(), price: numPrice, categoryId, isVeg, description: description.trim(), ...(imageUrl ? { imageUrl } : {}) });
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="overflow-hidden"
    >
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* Form header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
          <span className="text-[13px] font-bold text-gompa-slate tracking-tight">New dish</span>
          <button
            onClick={onCancel}
            className="rounded-md p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Row 1: Image + Name + Price */}
          <div className="flex gap-4 items-start">
            {/* Image thumbnail */}
            <button
              type="button"
              onClick={() => setShowImagePicker(true)}
              className="shrink-0 group relative h-[72px] w-[72px] rounded-lg overflow-hidden bg-gray-50 border border-gray-200 hover:border-everest-pine/30 transition-colors"
            >
              {imageUrl ? (
                <>
                  <img src={imageUrl} alt="Selected" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="h-4 w-4 text-white" />
                  </div>
                </>
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center gap-1">
                  <Camera className="h-4 w-4 text-gray-300 group-hover:text-everest-pine transition-colors" />
                  <span className="text-[9px] font-medium text-gray-300 group-hover:text-everest-pine/70 transition-colors">Photo</span>
                </div>
              )}
            </button>
            <ImagePicker
              open={showImagePicker}
              currentImage={imageUrl || null}
              onSelect={(url) => setImageUrl(url)}
              onClose={() => setShowImagePicker(false)}
            />

            {/* Name + Price */}
            <div className="flex-1 min-w-0 space-y-2.5">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dish name"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gompa-slate placeholder-gray-300 focus:outline-none focus:border-everest-pine/40 focus:ring-1 focus:ring-everest-pine/10 transition-all"
              />
              <div className="flex gap-2.5">
                <div className="w-32">
                  <PriceInput value={price} onChange={setPrice} placeholder="Price" />
                </div>
                {/* Veg/Non-veg pill */}
                <button
                  type="button"
                  onClick={() => setIsVeg(!isVeg)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-semibold transition-all border ${
                    isVeg
                      ? "border-green-200 bg-green-50 text-green-700"
                      : "border-red-200 bg-red-50 text-red-600"
                  }`}
                >
                  {isVeg ? <Leaf className="h-3 w-3" /> : <Flame className="h-3 w-3" />}
                  {isVeg ? "Veg" : "Non-Veg"}
                </button>
              </div>
            </div>
          </div>

          {/* Row 2: Category + Description */}
          <div className="space-y-2.5">
            <div className="relative">
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className={`w-full appearance-none rounded-lg border border-gray-200 bg-white px-3 py-2.5 pr-9 text-sm font-medium focus:outline-none focus:border-everest-pine/40 focus:ring-1 focus:ring-everest-pine/10 transition-all ${
                  categoryId ? "text-gompa-slate" : "text-gray-400"
                }`}
              >
                <option value="" disabled>
                  Select category
                </option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <svg
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
                viewBox="0 0 16 16"
                fill="none"
              >
                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description (optional)"
              rows={2}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gompa-slate placeholder-gray-300 focus:outline-none focus:border-everest-pine/40 focus:ring-1 focus:ring-everest-pine/10 transition-all resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleSubmit}
              className="rounded-lg bg-everest-pine px-6 py-2.5 text-[13px] font-bold text-white hover:bg-everest-pine/90 active:scale-[0.98] transition-all"
            >
              Add to menu
            </button>
            <button
              onClick={onCancel}
              className="text-[13px] font-medium text-gray-400 hover:text-gray-600 transition-colors"
            >
              Discard
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

const DEFAULT_CATEGORIES = [
  "Appetizers",
  "Momo",
  "Curry",
  "Rice & Noodles",
  "Thali Sets",
  "Tandoori",
  "Breads",
  "Soups & Salads",
  "Beverages",
  "Desserts",
];

export default function MenuManagementTab() {
  const { selectedRestaurant } = useRestaurant();
  const { showToast } = useToast();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("All");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [creatingCat, setCreatingCat] = useState(false);
  const [seedingCats, setSeedingCats] = useState(false);
  const newCatInputRef = useRef<HTMLInputElement>(null);

  const restaurantId = selectedRestaurant?.id;

  const fetchData = useCallback(async () => {
    if (!restaurantId) return;
    setLoading(true);
    try {
      const [menuRes, catRes] = await Promise.all([
        apiFetch<MenuItem[]>(`/api/restaurants/${restaurantId}/menu`),
        apiFetch<MenuCategory[]>(`/api/restaurants/${restaurantId}/categories`),
      ]);
      setItems(menuRes);
      setCategories(catRes);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (showNewCat && newCatInputRef.current) {
      newCatInputRef.current.focus();
    }
  }, [showNewCat]);

  const createCategory = async () => {
    if (!restaurantId || !newCatName.trim()) return;
    setCreatingCat(true);
    try {
      await apiFetch(`/api/restaurants/${restaurantId}/categories`, {
        method: "POST",
        body: { name: newCatName.trim() },
      });
      showToast(`Category "${newCatName.trim()}" created!`);
      setNewCatName("");
      setShowNewCat(false);
      await fetchData();
    } catch {
      showToast("Failed to create category");
    } finally {
      setCreatingCat(false);
    }
  };

  const seedDefaults = async () => {
    if (!restaurantId) return;
    setSeedingCats(true);
    try {
      for (const name of DEFAULT_CATEGORIES) {
        await apiFetch(`/api/restaurants/${restaurantId}/categories`, {
          method: "POST",
          body: { name },
        });
      }
      showToast(`${DEFAULT_CATEGORIES.length} default categories added!`);
      await fetchData();
    } catch {
      showToast("Failed to seed categories");
    } finally {
      setSeedingCats(false);
    }
  };

  const filtered = items.filter((item) => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === "All" || item.category.name === filterCat;
    return matchSearch && matchCat;
  });

  const updateItem = async (id: string, patch: Partial<MenuItem>) => {
    if (!restaurantId) return;
    try {
      await apiFetch(`/api/restaurants/${restaurantId}/menu/${id}`, {
        method: "PATCH",
        body: patch,
      });
      await fetchData();
    } catch {
      showToast("Failed to update item");
    }
  };

  const deleteItem = async (id: string) => {
    if (!restaurantId) return;
    try {
      await apiFetch(`/api/restaurants/${restaurantId}/menu/${id}`, {
        method: "DELETE",
      });
      await fetchData();
    } catch {
      showToast("Failed to delete item");
    }
  };

  const toggleItem = async (id: string, currentAvailable: boolean) => {
    if (!restaurantId) return;
    try {
      await apiFetch(`/api/restaurants/${restaurantId}/menu/${id}`, {
        method: "PATCH",
        body: { isAvailable: !currentAvailable },
      });
      await fetchData();
    } catch {
      showToast("Failed to toggle availability");
    }
  };

  const addItem = async (newItem: { name: string; price: number; categoryId: string; isVeg: boolean; description: string; imageUrl?: string }) => {
    if (!restaurantId) return;
    try {
      await apiFetch(`/api/restaurants/${restaurantId}/menu`, {
        method: "POST",
        body: newItem,
      });
      setShowAddForm(false);
      showToast("New dish added to menu!");
      await fetchData();
    } catch {
      showToast("Failed to add dish");
    }
  };

  const activeCount = items.filter((i) => i.isAvailable).length;
  const categoryNames = [...new Set(categories.map((c) => c.name))];

  if (loading && items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <p className="text-sm text-gray-400">Loading menu…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gompa-slate tracking-tight">Menu</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {activeCount} of {items.length} active
          </p>
        </div>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 rounded-lg bg-saffron-flame px-4 py-2 text-[13px] font-bold text-white hover:bg-saffron-flame/90 active:scale-[0.97] transition-all"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
            Add Dish
          </button>
        )}
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showAddForm && (
          <AddDishForm categories={categories} onAdd={addItem} onCancel={() => setShowAddForm(false)} />
        )}
      </AnimatePresence>

      {/* Search & filter */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search dishes…"
            className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm font-medium text-gompa-slate placeholder-gray-300 focus:outline-none focus:border-everest-pine/40 focus:ring-1 focus:ring-everest-pine/10 transition-all"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide items-center">
          {["All", ...categoryNames].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCat(cat)}
              className={`shrink-0 rounded-md px-3 py-2 text-[12px] font-semibold transition-all ${
                filterCat === cat
                  ? "bg-everest-pine text-white"
                  : "bg-gray-50 text-gray-500 hover:bg-gray-100"
              }`}
            >
              {cat}
            </button>
          ))}
          <div className="h-5 w-px bg-gray-200 shrink-0 mx-1" />
          <button
            onClick={() => setShowNewCat(true)}
            className="shrink-0 flex items-center gap-1 rounded-md border border-dashed border-gray-300 px-3 py-2 text-[12px] font-semibold text-gray-400 hover:border-everest-pine/40 hover:text-everest-pine transition-all"
          >
            <FolderPlus className="h-3 w-3" />
            New Category
          </button>
        </div>
      </div>

      {/* Category creation inline form */}
      <AnimatePresence>
        {showNewCat && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2.5 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
              <Tag className="h-4 w-4 text-gray-400 shrink-0" />
              <input
                ref={newCatInputRef}
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") createCategory(); if (e.key === "Escape") { setShowNewCat(false); setNewCatName(""); } }}
                placeholder="Category name, e.g. Appetizers"
                className="flex-1 min-w-0 text-sm font-medium text-gompa-slate placeholder-gray-300 outline-none"
              />
              <button
                onClick={createCategory}
                disabled={!newCatName.trim() || creatingCat}
                className="flex items-center gap-1 rounded-md bg-everest-pine px-3 py-1.5 text-[12px] font-bold text-white hover:bg-everest-pine/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.97]"
              >
                {creatingCat ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                Create
              </button>
              <button
                onClick={() => { setShowNewCat(false); setNewCatName(""); }}
                className="rounded-md p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Seed default categories prompt (shown when no categories exist) */}
      {!loading && categories.length === 0 && !showNewCat && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-center gap-3 rounded-lg border border-dashed border-gray-200 bg-gray-50/50 px-5 py-4"
        >
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Sparkles className="h-4 w-4 text-saffron-flame" />
            <span>No categories yet. Start with popular defaults?</span>
          </div>
          <button
            onClick={seedDefaults}
            disabled={seedingCats}
            className="flex items-center gap-1.5 rounded-lg bg-saffron-flame px-4 py-2 text-[12px] font-bold text-white hover:bg-saffron-flame/90 disabled:opacity-50 transition-all active:scale-[0.97]"
          >
            {seedingCats ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            Add Default Categories
          </button>
        </motion.div>
      )}

      {/* Items */}
      <div className="space-y-1.5">
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20 gap-2"
            >
              <div className="h-10 w-10 rounded-full bg-gray-50 flex items-center justify-center">
                <Search className="h-4 w-4 text-gray-300" />
              </div>
              <p className="text-[13px] text-gray-400">
                {items.length === 0 ? "Add your first dish to get started" : "No dishes match your search"}
              </p>
            </motion.div>
          ) : (
            filtered.map((item) => (
              <MenuItemRow
                key={item.id}
                item={item}
                onSave={(patch) => updateItem(item.id, patch)}
                onDelete={() => deleteItem(item.id)}
                onToggle={() => toggleItem(item.id, item.isAvailable)}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
