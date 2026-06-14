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
import { useRestaurant, useOptionalRestaurant } from "@/context/RestaurantContext";
import { apiFetch } from "@/lib/api-client";
import { useToast } from "@/context/ToastContext";
import { formatPrice, getCurrencySymbol } from "@/lib/currency";
import ImagePicker from "@/components/shared/ImagePicker";
import {
  SkeletonStatGrid,
  SkeletonGrid,
  SkeletonLine,
} from "@/components/shared/Skeleton";


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


const DEFAULT_CATEGORIES: { name: string; icon: string; subs: string[] }[] = [
  { name: "Appetizers",    icon: "", subs: ["Fried", "Grilled", "Cold"] },
  { name: "Momo",          icon: "", subs: ["Steam", "Fried", "Jhol", "Chilli", "Kothey", "C.Momo", "Tandoori"] },
  { name: "Curry",         icon: "", subs: ["Chicken", "Mutton", "Paneer", "Vegetable", "Fish", "Dal"] },
  { name: "Rice & Noodles",icon: "", subs: ["Fried Rice", "Biryani", "Chow Mein", "Thukpa", "Pulao"] },
  { name: "Thali Sets",    icon: "", subs: ["Veg Thali", "Non-Veg Thali", "Special Thali"] },
  { name: "Tandoori",      icon: "", subs: ["Chicken", "Paneer", "Fish", "Kebab"] },
  { name: "Breads",        icon: "", subs: ["Naan", "Roti", "Paratha", "Kulcha"] },
  { name: "Soups & Salads",icon: "", subs: ["Soups", "Salads"] },
  { name: "Beverages",     icon: "", subs: ["Hot", "Cold", "Juices", "Lassi", "Mocktails"] },
  { name: "Desserts",      icon: "", subs: ["Indian", "Western", "Ice Cream"] },
];

const BADGE_OPTIONS = ["Bestseller", "New", "Chef's Special", "Must Try", "Popular", "Seasonal"];
const ALLERGEN_OPTIONS = ["Gluten", "Dairy", "Nuts", "Soy", "Eggs", "Shellfish", "Sesame", "Mustard"];
const SPICE_LABELS = ["None", "Mild", "Medium", "Hot", "Extra Hot"];
const SPICE_COLORS = ["text-[var(--text-3)]", "text-[var(--accent-hover)]", "text-yellow-500", "text-[var(--accent)]", "text-red-500"];


function PriceInput({ value, onChange, placeholder, currencySymbol = "Rs." }: { value: string; onChange: (v: string) => void; placeholder?: string; currencySymbol?: string }) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-[var(--text-3)] select-none">{currencySymbol}</span>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => {
          const v = e.target.value.replace(/[^0-9.]/g, "");
          if (v.split(".").length <= 2) onChange(v);
        }}
        placeholder={placeholder ?? "0"}
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--canvas)] py-2 pl-9 pr-3 text-sm font-semibold text-[var(--text-1)] placeholder-gray-300 focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent-border)] transition-all"
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
          className={`transition-all ${l <= level && level > 0 ? "opacity-100" : "opacity-25"}`}
          title={SPICE_LABELS[l]}
        >
          <Flame className={`h-4 w-4 ${SPICE_COLORS[Math.max(l, 1)]}`} />
        </button>
      ))}
      <span className={`ml-1 text-[10px] font-semibold ${SPICE_COLORS[level]}`}>{SPICE_LABELS[level]}</span>
    </div>
  );
}


