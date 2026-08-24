"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Clock, Flame, Star, TrendingUp, Sparkles, Pin, History, Calendar, Search, Coffee, Croissant, Cookie, Cake } from "lucide-react";

interface DailySpecial {
  id: string;
  name: string;
  category: "Bread" | "Pastry" | "Cookie" | "Cake";
  batchQuantity: number;
  availableQuantity: number;
  bakedAt: string;
  availableUntil: string;
  price: number;
  description: string;
  soldOut: boolean;
  featured: boolean;
  badge: ("Fresh" | "Limited" | "New" | "Popular") | null;
}

interface RecurringSpecial {
  id: string;
  name: string;
  category: string;
  days: string[];
  price: number;
}

interface PastSpecial {
  id: string;
  name: string;
  date: string;
  quantityBaked: number;
  quantitySold: number;
  revenue: number;
}

const CATEGORIES = ["Bread", "Pastry", "Cookie", "Cake"] as const;
const BADGES = ["Fresh", "Limited", "New", "Popular"] as const;
const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Bread: <Coffee className="w-4 h-4" />,
  Pastry: <Croissant className="w-4 h-4" />,
  Cookie: <Cookie className="w-4 h-4" />,
  Cake: <Cake className="w-4 h-4" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  Bread: "bg-[var(--accent-muted)] text-[var(--accent-text)] border-[var(--accent-border)]",
  Pastry: "bg-pink-50 text-pink-700 border-pink-200",
  Cookie: "bg-[var(--accent)] text-[var(--accent)] border-[var(--accent-border)]",
  Cake: "bg-rose-50 text-rose-700 border-rose-200",
};

const BADGE_STYLES: Record<string, string> = {
  Fresh: "bg-[var(--accent-muted)] text-[var(--accent-text)]",
  Limited: "bg-[var(--accent-muted)] text-[var(--accent-text)]",
  New: "bg-blue-100 text-blue-700",
  Popular: "bg-purple-100 text-purple-700",
};

