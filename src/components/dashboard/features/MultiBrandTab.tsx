"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatPrice } from "@/lib/currency";
import { useRestaurant } from "@/context/RestaurantContext";
import {
  Store,
  Plus,
  X,
  ToggleLeft,
  ToggleRight,
  Palette,
  ChefHat,
  TrendingUp,
  Package,
  BarChart3,
  Settings,
  Tag,
  DollarSign,
  ShoppingBag,
} from "lucide-react";

interface Brand {
  id: string;
  name: string;
  cuisineType: string;
  description: string;
  brandColor: string;
  active: boolean;
  ordersToday: number;
  revenueToday: number;
  menuCategories: string[];
  sharedInventory: boolean;
}

const CUISINE_TYPES = [
  "Nepali",
  "Indian",
  "Chinese",
  "Italian",
  "Fast Food",
  "Thai",
  "Japanese",
  "Mexican",
  "Continental",
  "Fusion",
];

const MENU_CATEGORIES = [
  "Appetizers",
  "Main Course",
  "Rice & Noodles",
  "Breads",
  "Momos",
  "Pizza",
  "Burgers",
  "Desserts",
  "Beverages",
  "Combos",
];

const emptyForm = {
  name: "",
  cuisineType: "",
  description: "",
  brandColor: "#7c3aed",
};

