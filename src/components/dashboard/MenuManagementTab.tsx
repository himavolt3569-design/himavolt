"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
  Clock,
  Star,
  ChevronDown,
  ChevronRight,
  Zap,
  Award,
  AlertTriangle,
  Percent,
  Eye,
  EyeOff,
  GripVertical,
  Copy,
  MoreVertical,
  PlusCircle,
  Package,
  TrendingUp,
  UtensilsCrossed,
  Layers,
  ShieldAlert,
  Info,
} from "lucide-react";
import { useRestaurant } from "@/context/RestaurantContext";
import { apiFetch } from "@/lib/api-client";
import { useToast } from "@/context/ToastContext";
import { formatPrice, getCurrencySymbol } from "@/lib/currency";
import ImagePicker from "@/components/shared/ImagePicker";

/* ─── Types ─────────────────────────────────────────────────────────── */

interface MenuCategory {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  parentId: string | null;
  _count: { items: number };
  children: MenuCategory[];
}

interface MenuItemSize {
  id: string;
  label: string;
  grams: string;
  priceAdd: number;
}

interface MenuItemAddOn {
  id: string;
  name: string;
  price: number;
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
  category: { id: string; name: string; slug: string; parentId: string | null };
  sizes: MenuItemSize[];
  addOns: MenuItemAddOn[];
  discount: number;
  discountLabel: string | null;
  isFeatured: boolean;
  spiceLevel: number;
  calories: number | null;
  allergens: string[];
}

/* ─── Constants ─────────────────────────────────────────────────────── */

const DEFAULT_CATEGORIES: { name: string; icon: string; subs: string[] }[] = [
  { name: "Appetizers", icon: "🍢", subs: ["Fried", "Grilled", "Cold"] },
  { name: "Momo", icon: "🥟", subs: ["Steam", "Fried", "Jhol", "Chilli", "Kothey", "C.Momo", "Tandoori"] },
  { name: "Curry", icon: "🍛", subs: ["Chicken", "Mutton", "Paneer", "Vegetable", "Fish", "Dal"] },
  { name: "Rice & Noodles", icon: "🍜", subs: ["Fried Rice", "Biryani", "Chow Mein", "Thukpa", "Pulao"] },
  { name: "Thali Sets", icon: "🍽️", subs: ["Veg Thali", "Non-Veg Thali", "Special Thali"] },
  { name: "Tandoori", icon: "🔥", subs: ["Chicken", "Paneer", "Fish", "Kebab"] },
  { name: "Breads", icon: "🫓", subs: ["Naan", "Roti", "Paratha", "Kulcha"] },
  { name: "Soups & Salads", icon: "🥗", subs: ["Soups", "Salads"] },
  { name: "Beverages", icon: "🥤", subs: ["Hot", "Cold", "Juices", "Lassi", "Mocktails"] },
  { name: "Desserts", icon: "🍮", subs: ["Indian", "Western", "Ice Cream"] },
];

const BADGE_OPTIONS = ["Bestseller", "New", "Chef's Special", "Must Try", "Popular", "Seasonal"];
const ALLERGEN_OPTIONS = ["Gluten", "Dairy", "Nuts", "Soy", "Eggs", "Shellfish", "Sesame", "Mustard"];
const SPICE_LABELS = ["None", "Mild", "Medium", "Hot", "Extra Hot"];
const SPICE_COLORS = ["text-gray-400", "text-green-500", "text-yellow-500", "text-orange-500", "text-red-500"];

/* ─── Helpers ───────────────────────────────────────────────────────── */

function PriceInput({ value, onChange, placeholder, currencySymbol = "Rs." }: { value: string; onChange: (v: string) => void; placeholder?: string; currencySymbol?: string }) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-gray-400 select-none">{currencySymbol}</span>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => {
          const v = e.target.value.replace(/[^0-9.]/g, "");
          if (v.split(".").length <= 2) onChange(v);
        }}
        placeholder={placeholder ?? "0"}
        className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm font-semibold text-gray-900 placeholder-gray-300 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-100 transition-all"
      />
    </div>
  );
}

function SpiceLevelPicker({ level, onChange }: { level: number; onChange: (l: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2, 3, 4].map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => onChange(l)}
          className={`text-sm transition-all ${l <= level && level > 0 ? "opacity-100" : "opacity-30"}`}
          title={SPICE_LABELS[l]}
        >
          🌶️
        </button>
      ))}
      <span className={`ml-1 text-[10px] font-semibold ${SPICE_COLORS[level]}`}>{SPICE_LABELS[level]}</span>
    </div>
  );
}

/* ─── Stats Banner ──────────────────────────────────────────────────── */

