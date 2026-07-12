"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  PlusCircle,
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
  ChevronLeft,
  Zap,
  Award,
  AlertTriangle,
  Percent,
  Eye,
  EyeOff,
  GripVertical,
  Copy,
  MoreVertical,
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
import { FOOD_DESCRIPTION_TEMPLATES } from "@/lib/food-descriptions";
import ImagePicker from "@/components/shared/ImagePicker";
import { AnchoredMenu } from "@/components/shared/AnchoredMenu";
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

interface CategoryTemplateData {
  name: string;
  icon: string;
  subs: string[];
  slug: string;
  added: boolean;
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
  const menuTriggerRef = useRef<HTMLButtonElement>(null);

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
            <div className="relative">
              <button
                ref={menuTriggerRef}
                onClick={() => setShowMenu(!showMenu)}
                className="rounded-full bg-[var(--canvas)]/95 backdrop-blur-md p-2 text-[var(--text-2)] shadow-lg hover:bg-[var(--canvas)] transition-all hover:scale-105 active:scale-95"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
              <AnchoredMenu
                anchorRef={menuTriggerRef}
                open={showMenu}
                onClose={() => setShowMenu(false)}
                align="right"
                width={160}
                className="rounded-xl bg-[var(--canvas)]/95 backdrop-blur-xl shadow-2xl ring-1 ring-[var(--border)]/50 py-1.5 overflow-hidden"
              >
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
              </AnchoredMenu>
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

  // Section-tab strip scroll affordances (chevrons appear when more tabs are
  // hidden off either edge).
  const tabsRef = useRef<HTMLDivElement>(null);
  const [tabScroll, setTabScroll] = useState({ left: false, right: false });
  const updateTabScroll = () => {
    const el = tabsRef.current;
    if (!el) return;
    setTabScroll({
      left: el.scrollLeft > 4,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
    });
  };
  const scrollTabs = (dir: number) => {
    tabsRef.current?.scrollBy({ left: dir * 140, behavior: "smooth" });
  };
  useEffect(() => {
    updateTabScroll();
    window.addEventListener("resize", updateTabScroll);
    return () => window.removeEventListener("resize", updateTabScroll);
  }, []);

  const [suggestions, setSuggestions] = useState<{ id: string; thumb: string; url: string }[]>([]);
  const [suggesting, setSuggesting] = useState(false);

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

