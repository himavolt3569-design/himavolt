"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatPrice, getCurrencySymbol } from "@/lib/currency";
import { useRestaurant } from "@/context/RestaurantContext";
import {
  Leaf,
  Sun,
  Snowflake,
  CloudRain,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  ToggleLeft,
  ToggleRight,
  Calendar,
  Star,
  TrendingUp,
  Package,
  Clock,
  Palette,
  RotateCcw,
  StickyNote,
  Award,
  Eye,
} from "lucide-react";

type Season = "Spring" | "Summer" | "Autumn" | "Winter";

interface SeasonalItem {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  season: Season;
  startDate: string;
  endDate: string;
  featured: boolean;
  limitedQuantity: boolean;
  quantityLeft?: number;
  sourcingNotes: string;
  soldCount?: number;
}

interface PastItem {
  id: string;
  name: string;
  season: Season;
  totalSold: number;
  revenue: number;
  rating: number;
}

const seasonConfig: Record<Season, { icon: typeof Sun; color: string; bg: string }> = {
  Spring: { icon: Leaf, color: "text-green-600", bg: "bg-green-50" },
  Summer: { icon: Sun, color: "text-orange-600", bg: "bg-orange-50" },
  Autumn: { icon: CloudRain, color: "text-amber-600", bg: "bg-amber-50" },
  Winter: { icon: Snowflake, color: "text-blue-600", bg: "bg-blue-50" },
};