function MenuStats({ items, categories, currency }: { items: MenuItem[]; categories: MenuCategory[]; currency: string }) {
  const active = items.filter((i) => i.isAvailable).length;
  const vegCount = items.filter((i) => i.isVeg).length;
  const avgPrice = items.length ? Math.round(items.reduce((s, i) => s + i.price, 0) / items.length) : 0;
  const featuredCount = items.filter((i) => i.isFeatured).length;
  const topCats = categories.filter((c) => !c.parentId);
  const totalSubs = categories.filter((c) => c.parentId).length;

  const stats = [
    { label: "Total Items", value: items.length, icon: UtensilsCrossed, color: "text-amber-500", bg: "bg-amber-50" },
    { label: "Active", value: `${active}/${items.length}`, icon: Eye, color: "text-green-500", bg: "bg-green-50" },
    { label: "Categories", value: `${topCats.length} + ${totalSubs} sub`, icon: Layers, color: "text-indigo-500", bg: "bg-indigo-50" },
    { label: "Avg Price", value: formatPrice(avgPrice, currency), icon: TrendingUp, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Veg / Non-Veg", value: `${vegCount}/${items.length - vegCount}`, icon: Leaf, color: "text-emerald-500", bg: "bg-emerald-50" },
    { label: "Featured", value: featuredCount, icon: Star, color: "text-amber-500", bg: "bg-amber-50" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {stats.map((s) => (
        <div key={s.label} className="rounded-xl bg-white ring-1 ring-gray-100 p-3.5 flex items-center gap-3">
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${s.bg}`}>
            <s.icon className={`h-4 w-4 ${s.color}`} />
          </div>
          <div>
            <p className="text-[11px] text-gray-400 font-medium">{s.label}</p>
            <p className="text-sm font-bold text-gray-900">{String(s.value)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Category Tree Sidebar ─────────────────────────────────────────── */

function CategoryTree({
  categories,
  selectedCatId,
  onSelect,
  onAddSub,
}: {
  categories: MenuCategory[];
  selectedCatId: string;
  onSelect: (id: string) => void;
  onAddSub: (parentId: string) => void;
}) {
  const topLevel = categories.filter((c) => !c.parentId);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(topLevel.map((c) => c.id)));

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-0.5">
      {/* All items */}
      <button
        onClick={() => onSelect("All")}
        className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all ${
          selectedCatId === "All" ? "bg-amber-100/80 text-amber-900 font-semibold" : "text-gray-600 hover:bg-gray-50"
        }`}
      >
        <Package className="h-3.5 w-3.5" />
        <span className="flex-1 text-left">All Items</span>
      </button>

      {topLevel.map((cat) => {
        const subs = categories.filter((c) => c.parentId === cat.id);
        const isExpanded = expanded.has(cat.id);
        const totalItems = cat._count.items + subs.reduce((s, c) => s + c._count.items, 0);

        return (
          <div key={cat.id}>
            <div className="flex items-center">
              <button
                onClick={() => subs.length > 0 ? toggle(cat.id) : onSelect(cat.id)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                {subs.length > 0 ? (
                  <ChevronRight className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                ) : (
                  <span className="w-3" />
                )}
              </button>
              <button
                onClick={() => onSelect(cat.id)}
                className={`flex flex-1 items-center gap-2 rounded-lg px-2 py-2 text-[13px] font-medium transition-all ${
                  selectedCatId === cat.id ? "bg-amber-100/80 text-amber-900 font-semibold" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span>{cat.icon || "📁"}</span>
                <span className="flex-1 text-left truncate">{cat.name}</span>
                <span className="text-[10px] text-gray-400 font-normal">{totalItems}</span>
              </button>
              <button
                onClick={() => onAddSub(cat.id)}
                className="p-1 text-gray-300 hover:text-amber-500 transition-colors"
                title="Add subcategory"
              >
                <PlusCircle className="h-3 w-3" />
              </button>
            </div>

            <AnimatePresence>
              {isExpanded && subs.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden pl-7"
                >
                  {subs.map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => onSelect(sub.id)}
                      className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[12px] transition-all ${
                        selectedCatId === sub.id ? "bg-amber-50 text-amber-800 font-semibold" : "text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      <span className="flex-1 text-left truncate">{sub.name}</span>
                      <span className="text-[10px] text-gray-400">{sub._count.items}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Menu Item Card ────────────────────────────────────────────────── */

function MenuItemCard({
  item,
  onEdit,
  onDelete,
  onToggle,
  onDuplicate,
  currency,
}: {
  item: MenuItem;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onDuplicate: () => void;
  currency: string;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    }
    if (showMenu) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  const discountedPrice = item.discount > 0 ? Math.round(item.price * (1 - item.discount / 100)) : item.price;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`group relative rounded-xl bg-white ring-1 overflow-hidden transition-all hover:shadow-md ${
        item.isAvailable ? "ring-gray-200" : "ring-gray-100 opacity-60"
      }`}
    >
      {/* Image */}
      <div className="relative h-36 bg-gray-100">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <UtensilsCrossed className="h-8 w-8 text-gray-200" />
          </div>
        )}

        {/* Top badges */}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          {item.badge && (
            <span className="rounded-md bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm">
              {item.badge}
            </span>
          )}
          {item.isFeatured && (
            <span className="rounded-md bg-indigo-500 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm flex items-center gap-0.5">
              <Star className="h-2 w-2" /> Featured
            </span>
          )}
          {item.discount > 0 && (
            <span className="rounded-md bg-red-500 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm">
              {item.discountLabel || `${item.discount}% OFF`}
            </span>
          )}
        </div>

        {/* Veg indicator */}
        <div className="absolute top-2 right-2">
          <span className={`flex h-5 w-5 items-center justify-center rounded border-2 ${
            item.isVeg ? "border-green-500" : "border-red-500"
          } bg-white`}>
            <span className={`h-2 w-2 rounded-full ${item.isVeg ? "bg-green-500" : "bg-red-500"}`} />
          </span>
        </div>

        {/* Availability overlay */}
        {!item.isAvailable && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="rounded-lg bg-black/60 px-3 py-1.5 text-[11px] font-bold text-white">Unavailable</span>
          </div>
        )}

        {/* Quick actions (shown on hover) */}
        <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onToggle}
            className={`rounded-lg p-1.5 shadow-sm transition-colors ${
              item.isAvailable ? "bg-green-500 text-white hover:bg-green-600" : "bg-gray-500 text-white hover:bg-gray-600"
            }`}
            title={item.isAvailable ? "Mark unavailable" : "Mark available"}
          >
            {item.isAvailable ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
          </button>
          <button onClick={onEdit} className="rounded-lg bg-white p-1.5 text-gray-600 shadow-sm hover:bg-gray-50">
            <Pencil className="h-3 w-3" />
          </button>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="rounded-lg bg-white p-1.5 text-gray-600 shadow-sm hover:bg-gray-50"
            >
              <MoreVertical className="h-3 w-3" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-36 rounded-lg bg-white shadow-lg ring-1 ring-gray-200 z-20 py-1">
                <button
                  onClick={() => { onDuplicate(); setShowMenu(false); }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-[12px] text-gray-600 hover:bg-gray-50"
                >
                  <Copy className="h-3 w-3" /> Duplicate
                </button>
                <button
                  onClick={() => { onDelete(); setShowMenu(false); }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-[12px] text-red-500 hover:bg-red-50"
                >
                  <Trash2 className="h-3 w-3" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h4 className="text-[13px] font-bold text-gray-900 leading-tight line-clamp-1">{item.name}</h4>
          <div className="flex items-baseline gap-1 shrink-0">
            {item.discount > 0 && (
              <span className="text-[10px] text-gray-400 line-through">{formatPrice(item.price, currency)}</span>
            )}
            <span className="text-sm font-bold text-gray-900">{formatPrice(discountedPrice, currency)}</span>
          </div>
        </div>

        {item.description && (
          <p className="text-[11px] text-gray-400 line-clamp-1 mb-2">{item.description}</p>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Category */}
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
            {item.category.name}
          </span>

          {/* Prep time */}
          {item.prepTime && (
            <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
              <Clock className="h-2.5 w-2.5" /> {item.prepTime}
            </span>
          )}

          {/* Rating */}
          {item.rating > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-amber-500 font-semibold">
              <Star className="h-2.5 w-2.5 fill-amber-400" /> {item.rating.toFixed(1)}
            </span>
          )}

          {/* Spice level */}
          {item.spiceLevel > 0 && (
            <span className="text-[10px]">
              {"🌶️".repeat(item.spiceLevel)}
            </span>
          )}

          {/* Calories */}
          {item.calories && (
            <span className="text-[10px] text-gray-400">{item.calories} kcal</span>
          )}

          {/* Sizes count */}
          {item.sizes.length > 0 && (
            <span className="text-[10px] text-gray-400">{item.sizes.length} sizes</span>
          )}

          {/* Add-ons count */}
          {item.addOns.length > 0 && (
            <span className="text-[10px] text-gray-400">{item.addOns.length} add-ons</span>
          )}
        </div>

        {/* Tags */}
        {item.tags.length > 0 && (
          <div className="flex gap-1 mt-2 flex-wrap">
            {item.tags.slice(0, 3).map((t) => (
              <span key={t} className="rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-medium text-amber-600">
                {t}
              </span>
            ))}
            {item.tags.length > 3 && (
              <span className="text-[9px] text-gray-400">+{item.tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Allergens */}
        {item.allergens.length > 0 && (
          <div className="flex items-center gap-1 mt-1.5">
            <ShieldAlert className="h-2.5 w-2.5 text-orange-400" />
            <span className="text-[9px] text-orange-500">{item.allergens.join(", ")}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ─── Add / Edit Dish Form (Full-featured) ──────────────────────────── */

interface DishFormData {
  name: string;
  description: string;
  price: string;
  categoryId: string;
  imageUrl: string;
  isVeg: boolean;
  hasEgg: boolean;
  hasOnionGarlic: boolean;
  prepTime: string;
  badge: string;
  tags: string[];
  spiceLevel: number;
  calories: string;
  allergens: string[];
  isFeatured: boolean;
  discount: string;
  discountLabel: string;
  sizes: { label: string; grams: string; priceAdd: string }[];
  addOns: { name: string; price: string }[];
}

function DishForm({
  categories,
  initial,
  onSubmit,
  onCancel,
  submitLabel,
  currency = "NPR",
}: {
  categories: MenuCategory[];
  initial?: Partial<DishFormData>;
  onSubmit: (data: DishFormData) => void;
  onCancel: () => void;
  submitLabel: string;
  currency?: string;
}) {
  const { showToast } = useToast();
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("basic");
  const [tagInput, setTagInput] = useState("");

  const [form, setForm] = useState<DishFormData>({
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    price: initial?.price ?? "",
    categoryId: initial?.categoryId ?? "",
    imageUrl: initial?.imageUrl ?? "",
    isVeg: initial?.isVeg ?? true,
    hasEgg: initial?.hasEgg ?? false,
    hasOnionGarlic: initial?.hasOnionGarlic ?? true,
    prepTime: initial?.prepTime ?? "15-20 min",
    badge: initial?.badge ?? "",
    tags: initial?.tags ?? [],
    spiceLevel: initial?.spiceLevel ?? 0,
    calories: initial?.calories ?? "",
    allergens: initial?.allergens ?? [],
    isFeatured: initial?.isFeatured ?? false,
    discount: initial?.discount ?? "",
    discountLabel: initial?.discountLabel ?? "",
    sizes: initial?.sizes ?? [],
    addOns: initial?.addOns ?? [],
  });

  const update = (patch: Partial<DishFormData>) => setForm((f) => ({ ...f, ...patch }));

  // Build flat category list with hierarchy labels
  const topCats = categories.filter((c) => !c.parentId);
  const categoryOptions: { id: string; label: string }[] = [];
  for (const cat of topCats) {
    categoryOptions.push({ id: cat.id, label: cat.name });
    const subs = categories.filter((c) => c.parentId === cat.id);
    for (const sub of subs) {
      categoryOptions.push({ id: sub.id, label: `  └ ${sub.name}` });
    }
  }

  const handleSubmit = () => {
    if (!form.name.trim()) return showToast("Dish name is required");
    if (!Number(form.price) || Number(form.price) <= 0) return showToast("Enter a valid price");
    if (!form.categoryId) return showToast("Select a category");
    onSubmit(form);
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) {
      update({ tags: [...form.tags, t] });
      setTagInput("");
    }
  };

  const sections = [
    { id: "basic", label: "Basic Info", icon: Info },
    { id: "dietary", label: "Dietary & Spice", icon: Leaf },
    { id: "pricing", label: "Pricing & Offers", icon: Percent },
    { id: "sizes", label: "Sizes & Add-ons", icon: Layers },
    { id: "tags", label: "Tags & Badges", icon: Tag },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
        <span className="text-sm font-bold text-gray-900">{submitLabel === "Add to menu" ? "New Dish" : "Edit Dish"}</span>
        <button onClick={onCancel} className="rounded-md p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 px-4 pt-3 overflow-x-auto scrollbar-hide">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`flex items-center gap-1.5 shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all ${
              activeSection === s.id
                ? "bg-amber-100 text-amber-800"
                : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"
            }`}
          >
            <s.icon className="h-3 w-3" />
            {s.label}
          </button>
        ))}
      </div>

      <div className="p-5 space-y-5">
        {/* ── BASIC INFO ──────────────────────────────────────── */}
        {activeSection === "basic" && (
          <div className="space-y-4">
            {/* Image + Name + Price */}
            <div className="flex gap-4 items-start">
              <button
                type="button"
                onClick={() => setShowImagePicker(true)}
                className="shrink-0 group relative h-24 w-24 rounded-xl overflow-hidden bg-gray-50 border border-gray-200 hover:border-amber-300 transition-colors"
              >
                {form.imageUrl ? (
                  <>
                    <img src={form.imageUrl} alt="Selected" className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="h-5 w-5 text-white" />
                    </div>
                  </>
                ) : (
                  <div className="h-full w-full flex flex-col items-center justify-center gap-1">
                    <Camera className="h-5 w-5 text-gray-300" />
                    <span className="text-[9px] font-medium text-gray-300">Add Photo</span>
                  </div>
                )}
              </button>
              <ImagePicker
                open={showImagePicker}
                currentImage={form.imageUrl || null}
                onSelect={(url) => update({ imageUrl: url })}
                onClose={() => setShowImagePicker(false)}
              />

              <div className="flex-1 space-y-3">
                <input
                  value={form.name}
                  onChange={(e) => update({ name: e.target.value })}
                  placeholder="Dish name *"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-900 placeholder-gray-300 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-100"
                />
                <div className="flex gap-3">
                  <div className="w-32">
                    <PriceInput value={form.price} onChange={(v) => update({ price: v })} placeholder="Price *" currencySymbol={getCurrencySymbol(currency)} />
                  </div>
                  <input
                    value={form.prepTime}
                    onChange={(e) => update({ prepTime: e.target.value })}
                    placeholder="e.g. 15-20 min"
                    className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder-gray-300 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-100"
                  />
                </div>
              </div>
            </div>

            {/* Category */}
            <div className="relative">
              <select
                value={form.categoryId}
                onChange={(e) => update({ categoryId: e.target.value })}
                className={`w-full appearance-none rounded-lg border border-gray-200 bg-white px-3 py-2.5 pr-9 text-sm font-medium focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-100 ${
                  form.categoryId ? "text-gray-900" : "text-gray-400"
                }`}
              >
                <option value="" disabled>Select category / subcategory *</option>
                {categoryOptions.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>

            {/* Description */}
            <textarea
              value={form.description}
              onChange={(e) => update({ description: e.target.value })}
              placeholder="Short description — helps customers decide"
              rows={2}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 placeholder-gray-300 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-100 resize-none"
            />
          </div>
        )}

        {/* ── DIETARY & SPICE ─────────────────────────────────── */}
        {activeSection === "dietary" && (
          <div className="space-y-5">
            {/* Veg / Non-Veg / Egg / Onion-Garlic */}
            <div>
              <p className="text-[12px] font-semibold text-gray-600 mb-2.5">Dietary Classification</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => update({ isVeg: true })}
                  className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-[12px] font-semibold border transition-all ${
                    form.isVeg ? "border-green-300 bg-green-50 text-green-700 ring-1 ring-green-200" : "border-gray-200 text-gray-400"
                  }`}
                >
                  <Leaf className="h-3.5 w-3.5" /> Vegetarian
                </button>
                <button
                  type="button"
                  onClick={() => update({ isVeg: false })}
                  className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-[12px] font-semibold border transition-all ${
                    !form.isVeg ? "border-red-300 bg-red-50 text-red-600 ring-1 ring-red-200" : "border-gray-200 text-gray-400"
                  }`}
                >
                  <Flame className="h-3.5 w-3.5" /> Non-Vegetarian
                </button>
                <button
                  type="button"
                  onClick={() => update({ hasEgg: !form.hasEgg })}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-semibold border transition-all ${
                    form.hasEgg ? "border-yellow-300 bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200" : "border-gray-200 text-gray-400"
                  }`}
                >
                  🥚 Contains Egg
                </button>
                <button
                  type="button"
                  onClick={() => update({ hasOnionGarlic: !form.hasOnionGarlic })}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-semibold border transition-all ${
                    !form.hasOnionGarlic ? "border-purple-300 bg-purple-50 text-purple-700 ring-1 ring-purple-200" : "border-gray-200 text-gray-400"
                  }`}
                >
                  🧄 No Onion/Garlic
                </button>
              </div>
            </div>

            {/* Spice level */}
            <div>
              <p className="text-[12px] font-semibold text-gray-600 mb-2.5">Spice Level</p>
              <SpiceLevelPicker level={form.spiceLevel} onChange={(l) => update({ spiceLevel: l })} />
            </div>

            {/* Calories */}
            <div>
              <p className="text-[12px] font-semibold text-gray-600 mb-2.5">Calories (optional)</p>
              <div className="relative w-40">
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.calories}
                  onChange={(e) => update({ calories: e.target.value.replace(/\D/g, "") })}
                  placeholder="e.g. 450"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 pr-12 text-sm text-gray-700 placeholder-gray-300 focus:outline-none focus:border-amber-400"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-gray-400">kcal</span>
              </div>
            </div>

            {/* Allergens */}
            <div>
              <p className="text-[12px] font-semibold text-gray-600 mb-2.5">Allergens</p>
              <div className="flex flex-wrap gap-2">
                {ALLERGEN_OPTIONS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => {
                      const next = form.allergens.includes(a)
                        ? form.allergens.filter((x) => x !== a)
                        : [...form.allergens, a];
                      update({ allergens: next });
                    }}
                    className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold border transition-all ${
                      form.allergens.includes(a)
                        ? "border-orange-300 bg-orange-50 text-orange-700"
                        : "border-gray-200 text-gray-400 hover:border-gray-300"
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── PRICING & OFFERS ────────────────────────────────── */}
        {activeSection === "pricing" && (
          <div className="space-y-5">
            <div>
              <p className="text-[12px] font-semibold text-gray-600 mb-2.5">Discount</p>
              <div className="flex gap-3">
                <div className="relative w-28">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.discount}
                    onChange={(e) => update({ discount: e.target.value.replace(/\D/g, "") })}
                    placeholder="0"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 pr-8 text-sm font-semibold text-gray-900 placeholder-gray-300 focus:outline-none focus:border-amber-400"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-gray-400">%</span>
                </div>
                <input
                  value={form.discountLabel}
                  onChange={(e) => update({ discountLabel: e.target.value })}
                  placeholder={`Label e.g. 'FLAT ${getCurrencySymbol(currency)}50 OFF'`}
                  className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder-gray-300 focus:outline-none focus:border-amber-400"
                />
              </div>
              {Number(form.discount) > 0 && Number(form.price) > 0 && (
                <p className="text-[11px] text-green-600 mt-1.5">
                  Customer pays: {formatPrice(Math.round(Number(form.price) * (1 - Number(form.discount) / 100)), currency)}
                  {" "}(was {formatPrice(Number(form.price), currency)})
                </p>
              )}
            </div>

            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <button
                  type="button"
                  onClick={() => update({ isFeatured: !form.isFeatured })}
                  className={`relative h-5 w-9 rounded-full transition-colors ${form.isFeatured ? "bg-amber-500" : "bg-gray-200"}`}
                >
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${form.isFeatured ? "translate-x-4" : "translate-x-0.5"}`} />
                </button>
                <div>
                  <p className="text-[12px] font-semibold text-gray-700">Featured Item</p>
                  <p className="text-[10px] text-gray-400">Highlight this dish on your menu page</p>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* ── SIZES & ADD-ONS ─────────────────────────────────── */}
        {activeSection === "sizes" && (
          <div className="space-y-5">
            {/* Sizes */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-[12px] font-semibold text-gray-600">Size Variants</p>
                <button
                  type="button"
                  onClick={() => update({ sizes: [...form.sizes, { label: "", grams: "", priceAdd: "" }] })}
                  className="flex items-center gap-1 text-[11px] font-semibold text-amber-600 hover:text-amber-700"
                >
                  <Plus className="h-3 w-3" /> Add Size
                </button>
              </div>
              {form.sizes.length === 0 ? (
                <p className="text-[11px] text-gray-400 italic">No sizes — item has a single price</p>
              ) : (
                <div className="space-y-2">
                  {form.sizes.map((size, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input
                        value={size.label}
                        onChange={(e) => {
                          const next = [...form.sizes];
                          next[i] = { ...next[i], label: e.target.value };
                          update({ sizes: next });
                        }}
                        placeholder="e.g. Regular"
                        className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-[12px] focus:outline-none focus:border-amber-400"
                      />
                      <input
                        value={size.grams}
                        onChange={(e) => {
                          const next = [...form.sizes];
                          next[i] = { ...next[i], grams: e.target.value };
                          update({ sizes: next });
                        }}
                        placeholder="e.g. 250g"
                        className="w-20 rounded-lg border border-gray-200 px-3 py-1.5 text-[12px] focus:outline-none focus:border-amber-400"
                      />
                      <div className="relative w-24">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">+{getCurrencySymbol(currency)}</span>
                        <input
                          value={size.priceAdd}
                          onChange={(e) => {
                            const next = [...form.sizes];
                            next[i] = { ...next[i], priceAdd: e.target.value.replace(/[^0-9.]/g, "") };
                            update({ sizes: next });
                          }}
                          placeholder="0"
                          className="w-full rounded-lg border border-gray-200 py-1.5 pl-9 pr-2 text-[12px] focus:outline-none focus:border-amber-400"
                        />
                      </div>
                      <button
                        onClick={() => update({ sizes: form.sizes.filter((_, j) => j !== i) })}
                        className="p-1 text-gray-300 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add-ons */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-[12px] font-semibold text-gray-600">Add-ons</p>
                <button
                  type="button"
                  onClick={() => update({ addOns: [...form.addOns, { name: "", price: "" }] })}
                  className="flex items-center gap-1 text-[11px] font-semibold text-amber-600 hover:text-amber-700"
                >
                  <Plus className="h-3 w-3" /> Add-on
                </button>
              </div>
              {form.addOns.length === 0 ? (
                <p className="text-[11px] text-gray-400 italic">No add-ons configured</p>
              ) : (
                <div className="space-y-2">
                  {form.addOns.map((addon, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input
                        value={addon.name}
                        onChange={(e) => {
                          const next = [...form.addOns];
                          next[i] = { ...next[i], name: e.target.value };
                          update({ addOns: next });
                        }}
                        placeholder="e.g. Extra Cheese"
                        className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-[12px] focus:outline-none focus:border-amber-400"
                      />
                      <div className="w-28">
                        <PriceInput
                          value={addon.price}
                          onChange={(v) => {
                            const next = [...form.addOns];
                            next[i] = { ...next[i], price: v };
                            update({ addOns: next });
                          }}
                          placeholder="Price"
                          currencySymbol={getCurrencySymbol(currency)}
                        />
                      </div>
                      <button
                        onClick={() => update({ addOns: form.addOns.filter((_, j) => j !== i) })}
                        className="p-1 text-gray-300 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAGS & BADGES ──────────────────────────────────── */}
        {activeSection === "tags" && (
          <div className="space-y-5">
            {/* Badge */}
            <div>
              <p className="text-[12px] font-semibold text-gray-600 mb-2.5">Badge</p>
              <div className="flex flex-wrap gap-2">
                {BADGE_OPTIONS.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => update({ badge: form.badge === b ? "" : b })}
                    className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold border transition-all ${
                      form.badge === b
                        ? "border-amber-300 bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                        : "border-gray-200 text-gray-400 hover:border-gray-300"
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div>
              <p className="text-[12px] font-semibold text-gray-600 mb-2.5">Tags</p>
              <div className="flex gap-2 mb-2">
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                  placeholder="Type a tag and press Enter"
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-[12px] text-gray-700 placeholder-gray-300 focus:outline-none focus:border-amber-400"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="rounded-lg bg-gray-100 px-3 py-1.5 text-[11px] font-semibold text-gray-600 hover:bg-gray-200"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {form.tags.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-600">
                    {t}
                    <button onClick={() => update({ tags: form.tags.filter((x) => x !== t) })} className="text-gray-400 hover:text-red-500">
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
          <button
            onClick={handleSubmit}
            className="rounded-lg bg-amber-500 px-6 py-2.5 text-[13px] font-bold text-white hover:bg-amber-600 active:scale-[0.98] transition-all"
          >
            {submitLabel}
          </button>
          <button onClick={onCancel} className="text-[13px] font-medium text-gray-400 hover:text-gray-600">
            Cancel
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Add Sub-category Modal ────────────────────────────────────────── */

function AddSubCategoryInline({
  parentName,
  onCreate,
  onCancel,
}: {
  parentName: string;
  onCreate: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/50 p-3">
        <FolderPlus className="h-4 w-4 text-amber-500 shrink-0" />
        <span className="text-[12px] text-gray-500 shrink-0">Sub of <strong>{parentName}</strong>:</span>
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim()) onCreate(name.trim());
            if (e.key === "Escape") onCancel();
          }}
          placeholder="e.g. Chicken, Steam, Jhol…"
          className="flex-1 min-w-0 bg-transparent text-sm font-medium text-gray-800 outline-none placeholder-gray-400"
        />
        <button
          onClick={() => name.trim() && onCreate(name.trim())}
          disabled={!name.trim()}
          className="rounded-md bg-amber-500 px-3 py-1 text-[11px] font-bold text-white hover:bg-amber-600 disabled:opacity-40 transition-all"
        >
          Add
        </button>
        <button onClick={onCancel} className="p-1 text-gray-400 hover:text-gray-600">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

/* ─── Main Component ────────────────────────────────────────────────── */

export default function MenuManagementTab() {
  const { selectedRestaurant } = useRestaurant();
  const cur = selectedRestaurant?.currency ?? "NPR";
  const curSymbol = getCurrencySymbol(cur);
  const { showToast } = useToast();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCatId, setSelectedCatId] = useState("All");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [creatingCat, setCreatingCat] = useState(false);
  const [seedingCats, setSeedingCats] = useState(false);
  const [addSubParentId, setAddSubParentId] = useState<string | null>(null);
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

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (showNewCat && newCatInputRef.current) newCatInputRef.current.focus();
  }, [showNewCat]);

  // Flatten categories for tree
  const flatCategories = useMemo(() => {
    const flat: MenuCategory[] = [];
    for (const cat of categories) {
      flat.push(cat);
      if (cat.children) {
        for (const sub of cat.children) {
          flat.push(sub);
        }
      }
    }
    return flat;
  }, [categories]);

  const createCategory = async (name?: string, parentId?: string | null) => {
    if (!restaurantId) return;
    const catName = name || newCatName.trim();
    if (!catName) return;
    setCreatingCat(true);
    try {
      await apiFetch(`/api/restaurants/${restaurantId}/categories`, {
        method: "POST",
        body: { name: catName, parentId: parentId || null },
      });
      showToast(`"${catName}" created!`);
      if (!name) { setNewCatName(""); setShowNewCat(false); }
      setAddSubParentId(null);
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
      await apiFetch(`/api/restaurants/${restaurantId}/categories/seed`, {
        method: "POST",
      });
      showToast("10 categories with subcategories added!");
      await fetchData();
    } catch {
      showToast("Failed to seed categories");
    } finally {
      setSeedingCats(false);
    }
  };

  // Filter items
  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase()) || (item.description || "").toLowerCase().includes(search.toLowerCase());
      if (selectedCatId === "All") return matchSearch;
      // Check if selected is a parent category — if so, include items from all children
      const selectedCat = flatCategories.find((c) => c.id === selectedCatId);
      if (!selectedCat) return matchSearch;
      if (!selectedCat.parentId) {
        // Top-level: match this category or any of its children
        const childIds = flatCategories.filter((c) => c.parentId === selectedCatId).map((c) => c.id);
        return matchSearch && (item.categoryId === selectedCatId || childIds.includes(item.categoryId));
      }
      return matchSearch && item.categoryId === selectedCatId;
    });
  }, [items, search, selectedCatId, flatCategories]);

  const updateItem = async (id: string, patch: Record<string, unknown>) => {
    if (!restaurantId) return;
    try {
      await apiFetch(`/api/restaurants/${restaurantId}/menu/${id}`, { method: "PATCH", body: patch });
      await fetchData();
    } catch {
      showToast("Failed to update item");
    }
  };

  const deleteItem = async (id: string) => {
    if (!restaurantId) return;
    try {
      await apiFetch(`/api/restaurants/${restaurantId}/menu/${id}`, { method: "DELETE" });
      showToast("Item deleted");
      await fetchData();
    } catch {
      showToast("Failed to delete item");
    }
  };

  const toggleItem = async (id: string, currentAvailable: boolean) => {
    await updateItem(id, { isAvailable: !currentAvailable });
  };

  const addItem = async (formData: DishFormData) => {
    if (!restaurantId) return;
    try {
      await apiFetch(`/api/restaurants/${restaurantId}/menu`, {
        method: "POST",
        body: {
          name: formData.name.trim(),
          description: formData.description.trim(),
          price: Number(formData.price),
          categoryId: formData.categoryId,
          imageUrl: formData.imageUrl || undefined,
          isVeg: formData.isVeg,
          hasEgg: formData.hasEgg,
          hasOnionGarlic: formData.hasOnionGarlic,
          prepTime: formData.prepTime || "15-20 min",
          badge: formData.badge || null,
          tags: formData.tags,
          spiceLevel: formData.spiceLevel,
          calories: formData.calories ? Number(formData.calories) : null,
          allergens: formData.allergens,
          isFeatured: formData.isFeatured,
          discount: Number(formData.discount) || 0,
          discountLabel: formData.discountLabel || null,
          sizes: formData.sizes.filter((s) => s.label.trim()).map((s) => ({ label: s.label, grams: s.grams, priceAdd: Number(s.priceAdd) || 0 })),
          addOns: formData.addOns.filter((a) => a.name.trim()).map((a) => ({ name: a.name, price: Number(a.price) || 0 })),
        },
      });
      setShowAddForm(false);
      showToast("New dish added!");
      await fetchData();
    } catch {
      showToast("Failed to add dish");
    }
  };

  const editItem = async (formData: DishFormData) => {
    if (!restaurantId || !editingItem) return;
    try {
      await apiFetch(`/api/restaurants/${restaurantId}/menu/${editingItem.id}`, {
        method: "PATCH",
        body: {
          name: formData.name.trim(),
          description: formData.description.trim(),
          price: Number(formData.price),
          categoryId: formData.categoryId,
          imageUrl: formData.imageUrl || null,
          isVeg: formData.isVeg,
          hasEgg: formData.hasEgg,
          hasOnionGarlic: formData.hasOnionGarlic,
          prepTime: formData.prepTime || "15-20 min",
          badge: formData.badge || null,
          tags: formData.tags,
          spiceLevel: formData.spiceLevel,
          calories: formData.calories ? Number(formData.calories) : null,
          allergens: formData.allergens,
          isFeatured: formData.isFeatured,
          discount: Number(formData.discount) || 0,
          discountLabel: formData.discountLabel || null,
          sizes: formData.sizes.filter((s) => s.label.trim()).map((s) => ({ label: s.label, grams: s.grams, priceAdd: Number(s.priceAdd) || 0 })),
          addOns: formData.addOns.filter((a) => a.name.trim()).map((a) => ({ name: a.name, price: Number(a.price) || 0 })),
        },
      });
      setEditingItem(null);
      showToast("Dish updated!");
      await fetchData();
    } catch {
      showToast("Failed to update dish");
    }
  };

  const duplicateItem = async (item: MenuItem) => {
    if (!restaurantId) return;
    try {
      await apiFetch(`/api/restaurants/${restaurantId}/menu`, {
        method: "POST",
        body: {
          name: `${item.name} (Copy)`,
          description: item.description || "",
          price: item.price,
          categoryId: item.categoryId,
          imageUrl: item.imageUrl,
          isVeg: item.isVeg,
          hasEgg: item.hasEgg,
          hasOnionGarlic: item.hasOnionGarlic,
          prepTime: item.prepTime,
          badge: item.badge,
          tags: item.tags,
          spiceLevel: item.spiceLevel,
          calories: item.calories,
          allergens: item.allergens,
          sizes: item.sizes.map((s) => ({ label: s.label, grams: s.grams, priceAdd: s.priceAdd })),
          addOns: item.addOns.map((a) => ({ name: a.name, price: a.price })),
        },
      });
      showToast("Item duplicated!");
      await fetchData();
    } catch {
      showToast("Failed to duplicate item");
    }
  };

  const addSubParent = addSubParentId ? flatCategories.find((c) => c.id === addSubParentId) : null;

  if (loading && items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <p className="text-sm text-gray-400">Loading menu…</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Menu Management</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage your dishes, categories, pricing, and more
          </p>
        </div>
        <div className="flex gap-2">
          {!showAddForm && !editingItem && (
            <>
              <button
                onClick={() => setShowNewCat(true)}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-[12px] font-semibold text-gray-600 hover:bg-gray-50 transition-all"
              >
                <FolderPlus className="h-3.5 w-3.5" />
                Category
              </button>
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-[13px] font-bold text-white hover:bg-amber-600 active:scale-[0.97] transition-all"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                Add Dish
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <MenuStats items={items} categories={flatCategories} currency={cur} />

      {/* Seed prompt */}
      {!loading && categories.length === 0 && !showNewCat && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-center gap-4 rounded-xl border-2 border-dashed border-amber-200 bg-amber-50/30 px-6 py-5"
        >
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <div>
              <p className="text-sm font-semibold text-gray-700">Quick Start</p>
              <p className="text-[12px] text-gray-500">Add 10 popular food categories with subcategories in one click</p>
            </div>
          </div>
          <button
            onClick={seedDefaults}
            disabled={seedingCats}
            className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-5 py-2.5 text-[13px] font-bold text-white hover:bg-amber-600 disabled:opacity-50 transition-all shrink-0"
          >
            {seedingCats ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
            Add Default Categories
          </button>
        </motion.div>
      )}

      {/* Category creation */}
      <AnimatePresence>
        {showNewCat && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="flex items-center gap-2.5 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
              <Tag className="h-4 w-4 text-gray-400 shrink-0" />
              <input
                ref={newCatInputRef}
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") createCategory(); if (e.key === "Escape") { setShowNewCat(false); setNewCatName(""); } }}
                placeholder="New top-level category name"
                className="flex-1 min-w-0 text-sm font-medium text-gray-800 outline-none placeholder-gray-400"
              />
              <button
                onClick={() => createCategory()}
                disabled={!newCatName.trim() || creatingCat}
                className="flex items-center gap-1 rounded-md bg-amber-500 px-3 py-1.5 text-[12px] font-bold text-white hover:bg-amber-600 disabled:opacity-40 transition-all"
              >
                {creatingCat ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                Create
              </button>
              <button onClick={() => { setShowNewCat(false); setNewCatName(""); }} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subcategory creation */}
      <AnimatePresence>
        {addSubParent && (
          <AddSubCategoryInline
            parentName={addSubParent.name}
            onCreate={(name) => createCategory(name, addSubParentId)}
            onCancel={() => setAddSubParentId(null)}
          />
        )}
      </AnimatePresence>

      {/* Add / Edit form */}
      <AnimatePresence>
        {showAddForm && (
          <DishForm
            categories={flatCategories}
            onSubmit={addItem}
            onCancel={() => setShowAddForm(false)}
            submitLabel="Add to menu"
            currency={cur}
          />
        )}
        {editingItem && (
          <DishForm
            key={editingItem.id}
            categories={flatCategories}
            initial={{
              name: editingItem.name,
              description: editingItem.description || "",
              price: String(editingItem.price),
              categoryId: editingItem.categoryId,
              imageUrl: editingItem.imageUrl || "",
              isVeg: editingItem.isVeg,
              hasEgg: editingItem.hasEgg,
              hasOnionGarlic: editingItem.hasOnionGarlic,
              prepTime: editingItem.prepTime || "15-20 min",
              badge: editingItem.badge || "",
              tags: editingItem.tags,
              spiceLevel: editingItem.spiceLevel,
              calories: editingItem.calories ? String(editingItem.calories) : "",
              allergens: editingItem.allergens,
              isFeatured: editingItem.isFeatured,
              discount: editingItem.discount ? String(editingItem.discount) : "",
              discountLabel: editingItem.discountLabel || "",
              sizes: editingItem.sizes.map((s) => ({ label: s.label, grams: s.grams, priceAdd: String(s.priceAdd) })),
              addOns: editingItem.addOns.map((a) => ({ name: a.name, price: String(a.price) })),
            }}
            onSubmit={editItem}
            onCancel={() => setEditingItem(null)}
            submitLabel="Save Changes"
            currency={cur}
          />
        )}
      </AnimatePresence>

      {/* Main layout: sidebar + grid */}
      <div className="flex gap-5">
        {/* Category sidebar */}
        {flatCategories.length > 0 && (
          <div className="hidden lg:block w-52 shrink-0">
            <div className="sticky top-0 rounded-xl bg-white ring-1 ring-gray-100 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2 px-2">Categories</p>
              <CategoryTree
                categories={flatCategories}
                selectedCatId={selectedCatId}
                onSelect={setSelectedCatId}
                onAddSub={setAddSubParentId}
              />
            </div>
          </div>
        )}

        {/* Items area */}
        <div className="flex-1 min-w-0">
          {/* Search & mobile category filter */}
          <div className="flex flex-col sm:flex-row gap-2.5 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search dishes…"
                className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm font-medium text-gray-900 placeholder-gray-300 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-100"
              />
            </div>
            {/* Mobile category pills */}
            <div className="lg:hidden flex gap-1.5 overflow-x-auto scrollbar-hide items-center">
              {["All", ...flatCategories.filter((c) => !c.parentId).map((c) => c.name)].map((cat) => {
                const catObj = flatCategories.find((c) => c.name === cat && !c.parentId);
                const isActive = cat === "All" ? selectedCatId === "All" : selectedCatId === catObj?.id;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCatId(cat === "All" ? "All" : catObj?.id || "All")}
                    className={`shrink-0 rounded-lg px-3 py-2 text-[12px] font-semibold transition-all ${
                      isActive ? "bg-amber-500 text-white" : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Items grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {filtered.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="col-span-full flex flex-col items-center justify-center py-20 gap-3"
                >
                  <div className="h-14 w-14 rounded-full bg-gray-50 flex items-center justify-center">
                    {items.length === 0 ? <UtensilsCrossed className="h-6 w-6 text-gray-200" /> : <Search className="h-5 w-5 text-gray-300" />}
                  </div>
                  <p className="text-sm text-gray-400">
                    {items.length === 0 ? "Add your first dish to get started" : "No dishes match your search"}
                  </p>
                  {items.length === 0 && !showAddForm && (
                    <button
                      onClick={() => setShowAddForm(true)}
                      className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-[13px] font-bold text-white hover:bg-amber-600 mt-2"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add First Dish
                    </button>
                  )}
                </motion.div>
              ) : (
                filtered.map((item) => (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    currency={cur}
                    onEdit={() => { setEditingItem(item); setShowAddForm(false); }}
                    onDelete={() => deleteItem(item.id)}
                    onToggle={() => toggleItem(item.id, item.isAvailable)}
                    onDuplicate={() => duplicateItem(item)}
                  />
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
