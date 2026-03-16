"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Martini,
  Plus,
  X,
  Trash2,
  Star,
  Search,
  ChevronDown,
  ChevronUp,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Printer,
  Download,
  Eye,
  Edit2,
  Sparkles,
  GlassWater,
  Leaf,
  Flame,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

interface Ingredient {
  name: string;
  quantity: string;
  unit: string;
}

interface Cocktail {
  id: string;
  name: string;
  category: "Classic" | "Signature" | "Mocktail" | "Shot";
  baseSpirit: string;
  ingredients: Ingredient[];
  steps: string;
  glassType: string;
  garnish: string;
  cost: number;
  price: number;
  rating: number;
  isFeatured: boolean;
  isSeasonal: boolean;
}

interface IngredientStock {
  name: string;
  stock: "High" | "Medium" | "Low" | "Out";
  usedIn: number;
}

const GLASS_TYPES = ["Highball", "Martini", "Rocks", "Coupe", "Shot", "Collins", "Wine", "Copper Mug"];
const CATEGORIES: Cocktail["category"][] = ["Classic", "Signature", "Mocktail", "Shot"];

const ingredientStock: IngredientStock[] = [];

export default function CocktailMenuTab() {
  const [cocktails, setCocktails] = useState<Cocktail[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedRecipe, setExpandedRecipe] = useState<string | null>(null);
  const [showStockWarnings, setShowStockWarnings] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "cards">("cards");

  const [newCocktail, setNewCocktail] = useState({
    name: "",
    category: "Classic" as Cocktail["category"],
    baseSpirit: "",
    ingredients: [{ name: "", quantity: "", unit: "ml" }] as Ingredient[],
    steps: "",
    glassType: "Highball",
    garnish: "",
    cost: "",
    price: "",
  });

  const filteredCocktails = cocktails.filter((c) => {
    const matchesCategory = selectedCategory === "All" || c.category === selectedCategory;
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.baseSpirit.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const lowStockIngredients = ingredientStock.filter(
    (i) => i.stock === "Low" || i.stock === "Out"
  );

  const addIngredient = () => {
    setNewCocktail((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, { name: "", quantity: "", unit: "ml" }],
    }));
  };

  const removeIngredient = (index: number) => {
    setNewCocktail((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index),
    }));
  };

  const updateIngredient = (index: number, field: keyof Ingredient, value: string) => {
    setNewCocktail((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((ing, i) =>
        i === index ? { ...ing, [field]: value } : ing
      ),
    }));
  };

  const createCocktail = () => {
    if (!newCocktail.name.trim() || !newCocktail.price) return;
    const cocktail: Cocktail = {
      id: Date.now().toString(),
      name: newCocktail.name.trim(),
      category: newCocktail.category,
      baseSpirit: newCocktail.baseSpirit,
      ingredients: newCocktail.ingredients.filter((i) => i.name.trim()),
      steps: newCocktail.steps,
      glassType: newCocktail.glassType,
      garnish: newCocktail.garnish,
      cost: parseFloat(newCocktail.cost) || 0,
      price: parseFloat(newCocktail.price),
      rating: 0,
      isFeatured: false,
      isSeasonal: false,
    };
    setCocktails((prev) => [...prev, cocktail]);
    setNewCocktail({
      name: "",
      category: "Classic",
      baseSpirit: "",
      ingredients: [{ name: "", quantity: "", unit: "ml" }],
      steps: "",
      glassType: "Highball",
      garnish: "",
      cost: "",
      price: "",
    });
    setShowCreateForm(false);
  };

  const toggleFeatured = (id: string) => {
    setCocktails((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isFeatured: !c.isFeatured } : c))
    );
  };

  const toggleSeasonal = (id: string) => {
    setCocktails((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isSeasonal: !c.isSeasonal } : c))
    );
  };

  const deleteCocktail = (id: string) => {
    setCocktails((prev) => prev.filter((c) => c.id !== id));
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Classic":
        return <Martini className="w-4 h-4" />;
      case "Signature":
        return <Sparkles className="w-4 h-4" />;
      case "Mocktail":
        return <Leaf className="w-4 h-4" />;
      case "Shot":
        return <Flame className="w-4 h-4" />;
      default:
        return <Martini className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Classic":
        return "text-amber-400 bg-amber-500/10";
      case "Signature":
        return "text-purple-400 bg-purple-500/10";
      case "Mocktail":
        return "text-emerald-400 bg-emerald-500/10";
      case "Shot":
        return "text-red-400 bg-red-500/10";
      default:
        return "text-zinc-400 bg-zinc-500/10";
    }
  };

  return (
    <div className="space-y-6">
      {/* Ingredient Stock Warnings */}
      <AnimatePresence>
        {showStockWarnings && lowStockIngredients.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <h4 className="text-amber-400 font-medium">Low Stock Ingredients</h4>
              </div>
              <button
                onClick={() => setShowStockWarnings(false)}
                className="text-amber-400/60 hover:text-amber-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {lowStockIngredients.map((ing) => (
                <span
                  key={ing.name}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                    ing.stock === "Out"
                      ? "bg-red-500/20 text-red-400"
                      : "bg-amber-500/20 text-amber-300"
                  }`}
                >
                  {ing.name} ({ing.stock}) - used in {ing.usedIn} recipes
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search cocktails..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-9 pr-3 py-2 text-white text-sm focus:outline-none focus:border-rose-500"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Recipe
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg text-sm font-medium transition-colors">
            <Printer className="w-3.5 h-3.5" />
            Print
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg text-sm font-medium transition-colors">
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        {["All", ...CATEGORIES].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              selectedCategory === cat
                ? "bg-rose-600 text-white"
                : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            {cat}
            {cat !== "All" && (
              <span className="ml-1.5 text-xs opacity-60">
                ({cocktails.filter((c) => c.category === cat).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Create Form */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-zinc-800/80 rounded-xl p-5 border border-zinc-700/50 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-white font-medium">Create New Recipe</h4>
                <button onClick={() => setShowCreateForm(false)} className="text-zinc-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="col-span-2">
                  <label className="text-zinc-400 text-sm mb-1 block">Name</label>
                  <input
                    type="text"
                    value={newCocktail.name}
                    onChange={(e) => setNewCocktail((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Espresso Martini"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 text-sm mb-1 block">Category</label>
                  <select
                    value={newCocktail.category}
                    onChange={(e) =>
                      setNewCocktail((prev) => ({
                        ...prev,
                        category: e.target.value as Cocktail["category"],
                      }))
                    }
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-rose-500"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-zinc-400 text-sm mb-1 block">Base Spirit</label>
                  <input
                    type="text"
                    value={newCocktail.baseSpirit}
                    onChange={(e) =>
                      setNewCocktail((prev) => ({ ...prev, baseSpirit: e.target.value }))
                    }
                    placeholder="e.g., Vodka"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              {/* Ingredients */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-zinc-400 text-sm">Ingredients</label>
                  <button
                    onClick={addIngredient}
                    className="text-rose-400 hover:text-rose-300 text-sm flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </div>
                <div className="space-y-2">
                  {newCocktail.ingredients.map((ing, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        value={ing.name}
                        onChange={(e) => updateIngredient(idx, "name", e.target.value)}
                        placeholder="Ingredient"
                        className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-rose-500"
                      />
                      <input
                        type="text"
                        value={ing.quantity}
                        onChange={(e) => updateIngredient(idx, "quantity", e.target.value)}
                        placeholder="Qty"
                        className="w-20 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-rose-500"
                      />
                      <select
                        value={ing.unit}
                        onChange={(e) => updateIngredient(idx, "unit", e.target.value)}
                        className="w-20 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-rose-500"
                      >
                        <option value="ml">ml</option>
                        <option value="g">g</option>
                        <option value="dashes">dashes</option>
                        <option value="leaves">leaves</option>
                        <option value="slices">slices</option>
                      </select>
                      {newCocktail.ingredients.length > 1 && (
                        <button
                          onClick={() => removeIngredient(idx)}
                          className="text-zinc-400 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-zinc-400 text-sm mb-1 block">Preparation Steps</label>
                <textarea
                  value={newCocktail.steps}
                  onChange={(e) => setNewCocktail((prev) => ({ ...prev, steps: e.target.value }))}
                  placeholder="Step by step preparation..."
                  rows={3}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-rose-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-zinc-400 text-sm mb-1 block">Glass Type</label>
                  <select
                    value={newCocktail.glassType}
                    onChange={(e) =>
                      setNewCocktail((prev) => ({ ...prev, glassType: e.target.value }))
                    }
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-rose-500"
                  >
                    {GLASS_TYPES.map((glass) => (
                      <option key={glass} value={glass}>
                        {glass}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-zinc-400 text-sm mb-1 block">Garnish</label>
                  <input
                    type="text"
                    value={newCocktail.garnish}
                    onChange={(e) =>
                      setNewCocktail((prev) => ({ ...prev, garnish: e.target.value }))
                    }
                    placeholder="e.g., Lime wedge"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 text-sm mb-1 block">Cost (Rs)</label>
                  <input
                    type="number"
                    value={newCocktail.cost}
                    onChange={(e) =>
                      setNewCocktail((prev) => ({ ...prev, cost: e.target.value }))
                    }
                    placeholder="180"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 text-sm mb-1 block">Price (Rs)</label>
                  <input
                    type="number"
                    value={newCocktail.price}
                    onChange={(e) =>
                      setNewCocktail((prev) => ({ ...prev, price: e.target.value }))
                    }
                    placeholder="750"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              {newCocktail.cost && newCocktail.price && (
                <div className="bg-zinc-900 rounded-lg p-3 flex items-center justify-between">
                  <span className="text-zinc-400 text-sm">Profit Margin</span>
                  <span className="text-emerald-400 font-semibold">
                    {Math.round(
                      ((parseFloat(newCocktail.price) - parseFloat(newCocktail.cost)) /
                        parseFloat(newCocktail.price)) *
                        100
                    )}
                    % (Rs {parseFloat(newCocktail.price) - parseFloat(newCocktail.cost)} profit)
                  </span>
                </div>
              )}

              <button
                onClick={createCocktail}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white rounded-lg py-2.5 font-medium transition-colors"
              >
                Create Recipe
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cocktail Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredCocktails.map((cocktail, index) => (
          <motion.div
            key={cocktail.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`bg-zinc-800/80 rounded-xl border ${
              cocktail.isFeatured ? "border-rose-500/50" : "border-zinc-700/50"
            } overflow-hidden`}
          >
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getCategoryColor(cocktail.category)}`}>
                    {getCategoryIcon(cocktail.category)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-white font-medium">{cocktail.name}</h4>
                      {cocktail.isFeatured && (
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      )}
                      {cocktail.isSeasonal && (
                        <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] rounded-full font-medium">
                          Seasonal
                        </span>
                      )}
                    </div>
                    <p className="text-zinc-400 text-xs">
                      {cocktail.category} &middot; {cocktail.baseSpirit || "No spirit"} &middot;{" "}
                      {cocktail.glassType}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span className="text-zinc-300 text-sm">{cocktail.rating || "-"}</span>
                </div>
              </div>

              {/* Ingredients Preview */}
              <div className="flex flex-wrap gap-1 mb-3">
                {cocktail.ingredients.map((ing, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 bg-zinc-700/50 text-zinc-300 text-xs rounded-md"
                  >
                    {ing.quantity}{ing.unit} {ing.name}
                  </span>
                ))}
              </div>

              {/* Price & Cost */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-rose-400 font-bold">Rs {cocktail.price}</p>
                    <p className="text-zinc-500 text-xs">Selling Price</p>
                  </div>
                  <div>
                    <p className="text-zinc-300 text-sm">Rs {cocktail.cost}</p>
                    <p className="text-zinc-500 text-xs">Cost</p>
                  </div>
                  <div>
                    <p className="text-emerald-400 text-sm font-medium">
                      {Math.round(((cocktail.price - cocktail.cost) / cocktail.price) * 100)}%
                    </p>
                    <p className="text-zinc-500 text-xs">Margin</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-zinc-700/50">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setExpandedRecipe(expandedRecipe === cocktail.id ? null : cocktail.id)
                    }
                    className="flex items-center gap-1 text-zinc-400 hover:text-white text-sm transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Recipe
                  </button>
                  <button
                    onClick={() => toggleFeatured(cocktail.id)}
                    className={`flex items-center gap-1 text-sm transition-colors ${
                      cocktail.isFeatured ? "text-amber-400" : "text-zinc-400 hover:text-amber-400"
                    }`}
                  >
                    <Star className="w-3.5 h-3.5" />
                    Featured
                  </button>
                  <button
                    onClick={() => toggleSeasonal(cocktail.id)}
                    className={`flex items-center gap-1 text-sm transition-colors ${
                      cocktail.isSeasonal
                        ? "text-emerald-400"
                        : "text-zinc-400 hover:text-emerald-400"
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Seasonal
                  </button>
                </div>
                <button
                  onClick={() => deleteCocktail(cocktail.id)}
                  className="text-zinc-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Expanded Recipe */}
            <AnimatePresence>
              {expandedRecipe === cocktail.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-t border-zinc-700/50"
                >
                  <div className="p-4 bg-zinc-900/50 space-y-3">
                    <div>
                      <p className="text-zinc-400 text-xs font-medium uppercase mb-1">Preparation</p>
                      <p className="text-zinc-300 text-sm">{cocktail.steps}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-zinc-400 text-xs font-medium uppercase">Glass</p>
                        <p className="text-zinc-300 text-sm">{cocktail.glassType}</p>
                      </div>
                      <div>
                        <p className="text-zinc-400 text-xs font-medium uppercase">Garnish</p>
                        <p className="text-zinc-300 text-sm">{cocktail.garnish}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      {filteredCocktails.length === 0 && (
        <div className="text-center py-12">
          <Martini className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400">No cocktails found</p>
          <p className="text-zinc-500 text-sm">Try a different search or category</p>
        </div>
      )}

      {/* Mocktail Section Highlight */}
      {selectedCategory === "All" && cocktails.some((c) => c.category === "Mocktail") && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Leaf className="w-5 h-5 text-emerald-400" />
            <h3 className="text-white font-semibold">Mocktail Corner</h3>
            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">
              Non-Alcoholic
            </span>
          </div>
          <div className="bg-gradient-to-r from-emerald-500/5 to-transparent rounded-xl p-4 border border-emerald-500/20">
            <div className="flex gap-3 overflow-x-auto">
              {cocktails
                .filter((c) => c.category === "Mocktail")
                .map((mocktail) => (
                  <div
                    key={mocktail.id}
                    className="min-w-[200px] bg-zinc-800/80 rounded-lg p-3 border border-zinc-700/50"
                  >
                    <p className="text-white text-sm font-medium">{mocktail.name}</p>
                    <p className="text-zinc-400 text-xs mt-0.5">
                      {mocktail.ingredients.length} ingredients
                    </p>
                    <p className="text-emerald-400 font-semibold text-sm mt-2">
                      Rs {mocktail.price}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
