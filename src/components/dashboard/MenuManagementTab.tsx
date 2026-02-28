"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Leaf,
  Flame,
  Wine,
  Search,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { menuItems as initialItems, type MenuItem } from "@/lib/menuData";
import { useToast } from "@/context/ToastContext";
import gsap from "gsap";

const CATEGORY_OPTIONS = [
  "Main Dishes",
  "Vegan",
  "Street Food",
  "Desserts",
  "Drinks",
  "Alcohol",
];

function PriceInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
        Rs.
      </span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-sm font-bold text-[#1F2A2A] focus:outline-none focus:ring-2 focus:ring-[#FF9933]/30 focus:border-[#FF9933]/30 focus:bg-white transition-all"
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
  item: MenuItem & { active: boolean };
  onSave: (updated: Partial<MenuItem>) => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const { showToast } = useToast();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(item.name);
  const [editPrice, setEditPrice] = useState(item.price);
  const [editVeg, setEditVeg] = useState(item.isVeg);
  const [editAlcohol, setEditAlcohol] = useState(item.category === "Alcohol");
  const saveRef = useRef<HTMLButtonElement>(null);

  const handleSave = () => {
    onSave({
      name: editName,
      price: editPrice,
      isVeg: editVeg,
      category: editAlcohol
        ? "Alcohol"
        : item.category === "Alcohol"
          ? "Drinks"
          : item.category,
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`rounded-2xl border bg-white transition-all ${
        item.active ? "border-gray-200" : "border-gray-100 opacity-50"
      }`}
    >
      <div className="flex items-center gap-3 p-4">
        {/* Image */}
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-gray-100">
          <img
            src={item.image}
            alt={item.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>

        {editing ? (
          <div className="flex flex-1 flex-col gap-2 min-w-0">
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-bold text-[#1F2A2A] focus:outline-none focus:ring-2 focus:ring-[#FF9933]/30 focus:bg-white transition-all"
            />
            <div className="flex gap-2 flex-wrap">
              <div className="w-28">
                <PriceInput value={editPrice} onChange={setEditPrice} />
              </div>
              <button
                onClick={() => setEditVeg(!editVeg)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-bold transition-all ${
                  editVeg
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {editVeg ? (
                  <Leaf className="h-3 w-3" />
                ) : (
                  <Flame className="h-3 w-3" />
                )}
                {editVeg ? "Veg" : "Non-Veg"}
              </button>
              <button
                onClick={() => setEditAlcohol(!editAlcohol)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-bold transition-all ${
                  editAlcohol
                    ? "bg-purple-100 text-purple-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                <Wine className="h-3 w-3" />
                Alcohol
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-[#1F2A2A] truncate">
                {item.name}
              </span>
              {item.badge && (
                <span className="rounded-full bg-[#FF9933]/10 px-2 py-0.5 text-[10px] font-bold text-[#FF9933]">
                  {item.badge}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs font-bold text-[#1F2A2A]">
                Rs. {item.price}
              </span>
              <span className="text-[11px] text-gray-400">·</span>
              <span className="text-[11px] text-gray-400">{item.category}</span>
              {item.isVeg ? (
                <span className="flex items-center gap-0.5 text-[10px] font-semibold text-green-600">
                  <Leaf className="h-2.5 w-2.5" />
                  Veg
                </span>
              ) : (
                <span className="flex items-center gap-0.5 text-[10px] font-semibold text-red-500">
                  <Flame className="h-2.5 w-2.5" />
                  Non-Veg
                </span>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center gap-1.5 shrink-0">
          {editing ? (
            <>
              <button
                ref={saveRef}
                onClick={handleSave}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0A4D3C] text-white hover:bg-[#083a2d] transition-colors"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={() => setEditing(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onToggle}
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                  item.active
                    ? "bg-green-100 text-green-600 hover:bg-green-200"
                    : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                }`}
              >
                {item.active ? (
                  <ToggleRight className="h-4 w-4" />
                ) : (
                  <ToggleLeft className="h-4 w-4" />
                )}
              </button>
              <button
                onClick={() => setEditing(true)}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-500 hover:bg-[#FF9933]/10 hover:text-[#FF9933] transition-all"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={onDelete}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-500 transition-all"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function AddDishForm({
  onAdd,
  onCancel,
}: {
  onAdd: (item: Partial<MenuItem>) => void;
  onCancel: () => void;
}) {
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [price, setPrice] = useState(0);
  const [category, setCategory] = useState("Main Dishes");
  const [isVeg, setIsVeg] = useState(true);
  const [description, setDescription] = useState("");

  const handleSubmit = () => {
    if (!name.trim() || price <= 0) {
      showToast("Please fill all required fields");
      return;
    }
    onAdd({ name, price, category, isVeg, description });
    showToast("New dish added to menu!");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="rounded-2xl border-2 border-[#FF9933]/30 bg-[#FF9933]/5 p-5 space-y-4"
    >
      <h3 className="text-sm font-bold text-[#1F2A2A]">Add New Dish</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Dish name *"
          className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-[#1F2A2A] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF9933]/30 transition-all"
        />
        <PriceInput value={price} onChange={setPrice} />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-[#1F2A2A] focus:outline-none focus:ring-2 focus:ring-[#FF9933]/30 transition-all"
        >
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          onClick={() => setIsVeg(!isVeg)}
          className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-all ${
            isVeg ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}
        >
          {isVeg ? <Leaf className="h-4 w-4" /> : <Flame className="h-4 w-4" />}
          {isVeg ? "Vegetarian" : "Non-Vegetarian"}
        </button>
      </div>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        rows={2}
        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-[#1F2A2A] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF9933]/30 transition-all resize-none"
      />
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          className="flex-1 rounded-xl bg-[#0A4D3C] py-3 text-sm font-bold text-white hover:bg-[#083a2d] transition-all"
        >
          Add Dish
        </button>
        <button
          onClick={onCancel}
          className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-bold text-gray-500 hover:bg-gray-50 transition-all"
        >
          Cancel
        </button>
      </div>
    </motion.div>
  );
}

export default function MenuManagementTab() {
  type ManagedItem = MenuItem & { active: boolean };
  const [items, setItems] = useState<ManagedItem[]>(
    initialItems.map((item) => ({ ...item, active: true })),
  );
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("All");
  const [showAddForm, setShowAddForm] = useState(false);
  let nextId = 9000;

  const filtered = items.filter((item) => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === "All" || item.category === filterCat;
    return matchSearch && matchCat;
  });

  const updateItem = (id: number, patch: Partial<MenuItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  };

  const deleteItem = (id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const toggleItem = (id: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, active: !item.active } : item,
      ),
    );
  };

  const addItem = (newItem: Partial<MenuItem>) => {
    const item: ManagedItem = {
      id: nextId++,
      name: newItem.name ?? "New Dish",
      description: newItem.description ?? "",
      price: newItem.price ?? 100,
      image:
        "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=400&auto=format&fit=crop",
      rating: 4.0,
      time: "20 mins",
      addOns: [],
      category: newItem.category ?? "Main Dishes",
      tags: [],
      isVeg: newItem.isVeg ?? true,
      hasEgg: false,
      hasOnionGarlic: true,
      active: true,
    };
    setItems((prev) => [item, ...prev]);
    setShowAddForm(false);
  };

  const activeCount = items.filter((i) => i.active).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#1F2A2A]">Menu Management</h2>
          <p className="text-sm text-gray-400">
            {activeCount} of {items.length} items active
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 rounded-xl bg-[#FF9933] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#ff8811] transition-all shadow-md shadow-[#FF9933]/25 active:scale-[0.97]"
        >
          <Plus className="h-4 w-4" />
          Add Dish
        </button>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showAddForm && (
          <AddDishForm onAdd={addItem} onCancel={() => setShowAddForm(false)} />
        )}
      </AnimatePresence>

      {/* Search & filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search dishes..."
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-11 pr-4 text-sm font-medium text-[#1F2A2A] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF9933]/30 transition-all"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {["All", ...CATEGORY_OPTIONS].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCat(cat)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-all ${
                filterCat === cat
                  ? "bg-[#0A4D3C] text-white shadow-sm"
                  : "bg-white border border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Items */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.p
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-16 text-center text-sm text-gray-400"
            >
              No dishes found. Try a different filter.
            </motion.p>
          ) : (
            filtered.map((item) => (
              <MenuItemRow
                key={item.id}
                item={item}
                onSave={(patch) => updateItem(item.id, patch)}
                onDelete={() => deleteItem(item.id)}
                onToggle={() => toggleItem(item.id)}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
