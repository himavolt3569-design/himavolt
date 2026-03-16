"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UtensilsCrossed,
  Plus,
  X,
  Percent,
  ToggleLeft,
  ToggleRight,
  ArrowUpDown,
  Tag,
  Trash2,
  Pencil,
  Check,
  ShoppingBag,
} from "lucide-react";

interface ComboMeal {
  id: string;
  name: string;
  items: string[];
  comboPrice: number;
  originalPrice: number;
  active: boolean;
  createdAt: string;
  popularity: number; // 0-100
}

const MENU_ITEMS = [
  "Classic Burger",
  "Cheese Burger",
  "Chicken Burger",
  "Veggie Burger",
  "French Fries",
  "Onion Rings",
  "Chicken Nuggets",
  "Momo (6pcs)",
  "Momo (12pcs)",
  "Hot Dog",
  "Chicken Wrap",
  "Cola",
  "Sprite",
  "Lemonade",
  "Iced Tea",
  "Milkshake",
  "Sundae",
  "Apple Pie",
];

export default function ComboMealsTab() {
  const [combos, setCombos] = useState<ComboMeal[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"popularity" | "date">("popularity");

  // Form state
  const [formName, setFormName] = useState("");
  const [formItems, setFormItems] = useState<string[]>([]);
  const [formComboPrice, setFormComboPrice] = useState("");
  const [formOriginalPrice, setFormOriginalPrice] = useState("");

  const sortedCombos = [...combos].sort((a, b) => {
    if (sortBy === "popularity") return b.popularity - a.popularity;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const savings = (original: number, combo: number) =>
    Math.round(((original - combo) / original) * 100);

  const resetForm = () => {
    setFormName("");
    setFormItems([]);
    setFormComboPrice("");
    setFormOriginalPrice("");
    setEditingId(null);
    setShowForm(false);
  };

  const openEdit = (combo: ComboMeal) => {
    setFormName(combo.name);
    setFormItems([...combo.items]);
    setFormComboPrice(combo.comboPrice.toString());
    setFormOriginalPrice(combo.originalPrice.toString());
    setEditingId(combo.id);
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!formName.trim() || formItems.length === 0 || !formComboPrice || !formOriginalPrice) return;

    const combo: ComboMeal = {
      id: editingId || Date.now().toString(),
      name: formName.trim(),
      items: formItems,
      comboPrice: Number(formComboPrice),
      originalPrice: Number(formOriginalPrice),
      active: true,
      createdAt: new Date().toISOString().split("T")[0],
      popularity: editingId ? combos.find((c) => c.id === editingId)?.popularity || 50 : 50,
    };

    if (editingId) {
      setCombos((prev) => prev.map((c) => (c.id === editingId ? combo : c)));
    } else {
      setCombos((prev) => [...prev, combo]);
    }
    resetForm();
  };

  const toggleCombo = (id: string) => {
    setCombos((prev) => prev.map((c) => (c.id === id ? { ...c, active: !c.active } : c)));
  };

  const deleteCombo = (id: string) => {
    setCombos((prev) => prev.filter((c) => c.id !== id));
  };

  const toggleItem = (item: string) => {
    setFormItems((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-orange-100 rounded-xl">
            <UtensilsCrossed className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Combo Meals</h2>
            <p className="text-sm text-gray-500">Bundle items into value combos</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSortBy(sortBy === "popularity" ? "date" : "popularity")}
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-600 hover:bg-gray-200 transition-colors"
          >
            <ArrowUpDown className="w-4 h-4" />
            {sortBy === "popularity" ? "By Popularity" : "By Date"}
          </button>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Combo
          </button>
        </div>
      </div>

      {/* Create / Edit Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white border border-orange-200 rounded-xl p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">
                  {editingId ? "Edit Combo" : "New Combo Meal"}
                </h3>
                <button onClick={resetForm} className="p-1 text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-600">Combo Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Classic Combo"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-600">Original Price (Rs)</label>
                  <input
                    type="number"
                    placeholder="580"
                    value={formOriginalPrice}
                    onChange={(e) => setFormOriginalPrice(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-600">Combo Price (Rs)</label>
                  <input
                    type="number"
                    placeholder="450"
                    value={formComboPrice}
                    onChange={(e) => setFormComboPrice(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                  />
                </div>
              </div>

              {formComboPrice && formOriginalPrice && Number(formOriginalPrice) > Number(formComboPrice) && (
                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2">
                  <Percent className="w-4 h-4" />
                  Customer saves {savings(Number(formOriginalPrice), Number(formComboPrice))}% (Rs {Number(formOriginalPrice) - Number(formComboPrice)})
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600">Select Items</label>
                <div className="flex flex-wrap gap-2">
                  {MENU_ITEMS.map((item) => (
                    <button
                      key={item}
                      onClick={() => toggleItem(item)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        formItems.includes(item)
                          ? "bg-orange-500 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={resetForm}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!formName.trim() || formItems.length === 0 || !formComboPrice || !formOriginalPrice}
                  className="flex items-center gap-2 px-5 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Check className="w-4 h-4" />
                  {editingId ? "Update" : "Create"} Combo
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Combos Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnimatePresence>
          {sortedCombos.map((combo) => (
            <motion.div
              key={combo.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              whileHover={{ y: -2 }}
              className={`bg-white border rounded-xl p-5 shadow-sm transition-colors ${
                combo.active ? "border-gray-100" : "border-gray-200 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-orange-500" />
                  <h4 className="font-semibold text-gray-900">{combo.name}</h4>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                    <Tag className="w-3 h-3" />
                    {savings(combo.originalPrice, combo.comboPrice)}% OFF
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-4">
                {combo.items.map((item) => (
                  <span
                    key={item}
                    className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-xs font-medium"
                  >
                    {item}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold text-gray-900">Rs {combo.comboPrice}</span>
                  <span className="text-sm text-gray-400 line-through">Rs {combo.originalPrice}</span>
                </div>
                <div className="text-xs text-gray-400">
                  Popularity: {combo.popularity}%
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleCombo(combo.id)}>
                    {combo.active ? (
                      <ToggleRight className="w-7 h-7 text-orange-500" />
                    ) : (
                      <ToggleLeft className="w-7 h-7 text-gray-400" />
                    )}
                  </button>
                  <span className={`text-xs font-medium ${combo.active ? "text-orange-600" : "text-gray-400"}`}>
                    {combo.active ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(combo)}
                    className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteCombo(combo.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {combos.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <UtensilsCrossed className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No combos yet. Create your first combo meal deal!</p>
        </div>
      )}
    </motion.div>
  );
}