function MenuStats({ items, categories, currency }: { items: MenuItem[]; categories: MenuCategory[]; currency: string }) {
  const active = items.filter((i) => i.isAvailable).length;
  const vegCount = items.filter((i) => i.isVeg).length;
  const avgPrice = items.length ? Math.round(items.reduce((s, i) => s + i.price, 0) / items.length) : 0;
  const featuredCount = items.filter((i) => i.isFeatured).length;
  const topCats = categories.filter((c) => !c.parentId);
  const totalSubs = categories.filter((c) => c.parentId).length;

  const stats = [
    { label: "Total Items", value: items.length, icon: UtensilsCrossed, color: "text-[var(--accent)]", bg: "bg-gradient-to-br from-[var(--accent)]0/20 to-[var(--accent-hover)]/10", border: "border-[var(--accent-border)]/50" },
    { label: "Active", value: `${active}/${items.length}`, icon: Eye, color: "text-[var(--accent-hover)]", bg: "bg-gradient-to-br from-[var(--accent)]/20 to-[#fef9ef]", border: "border-[var(--accent-border)]/50" },
    { label: "Categories", value: `${topCats.length} + ${totalSubs} sub`, icon: Layers, color: "text-indigo-500", bg: "bg-gradient-to-br from-indigo-400/20 to-purple-500/10", border: "border-indigo-100/50" },
    { label: "Avg Price", value: formatPrice(avgPrice, currency), icon: TrendingUp, color: "text-blue-500", bg: "bg-gradient-to-br from-blue-400/20 to-cyan-500/10", border: "border-blue-100/50" },
    { label: "Veg / Non-Veg", value: `${vegCount}/${items.length - vegCount}`, icon: Leaf, color: "text-[var(--accent-text)]", bg: "bg-gradient-to-br from-[var(--accent)]/20 to-[#fef3dc]", border: "border-[var(--accent-border)]/50" },
    { label: "Featured", value: featuredCount, icon: Star, color: "text-[var(--accent)]", bg: "bg-gradient-to-br from-[var(--accent)]0/20 to-yellow-500/10", border: "border-[var(--accent-border)]/50" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      {stats.map((s) => (
        <motion.div 
          key={s.label} 
          whileHover={{ y: -2 }}
          className={`rounded-2xl bg-[var(--canvas)]/70 backdrop-blur-md border ${s.border} p-4 flex items-center gap-3.5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)] transition-all`}
        >
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${s.bg} border border-white/40 shadow-sm backdrop-blur-md`}>
            <s.icon className={`h-4.5 w-4.5 ${s.color} drop-shadow-sm`} />
          </div>
          <div>
            <p className="text-[11px] text-[var(--text-2)] font-bold tracking-wide uppercase">{s.label}</p>
            <p className="text-lg font-extrabold text-[var(--text-1)] leading-none mt-1">{String(s.value)}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}


function CategoryTree({
  categories,
  selectedCatId,
  onSelect,
  onAddSub,
  onDelete,
}: {
  categories: MenuCategory[];
  selectedCatId: string;
  onSelect: (id: string) => void;
  onAddSub: (parentId: string) => void;
  onDelete: (categoryId: string) => void;
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
      <button
        onClick={() => onSelect("All")}
        className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all ${
          selectedCatId === "All" ? "bg-[var(--accent-muted)] text-[var(--accent-text)] font-semibold" : "text-[var(--text-2)] hover:bg-[var(--canvas-sub)]"
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
                className="p-1 text-[var(--text-3)] hover:text-[var(--text-2)]"
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
                  selectedCatId === cat.id ? "bg-[var(--accent-muted)] text-[var(--accent-text)] font-semibold" : "text-[var(--text-2)] hover:bg-[var(--canvas-sub)]"
                }`}
              >
                {cat.icon ? <span className="text-sm leading-none">{cat.icon}</span> : <Tag className="h-3.5 w-3.5 text-[var(--text-3)]" />}
                <span className="flex-1 text-left truncate">{cat.name}</span>
                <span className="text-[10px] text-[var(--text-3)] font-normal">{totalItems}</span>
              </button>
              <button
                onClick={() => onAddSub(cat.id)}
                className="p-1 text-[var(--text-3)] hover:text-[var(--accent)] transition-colors"
                title="Add subcategory"
              >
                <PlusCircle className="h-3 w-3" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(cat.id); }}
                className="p-1 text-[var(--text-3)] hover:text-red-500 transition-colors"
                title="Delete category"
              >
                <Trash2 className="h-3 w-3" />
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
                    <div key={sub.id} className="flex items-center group">
                    <button
                      onClick={() => onSelect(sub.id)}
                      className={`flex flex-1 items-center gap-2 rounded-md px-2.5 py-1.5 text-[12px] transition-all ${
                        selectedCatId === sub.id ? "bg-[var(--accent-muted)] text-[var(--accent-text)] font-semibold" : "text-[var(--text-2)] hover:bg-[var(--canvas-sub)]"
                      }`}
                    >
                      <span className="flex-1 text-left truncate">{sub.name}</span>
                      <span className="text-[10px] text-[var(--text-3)]">{sub._count.items}</span>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(sub.id); }}
                      className="p-1 text-[var(--text-3)] hover:text-red-500 transition-colors"
                      title="Delete subcategory"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                    </div>
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
      variants={{
        hidden: { opacity: 0, scale: 0.95, y: 15 },
        visible: { opacity: 1, scale: 1, y: 0 },
      }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={`group relative rounded-2xl bg-[var(--canvas)]/90 backdrop-blur-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border overflow-hidden transition-all hover:shadow-[0_8px_30px_-4px_rgba(245,158,11,0.15)] ${
        item.isAvailable ? "border-[var(--accent-border)]/60" : "border-[var(--border)] opacity-80"
      }`}
    >
      {/* Mobile: image-left / text-right  |  sm+: image-top / content-below */}
      <div className="flex sm:block">

        <div className="relative w-28 shrink-0 sm:w-full sm:h-36 h-auto overflow-hidden bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)]/20">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.name} className={`h-full w-full object-cover aspect-square sm:aspect-auto transition-transform duration-700 group-hover:scale-110 ${!item.isAvailable ? 'grayscale-[40%]' : ''}`} loading="lazy" />
          ) : (
            <div className="h-full w-full flex items-center justify-center min-h-[7rem]">
              <UtensilsCrossed className="h-8 w-8 sm:h-10 sm:w-10 text-[var(--accent)]/50" />
            </div>
          )}

          {/* Veg indicator — always visible */}
          <div className="absolute top-2 right-2 z-10">
            <span className={`flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-md border-2 shadow-sm bg-[var(--canvas)]/90 ${
              item.isVeg ? "border-[var(--accent)]" : "border-red-500"
            }`}>
              <span className={`h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full ${item.isVeg ? "bg-[var(--accent)]" : "bg-red-500"}`} />
            </span>
          </div>

          {item.discount > 0 && (
            <div className="absolute top-2 left-2 z-10">
              <span className="rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] px-1.5 py-0.5 text-[9px] font-bold text-white shadow-md">
                {item.discountLabel || `${item.discount}% OFF`}
              </span>
            </div>
          )}

          {!item.isAvailable && (
            <div className="absolute inset-0 bg-red-950/30 backdrop-blur-[2px] flex items-center justify-center z-10">
              <span className="rounded-full bg-red-600 px-2 py-0.5 text-[9px] sm:text-[11px] font-bold uppercase text-white shadow-lg">Unavailable</span>
            </div>
          )}

          {/* Desktop-only hover quick actions */}
          <div className="hidden sm:flex absolute bottom-2.5 right-2.5 gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 translate-y-2 group-hover:translate-y-0">
            <button
              onClick={onToggle}
              className={`rounded-full p-2 shadow-lg backdrop-blur-md transition-all hover:scale-105 active:scale-95 ${
                item.isAvailable ? "bg-[var(--accent)]/90 text-white" : "bg-[var(--text-2)]/90 text-white"
              }`}
              title={item.isAvailable ? "Mark unavailable" : "Mark available"}
            >
              {item.isAvailable ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
            <button onClick={onEdit} className="rounded-full bg-[var(--canvas)]/95 backdrop-blur-md p-2 text-indigo-600 shadow-lg hover:bg-[var(--canvas)] transition-all hover:scale-105 active:scale-95">
              <Pencil className="h-4 w-4" />
            </button>
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="rounded-full bg-[var(--canvas)]/95 backdrop-blur-md p-2 text-[var(--text-2)] shadow-lg hover:bg-[var(--canvas)] transition-all hover:scale-105 active:scale-95"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-full mt-2 w-40 rounded-xl bg-[var(--canvas)]/95 backdrop-blur-xl shadow-2xl ring-1 ring-[var(--border)]/50 z-30 py-1.5 overflow-hidden origin-bottom-right">
                  <button
                    onClick={() => { onDuplicate(); setShowMenu(false); }}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2 text-[13px] font-semibold text-[var(--text-2)] hover:bg-[var(--accent-muted)] hover:text-[var(--accent-text)] transition-colors"
                  >
                    <Copy className="h-3.5 w-3.5" /> Duplicate
                  </button>
                  <div className="h-px bg-[var(--surface)] my-1 mx-2"></div>
                  <button
                    onClick={() => { onDelete(); setShowMenu(false); }}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2 text-[13px] font-semibold text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete Item
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

      <div className="flex-1 min-w-0 p-3 sm:p-3.5 bg-[var(--canvas)]/40 flex flex-col justify-between sm:block">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h4 className="text-[14px] font-extrabold text-[var(--text-1)] leading-tight line-clamp-1">{item.name}</h4>
          <div className="flex items-baseline gap-1.5 shrink-0 bg-[var(--accent-muted)] px-2 py-0.5 rounded-md border border-[var(--accent-border)]/50">
            {item.discount > 0 && (
              <span className="text-[11px] font-medium text-[var(--text-3)] line-through">{formatPrice(item.price, currency)}</span>
            )}
            <span className="text-[14px] font-extrabold text-[var(--accent-text)]">{formatPrice(discountedPrice, currency)}</span>
          </div>
        </div>

        {item.description && (
          <p className="text-[12px] text-[var(--text-2)] line-clamp-2 mb-3 leading-relaxed">{item.description}</p>
        )}

        <div className="h-px w-full bg-gradient-to-r from-transparent via-gray-100 to-transparent mb-3" />

        <div className="flex items-center gap-2 flex-wrap">
          <span className="rounded-md bg-indigo-50/60 border border-indigo-100/50 px-2 py-1 text-[10px] font-bold text-indigo-600">
            {item.category.name}
          </span>

          {item.prepTime && (
            <span className="flex items-center gap-0.5 text-[10px] text-[var(--text-3)]">
              <Clock className="h-2.5 w-2.5" /> {item.prepTime}
            </span>
          )}

          {item.rating > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-[var(--accent)] font-semibold">
              <Star className="h-2.5 w-2.5 fill-[var(--accent)]" /> {item.rating.toFixed(1)}
            </span>
          )}

          {item.spiceLevel > 0 && (
            <span className="text-[10px]">
              {"🌶️".repeat(item.spiceLevel)}
            </span>
          )}

          {item.calories && (
            <span className="text-[10px] text-[var(--text-3)]">{item.calories} kcal</span>
          )}

          {item.sizes.length > 0 && (
            <span className="text-[10px] text-[var(--text-3)]">{item.sizes.length} sizes</span>
          )}

          {/* Add-ons count */}
          {item.addOns.length > 0 && (
            <span className="text-[10px] text-[var(--text-3)]">{item.addOns.length} add-ons</span>
          )}
        </div>

        {item.tags.length > 0 && (
          <div className="flex gap-1 mt-2 flex-wrap">
            {item.tags.slice(0, 3).map((t) => (
              <span key={t} className="rounded bg-[var(--accent-muted)] px-1.5 py-0.5 text-[9px] font-medium text-[var(--accent-text)]">
                {t}
              </span>
            ))}
            {item.tags.length > 3 && (
              <span className="text-[9px] text-[var(--text-3)]">+{item.tags.length - 3}</span>
            )}
          </div>
        )}

        {item.allergens.length > 0 && (
          <div className="flex items-center gap-1 mt-1.5">
            <ShieldAlert className="h-2.5 w-2.5 text-[var(--accent)]" />
            <span className="text-[9px] text-[var(--accent)]">{item.allergens.join(", ")}</span>
          </div>
        )}

        {/* Mobile action buttons — touch-friendly, hidden on sm+ (desktop uses hover) */}
        <div className="flex sm:hidden items-center justify-end gap-2 mt-3 pt-2.5 border-t border-[var(--border-soft)]">
          <button
            onClick={onToggle}
            className={`rounded-full p-2 shadow-sm transition-all active:scale-95 ${
              item.isAvailable ? "bg-[var(--accent-muted)] text-[var(--accent-text)]" : "bg-[var(--surface)] text-[var(--text-2)]"
            }`}
            title={item.isAvailable ? "Mark unavailable" : "Mark available"}
          >
            {item.isAvailable ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
          <button
            onClick={onEdit}
            className="rounded-full bg-indigo-50 p-2 text-indigo-600 shadow-sm transition-all active:scale-95"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="rounded-full bg-red-50 p-2 text-red-600 shadow-sm transition-all active:scale-95"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      </div>{/* end flex sm:block */}
    </motion.div>
  );
}

