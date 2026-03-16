"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatPrice, getCurrencySymbol } from "@/lib/currency";
import { useRestaurant } from "@/context/RestaurantContext";
import {
  Coffee,
  ToggleLeft,
  ToggleRight,
  Calendar,
  Clock,
  Plus,
  Trash2,
  Users,
  TrendingUp,
  DollarSign,
  UtensilsCrossed,
  Package,
  Star,
  ClipboardList,
  Timer,
  Edit3,
  Check,
  X,
  ChevronRight,
  Croissant,
} from "lucide-react";

interface BrunchMenuItem {
  id: string;
  name: string;
  category: "Main Menu" | "Brunch Exclusive";
  regularPrice: number;
  brunchPrice: number;
  hasPriceOverride: boolean;
  popular: boolean;
}

interface BrunchPackage {
  id: string;
  name: string;
  description: string;
  items: string[];
  price: number;
  active: boolean;
}

interface ReservationSlot {
  id: string;
  time: string;
  capacity: number;
  booked: number;
}

type DayOfWeek = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

export default function BrunchModeTab() {
  const { selectedRestaurant } = useRestaurant();
  const cur = selectedRestaurant?.currency ?? "NPR";
  const [brunchEnabled, setBrunchEnabled] = useState(true);
  const [brunchDays, setBrunchDays] = useState<DayOfWeek[]>(["Sat", "Sun"]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("14:00");

  const [menuItems, setMenuItems] = useState<BrunchMenuItem[]>([]);
  const [packages, setPackages] = useState<BrunchPackage[]>([]);
  const [slots] = useState<ReservationSlot[]>([]);

  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState<"Main Menu" | "Brunch Exclusive">("Brunch Exclusive");
  const [newItemPrice, setNewItemPrice] = useState(0);

  const [showAddPackage, setShowAddPackage] = useState(false);
  const [newPkgName, setNewPkgName] = useState("");
  const [newPkgDesc, setNewPkgDesc] = useState("");
  const [newPkgPrice, setNewPkgPrice] = useState(0);

  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [editPriceValue, setEditPriceValue] = useState(0);

  // Live stats
  const currentCovers = 42;
  const totalCapacity = 60;
  const availableSeats = totalCapacity - currentCovers;
  const waitlistCount = 5;
  const avgSpendPerCover = 520;
  const totalBooked = slots.reduce((s, sl) => s + sl.booked, 0);
  const totalSlotCapacity = slots.reduce((s, sl) => s + sl.capacity, 0);

  const allDays: DayOfWeek[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const toggleDay = (day: DayOfWeek) => {
    setBrunchDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const addMenuItem = () => {
    if (!newItemName.trim() || !newItemPrice) return;
    setMenuItems((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        name: newItemName.trim(),
        category: newItemCategory,
        regularPrice: newItemPrice,
        brunchPrice: newItemPrice,
        hasPriceOverride: false,
        popular: false,
      },
    ]);
    setNewItemName("");
    setNewItemPrice(0);
    setShowAddItem(false);
  };

  const removeMenuItem = (id: string) => {
    setMenuItems((prev) => prev.filter((i) => i.id !== id));
  };

  const togglePopular = (id: string) => {
    setMenuItems((prev) => prev.map((i) => (i.id === id ? { ...i, popular: !i.popular } : i)));
  };

  const startPriceEdit = (item: BrunchMenuItem) => {
    setEditingPrice(item.id);
    setEditPriceValue(item.brunchPrice);
  };

  const savePriceEdit = (id: string) => {
    setMenuItems((prev) =>
      prev.map((i) =>
        i.id === id
          ? { ...i, brunchPrice: editPriceValue, hasPriceOverride: editPriceValue !== i.regularPrice }
          : i
      )
    );
    setEditingPrice(null);
  };

  const addPackage = () => {
    if (!newPkgName.trim() || !newPkgPrice) return;
    setPackages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        name: newPkgName.trim(),
        description: newPkgDesc.trim(),
        items: [],
        price: newPkgPrice,
        active: true,
      },
    ]);
    setNewPkgName("");
    setNewPkgDesc("");
    setNewPkgPrice(0);
    setShowAddPackage(false);
  };

  const togglePackage = (id: string) => {
    setPackages((prev) => prev.map((p) => (p.id === id ? { ...p, active: !p.active } : p)));
  };

  const removePackage = (id: string) => {
    setPackages((prev) => prev.filter((p) => p.id !== id));
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
          <div className="p-2.5 bg-amber-100 rounded-xl">
            <Coffee className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Brunch Mode</h2>
            <p className="text-sm text-gray-500">Weekend brunch & pastry focus management</p>
          </div>
        </div>
        <button
          onClick={() => setBrunchEnabled(!brunchEnabled)}
          className="flex items-center gap-2 text-sm font-medium"
        >
          {brunchEnabled ? (
            <ToggleRight className="w-8 h-8 text-amber-500" />
          ) : (
            <ToggleLeft className="w-8 h-8 text-gray-400" />
          )}
          <span className={brunchEnabled ? "text-amber-600" : "text-gray-400"}>
            {brunchEnabled ? "Active" : "Inactive"}
          </span>
        </button>
      </div>

      {brunchEnabled && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {/* Live Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {[
              { label: "Current Covers", value: currentCovers, icon: Users, color: "text-amber-600 bg-amber-50" },
              { label: "Available Seats", value: availableSeats, icon: UtensilsCrossed, color: "text-green-600 bg-green-50" },
              { label: "Waitlist", value: waitlistCount, icon: ClipboardList, color: "text-orange-600 bg-orange-50" },
              { label: "Avg Spend/Cover", value: formatPrice(avgSpendPerCover, cur), icon: TrendingUp, color: "text-purple-600 bg-purple-50" },
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

          {/* Schedule & Live Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Schedule */}
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-5">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-500" />
                Brunch Schedule
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600 mb-2 block">Brunch Days</label>
                  <div className="flex gap-2">
                    {allDays.map((day) => (
                      <button
                        key={day}
                        onClick={() => toggleDay(day)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          brunchDays.includes(day)
                            ? "bg-amber-500 text-white"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-500" /> Start Time
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                      <Timer className="w-3.5 h-3.5 text-amber-500" /> End Time
                    </label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                    />
                  </div>
                </div>

                <div className="bg-amber-50 rounded-lg p-3">
                  <p className="text-xs text-amber-700">
                    Brunch runs on <span className="font-semibold">{brunchDays.join(", ")}</span> from{" "}
                    <span className="font-semibold">{startTime}</span> to{" "}
                    <span className="font-semibold">{endTime}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Reservation Slots */}
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-amber-500" />
                  Reservation Slots
                </h3>
                <span className="text-xs text-gray-400">{totalBooked}/{totalSlotCapacity} total booked</span>
              </div>

              <div className="space-y-2">
                {slots.map((slot) => {
                  const pct = Math.round((slot.booked / slot.capacity) * 100);
                  const isFull = slot.booked >= slot.capacity;
                  return (
                    <div key={slot.id} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">{slot.time}</span>
                        <span className={`text-xs font-semibold ${isFull ? "text-red-500" : "text-gray-500"}`}>
                          {slot.booked}/{slot.capacity} {isFull && "(Full)"}
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                          className={`h-2 rounded-full ${isFull ? "bg-red-400" : pct > 70 ? "bg-amber-400" : "bg-green-400"}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Brunch Packages */}
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-500" />
                Brunch Packages
              </h3>
              <button
                onClick={() => setShowAddPackage(!showAddPackage)}
                className="flex items-center gap-2 px-3 py-2 bg-amber-500 text-white rounded-lg text-sm font-semibold hover:bg-amber-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Package
              </button>
            </div>

            <AnimatePresence>
              {showAddPackage && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="border-b border-gray-100 bg-amber-50/50"
                >
                  <div className="p-5 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input
                        type="text"
                        placeholder="Package name"
                        value={newPkgName}
                        onChange={(e) => setNewPkgName(e.target.value)}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                      />
                      <input
                        type="text"
                        placeholder="Description"
                        value={newPkgDesc}
                        onChange={(e) => setNewPkgDesc(e.target.value)}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                      />
                      <input
                        type="number"
                        placeholder={`Price (${getCurrencySymbol(cur)})`}
                        min={0}
                        value={newPkgPrice || ""}
                        onChange={(e) => setNewPkgPrice(Number(e.target.value))}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={addPackage}
                        className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-semibold hover:bg-amber-600 transition-colors"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => setShowAddPackage(false)}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="divide-y divide-gray-50">
              {packages.map((pkg) => (
                <motion.div
                  key={pkg.id}
                  layout
                  className="flex items-center justify-between px-5 py-4 hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                      <Croissant className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{pkg.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{pkg.description}</p>
                      {pkg.items.length > 0 && (
                        <p className="text-xs text-amber-500 mt-1">{pkg.items.join(" + ")}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-amber-600">{formatPrice(pkg.price, cur)}</span>
                    <button onClick={() => togglePackage(pkg.id)}>
                      {pkg.active ? (
                        <ToggleRight className="w-6 h-6 text-amber-500" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-gray-400" />
                      )}
                    </button>
                    <button
                      onClick={() => removePackage(pkg.id)}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Brunch Menu */}
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                <UtensilsCrossed className="w-4 h-4 text-amber-500" />
                Brunch Menu Items
              </h3>
              <button
                onClick={() => setShowAddItem(!showAddItem)}
                className="flex items-center gap-2 px-3 py-2 bg-amber-500 text-white rounded-lg text-sm font-semibold hover:bg-amber-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </button>
            </div>

            <AnimatePresence>
              {showAddItem && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="border-b border-gray-100 bg-amber-50/50"
                >
                  <div className="p-5 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input
                        type="text"
                        placeholder="Item name"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                      />
                      <select
                        value={newItemCategory}
                        onChange={(e) => setNewItemCategory(e.target.value as "Main Menu" | "Brunch Exclusive")}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                      >
                        <option value="Brunch Exclusive">Brunch Exclusive</option>
                        <option value="Main Menu">From Main Menu</option>
                      </select>
                      <input
                        type="number"
                        placeholder={`Price (${getCurrencySymbol(cur)})`}
                        min={0}
                        value={newItemPrice || ""}
                        onChange={(e) => setNewItemPrice(Number(e.target.value))}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={addMenuItem}
                        className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-semibold hover:bg-amber-600 transition-colors"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => setShowAddItem(false)}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="divide-y divide-gray-50">
              <AnimatePresence>
                {menuItems.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, x: 40 }}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        item.category === "Brunch Exclusive" ? "bg-amber-100" : "bg-gray-100"
                      }`}>
                        <UtensilsCrossed className={`w-5 h-5 ${
                          item.category === "Brunch Exclusive" ? "text-amber-600" : "text-gray-500"
                        }`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-800">{item.name}</p>
                          {item.popular && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700">
                              <Star className="w-3 h-3" /> Popular
                            </span>
                          )}
                          {item.hasPriceOverride && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-600">
                              Special Price
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{item.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {editingPrice === item.id ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-gray-400">{getCurrencySymbol(cur)}</span>
                          <input
                            type="number"
                            value={editPriceValue}
                            onChange={(e) => setEditPriceValue(Number(e.target.value))}
                            className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-amber-300"
                          />
                          <button onClick={() => savePriceEdit(item.id)} className="p-1 text-green-600 hover:bg-green-50 rounded">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditingPrice(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {item.hasPriceOverride && (
                            <span className="text-xs text-gray-400 line-through">{formatPrice(item.regularPrice, cur)}</span>
                          )}
                          <span className="text-sm font-bold text-amber-600">{formatPrice(item.brunchPrice, cur)}</span>
                          <button
                            onClick={() => startPriceEdit(item)}
                            className="p-1 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                            title="Set brunch price"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                      <button
                        onClick={() => togglePopular(item.id)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          item.popular ? "text-yellow-500 bg-yellow-50" : "text-gray-300 hover:text-yellow-500 hover:bg-yellow-50"
                        }`}
                      >
                        <Star className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeMenuItem(item.id)}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Brunch Performance */}
          <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-amber-500" />
              Brunch Performance
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              {[
                { label: "Avg Spend / Cover", value: formatPrice(avgSpendPerCover, cur), sub: "+8% vs last week" },
                { label: "Popular Item", value: "Eggs Benedict", sub: "Ordered 34 times today" },
                { label: "Total Covers (Today)", value: currentCovers.toString(), sub: `${totalCapacity} capacity` },
                { label: "Revenue (Today)", value: formatPrice(currentCovers * avgSpendPerCover, cur), sub: "Based on avg spend" },
              ].map((item) => (
                <div key={item.label} className="bg-amber-50 rounded-xl p-4">
                  <p className="text-xs text-amber-600 font-medium">{item.label}</p>
                  <p className="text-lg font-bold text-amber-800 mt-1">{item.value}</p>
                  <p className="text-xs text-amber-500 mt-0.5">{item.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