  useEffect(() => {
    const q = form.name.trim();
    if (!q || q.length < 3) {
      setSuggestions([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setSuggesting(true);
      try {
        const res = await fetch(`/api/image-search?q=${encodeURIComponent(q + " food")}`, { signal: ctrl.signal });
        const data = await res.json();
        if (res.ok && data.images) {
          setSuggestions(data.images.slice(0, 6));
        }
      } catch (err) {
        // ignore
      } finally {
        setSuggesting(false);
      }
    }, 400);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [form.name]);

  const generateDescription = () => {
    let randomTemplate = FOOD_DESCRIPTION_TEMPLATES[Math.floor(Math.random() * FOOD_DESCRIPTION_TEMPLATES.length)];
    randomTemplate = randomTemplate.replace(/\[Name\]/g, form.name || "dish");
    
    let spiceStr = "mild";
    if (form.spiceLevel === 1) spiceStr = "mildly spiced";
    else if (form.spiceLevel === 2) spiceStr = "medium spiced";
    else if (form.spiceLevel === 3) spiceStr = "spicy";
    else if (form.spiceLevel === 4) spiceStr = "extra spicy";
    else if (form.spiceLevel === 5) spiceStr = "fiery hot";
    randomTemplate = randomTemplate.replace(/\[Spice\]/g, spiceStr);
    
    const flavors = ["savory", "tangy", "rich", "mouth-watering", "delicious", "sweet and savory"];
    randomTemplate = randomTemplate.replace(/\[Flavor\]/g, flavors[Math.floor(Math.random() * flavors.length)]);
    
    update({ description: randomTemplate });
  };

  const sections = [
    { id: "basic", label: "Basic Info", icon: Info },
    { id: "dietary", label: "Dietary & Spice", icon: Leaf },
    { id: "pricing", label: "Pricing & Offers", icon: Percent },
    { id: "sizes", label: "Sizes & Add-ons", icon: Layers },
    { id: "tags", label: "Tags & Badges", icon: Tag },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-4 w-full">
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 8 }}
        className="rounded-2xl border border-[var(--border)] bg-[var(--canvas)] shadow-2xl overflow-hidden flex-1 max-w-full"
      >
      {/* Sticky header + section tabs so navigation stays reachable while the
          form body scrolls inside the modal. */}
      <div className="sticky top-0 z-10 bg-[var(--canvas)]/95 backdrop-blur border-b border-[var(--border-soft)]">
        <div className="flex items-center justify-between px-5 py-3">
          <span className="text-sm font-bold text-[var(--text-1)]">{submitLabel === "Add to menu" ? "New Dish" : "Edit Dish"}</span>
          <button onClick={onCancel} className="rounded-md p-1 text-[var(--text-3)] hover:text-[var(--text-2)] hover:bg-[var(--surface)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative px-4 pb-3">
          {tabScroll.left && (
            <button
              type="button"
              onClick={() => scrollTabs(-1)}
              aria-label="Scroll tabs left"
              className="absolute left-4 top-1/2 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--canvas)] text-[var(--text-2)] shadow-md ring-1 ring-[var(--border)] hover:text-[var(--accent)]"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          )}
          <div
            ref={tabsRef}
            onScroll={updateTabScroll}
            className="flex gap-1 overflow-x-auto scrollbar-hide scroll-smooth"
          >
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
          {tabScroll.right && (
            <button
              type="button"
              onClick={() => scrollTabs(1)}
              aria-label="Scroll tabs right"
              className="absolute right-4 top-1/2 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--canvas)] text-[var(--text-2)] shadow-md ring-1 ring-[var(--border)] hover:text-[var(--accent)]"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
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

              <div className="flex-1 space-y-3 min-w-0">
                <div className="space-y-1.5">
                  <input
                    value={form.name}
                    onChange={(e) => update({ name: e.target.value })}
                    placeholder="Dish name *"
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--canvas)] px-3 py-2.5 text-sm font-semibold text-[var(--text-1)] placeholder-gray-300 focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent-border)]"
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
                              onClick={() => update({ imageUrl: img.url })}
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

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[12px] font-semibold text-[var(--text-2)]">Description</p>
                <button
                  type="button"
                  onClick={generateDescription}
                  className="flex items-center gap-1 text-[11px] font-semibold text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
                >
                  <Sparkles className="h-3 w-3" /> Auto Generate
                </button>
              </div>
              <textarea
                value={form.description}
                onChange={(e) => update({ description: e.target.value })}
                placeholder="Short description, helps customers decide"
                rows={3}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--canvas)] px-3 py-2.5 text-sm text-[var(--text-2)] placeholder-gray-300 focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent-border)] resize-none"
              />
            </div>
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
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${form.isFeatured ? "translate-x-4" : "translate-x-0.5"}`} />
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

      {/* Live Preview Pane */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98, x: 20 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        exit={{ opacity: 0, scale: 0.98, x: 20 }}
        className="hidden lg:flex w-[22rem] shrink-0 flex-col gap-3"
      >
        <h3 className="text-sm font-bold text-[var(--text-1)] px-1">Live Preview</h3>
        <div className="pointer-events-none">
          <MenuItemCard
            item={{
              id: "preview",
              name: form.name || "Dish name",
              description: form.description || "Description will appear here",
              price: Number(form.price) || 0,
              imageUrl: form.imageUrl || null,
              rating: 0,
              prepTime: form.prepTime || "15-20 min",
              isVeg: form.isVeg,
              hasEgg: form.hasEgg,
              hasOnionGarlic: form.hasOnionGarlic,
              isAvailable: true,
              badge: form.badge || null,
              tags: form.tags,
              sortOrder: 0,
              categoryId: form.categoryId || "temp",
              category: { id: form.categoryId || "temp", name: "", slug: "", parentId: null },
              sizes: form.sizes.map((s, i) => ({ id: `s${i}`, label: s.label, grams: s.grams, priceAdd: Number(s.priceAdd) || 0 })),
              addOns: form.addOns.map((a, i) => ({ id: `a${i}`, name: a.name, price: Number(a.price) || 0 })),
              discount: Number(form.discount) || 0,
              discountLabel: form.discountLabel || null,
              isFeatured: form.isFeatured,
              spiceLevel: form.spiceLevel,
              calories: form.calories ? Number(form.calories) : null,
              allergens: form.allergens
            }}
            currency={currency}
            onEdit={() => {}}
            onDelete={() => {}}
            onToggle={() => {}}
            onDuplicate={() => {}}
          />
        </div>
      </motion.div>
    </div>
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

/* ─── Categories view: type templates the owner can one-tap add ─────── */

function TemplateCard({
  template,
  onAdd,
}: {
  template: CategoryTemplateData;
  onAdd: () => void;
}) {
  return (
    <motion.div
      whileHover={template.added ? undefined : { y: -2 }}
      className={`rounded-2xl border p-4 flex flex-col gap-3 transition-all ${
        template.added
          ? "border-[var(--border)] bg-[var(--canvas-sub)]/50 opacity-70"
          : "border-[var(--border)] bg-[var(--canvas)] shadow-sm hover:shadow-md hover:border-[var(--accent-border)]"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <span className="text-2xl leading-none">{template.icon}</span>
        <span className="text-sm font-bold text-[var(--text-1)] flex-1 truncate">{template.name}</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {template.subs.slice(0, 4).map((s) => (
          <span key={s} className="rounded-md bg-[var(--canvas-sub)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-3)]">
            {s}
          </span>
        ))}
        {template.subs.length > 4 && (
          <span className="text-[10px] text-[var(--text-3)] font-medium">+{template.subs.length - 4}</span>
        )}
      </div>
      <button
        onClick={onAdd}
        disabled={template.added}
        className={`mt-auto flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-bold transition-all ${
          template.added
            ? "bg-[var(--accent-muted)] text-[var(--accent-text)] cursor-default"
            : "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] active:scale-[0.97]"
        } disabled:opacity-60`}
      >
        {template.added ? (
          <><Check className="h-3.5 w-3.5" /> Added</>
        ) : (
          <><Plus className="h-3.5 w-3.5" /> Add to menu</>
        )}
      </button>
    </motion.div>
  );
}