export default function DailySpecialsTab() {
  const [specials, setSpecials] = useState<DailySpecial[]>([]);
  const [recurring] = useState<RecurringSpecial[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");

  const [form, setForm] = useState({
    name: "",
    category: "" as DailySpecial["category"] | "",
    batchQuantity: 0,
    price: 0,
    description: "",
    availableUntil: "",
    badge: null as DailySpecial["badge"],
  });

  const filteredSpecials = specials.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "All" || s.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleAddSpecial = () => {
    if (!form.name || !form.category || form.batchQuantity <= 0) return;
    const newSpecial: DailySpecial = {
      id: `DS-${String(specials.length + 1).padStart(3, "0")}`,
      name: form.name,
      category: form.category as DailySpecial["category"],
      batchQuantity: form.batchQuantity,
      availableQuantity: form.batchQuantity,
      bakedAt: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
      availableUntil: form.availableUntil || "5:00 PM",
      price: form.price,
      description: form.description,
      soldOut: false,
      featured: false,
      badge: form.badge,
    };
    setSpecials([newSpecial, ...specials]);
    setForm({ name: "", category: "", batchQuantity: 0, price: 0, description: "", availableUntil: "", badge: null });
    setShowForm(false);
  };

  const toggleSoldOut = (id: string) => {
    setSpecials(
      specials.map((s) =>
        s.id === id ? { ...s, soldOut: !s.soldOut, availableQuantity: s.soldOut ? s.batchQuantity : 0 } : s
      )
    );
  };

  const toggleFeatured = (id: string) => {
    setSpecials(
      specials.map((s) => (s.id === id ? { ...s, featured: !s.featured } : { ...s, featured: false }))
    );
  };

  const updateBadge = (id: string, badge: DailySpecial["badge"]) => {
    setSpecials(specials.map((s) => (s.id === id ? { ...s, badge: s.badge === badge ? null : badge } : s)));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-1)]">Daily Specials</h2>
          <p className="text-sm text-[var(--text-2)] mt-0.5">
            Highlight today&apos;s fresh-from-oven items
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--surface)] text-[var(--text-2)] hover:bg-[var(--surface-alt)] transition-colors text-sm font-medium"
          >
            <History className="w-4 h-4" />
            History
          </button>
          <button
            onClick={() => setShowSchedule(!showSchedule)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-pink-50 text-pink-600 hover:bg-pink-100 transition-colors text-sm font-medium"
          >
            <Calendar className="w-4 h-4" />
            Schedule
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500 text-white hover:bg-rose-600 transition-colors text-sm font-medium shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Special
          </button>
        </div>
      </div>

      {specials.find((s) => s.featured) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-rose-500 to-pink-500 rounded-xl p-5 text-white shadow-lg"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Star className="w-4 h-4 fill-white" />
                <span className="text-xs font-medium uppercase tracking-wide opacity-90">
                  Featured Special
                </span>
              </div>
              <h3 className="text-xl font-bold">{specials.find((s) => s.featured)!.name}</h3>
              <p className="text-sm opacity-90 mt-1">
                {specials.find((s) => s.featured)!.description}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">${specials.find((s) => s.featured)!.price.toFixed(2)}</p>
              <p className="text-xs opacity-75 mt-1">
                {specials.find((s) => s.featured)!.availableQuantity} left of{" "}
                {specials.find((s) => s.featured)!.batchQuantity}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Search & Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-3)]" />
          <input
            type="text"
            placeholder="Search specials..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
          />
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => setCategoryFilter("All")}
            className={`text-xs px-3 py-2 rounded-lg font-medium transition-colors ${
              categoryFilter === "All"
                ? "bg-rose-500 text-white"
                : "bg-[var(--surface)] text-[var(--text-2)] hover:bg-[var(--surface-alt)]"
            }`}
          >
            All
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`text-xs px-3 py-2 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                categoryFilter === cat
                  ? "bg-rose-500 text-white"
                  : "bg-[var(--surface)] text-[var(--text-2)] hover:bg-[var(--surface-alt)]"
              }`}
            >
              {CATEGORY_ICONS[cat]}
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <AnimatePresence>
          {filteredSpecials.map((special, index) => (
            <motion.div
              key={special.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ type: "spring", bounce: 0.2, duration: 0.4, delay: index * 0.05 }}
              className={`bg-[var(--canvas)] rounded-xl border shadow-sm p-4 hover:shadow-md transition-shadow ${
                special.soldOut ? "border-[var(--border)] opacity-75" : "border-rose-100"
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                      CATEGORY_COLORS[special.category]
                    }`}
                  >
                    {special.category}
                  </span>
                  {special.badge && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        BADGE_STYLES[special.badge]
                      }`}
                    >
                      {special.badge === "Fresh" && <Sparkles className="w-2.5 h-2.5 inline mr-0.5" />}
                      {special.badge === "Popular" && <TrendingUp className="w-2.5 h-2.5 inline mr-0.5" />}
                      {special.badge === "Limited" && <Flame className="w-2.5 h-2.5 inline mr-0.5" />}
                      {special.badge}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleFeatured(special.id)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      special.featured
                        ? "bg-[var(--accent-muted)] text-[var(--accent-text)]"
                        : "hover:bg-[var(--surface)] text-[var(--text-3)]"
                    }`}
                    title="Feature this special"
                  >
                    <Pin className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <h4 className={`font-semibold text-[var(--text-1)] ${special.soldOut ? "line-through" : ""}`}>
                {special.name}
              </h4>
              <p className="text-xs text-[var(--text-2)] mt-0.5">{special.description}</p>

              <div className="flex items-center gap-4 mt-3 text-xs text-[var(--text-3)]">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Baked at {special.bakedAt}
                </span>
                <span>Until {special.availableUntil}</span>
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border-soft)]">
                <div>
                  <p className="text-lg font-bold text-[var(--text-1)]">${special.price.toFixed(2)}</p>
                  <p className="text-xs text-[var(--text-3)]">
                    {special.availableQuantity}/{special.batchQuantity} available
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {BADGES.map((badge) => (
                      <button
                        key={badge}
                        onClick={() => updateBadge(special.id, badge)}
                        className={`text-[9px] px-1.5 py-0.5 rounded transition-colors ${
                          special.badge === badge
                            ? BADGE_STYLES[badge]
                            : "bg-[var(--canvas-sub)] text-[var(--text-3)] hover:bg-[var(--surface)]"
                        }`}
                      >
                        {badge}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => toggleSoldOut(special.id)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                      special.soldOut
                        ? "bg-[var(--accent-muted)] text-[var(--accent-text)] hover:bg-[#fde9ba]"
                        : "bg-red-100 text-red-700 hover:bg-red-200"
                    }`}
                  >
                    {special.soldOut ? "Restock" : "Sold Out"}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredSpecials.length === 0 && (
        <div className="text-center py-12 bg-[var(--canvas)] rounded-xl border border-rose-100">
          <Flame className="w-12 h-12 text-[var(--text-3)] mx-auto mb-3" />
          <p className="text-[var(--text-3)] text-sm">No specials found</p>
        </div>
      )}

      <AnimatePresence>
        {showSchedule && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-[var(--canvas)] rounded-xl border border-rose-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-[var(--text-2)] mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-rose-500" />
                Recurring Specials Schedule
              </h3>
              <div className="space-y-3">
                {recurring.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-rose-50 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium text-[var(--text-2)]">{item.name}</p>
                      <p className="text-xs text-[var(--text-3)]">{item.category} - ${item.price.toFixed(2)}</p>
                    </div>
                    <div className="flex gap-1">
                      {DAYS_OF_WEEK.map((day) => (
                        <span
                          key={day}
                          className={`text-[10px] w-8 h-6 flex items-center justify-center rounded font-medium ${
                            item.days.includes(day)
                              ? "bg-rose-500 text-white"
                              : "bg-[var(--canvas)] text-[var(--text-3)] border border-[var(--border)]"
                          }`}
                        >
                          {day}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-[var(--canvas)] rounded-xl border border-rose-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-[var(--text-2)] mb-4 flex items-center gap-2">
                <History className="w-4 h-4 text-rose-500" />
                Past Specials Performance
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border-soft)]">
                      <th className="text-left text-xs font-medium text-[var(--text-3)] pb-2">Item</th>
                      <th className="text-left text-xs font-medium text-[var(--text-3)] pb-2">Date</th>
                      <th className="text-right text-xs font-medium text-[var(--text-3)] pb-2">Baked</th>
                      <th className="text-right text-xs font-medium text-[var(--text-3)] pb-2">Sold</th>
                      <th className="text-right text-xs font-medium text-[var(--text-3)] pb-2">Sell %</th>
                      <th className="text-right text-xs font-medium text-[var(--text-3)] pb-2">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {([] as PastSpecial[]).map((h) => (
                      <tr key={h.id} className="border-b border-[var(--border-soft)]">
                        <td className="py-2 font-medium text-[var(--text-2)]">{h.name}</td>
                        <td className="py-2 text-[var(--text-2)]">{h.date}</td>
                        <td className="py-2 text-right text-[var(--text-2)]">{h.quantityBaked}</td>
                        <td className="py-2 text-right text-[var(--text-2)] font-medium">{h.quantitySold}</td>
                        <td className="py-2 text-right">
                          <span
                            className={`text-xs font-medium ${
                              (h.quantitySold / h.quantityBaked) * 100 >= 90
                                ? "text-[var(--accent-text)]"
                                : "text-[var(--accent-text)]"
                            }`}
                          >
                            {((h.quantitySold / h.quantityBaked) * 100).toFixed(0)}%
                          </span>
                        </td>
                        <td className="py-2 text-right font-semibold text-[var(--text-1)]">
                          ${h.revenue.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[var(--canvas)] rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between p-5 border-b border-[var(--border-soft)]">
                <h3 className="text-lg font-bold text-[var(--text-1)]">Add Daily Special</h3>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-1.5 rounded-lg hover:bg-[var(--surface)] transition-colors"
                >
                  <X className="w-5 h-5 text-[var(--text-3)]" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-2)] mb-1">
                    Item Name *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                    placeholder="e.g., Sourdough Boule"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-2)] mb-2">
                    Category *
                  </label>
                  <div className="flex gap-2">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setForm({ ...form, category: cat })}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-sm font-medium transition-colors ${
                          form.category === cat
                            ? "bg-rose-500 text-white border-rose-500"
                            : "bg-[var(--canvas)] text-[var(--text-2)] border-[var(--border)] hover:border-rose-300"
                        }`}
                      >
                        {CATEGORY_ICONS[cat]}
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-2)] mb-1">
                      Quantity Baked *
                    </label>
                    <input
                      type="number"
                      value={form.batchQuantity}
                      onChange={(e) => setForm({ ...form, batchQuantity: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                      min={1}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-2)] mb-1">
                      Price ($)
                    </label>
                    <input
                      type="number"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                      min={0}
                      step={0.5}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-2)] mb-1">
                    Description
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none"
                    placeholder="Describe this special item..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-2)] mb-1">
                    Available Until
                  </label>
                  <input
                    type="time"
                    value={form.availableUntil}
                    onChange={(e) => setForm({ ...form, availableUntil: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-2)] mb-2">
                    Badge
                  </label>
                  <div className="flex gap-2">
                    {BADGES.map((badge) => (
                      <button
                        key={badge}
                        onClick={() => setForm({ ...form, badge: form.badge === badge ? null : badge })}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                          form.badge === badge
                            ? BADGE_STYLES[badge] + " border-transparent"
                            : "bg-[var(--canvas)] text-[var(--text-2)] border-[var(--border)] hover:border-[var(--border)]"
                        }`}
                      >
                        {badge}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-5 border-t border-[var(--border-soft)]">
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-[var(--text-2)] hover:bg-[var(--surface)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddSpecial}
                  className="px-5 py-2 rounded-xl bg-rose-500 text-white text-sm font-medium hover:bg-rose-600 transition-colors shadow-sm"
                >
                  Add Special
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