function CategorySelector({
  categories,
  value,
  onChange,
}: {
  categories: any[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const topCats = useMemo(() => categories.filter((c) => !c.parentId), [categories]);
  
  const filteredCats = useMemo(() => {
    const s = search.toLowerCase();
    if (!s) return topCats;
    return topCats.filter(c => {
      const matchParent = c.name.toLowerCase().includes(s);
      const subs = categories.filter(sub => sub.parentId === c.id);
      const matchSub = subs.some(sub => sub.name.toLowerCase().includes(s));
      return matchParent || matchSub;
    });
  }, [search, topCats, categories]);

  const toggleExpand = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setExpandedCats(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const selectedCat = categories.find(c => c.id === value);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--canvas)] px-3 py-2.5 text-sm font-medium focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent-border)] ${
           value ? "text-[var(--text-1)]" : "text-[var(--text-3)]"
        }`}
      >
        <span className="truncate">{selectedCat ? selectedCat.name : "Select category / subcategory *"}</span>
        <ChevronDown className={`h-4 w-4 text-[var(--text-3)] transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] shadow-xl overflow-hidden text-left"
          >
            <div className="p-2 border-b border-[var(--border-soft)]">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-3)]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search categories..."
                  className="w-full rounded-md border border-[var(--border-soft)] bg-[var(--canvas-sub)] py-1.5 pl-8 pr-3 text-xs focus:bg-[var(--canvas)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent-border)] outline-none transition-all"
                />
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto p-1.5 custom-scrollbar">
              {filteredCats.length === 0 ? (
                <div className="p-3 text-center text-xs text-[var(--text-2)]">No categories found</div>
              ) : (
                filteredCats.map(cat => {
                  const subs = categories.filter(c => c.parentId === cat.id);
                  const s = search.toLowerCase();
                  const filteredSubs = s ? subs.filter(sub => sub.name.toLowerCase().includes(s) || cat.name.toLowerCase().includes(s)) : subs;
                  const isExpanded = expandedCats[cat.id] !== false || (s && filteredSubs.length > 0); 
                  
                  return (
                    <div key={cat.id} className="mb-0.5">
                      <div
                        className={`group flex items-center justify-between rounded-md px-2.5 py-2 text-[13px] transition-colors cursor-pointer ${value === cat.id ? "bg-[var(--accent-muted)] text-[var(--accent-text)] font-bold" : "text-[var(--text-2)] font-semibold hover:bg-[var(--canvas-sub)]"}`}
                        onClick={() => { onChange(cat.id); setIsOpen(false); }}
                      >
                        <span className="truncate">{cat.name}</span>
                        {subs.length > 0 && (
                          <button
                            type="button"
                            onClick={(e) => toggleExpand(e, cat.id)}
                            className="p-1 rounded-md hover:bg-[var(--surface-alt)] text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors"
                          >
                            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                          </button>
                        )}
                      </div>
                      
                      <AnimatePresence>
                        {isExpanded && filteredSubs.length > 0 && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="ml-3 mt-1 mb-1 space-y-0.5 border-l-2 border-[var(--border-soft)] pl-2">
                              {filteredSubs.map(sub => (
                                <div
                                  key={sub.id}
                                  className={`flex items-center rounded-md px-2.5 py-1.5 text-xs transition-colors cursor-pointer ${value === sub.id ? "bg-[var(--accent-muted)] text-[var(--accent-text)] font-bold" : "text-[var(--text-2)] hover:bg-[var(--canvas-sub)] font-medium"}`}
                                  onClick={() => { onChange(sub.id); setIsOpen(false); }}
                                >
                                  <span className="truncate">{sub.name}</span>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
      className="rounded-xl border border-[var(--border)] bg-[var(--canvas)] shadow-lg overflow-hidden w-full max-w-full"
    >
      <div className="flex items-center justify-between border-b border-[var(--border-soft)] px-5 py-3">
        <span className="text-sm font-bold text-[var(--text-1)]">{submitLabel === "Add to menu" ? "New Dish" : "Edit Dish"}</span>
        <button onClick={onCancel} className="rounded-md p-1 text-[var(--text-3)] hover:text-[var(--text-2)] hover:bg-[var(--surface)]">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex gap-1 px-4 pt-3 overflow-x-auto scrollbar-hide">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`flex items-center gap-1.5 shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all ${
              activeSection === s.id
                ? "bg-[var(--accent-muted)] text-[var(--accent-text)]"
                : "text-[var(--text-3)] hover:bg-[var(--canvas-sub)] hover:text-[var(--text-2)]"
            }`}
          >
            <s.icon className="h-3 w-3" />
            {s.label}
          </button>
        ))}
      </div>

      <div className="p-4 sm:p-5 space-y-5 overflow-x-hidden">
        {/* ── BASIC INFO ──────────────────────────────────────── */}
        {activeSection === "basic" && (
          <div className="space-y-4">
            {/* Image + Name + Price */}
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <button
                type="button"
                onClick={() => setShowImagePicker(true)}
                className="shrink-0 group relative h-24 w-full sm:w-24 rounded-xl overflow-hidden bg-[var(--canvas-sub)] border border-[var(--border)] hover:border-[var(--accent-border)] transition-colors"
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
                    <Camera className="h-5 w-5 text-[var(--text-3)]" />
                    <span className="text-[9px] font-medium text-[var(--text-3)]">Add Photo</span>
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
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--canvas)] px-3 py-2.5 text-sm font-semibold text-[var(--text-1)] placeholder-gray-300 focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent-border)]"
                />
                <div className="grid grid-cols-2 gap-3">
                  <PriceInput value={form.price} onChange={(v) => update({ price: v })} placeholder="Price *" currencySymbol={getCurrencySymbol(currency)} />
                  <input
                    value={form.prepTime}
                    onChange={(e) => update({ prepTime: e.target.value })}
                    placeholder="e.g. 15-20 min"
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--canvas)] px-3 py-2 text-sm text-[var(--text-2)] placeholder-gray-300 focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent-border)]"
                  />
                </div>
              </div>
            </div>

            <div className="relative z-10">
              <CategorySelector
                categories={categories}
                value={form.categoryId}
                onChange={(id) => update({ categoryId: id })}
              />
            </div>

            <textarea
              value={form.description}
              onChange={(e) => update({ description: e.target.value })}
              placeholder="Short description, helps customers decide"
              rows={2}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--canvas)] px-3 py-2.5 text-sm text-[var(--text-2)] placeholder-gray-300 focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent-border)] resize-none"
            />
          </div>
        )}

        {/* ── DIETARY & SPICE ─────────────────────────────────── */}
        {activeSection === "dietary" && (
          <div className="space-y-5">
            {/* Veg / Non-Veg / Egg / Onion-Garlic */}
            <div>
              <p className="text-[12px] font-semibold text-[var(--text-2)] mb-2.5">Dietary Classification</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => update({ isVeg: true })}
                  className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-[12px] font-semibold border transition-all ${
                    form.isVeg ? "border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--accent-text)] ring-1 ring-[var(--accent-border)]" : "border-[var(--border)] text-[var(--text-3)]"
                  }`}
                >
                  <Leaf className="h-3.5 w-3.5" /> Vegetarian
                </button>
                <button
                  type="button"
                  onClick={() => update({ isVeg: false })}
                  className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-[12px] font-semibold border transition-all ${
                    !form.isVeg ? "border-red-300 bg-red-50 text-red-600 ring-1 ring-red-200" : "border-[var(--border)] text-[var(--text-3)]"
                  }`}
                >
                  <Flame className="h-3.5 w-3.5" /> Non-Vegetarian
                </button>
                <button
                  type="button"
                  onClick={() => update({ hasEgg: !form.hasEgg })}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-semibold border transition-all ${
                    form.hasEgg ? "border-yellow-300 bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200" : "border-[var(--border)] text-[var(--text-3)]"
                  }`}
                >
                  🥚 Contains Egg
                </button>
                <button
                  type="button"
                  onClick={() => update({ hasOnionGarlic: !form.hasOnionGarlic })}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-semibold border transition-all ${
                    !form.hasOnionGarlic ? "border-purple-300 bg-purple-50 text-purple-700 ring-1 ring-purple-200" : "border-[var(--border)] text-[var(--text-3)]"
                  }`}
                >
                  🧄 No Onion/Garlic
                </button>
              </div>
            </div>

            <div>
              <p className="text-[12px] font-semibold text-[var(--text-2)] mb-2.5">Spice Level</p>
              <SpiceLevelPicker level={form.spiceLevel} onChange={(l) => update({ spiceLevel: l })} />
            </div>

            <div>
              <p className="text-[12px] font-semibold text-[var(--text-2)] mb-2.5">Calories (optional)</p>
              <div className="relative w-40">
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.calories}
                  onChange={(e) => update({ calories: e.target.value.replace(/\D/g, "") })}
                  placeholder="e.g. 450"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--canvas)] px-3 py-2 pr-12 text-sm text-[var(--text-2)] placeholder-gray-300 focus:outline-none focus:border-[var(--accent)]"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[var(--text-3)]">kcal</span>
              </div>
            </div>

            <div>
              <p className="text-[12px] font-semibold text-[var(--text-2)] mb-2.5">Allergens</p>
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
                        ? "border-[var(--accent-border)] bg-[var(--accent)] text-[var(--accent)]"
                        : "border-[var(--border)] text-[var(--text-3)] hover:border-[var(--border)]"
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
              <p className="text-[12px] font-semibold text-[var(--text-2)] mb-2.5">Discount</p>
              <div className="flex gap-3">
                <div className="relative w-28">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.discount}
                    onChange={(e) => update({ discount: e.target.value.replace(/\D/g, "") })}
                    placeholder="0"
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--canvas)] px-3 py-2 pr-8 text-sm font-semibold text-[var(--text-1)] placeholder-gray-300 focus:outline-none focus:border-[var(--accent)]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[var(--text-3)]">%</span>
                </div>
                <input
                  value={form.discountLabel}
                  onChange={(e) => update({ discountLabel: e.target.value })}
                  placeholder={`Label e.g. 'FLAT ${getCurrencySymbol(currency)}50 OFF'`}
                  className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--canvas)] px-3 py-2 text-sm text-[var(--text-2)] placeholder-gray-300 focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
              {Number(form.discount) > 0 && Number(form.price) > 0 && (
                <p className="text-[11px] text-[var(--accent-text)] mt-1.5">
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
                  className={`relative h-5 w-9 rounded-full transition-colors ${form.isFeatured ? "bg-[var(--accent)]" : "bg-[var(--surface-alt)]"}`}
                >
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-[var(--canvas)] shadow transition-transform ${form.isFeatured ? "translate-x-4" : "translate-x-0.5"}`} />
                </button>
                <div>
                  <p className="text-[12px] font-semibold text-[var(--text-2)]">Featured Item</p>
                  <p className="text-[10px] text-[var(--text-3)]">Highlight this dish on your menu page</p>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* ── SIZES & ADD-ONS ─────────────────────────────────── */}
        {activeSection === "sizes" && (
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-[12px] font-semibold text-[var(--text-2)]">Size Variants</p>
                <button
                  type="button"
                  onClick={() => update({ sizes: [...form.sizes, { label: "", grams: "", priceAdd: "" }] })}
                  className="flex items-center gap-1 text-[11px] font-semibold text-[var(--accent-text)] hover:text-[var(--accent-text)]"
                >
                  <Plus className="h-3 w-3" /> Add Size
                </button>
              </div>
              {form.sizes.length === 0 ? (
                <p className="text-[11px] text-[var(--text-3)] italic">No sizes: item has a single price</p>
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
                        className="flex-1 rounded-lg border border-[var(--border)] px-3 py-1.5 text-[12px] focus:outline-none focus:border-[var(--accent)]"
                      />
                      <input
                        value={size.grams}
                        onChange={(e) => {
                          const next = [...form.sizes];
                          next[i] = { ...next[i], grams: e.target.value };
                          update({ sizes: next });
                        }}
                        placeholder="e.g. 250g"
                        className="w-20 rounded-lg border border-[var(--border)] px-3 py-1.5 text-[12px] focus:outline-none focus:border-[var(--accent)]"
                      />
                      <div className="relative w-24">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--text-3)]">+{getCurrencySymbol(currency)}</span>
                        <input
                          value={size.priceAdd}
                          onChange={(e) => {
                            const next = [...form.sizes];
                            next[i] = { ...next[i], priceAdd: e.target.value.replace(/[^0-9.]/g, "") };
                            update({ sizes: next });
                          }}
                          placeholder="0"
                          className="w-full rounded-lg border border-[var(--border)] py-1.5 pl-9 pr-2 text-[12px] focus:outline-none focus:border-[var(--accent)]"
                        />
                      </div>
                      <button
                        onClick={() => update({ sizes: form.sizes.filter((_, j) => j !== i) })}
                        className="p-1 text-[var(--text-3)] hover:text-red-500"
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
                <p className="text-[12px] font-semibold text-[var(--text-2)]">Add-ons</p>
                <button
                  type="button"
                  onClick={() => update({ addOns: [...form.addOns, { name: "", price: "" }] })}
                  className="flex items-center gap-1 text-[11px] font-semibold text-[var(--accent-text)] hover:text-[var(--accent-text)]"
                >
                  <Plus className="h-3 w-3" /> Add-on
                </button>
              </div>
              {form.addOns.length === 0 ? (
                <p className="text-[11px] text-[var(--text-3)] italic">No add-ons configured</p>
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
                        className="flex-1 rounded-lg border border-[var(--border)] px-3 py-1.5 text-[12px] focus:outline-none focus:border-[var(--accent)]"
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
                        className="p-1 text-[var(--text-3)] hover:text-red-500"
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
            <div>
              <p className="text-[12px] font-semibold text-[var(--text-2)] mb-2.5">Badge</p>
              <div className="flex flex-wrap gap-2">
                {BADGE_OPTIONS.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => update({ badge: form.badge === b ? "" : b })}
                    className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold border transition-all ${
                      form.badge === b
                        ? "border-[var(--accent-border)] bg-[var(--accent-muted)] text-[var(--accent-text)] ring-1 ring-[var(--accent-border)]"
                        : "border-[var(--border)] text-[var(--text-3)] hover:border-[var(--border)]"
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[12px] font-semibold text-[var(--text-2)] mb-2.5">Tags</p>
              <div className="flex gap-2 mb-2">
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                  placeholder="Type a tag and press Enter"
                  className="flex-1 rounded-lg border border-[var(--border)] px-3 py-1.5 text-[12px] text-[var(--text-2)] placeholder-gray-300 focus:outline-none focus:border-[var(--accent)]"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="rounded-lg bg-[var(--surface)] px-3 py-1.5 text-[11px] font-semibold text-[var(--text-2)] hover:bg-[var(--surface-alt)]"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {form.tags.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 rounded-md bg-[var(--surface)] px-2 py-1 text-[11px] font-medium text-[var(--text-2)]">
                    {t}
                    <button onClick={() => update({ tags: form.tags.filter((x) => x !== t) })} className="text-[var(--text-3)] hover:text-red-500">
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 pt-2 border-t border-[var(--border-soft)]">
          <button
            onClick={handleSubmit}
            className="rounded-lg bg-[var(--accent)] px-6 py-2.5 text-[13px] font-bold text-white hover:bg-[var(--accent-hover)] active:scale-[0.98] transition-all"
          >
            {submitLabel}
          </button>
          <button onClick={onCancel} className="text-[13px] font-medium text-[var(--text-3)] hover:text-[var(--text-2)]">
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
      <div className="flex items-center gap-2 rounded-lg border border-[var(--accent-border)] bg-[var(--accent-muted)] p-3">
        <FolderPlus className="h-4 w-4 text-[var(--accent)] shrink-0" />
        <span className="text-[12px] text-[var(--text-2)] shrink-0">Sub of <strong>{parentName}</strong>:</span>
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim()) onCreate(name.trim());
            if (e.key === "Escape") onCancel();
          }}
          placeholder="e.g. Chicken, Steam, Jhol…"
          className="flex-1 min-w-0 bg-transparent text-sm font-medium text-[var(--text-1)] outline-none placeholder-gray-400"
        />
        <button
          onClick={() => name.trim() && onCreate(name.trim())}
          disabled={!name.trim()}
          className="rounded-md bg-[var(--accent)] px-3 py-1 text-[11px] font-bold text-white hover:bg-[var(--accent-hover)] disabled:opacity-40 transition-all"
        >
          Add
        </button>
        <button onClick={onCancel} className="p-1 text-[var(--text-3)] hover:text-[var(--text-2)]">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  );
}


export default function MenuManagementTab({
  overrideRestaurantId,
  overrideCurrency,
}: {
  overrideRestaurantId?: string;
  overrideCurrency?: string;
} = {}) {
  const ctx = useOptionalRestaurant();
  const restaurantId = overrideRestaurantId || ctx?.selectedRestaurant?.id;
  const cur = overrideCurrency || ctx?.selectedRestaurant?.currency || "NPR";
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
  const [deleteCatConfirm, setDeleteCatConfirm] = useState<{
    categoryId: string;
    name: string;
    items: number;
    subcategories: number;
  } | null>(null);
  const newCatInputRef = useRef<HTMLInputElement>(null);

  const [isOpen, setIsOpen] = useState(true);
  const [deliveryEnabled, setDeliveryEnabled] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);

  useEffect(() => {
    if (!restaurantId) return;
    apiFetch<{ isOpen: boolean; deliveryEnabled: boolean }>(`/api/restaurants/${restaurantId}/status`)
      .then((s) => { setIsOpen(s.isOpen); setDeliveryEnabled(s.deliveryEnabled); })
      .catch(() => {});
  }, [restaurantId]);

  const handleStatusToggle = async (field: "isOpen" | "deliveryEnabled", value: boolean) => {
    if (!restaurantId || statusSaving) return;
    const prev = field === "isOpen" ? isOpen : deliveryEnabled;
    if (field === "isOpen") setIsOpen(value); else setDeliveryEnabled(value);
    setStatusSaving(true);
    try {
      await apiFetch(`/api/restaurants/${restaurantId}/status`, { method: "PATCH", body: { [field]: value } });
    } catch {
      if (field === "isOpen") setIsOpen(prev); else setDeliveryEnabled(prev);
      showToast("Failed to update status");
    } finally {
      setStatusSaving(false);
    }
  };

  // `silent` reconciles state in the background without blanking the grid with
  // a loading skeleton. Mutations update local state optimistically (instant),
  // then call fetchData(true) to sync canonical data (real IDs, item counts).
  const fetchData = useCallback(async (silent = false) => {
    if (!restaurantId) {
      // No restaurant resolved yet — don't sit in a blank loading state.
      if (!silent) setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    try {
      const [menuRes, catRes] = await Promise.all([
        apiFetch<MenuItem[]>(`/api/restaurants/${restaurantId}/menu`, { cacheTtl: 0 }),
        apiFetch<MenuCategory[]>(`/api/restaurants/${restaurantId}/categories`, { cacheTtl: 0 }),
      ]);
      setItems(Array.isArray(menuRes) ? menuRes : []);
      setCategories(Array.isArray(catRes) ? catRes : []);
    } catch (err) {
      if (!silent) showToast(err instanceof Error ? err.message : "Failed to load menu data");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [restaurantId, showToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (showNewCat && newCatInputRef.current) newCatInputRef.current.focus();
  }, [showNewCat]);

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
    if (!restaurantId) {
      showToast("No restaurant selected — please refresh");
      return;
    }
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
      await fetchData(true);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to create category");
    } finally {
      setCreatingCat(false);
    }
  };

  const seedDefaults = async () => {
    if (!restaurantId) return;
    setSeedingCats(true);
    try {
      const result = await apiFetch<{ message: string; categories: { name: string }[] }>(
        `/api/restaurants/${restaurantId}/categories/seed`,
        { method: "POST" }
      );
      showToast(result.message || `${result.categories.length} categories added!`);
      await fetchData(true);
    } catch {
      showToast("Failed to seed categories");
    } finally {
      setSeedingCats(false);
    }
  };

  const initDeleteCategory = async (categoryId: string) => {
    if (!restaurantId) return;
    try {
      const res = await apiFetch<{ willDelete: { items: number; subcategories: number }; name: string; categoryId: string }>(
        `/api/restaurants/${restaurantId}/categories?categoryId=${categoryId}`,
        { method: "DELETE", body: { categoryId } }
      );
      setDeleteCatConfirm({ categoryId, name: res.name, items: res.willDelete.items, subcategories: res.willDelete.subcategories });
    } catch {
      showToast("Failed to check category");
    }
  };

  const confirmDeleteCategory = async () => {
    if (!restaurantId || !deleteCatConfirm) return;
    try {
      await apiFetch(
        `/api/restaurants/${restaurantId}/categories?confirm=true`,
        { method: "DELETE", body: { categoryId: deleteCatConfirm.categoryId } }
      );
      showToast(`"${deleteCatConfirm.name}" deleted`);
      if (selectedCatId === deleteCatConfirm.categoryId) setSelectedCatId("All");
      setDeleteCatConfirm(null);
      await fetchData(true);
    } catch {
      showToast("Failed to delete category");
    }
  };

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
    // Optimistic — reflect the change instantly, reconcile in the background.
    const snapshot = items;
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    try {
      await apiFetch(`/api/restaurants/${restaurantId}/menu/${id}`, { method: "PATCH", body: patch });
      fetchData(true);
    } catch {
      setItems(snapshot);
      showToast("Failed to update item");
    }
  };

  const deleteItem = async (id: string) => {
    if (!restaurantId) return;
    // Optimistic removal — no full-grid reload.
    const snapshot = items;
    setItems((prev) => prev.filter((i) => i.id !== id));
    showToast("Item deleted");
    try {
      await apiFetch(`/api/restaurants/${restaurantId}/menu/${id}`, { method: "DELETE" });
      fetchData(true);
    } catch {
      setItems(snapshot);
      showToast("Failed to delete item");
    }
  };

  const toggleItem = async (id: string, currentAvailable: boolean) => {
    await updateItem(id, { isAvailable: !currentAvailable });
  };

  const addItem = async (formData: DishFormData) => {
    if (!restaurantId) return;

    // Optimistic insert — render the new dish immediately, then reconcile with
    // the server's canonical row (real id, defaults) in the background.
    const cat = flatCategories.find((c) => c.id === formData.categoryId);
    const tempId = `temp-${Date.now()}`;
    const discountNum = Number(formData.discount) || 0;
    const optimistic: MenuItem = {
      id: tempId,
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      price: Number(formData.price),
      imageUrl: formData.imageUrl || null,
      rating: 0,
      prepTime: formData.prepTime || "15-20 min",
      isVeg: formData.isVeg,
      hasEgg: formData.hasEgg,
      hasOnionGarlic: formData.hasOnionGarlic,
      isAvailable: true,
      badge: formData.badge || null,
      tags: formData.tags,
      sortOrder: items.length,
      categoryId: formData.categoryId,
      category: cat
        ? { id: cat.id, name: cat.name, slug: cat.slug, parentId: cat.parentId }
        : { id: formData.categoryId, name: "", slug: "", parentId: null },
      sizes: formData.sizes
        .filter((s) => s.label.trim())
        .map((s, i) => ({ id: `${tempId}-s${i}`, label: s.label, grams: s.grams, priceAdd: Number(s.priceAdd) || 0 })),
      addOns: formData.addOns
        .filter((a) => a.name.trim())
        .map((a, i) => ({ id: `${tempId}-a${i}`, name: a.name, price: Number(a.price) || 0 })),
      discount: discountNum,
      discountLabel: formData.discountLabel || null,
      isFeatured: formData.isFeatured,
      spiceLevel: formData.spiceLevel,
      calories: formData.calories ? Number(formData.calories) : null,
      allergens: formData.allergens,
    };
    setItems((prev) => [...prev, optimistic]);
    setShowAddForm(false);
    showToast("New dish added!");

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
      // Reconcile silently — swaps the temp row for the canonical one, fixes counts.
      fetchData(true);
    } catch (err) {
      setItems((prev) => prev.filter((i) => i.id !== tempId));
      setShowAddForm(true);
      showToast(err instanceof Error ? err.message : "Failed to add dish");
    }
  };

  const editItem = async (formData: DishFormData) => {
    if (!restaurantId || !editingItem) return;

    // Optimistic edit — apply the change to the visible card instantly.
    const targetId = editingItem.id;
    const snapshot = items;
    const cat = flatCategories.find((c) => c.id === formData.categoryId);
    setItems((prev) =>
      prev.map((i) =>
        i.id === targetId
          ? {
              ...i,
              name: formData.name.trim(),
              description: formData.description.trim() || null,
              price: Number(formData.price),
              categoryId: formData.categoryId,
              category: cat
                ? { id: cat.id, name: cat.name, slug: cat.slug, parentId: cat.parentId }
                : i.category,
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
              sizes: formData.sizes
                .filter((s) => s.label.trim())
                .map((s, idx) => ({ id: `${targetId}-s${idx}`, label: s.label, grams: s.grams, priceAdd: Number(s.priceAdd) || 0 })),
              addOns: formData.addOns
                .filter((a) => a.name.trim())
                .map((a, idx) => ({ id: `${targetId}-a${idx}`, name: a.name, price: Number(a.price) || 0 })),
            }
          : i,
      ),
    );
    setEditingItem(null);
    showToast("Dish updated!");

    try {
      await apiFetch(`/api/restaurants/${restaurantId}/menu/${targetId}`, {
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
      fetchData(true);
    } catch {
      setItems(snapshot);
      showToast("Failed to update dish");
    }
  };

  const duplicateItem = async (item: MenuItem) => {
    if (!restaurantId) return;
    // Optimistic clone — show the copy instantly, reconcile for the real id.
    const tempId = `temp-${Date.now()}`;
    setItems((prev) => [...prev, { ...item, id: tempId, name: `${item.name} (Copy)` }]);
    showToast("Item duplicated!");
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
      fetchData(true);
    } catch {
      setItems((prev) => prev.filter((i) => i.id !== tempId));
      showToast("Failed to duplicate item");
    }
  };

  const addSubParent = addSubParentId ? flatCategories.find((c) => c.id === addSubParentId) : null;

  if (loading && items.length === 0) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-2">
            <SkeletonLine width="w-48" height="h-6" />
            <SkeletonLine width="w-64" height="h-3" />
          </div>
          <SkeletonLine width="w-28" height="h-9" className="rounded-xl" />
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <SkeletonLine width="w-full" height="h-16" className="rounded-2xl" />
          <SkeletonLine width="w-full" height="h-16" className="rounded-2xl" />
        </div>
        <SkeletonStatGrid count={6} />
        <SkeletonGrid rows={2} cols={4} cardClass="h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
        <div>
          <h2 className="text-xl font-extrabold text-[var(--text-1)] tracking-tight">Menu Management</h2>
          <p className="text-sm text-[var(--text-2)] mt-1 font-medium">
            Manage your dishes, categories, pricing, and more
          </p>
        </div>
        <div className="flex gap-2.5">
          {!showAddForm && !editingItem && (
            <>
              <button
                onClick={() => setShowNewCat(true)}
                className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--canvas)] shadow-sm px-4 py-2 text-[13px] font-bold text-[var(--text-2)] hover:bg-[var(--canvas-sub)] hover:text-[var(--accent-text)] transition-all active:scale-[0.97]"
              >
                <FolderPlus className="h-4 w-4" />
                Category
              </button>
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] shadow-[0_4px_14px_0_rgba(245,158,11,0.39)] px-5 py-2 text-[13px] font-bold text-white hover:shadow-[0_6px_20px_rgba(245,158,11,0.23)] hover:-translate-y-0.5 active:scale-[0.97] transition-all"
              >
                <Plus className="h-4 w-4" strokeWidth={2.5} />
                Add Dish
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => handleStatusToggle("isOpen", !isOpen)}
          disabled={statusSaving}
          className={`flex flex-1 items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition-all ${
            isOpen
              ? "border-[var(--accent-border)] bg-[var(--accent-muted)] hover:bg-[var(--accent-muted)]"
              : "border-red-200 bg-red-50 hover:bg-red-100"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${isOpen ? "bg-[var(--accent-muted)]" : "bg-red-100"}`}>
              {isOpen ? <Eye className="h-4 w-4 text-[var(--accent-text)]" /> : <EyeOff className="h-4 w-4 text-red-500" />}
            </div>
            <div className="text-left">
              <p className={`text-xs font-bold ${isOpen ? "text-[var(--text-1)]" : "text-red-700"}`}>
                {isOpen ? "Restaurant Visible" : "Restaurant Hidden"}
              </p>
              <p className={`text-[11px] ${isOpen ? "text-[var(--accent-text)]" : "text-red-500"}`}>
                {isOpen ? "Showing on landing page" : "Hidden from landing page"}
              </p>
            </div>
          </div>
          <div className={`relative h-6 w-11 rounded-full transition-colors ${isOpen ? "bg-[var(--accent)]" : "bg-[var(--border)]"}`}>
            <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-[var(--canvas)] shadow transition-transform ${isOpen ? "translate-x-5" : "translate-x-0.5"}`} />
          </div>
        </button>

        <button
          onClick={() => handleStatusToggle("deliveryEnabled", !deliveryEnabled)}
          disabled={statusSaving}
          className={`flex flex-1 items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition-all ${
            deliveryEnabled
              ? "border-blue-200 bg-blue-50 hover:bg-blue-100"
              : "border-[var(--border)] bg-[var(--canvas-sub)] hover:bg-[var(--surface)]"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${deliveryEnabled ? "bg-blue-100" : "bg-[var(--surface)]"}`}>
              <Package className={`h-4 w-4 ${deliveryEnabled ? "text-blue-600" : "text-[var(--text-3)]"}`} />
            </div>
            <div className="text-left">
              <p className={`text-xs font-bold ${deliveryEnabled ? "text-blue-800" : "text-[var(--text-2)]"}`}>
                {deliveryEnabled ? "Delivery Enabled" : "Delivery Disabled"}
              </p>
              <p className={`text-[11px] ${deliveryEnabled ? "text-blue-600" : "text-[var(--text-3)]"}`}>
                {deliveryEnabled ? "Customers can order delivery" : "No delivery available"}
              </p>
            </div>
          </div>
          <div className={`relative h-6 w-11 rounded-full transition-colors ${deliveryEnabled ? "bg-blue-500" : "bg-[var(--border)]"}`}>
            <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-[var(--canvas)] shadow transition-transform ${deliveryEnabled ? "translate-x-5" : "translate-x-0.5"}`} />
          </div>
        </button>
      </div>

      <MenuStats items={items} categories={flatCategories} currency={cur} />

      {!loading && categories.length === 0 && !showNewCat && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-center gap-4 rounded-xl border-2 border-dashed border-[var(--accent-border)] bg-[var(--accent-muted)] px-6 py-5"
        >
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-[var(--accent)]" />
            <div>
              <p className="text-sm font-semibold text-[var(--text-2)]">Quick Start</p>
              <p className="text-[12px] text-[var(--text-2)]">Add 10 popular food categories with subcategories in one click</p>
            </div>
          </div>
          <button
            onClick={seedDefaults}
            disabled={seedingCats}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-5 py-2.5 text-[13px] font-bold text-white hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-all shrink-0"
          >
            {seedingCats ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
            Generate Categories for My Place
          </button>
        </motion.div>
      )}

      <AnimatePresence>
        {showNewCat && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="flex items-center gap-2.5 rounded-lg border border-[var(--border)] bg-[var(--canvas)] p-3 shadow-sm">
              <Tag className="h-4 w-4 text-[var(--text-3)] shrink-0" />
              <input
                ref={newCatInputRef}
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") createCategory(); if (e.key === "Escape") { setShowNewCat(false); setNewCatName(""); } }}
                placeholder="New top-level category name"
                className="flex-1 min-w-0 text-sm font-medium text-[var(--text-1)] outline-none placeholder-gray-400"
              />
              <button
                onClick={() => createCategory()}
                disabled={!newCatName.trim() || creatingCat}
                className="flex items-center gap-1 rounded-md bg-[var(--accent)] px-3 py-1.5 text-[12px] font-bold text-white hover:bg-[var(--accent-hover)] disabled:opacity-40 transition-all"
              >
                {creatingCat ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                Create
              </button>
              <button onClick={() => { setShowNewCat(false); setNewCatName(""); }} className="p-1 text-[var(--text-3)] hover:text-[var(--text-2)]">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
        {flatCategories.length > 0 && (
          <div className="hidden lg:block w-52 shrink-0">
            <div className="sticky top-6 max-h-[calc(100vh-120px)] overflow-y-auto scrollbar-slim rounded-xl bg-[var(--canvas)] ring-1 ring-[var(--border)] p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-3)] mb-2 px-2">Categories</p>
              <CategoryTree
                categories={flatCategories}
                selectedCatId={selectedCatId}
                onSelect={setSelectedCatId}
                onAddSub={setAddSubParentId}
                onDelete={initDeleteCategory}
              />
            </div>
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Search & mobile category filter */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1 group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-3)] group-focus-within:text-[var(--accent)] transition-colors" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search dishes…"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)]/80 backdrop-blur-sm py-3 pl-10 pr-4 text-sm font-semibold text-[var(--text-1)] placeholder-gray-400 focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 shadow-sm transition-all"
              />
            </div>
            <div className="lg:hidden flex gap-2 overflow-x-auto scrollbar-hide items-center pb-1">
              {["All", ...flatCategories.filter((c) => !c.parentId).map((c) => c.name)].map((cat) => {
                const catObj = flatCategories.find((c) => c.name === cat && !c.parentId);
                const isActive = cat === "All" ? selectedCatId === "All" : selectedCatId === catObj?.id;
                return cat === "All" ? (
                  <button
                    key="All"
                    onClick={() => setSelectedCatId("All")}
                    className={`shrink-0 rounded-full px-4 py-2 text-[12px] font-bold tracking-wide transition-all shadow-sm border ${
                      isActive ? "bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] text-white border-transparent" : "bg-[var(--canvas)] text-[var(--text-2)] border-[var(--border)] hover:bg-[var(--canvas-sub)]"
                    }`}
                  >
                    All
                  </button>
                ) : (
                  <div key={cat} className="shrink-0 flex items-center gap-0.5">
                    <button
                      onClick={() => setSelectedCatId(catObj?.id || "All")}
                      className={`rounded-l-full pl-4 pr-2 py-2 text-[12px] font-bold tracking-wide transition-all shadow-sm border-y border-l ${
                        isActive ? "bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] text-white border-transparent" : "bg-[var(--canvas)] text-[var(--text-2)] border-[var(--border)] hover:bg-[var(--canvas-sub)]"
                      }`}
                    >
                      {cat}
                    </button>
                    {catObj && (
                      <button
                        onClick={() => initDeleteCategory(catObj.id)}
                        className={`rounded-r-full pl-1.5 pr-3 py-2 transition-all shadow-sm border-y border-r ${
                          isActive ? "bg-[var(--accent)] text-white border-transparent" : "bg-[var(--canvas)] text-[var(--text-3)] border-[var(--border)] hover:text-red-500 hover:bg-red-50 hover:border-red-200"
                        }`}
                        title={`Delete "${cat}"`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <motion.div 
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
            }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4"
          >
            <AnimatePresence mode="popLayout">
              {filtered.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="col-span-full flex flex-col items-center justify-center py-20 gap-3"
                >
                  <div className="h-14 w-14 rounded-full bg-[var(--canvas-sub)] flex items-center justify-center">
                    {items.length === 0 ? <UtensilsCrossed className="h-6 w-6 text-[var(--text-3)]" /> : <Search className="h-5 w-5 text-[var(--text-3)]" />}
                  </div>
                  <p className="text-sm text-[var(--text-3)]">
                    {items.length === 0 ? "Add your first dish to get started" : "No dishes match your search"}
                  </p>
                  {items.length === 0 && !showAddForm && (
                    <button
                      onClick={() => setShowAddForm(true)}
                      className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-bold text-white hover:bg-[var(--accent-hover)] mt-2"
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
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {deleteCatConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[var(--canvas)] rounded-2xl shadow-2xl p-6 max-w-sm w-full"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <Trash2 className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-bold text-[var(--text-1)]">Delete Category</h3>
                  <p className="text-sm text-[var(--text-2)]">This cannot be undone</p>
                </div>
              </div>
              <p className="text-sm text-[var(--text-2)] mb-1">
                Deleting <span className="font-semibold">&ldquo;{deleteCatConfirm.name}&rdquo;</span> will also delete:
              </p>
              <ul className="text-sm text-red-600 mb-5 list-disc pl-5 space-y-0.5">
                {deleteCatConfirm.items > 0 && <li>{deleteCatConfirm.items} menu item{deleteCatConfirm.items !== 1 ? "s" : ""}</li>}
                {deleteCatConfirm.subcategories > 0 && <li>{deleteCatConfirm.subcategories} subcategor{deleteCatConfirm.subcategories !== 1 ? "ies" : "y"}</li>}
                {deleteCatConfirm.items === 0 && deleteCatConfirm.subcategories === 0 && <li className="text-[var(--text-2)]">No items or subcategories</li>}
              </ul>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteCatConfirm(null)}
                  className="flex-1 rounded-xl border border-[var(--border)] py-2.5 text-sm font-semibold text-[var(--text-2)] hover:bg-[var(--canvas-sub)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteCategory}
                  className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-bold text-white hover:bg-red-600 transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