/* ─── Categories view: editable tree with inline subcategories ──────── */

function CategoryEditableName({
  name,
  icon,
  onRename,
  className,
}: {
  name: string;
  icon?: string | null;
  onRename: (name: string) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
  useEffect(() => { setValue(name); }, [name]);

  const commit = () => {
    const trimmed = value.trim();
    setEditing(false);
    if (trimmed && trimmed !== name) onRename(trimmed);
    else setValue(name);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") { setValue(name); setEditing(false); }
        }}
        onClick={(e) => e.stopPropagation()}
        className={`min-w-0 flex-1 bg-transparent border-b border-[var(--accent)] outline-none ${className ?? ""}`}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); setEditing(true); }}
      className={`flex items-center gap-2 min-w-0 text-left hover:opacity-70 transition-opacity ${className ?? ""}`}
      title="Click to rename"
    >
      {icon && <span className="leading-none shrink-0">{icon}</span>}
      <span className="truncate">{name}</span>
      <Pencil className="h-3 w-3 text-[var(--text-3)] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

function CategoryManager({
  categories,
  onAddSub,
  onDelete,
  onRename,
  addSubParentId,
  onCreateSub,
  onCancelAddSub,
}: {
  categories: MenuCategory[];
  onAddSub: (parentId: string) => void;
  onDelete: (categoryId: string) => void;
  onRename: (categoryId: string, name: string) => void;
  addSubParentId: string | null;
  onCreateSub: (parentId: string, name: string) => void;
  onCancelAddSub: () => void;
}) {
  const topLevel = categories.filter((c) => !c.parentId);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(topLevel.map((c) => c.id)));

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  if (topLevel.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border)] py-10 text-center text-sm text-[var(--text-3)]">
        No categories yet — add one below or pick a template above.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {topLevel.map((cat) => {
        const subs = categories.filter((c) => c.parentId === cat.id);
        const isAddingSubHere = addSubParentId === cat.id;
        const isExpanded = expanded.has(cat.id) || isAddingSubHere;
        const totalItems = cat._count.items + subs.reduce((s, c) => s + c._count.items, 0);

        return (
          <div key={cat.id} className="rounded-xl border border-[var(--border)] bg-[var(--canvas)] overflow-hidden">
            <div className="group flex items-center gap-2 px-4 py-3">
              <button
                onClick={() => toggle(cat.id)}
                className="p-1 text-[var(--text-3)] hover:text-[var(--text-2)] shrink-0"
                title={isExpanded ? "Collapse" : "Expand"}
              >
                {subs.length > 0 ? (
                  <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                ) : (
                  <span className="block w-4" />
                )}
              </button>
              <CategoryEditableName
                name={cat.name}
                icon={cat.icon}
                onRename={(name) => onRename(cat.id, name)}
                className="flex-1 text-[14px] font-bold text-[var(--text-1)]"
              />
              <span className="text-[11px] text-[var(--text-3)] font-semibold shrink-0">{totalItems} item{totalItems !== 1 ? "s" : ""}</span>
              <button
                onClick={() => onAddSub(cat.id)}
                className="p-1.5 rounded-md text-[var(--text-3)] hover:text-[var(--accent)] hover:bg-[var(--accent-muted)] transition-colors shrink-0"
                title="Add subcategory"
              >
                <PlusCircle className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onDelete(cat.id)}
                className="p-1.5 rounded-md text-[var(--text-3)] hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                title="Delete category"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            <AnimatePresence>
              {isExpanded && (subs.length > 0 || isAddingSubHere) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden border-t border-[var(--border)]"
                >
                  {subs.map((sub) => (
                    <div key={sub.id} className="group flex items-center gap-2 pl-11 pr-4 py-2.5 border-b border-[var(--border)] last:border-0">
                      <CategoryEditableName
                        name={sub.name}
                        onRename={(name) => onRename(sub.id, name)}
                        className="flex-1 text-[13px] font-semibold text-[var(--text-2)]"
                      />
                      <span className="text-[10px] text-[var(--text-3)] font-medium shrink-0">{sub._count.items}</span>
                      <button
                        onClick={() => onDelete(sub.id)}
                        className="p-1.5 rounded-md text-[var(--text-3)] hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                        title="Delete subcategory"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  {isAddingSubHere && (
                    <div className="pl-9 pr-3 py-2">
                      <AddSubCategoryInline
                        parentName={cat.name}
                        onCreate={(name) => onCreateSub(cat.id, name)}
                        onCancel={onCancelAddSub}
                      />
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
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
  const queryClient = useQueryClient();
  // Query cache paints instantly on a re-opened tab; each list keeps its own
  // key/setter shim so the many optimistic mutation handlers below (which
  // already do their own snapshot/rollback via setItems) don't need to change.
  const itemsQueryKey = ["menu-items", restaurantId] as const;
  const itemsQuery = useQuery({
    queryKey: itemsQueryKey,
    queryFn: () => apiFetch<MenuItem[]>(`/api/restaurants/${restaurantId}/menu`),
    enabled: !!restaurantId,
  });
  const items = itemsQuery.data ?? [];
  const setItems = (updater: React.SetStateAction<MenuItem[]>) =>
    queryClient.setQueryData<MenuItem[]>(itemsQueryKey, (prev) =>
      typeof updater === "function" ? (updater as (p: MenuItem[]) => MenuItem[])(prev ?? []) : updater,
    );

  const catQueryKey = ["menu-categories", restaurantId] as const;
  const catQuery = useQuery({
    queryKey: catQueryKey,
    queryFn: () => apiFetch<MenuCategory[]>(`/api/restaurants/${restaurantId}/categories`),
    enabled: !!restaurantId,
  });
  const categories = catQuery.data ?? [];
  const setCategories = (updater: React.SetStateAction<MenuCategory[]>) =>
    queryClient.setQueryData<MenuCategory[]>(catQueryKey, (prev) =>
      typeof updater === "function" ? (updater as (p: MenuCategory[]) => MenuCategory[])(prev ?? []) : updater,
    );

  // Per-type category templates the owner can one-tap add (with their subs).
  // The `added` flag greys out ones already on the menu; refetched alongside
  // categories so it stays in sync after adds/deletes.
  const templatesQueryKey = ["category-templates", restaurantId] as const;
  const templatesQuery = useQuery({
    queryKey: templatesQueryKey,
    queryFn: () => apiFetch<CategoryTemplateData[]>(`/api/restaurants/${restaurantId}/categories/templates`),
    enabled: !!restaurantId,
  });
  const templates = templatesQuery.data ?? [];
  const setTemplates = (updater: React.SetStateAction<CategoryTemplateData[]>) =>
    queryClient.setQueryData<CategoryTemplateData[]>(templatesQueryKey, (prev) =>
      typeof updater === "function" ? (updater as (p: CategoryTemplateData[]) => CategoryTemplateData[])(prev ?? []) : updater,
    );

  const loading = itemsQuery.isLoading || catQuery.isLoading;
  const [search, setSearch] = useState("");
  const [selectedCatId, setSelectedCatId] = useState("All");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
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

  // Two views inside Menu Management: the dish grid ("items") and a dedicated
  // category manager ("categories"). A restaurant with no categories yet opens
  // straight to Categories, since a dish can't be added without one.
  const [view, setView] = useState<"items" | "categories">("items");
  const didAutoPickView = useRef(false);
  useEffect(() => {
    if (didAutoPickView.current || catQuery.isLoading) return;
    didAutoPickView.current = true;
    if (categories.length === 0) setView("categories");
  }, [catQuery.isLoading, categories.length]);

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

  // Mutations update local state optimistically (instant), then call
  // fetchData(true) to reconcile canonical data (real IDs, item counts) —
  // now a background invalidate on both query caches instead of a manual fetch.
  const fetchData = (_silent = false) => {
    queryClient.invalidateQueries({ queryKey: itemsQueryKey });
    queryClient.invalidateQueries({ queryKey: catQueryKey });
    queryClient.invalidateQueries({ queryKey: templatesQueryKey });
  };

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


  const renameCategory = async (categoryId: string, name: string) => {
    if (!restaurantId) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    setCategories((prev) =>
      prev.map((c) =>
        c.id === categoryId
          ? { ...c, name: trimmed }
          : {
              ...c,
              children:
                c.children?.map((s) =>
                  s.id === categoryId ? { ...s, name: trimmed } : s,
                ) ?? c.children,
            },
      ),
    );
    try {
      await apiFetch(`/api/restaurants/${restaurantId}/categories`, {
        method: "PATCH",
        body: { categoryId, name: trimmed },
      });
      fetchData(true);
    } catch {
      fetchData(true);
      showToast("Failed to rename category");
    }
  };

  const createCategory = async (name?: string, parentId?: string | null) => {
    if (!restaurantId) {
      showToast("No restaurant selected — please refresh");
      return;
    }
    const catName = name || newCatName.trim();
    if (!catName) return;

    const pid = parentId || null;
    const catSnapshot = categories;
    const tempId = `temp-${Date.now()}`;
    const slug = catName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const optimisticNode: MenuCategory = {
      id: tempId, name: catName, slug, icon: null, parentId: pid,
      _count: { items: 0 }, children: [],
    };

    // Optimistic: the category (or subcategory) appears instantly and the input
    // closes — no spinner, reconciled with the real id in the background.
    setCategories((prev) =>
      pid
        ? prev.map((c) =>
            c.id === pid
              ? { ...c, children: [...(c.children ?? []), optimisticNode] }
              : c,
          )
        : [...prev, optimisticNode],
    );
    if (!name) { setNewCatName(""); setShowNewCat(false); }
    setAddSubParentId(null);
    showToast(`"${catName}" created!`);

    try {
      await apiFetch(`/api/restaurants/${restaurantId}/categories`, {
        method: "POST",
        body: { name: catName, parentId: pid },
      });
      fetchData(true);
    } catch (err) {
      setCategories(catSnapshot); // rollback
      showToast(err instanceof Error ? err.message : "Failed to create category");
    }
  };

  // One-tap add of a single template category (with its subcategories).
  // Optimistic: the category + "Added" state show instantly, reconciled with
  // real ids in the background.
  const addTemplate = async (name: string) => {
    if (!restaurantId) return;
    const template = templates.find((t) => t.name === name);
    if (!template) return;

    const catSnapshot = categories;
    const tplSnapshot = templates;
    const tempId = `temp-${Date.now()}`;

    setCategories((prev) => [
      ...prev,
      {
        id: tempId,
        name: template.name,
        slug: template.slug,
        icon: template.icon,
        parentId: null,
        _count: { items: 0 },
        children: template.subs.map((s, i) => ({
          id: `${tempId}-${i}`,
          name: s,
          slug: `${template.slug}--${i}`,
          icon: null,
          parentId: tempId,
          _count: { items: 0 },
          children: [],
        })),
      },
    ]);
    setTemplates((prev) => prev.map((t) => (t.name === name ? { ...t, added: true } : t)));
    showToast(`"${name}" added to your menu!`);

    try {
      await apiFetch(`/api/restaurants/${restaurantId}/categories/templates`, {
        method: "POST",
        body: { name },
      });
      fetchData(true);
    } catch (err) {
      setCategories(catSnapshot);
      setTemplates(tplSnapshot);
      showToast(err instanceof Error ? err.message : "Failed to add category");
    }
  };

  const seedDefaults = async (opts?: { silent?: boolean }) => {
    if (!restaurantId) return;
    setSeedingCats(true);
    try {
      const result = await apiFetch<{ message: string; categories: { name: string }[] }>(
        `/api/restaurants/${restaurantId}/categories/seed`,
        { method: "POST" }
      );
      if (!opts?.silent) {
        showToast(result.message || `${result.categories.length} categories added!`);
      }
      await fetchData(true);
    } catch {
      if (!opts?.silent) showToast("Failed to seed categories");
    } finally {
      setSeedingCats(false);
    }
  };

  // Safety net: any restaurant that lands here with zero categories (created
  // before server-side auto-seed, or a seed that didn't run) gets its default
  // category tree generated automatically — silently, once per restaurant — so
  // the owner never sees an empty Categories tab and never has to seed by hand.
  const autoSeededRef = useRef<string | null>(null);
  useEffect(() => {
    if (catQuery.isLoading || !restaurantId) return;
    if (categories.length > 0 || seedingCats) return;
    if (autoSeededRef.current === restaurantId) return;
    autoSeededRef.current = restaurantId;
    void seedDefaults({ silent: true });
    // seedDefaults is a stable closure over restaurantId; guarded by the ref so
    // it runs at most once per restaurant.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catQuery.isLoading, categories.length, restaurantId, seedingCats]);

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
          {!showAddForm && !editingItem &&
            (view === "categories" ? (
              <button
                onClick={() => setShowNewCat(true)}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] shadow-[0_4px_14px_0_rgba(245,158,11,0.39)] px-5 py-2 text-[13px] font-bold text-white hover:shadow-[0_6px_20px_rgba(245,158,11,0.23)] hover:-translate-y-0.5 active:scale-[0.97] transition-all"
              >
                <FolderPlus className="h-4 w-4" />
                Add Category
              </button>
            ) : (
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] shadow-[0_4px_14px_0_rgba(245,158,11,0.39)] px-5 py-2 text-[13px] font-bold text-white hover:shadow-[0_6px_20px_rgba(245,158,11,0.23)] hover:-translate-y-0.5 active:scale-[0.97] transition-all"
              >
                <Plus className="h-4 w-4" strokeWidth={2.5} />
                Add Dish
              </button>
            ))}
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
            <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${isOpen ? "translate-x-5" : "translate-x-0.5"}`} />
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
            <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${deliveryEnabled ? "translate-x-5" : "translate-x-0.5"}`} />
          </div>
        </button>
      </div>

      <MenuStats items={items} categories={flatCategories} currency={cur} />

      {/* Items | Categories view switch */}
      <div className="inline-flex items-center gap-1 rounded-xl bg-[var(--canvas-sub)] p-1">
        {(
          [
            ["items", "Dishes", items.length],
            ["categories", "Categories", flatCategories.length],
          ] as const
        ).map(([id, label, count]) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-bold transition-colors ${
              view === id
                ? "bg-[var(--canvas)] text-[var(--text-1)] shadow-sm"
                : "text-[var(--text-3)] hover:text-[var(--text-2)]"
            }`}
          >
            {id === "items" ? <UtensilsCrossed className="h-4 w-4" /> : <Layers className="h-4 w-4" />}
            {label}
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                view === id
                  ? "bg-[var(--accent-muted)] text-[var(--accent-text)]"
                  : "bg-[var(--surface)] text-[var(--text-3)]"
              }`}
            >
              {count}
            </span>
          </button>
        ))}
      </div>

      {view === "categories" && (
        <div className="space-y-6">
          {/* One-tap templates for this restaurant type (only the un-added) */}
          {templates.some((t) => !t.added) && (
            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-1)]">Quick add for your place</h3>
                  <p className="text-[12px] text-[var(--text-2)]">Tap one to add it with its subcategories — or add them all</p>
                </div>
                <button
                  onClick={() => seedDefaults()}
                  disabled={seedingCats}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--canvas)] px-3.5 py-2 text-[12px] font-bold text-[var(--text-2)] hover:bg-[var(--canvas-sub)] disabled:opacity-50 transition-all"
                >
                  {seedingCats ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                  Add all
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {templates.filter((t) => !t.added).map((t) => (
                  <TemplateCard key={t.name} template={t} onAdd={() => addTemplate(t.name)} />
                ))}
              </div>
            </div>
          )}

          {/* Inline new top-level category */}
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
                    disabled={!newCatName.trim()}
                    className="flex items-center gap-1 rounded-md bg-[var(--accent)] px-3 py-1.5 text-[12px] font-bold text-white hover:bg-[var(--accent-hover)] disabled:opacity-40 transition-all"
                  >
                    <Check className="h-3 w-3" />
                    Create
                  </button>
                  <button onClick={() => { setShowNewCat(false); setNewCatName(""); }} className="p-1 text-[var(--text-3)] hover:text-[var(--text-2)]">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* The editable category tree (categories → subcategories) */}
          <div>
            <h3 className="mb-3 text-sm font-bold text-[var(--text-1)]">Your categories</h3>
            <CategoryManager
              categories={flatCategories}
              onAddSub={setAddSubParentId}
              onDelete={initDeleteCategory}
              onRename={renameCategory}
              addSubParentId={addSubParentId}
              onCreateSub={(parentId, name) => createCategory(name, parentId)}
              onCancelAddSub={() => setAddSubParentId(null)}
            />
          </div>
        </div>
      )}

      {view === "items" && (
        <>
      {/* Add / Edit form — modal popup */}
      <AnimatePresence>
        {(showAddForm || editingItem) && (
          <div
            className="fixed inset-0 z-[90] flex items-start sm:items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto"
            onClick={() => { setShowAddForm(false); setEditingItem(null); }}
          >
            <div
              className="w-full max-w-5xl my-auto max-h-[92dvh] overflow-y-auto rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {editingItem ? (
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
              ) : (
                <DishForm
                  categories={flatCategories}
                  onSubmit={addItem}
                  onCancel={() => setShowAddForm(false)}
                  submitLabel="Add to menu"
                  currency={cur}
                />
              )}
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Dishes grid — filter via the category chip strip below (no sidebar) */}
      <div>
        <div className="min-w-0">
          {/* Search & category filter (managing categories lives in the
              Categories tab — this strip is filter-only, no delete) */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
            <div className="relative sm:w-72 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-3)] group-focus-within:text-[var(--accent)] transition-colors" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search dishes…"
                className="w-full rounded-full border border-[var(--border)] bg-[var(--canvas-sub)] py-2.5 pl-11 pr-10 text-sm font-medium text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:outline-none focus:border-[var(--accent)] focus:bg-[var(--canvas)] focus:ring-2 focus:ring-[var(--accent)]/20 transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-[var(--text-3)] hover:bg-[var(--surface)] hover:text-[var(--text-1)] transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide items-center pb-1 sm:flex-1">
              {["All", ...flatCategories.filter((c) => !c.parentId).map((c) => c.name)].map((cat) => {
                const catObj = flatCategories.find((c) => c.name === cat && !c.parentId);
                const isActive = cat === "All" ? selectedCatId === "All" : selectedCatId === catObj?.id;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCatId(cat === "All" ? "All" : catObj?.id || "All")}
                    className={`shrink-0 rounded-full px-4 py-2 text-[12px] font-bold tracking-wide transition-all border ${
                      isActive
                        ? "bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] text-white border-transparent shadow-sm"
                        : "bg-[var(--canvas)] text-[var(--text-2)] border-[var(--border)] hover:bg-[var(--canvas-sub)] hover:text-[var(--text-1)]"
                    }`}
                  >
                    {cat}
                  </button>
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
        </>
      )}

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