export default function SeasonalMenuTab() {
  const { selectedRestaurant } = useRestaurant();
  const cur = selectedRestaurant?.currency ?? "NPR";
  const [currentSeason, setCurrentSeason] = useState<Season>("Spring");
  const [items, setItems] = useState<SeasonalItem[]>([]);
  const [autoRotate, setAutoRotate] = useState(true);
  const [seasonalTheme, setSeasonalTheme] = useState(true);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState<Partial<SeasonalItem>>({
    name: "",
    description: "",
    category: "Beverages",
    price: 0,
    season: currentSeason,
    startDate: "",
    endDate: "",
    featured: false,
    limitedQuantity: false,
    sourcingNotes: "",
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewTab, setViewTab] = useState<"active" | "upcoming" | "past">("active");

  const activeItems = items.filter((i) => i.season === currentSeason);
  const upcomingSeasons: Season[] = (["Spring", "Summer", "Autumn", "Winter"] as Season[]).filter(
    (s) => s !== currentSeason
  );

  const SeasonIcon = seasonConfig[currentSeason].icon;

  const addItem = () => {
    if (!newItem.name?.trim() || !newItem.price) return;
    setItems((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        name: newItem.name!.trim(),
        description: newItem.description || "",
        category: newItem.category || "Beverages",
        price: newItem.price || 0,
        season: newItem.season || currentSeason,
        startDate: newItem.startDate || "",
        endDate: newItem.endDate || "",
        featured: newItem.featured || false,
        limitedQuantity: newItem.limitedQuantity || false,
        quantityLeft: newItem.limitedQuantity ? 20 : undefined,
        sourcingNotes: newItem.sourcingNotes || "",
        soldCount: 0,
      },
    ]);
    setNewItem({
      name: "", description: "", category: "Beverages", price: 0,
      season: currentSeason, startDate: "", endDate: "", featured: false,
      limitedQuantity: false, sourcingNotes: "",
    });
    setShowAddForm(false);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const toggleFeatured = (id: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, featured: !i.featured } : i)));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${seasonConfig[currentSeason].bg}`}>
            <SeasonIcon className={`w-6 h-6 ${seasonConfig[currentSeason].color}`} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Seasonal Menu</h2>
            <p className="text-sm text-gray-500">Rotating seasonal specials & limited-time items</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={currentSeason}
            onChange={(e) => setCurrentSeason(e.target.value as Season)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-300"
          >
            {(["Spring", "Summer", "Autumn", "Winter"] as Season[]).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: "Active Items", value: activeItems.length, icon: Package, color: `${seasonConfig[currentSeason].color} ${seasonConfig[currentSeason].bg}` },
          { label: "Featured Items", value: activeItems.filter((i) => i.featured).length, icon: Star, color: "text-yellow-600 bg-yellow-50" },
          { label: "Limited Items", value: items.filter((i) => i.limitedQuantity).length, icon: Clock, color: "text-red-600 bg-red-50" },
          { label: "Total Sold (Season)", value: activeItems.reduce((s, i) => s + (i.soldCount || 0), 0), icon: TrendingUp, color: "text-green-600 bg-green-50" },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            whileHover={{ scale: 1.02 }}
            className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stat.color}`}>
                <stat.icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{stat.label}</p>
                <p className="text-lg font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Toggles Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <RotateCcw className="w-4 h-4 text-amber-500" />
            <div>
              <p className="text-sm font-medium text-gray-700">Auto-Rotate Menu</p>
              <p className="text-xs text-gray-400">Automatically switch based on date ranges</p>
            </div>
          </div>
          <button onClick={() => setAutoRotate(!autoRotate)}>
            {autoRotate ? (
              <ToggleRight className="w-7 h-7 text-amber-500" />
            ) : (
              <ToggleLeft className="w-7 h-7 text-gray-400" />
            )}
          </button>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Palette className="w-4 h-4 text-amber-500" />
            <div>
              <p className="text-sm font-medium text-gray-700">Seasonal Theme</p>
              <p className="text-xs text-gray-400">Apply seasonal decorations to customer menu</p>
            </div>
          </div>
          <button onClick={() => setSeasonalTheme(!seasonalTheme)}>
            {seasonalTheme ? (
              <ToggleRight className="w-7 h-7 text-amber-500" />
            ) : (
              <ToggleLeft className="w-7 h-7 text-gray-400" />
            )}
          </button>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {(["active", "upcoming", "past"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setViewTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewTab === tab ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Active Seasonal Items */}
      {viewTab === "active" && (
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              {currentSeason} Menu Items
            </h3>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 px-3 py-2 bg-amber-500 text-white rounded-lg text-sm font-semibold hover:bg-amber-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </button>
          </div>

          {/* Add Form */}
          <AnimatePresence>
            {showAddForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="border-b border-gray-100 bg-amber-50/50"
              >
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Item name"
                      value={newItem.name}
                      onChange={(e) => setNewItem((p) => ({ ...p, name: e.target.value }))}
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                    />
                    <input
                      type="text"
                      placeholder="Description"
                      value={newItem.description}
                      onChange={(e) => setNewItem((p) => ({ ...p, description: e.target.value }))}
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <select
                      value={newItem.category}
                      onChange={(e) => setNewItem((p) => ({ ...p, category: e.target.value }))}
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                    >
                      <option>Beverages</option>
                      <option>Pastry</option>
                      <option>Dessert</option>
                      <option>Snack</option>
                      <option>Meal</option>
                    </select>
                    <input
                      type="number"
                      placeholder={`Price (${getCurrencySymbol(cur)})`}
                      min={0}
                      value={newItem.price || ""}
                      onChange={(e) => setNewItem((p) => ({ ...p, price: Number(e.target.value) }))}
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                    />
                    <input
                      type="date"
                      value={newItem.startDate}
                      onChange={(e) => setNewItem((p) => ({ ...p, startDate: e.target.value }))}
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                    />
                    <input
                      type="date"
                      value={newItem.endDate}
                      onChange={(e) => setNewItem((p) => ({ ...p, endDate: e.target.value }))}
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <select
                      value={newItem.season}
                      onChange={(e) => setNewItem((p) => ({ ...p, season: e.target.value as Season }))}
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                    >
                      {(["Spring", "Summer", "Autumn", "Winter"] as Season[]).map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Ingredient sourcing notes"
                      value={newItem.sourcingNotes}
                      onChange={(e) => setNewItem((p) => ({ ...p, sourcingNotes: e.target.value }))}
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                    />
                  </div>
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newItem.limitedQuantity}
                        onChange={(e) => setNewItem((p) => ({ ...p, limitedQuantity: e.target.checked }))}
                        className="rounded accent-amber-500"
                      />
                      Limited Quantity
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newItem.featured}
                        onChange={(e) => setNewItem((p) => ({ ...p, featured: e.target.checked }))}
                        className="rounded accent-amber-500"
                      />
                      Featured
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={addItem}
                      className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-semibold hover:bg-amber-600 transition-colors"
                    >
                      Add Item
                    </button>
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Items List */}
          <div className="divide-y divide-gray-50">
            <AnimatePresence>
              {activeItems.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, x: 40 }}
                  className="px-5 py-4 hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg ${seasonConfig[item.season].bg} flex items-center justify-center`}>
                        {(() => { const I = seasonConfig[item.season].icon; return <I className={`w-5 h-5 ${seasonConfig[item.season].color}`} />; })()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-800">{item.name}</p>
                          {item.featured && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700">
                              <Star className="w-3 h-3" /> Featured
                            </span>
                          )}
                          {item.limitedQuantity && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-600">
                              {item.quantityLeft} left
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-gray-400">{item.category}</span>
                          <span className="text-xs text-gray-300">|</span>
                          <span className="text-xs text-gray-400">{item.startDate} to {item.endDate}</span>
                          {item.sourcingNotes && (
                            <>
                              <span className="text-xs text-gray-300">|</span>
                              <span className="text-xs text-amber-500 flex items-center gap-1">
                                <StickyNote className="w-3 h-3" /> {item.sourcingNotes}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-amber-600">{formatPrice(item.price, cur)}</span>
                      <button
                        onClick={() => toggleFeatured(item.id)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          item.featured ? "text-yellow-500 bg-yellow-50" : "text-gray-300 hover:text-yellow-500 hover:bg-yellow-50"
                        }`}
                      >
                        <Star className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {activeItems.length === 0 && (
              <div className="p-8 text-center text-gray-400 text-sm">
                No items for {currentSeason}. Add seasonal items to get started.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upcoming Seasons */}
      {viewTab === "upcoming" && (
        <div className="space-y-4">
          {upcomingSeasons.map((season) => {
            const seasonItems = items.filter((i) => i.season === season);
            const SI = seasonConfig[season].icon;
            return (
              <div key={season} className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 p-5 border-b border-gray-100">
                  <div className={`p-2 rounded-lg ${seasonConfig[season].bg}`}>
                    <SI className={`w-4 h-4 ${seasonConfig[season].color}`} />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-700">{season}</h3>
                  <span className="text-xs text-gray-400">{seasonItems.length} items planned</span>
                </div>
                {seasonItems.length > 0 ? (
                  <div className="divide-y divide-gray-50">
                    {seasonItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between px-5 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{item.name}</p>
                          <p className="text-xs text-gray-400">{item.category} - {formatPrice(item.price, cur)}</p>
                        </div>
                        <span className="text-xs text-gray-400">{item.startDate} to {item.endDate}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-5 text-center text-sm text-gray-400">No items planned yet</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Past Performance */}
      {viewTab === "past" && (
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-500" />
              Past Seasonal Performance
            </h3>
          </div>
          <div className="divide-y divide-gray-50">
            {([] as PastItem[]).map((item, i) => {
              const SI = seasonConfig[item.season].icon;
              return (
                <motion.div
                  key={item.id}
                  whileHover={{ backgroundColor: "rgba(251, 191, 36, 0.04)" }}
                  className="flex items-center justify-between px-5 py-3.5"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-center text-sm font-bold text-gray-400">#{i + 1}</span>
                    <div className={`p-1.5 rounded-lg ${seasonConfig[item.season].bg}`}>
                      <SI className={`w-3.5 h-3.5 ${seasonConfig[item.season].color}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{item.name}</p>
                      <p className="text-xs text-gray-400">{item.season}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-800">{item.totalSold} sold</p>
                      <p className="text-xs text-gray-400">{formatPrice(item.revenue, cur)}</p>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 rounded-full">
                      <Star className="w-3 h-3 text-amber-500" />
                      <span className="text-xs font-semibold text-amber-700">{item.rating}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}