export default function MultiBrandTab() {
  const { selectedRestaurant } = useRestaurant();
  const cur = selectedRestaurant?.currency ?? "NPR";
  const [brands, setBrands] = useState<Brand[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [showMenuManager, setShowMenuManager] = useState<string | null>(null);

  const totalRevenue = brands.reduce((s, b) => s + b.revenueToday, 0);
  const totalOrders = brands.reduce((s, b) => s + b.ordersToday, 0);
  const maxRevenue = Math.max(...brands.map((b) => b.revenueToday), 1);

  const addBrand = () => {
    if (!form.name.trim() || !form.cuisineType) return;
    const newBrand: Brand = {
      id: Date.now().toString(),
      name: form.name.trim(),
      cuisineType: form.cuisineType,
      description: form.description.trim(),
      brandColor: form.brandColor,
      active: true,
      ordersToday: 0,
      revenueToday: 0,
      menuCategories: [],
      sharedInventory: true,
    };
    setBrands((prev) => [...prev, newBrand]);
    setForm(emptyForm);
    setShowAddForm(false);
  };

  const toggleBrand = (id: string) => {
    setBrands((prev) =>
      prev.map((b) => (b.id === id ? { ...b, active: !b.active } : b))
    );
  };

  const toggleSharedInventory = (id: string) => {
    setBrands((prev) =>
      prev.map((b) =>
        b.id === id ? { ...b, sharedInventory: !b.sharedInventory } : b
      )
    );
  };

  const toggleMenuCategory = (brandId: string, category: string) => {
    setBrands((prev) =>
      prev.map((b) => {
        if (b.id !== brandId) return b;
        const has = b.menuCategories.includes(category);
        return {
          ...b,
          menuCategories: has
            ? b.menuCategories.filter((c) => c !== category)
            : [...b.menuCategories, category],
        };
      })
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Multi-Brand Management
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Run multiple virtual brands from one cloud kitchen
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Brand
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
          <Store className="w-5 h-5 text-violet-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">{brands.length}</p>
          <p className="text-xs text-gray-500">Total Brands</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
          <ShoppingBag className="w-5 h-5 text-blue-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">{totalOrders}</p>
          <p className="text-xs text-gray-500">Orders Today</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
          <DollarSign className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">
            {formatPrice(totalRevenue, cur)}
          </p>
          <p className="text-xs text-gray-500">Revenue Today</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
          <TrendingUp className="w-5 h-5 text-amber-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">
            {brands.filter((b) => b.active).length}
          </p>
          <p className="text-xs text-gray-500">Active Brands</p>
        </div>
      </div>

      {/* Add Brand Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white rounded-xl shadow-sm border border-violet-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-violet-600" />
                  Add New Brand
                </h3>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setForm(emptyForm);
                  }}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600">
                    Brand Name *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
                    placeholder="e.g., Spice Express"
                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">
                    Cuisine Type *
                  </label>
                  <select
                    value={form.cuisineType}
                    onChange={(e) =>
                      setForm({ ...form, cuisineType: e.target.value })
                    }
                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none bg-white"
                  >
                    <option value="">Select cuisine</option>
                    {CUISINE_TYPES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">
                    Description
                  </label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    placeholder="Short description of this brand"
                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 flex items-center gap-2">
                    <Palette className="w-3.5 h-3.5" />
                    Brand Color
                  </label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="color"
                      value={form.brandColor}
                      onChange={(e) =>
                        setForm({ ...form, brandColor: e.target.value })
                      }
                      className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
                    />
                    <span className="text-sm text-gray-500">
                      {form.brandColor}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setForm(emptyForm);
                  }}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={addBrand}
                  disabled={!form.name.trim() || !form.cuisineType}
                  className="px-4 py-2 text-sm bg-violet-600 text-white font-medium rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Brand
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Brand Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {brands.map((brand) => (
            <motion.div
              key={brand.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`bg-white rounded-xl shadow-sm border overflow-hidden ${
                brand.active ? "border-gray-200" : "border-gray-100 opacity-70"
              }`}
            >
              {/* Brand color accent bar */}
              <div
                className="h-2"
                style={{ backgroundColor: brand.brandColor }}
              />

              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {/* Logo placeholder */}
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                      style={{ backgroundColor: brand.brandColor }}
                    >
                      {brand.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">
                        {brand.name}
                      </h3>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <ChefHat className="w-3 h-3" />
                        {brand.cuisineType}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleBrand(brand.id)}
                    className="focus:outline-none"
                  >
                    {brand.active ? (
                      <ToggleRight
                        className="w-8 h-8"
                        style={{ color: brand.brandColor }}
                      />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-gray-300" />
                    )}
                  </button>
                </div>

                {brand.description && (
                  <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                    {brand.description}
                  </p>
                )}

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                  <div className="text-center">
                    <p className="text-lg font-bold text-gray-900">
                      {brand.ordersToday}
                    </p>
                    <p className="text-[10px] text-gray-500">Orders</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-gray-900">
                      {formatPrice(brand.revenueToday, cur)}
                    </p>
                    <p className="text-[10px] text-gray-500">Revenue</p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-[10px] font-semibold ${
                      brand.active
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {brand.active ? "Active" : "Paused"}
                  </span>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() =>
                      setShowMenuManager(
                        showMenuManager === brand.id ? null : brand.id
                      )
                    }
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium bg-violet-50 text-violet-700 rounded-lg hover:bg-violet-100 transition-colors"
                  >
                    <Tag className="w-3 h-3" />
                    Menu
                  </button>
                  <button
                    onClick={() => toggleSharedInventory(brand.id)}
                    className={`flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      brand.sharedInventory
                        ? "bg-blue-50 text-blue-700 hover:bg-blue-100"
                        : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <Package className="w-3 h-3" />
                    {brand.sharedInventory ? "Shared" : "Separate"}
                  </button>
                </div>

                {/* Menu category manager */}
                <AnimatePresence>
                  {showMenuManager === brand.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs font-medium text-gray-600 mb-2">
                          Assigned Menu Categories
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {MENU_CATEGORIES.map((cat) => {
                            const isActive =
                              brand.menuCategories.includes(cat);
                            return (
                              <button
                                key={cat}
                                onClick={() =>
                                  toggleMenuCategory(brand.id, cat)
                                }
                                className={`px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${
                                  isActive
                                    ? "text-white"
                                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                }`}
                                style={
                                  isActive
                                    ? { backgroundColor: brand.brandColor }
                                    : undefined
                                }
                              >
                                {cat}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Performance Comparison */}
      <motion.div
        layout
        className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 bg-violet-100 rounded-lg">
            <BarChart3 className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              Brand Performance Comparison
            </h3>
            <p className="text-xs text-gray-500">
              Revenue comparison across brands today
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {brands.map((brand) => (
            <div key={brand.id} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  {brand.name}
                </span>
                <span className="text-sm font-bold text-gray-900">
                  {formatPrice(brand.revenueToday, cur)}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${(brand.revenueToday / maxRevenue) * 100}%`,
                  }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: brand.brandColor }}
                />
              </div>
              <div className="flex items-center gap-3 text-[10px] text-gray-400">
                <span>{brand.ordersToday} orders</span>
                <span>
                  Avg: {brand.ordersToday > 0
                    ? formatPrice(Math.round(brand.revenueToday / brand.ordersToday), cur)
                    : formatPrice(0, cur)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
