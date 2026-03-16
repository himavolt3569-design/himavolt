"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  PartyPopper,
  TrendingUp,
  DollarSign,
  Beer,
  Wine,
  Martini,
  Percent,
  Calendar,
  ChevronDown,
  ChevronUp,
  Star,
  Zap,
  Edit2,
  X,
} from "lucide-react";

interface HappyHour {
  id: string;
  name: string;
  days: string[];
  startTime: string;
  endTime: string;
  discountType: "percentage" | "flat";
  discountValue: number;
  category: string;
  active: boolean;
  autoActivate: boolean;
}

interface HappyHourItem {
  id: string;
  name: string;
  originalPrice: number;
  discountedPrice: number;
  category: string;
}

interface SpecialItem {
  id: string;
  name: string;
  price: number;
  available: boolean;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const CATEGORIES = ["All Drinks", "Cocktails", "Beer", "Wine"];

export default function HappyHoursTab() {
  const [happyHours, setHappyHours] = useState<HappyHour[]>([]);
  const [happyHourItems] = useState<HappyHourItem[]>([]);
  const [specialItems, setSpecialItems] = useState<SpecialItem[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expandedStats, setExpandedStats] = useState(true);
  const [expandedSpecial, setExpandedSpecial] = useState(false);

  const [newHH, setNewHH] = useState<{
    name: string;
    days: string[];
    startTime: string;
    endTime: string;
    discountType: "percentage" | "flat";
    discountValue: string;
    category: string;
  }>({
    name: "",
    days: [],
    startTime: "16:00",
    endTime: "19:00",
    discountType: "percentage",
    discountValue: "",
    category: "All Drinks",
  });

  const isHappyHourActive = happyHours.some((hh) => hh.active);

  const toggleHappyHour = (id: string) => {
    setHappyHours((prev) =>
      prev.map((hh) => (hh.id === id ? { ...hh, active: !hh.active } : hh))
    );
  };

  const toggleAutoActivate = (id: string) => {
    setHappyHours((prev) =>
      prev.map((hh) => (hh.id === id ? { ...hh, autoActivate: !hh.autoActivate } : hh))
    );
  };

  const deleteHappyHour = (id: string) => {
    setHappyHours((prev) => prev.filter((hh) => hh.id !== id));
  };

  const toggleDay = (day: string) => {
    setNewHH((prev) => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter((d) => d !== day)
        : [...prev.days, day],
    }));
  };

  const createHappyHour = () => {
    if (!newHH.name.trim() || newHH.days.length === 0 || !newHH.discountValue) return;
    const hh: HappyHour = {
      id: Date.now().toString(),
      name: newHH.name.trim(),
      days: newHH.days,
      startTime: newHH.startTime,
      endTime: newHH.endTime,
      discountType: newHH.discountType,
      discountValue: parseFloat(newHH.discountValue),
      category: newHH.category,
      active: false,
      autoActivate: true,
    };
    setHappyHours((prev) => [...prev, hh]);
    setNewHH({ name: "", days: [], startTime: "16:00", endTime: "19:00", discountType: "percentage", discountValue: "", category: "All Drinks" });
    setShowCreateForm(false);
  };

  const toggleSpecialItem = (id: string) => {
    setSpecialItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, available: !item.available } : item))
    );
  };

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-xl p-4 flex items-center justify-between ${
          isHappyHourActive
            ? "bg-gradient-to-r from-rose-500 to-red-600 text-white"
            : "bg-zinc-800 text-zinc-300 border border-zinc-700"
        }`}
      >
        <div className="flex items-center gap-3">
          <PartyPopper className={`w-6 h-6 ${isHappyHourActive ? "animate-bounce" : ""}`} />
          <div>
            <h3 className="font-bold text-lg">
              {isHappyHourActive ? "Happy Hour Active!" : "No Happy Hour Right Now"}
            </h3>
            <p className={`text-sm ${isHappyHourActive ? "text-rose-100" : "text-zinc-400"}`}>
              {isHappyHourActive
                ? "Discounted prices are currently applied"
                : "Next happy hour in ~2 hours"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          <span className="text-sm font-medium">
            {isHappyHourActive ? "Ends at 7:00 PM" : "Starts at 4:00 PM"}
          </span>
        </div>
      </motion.div>

      {/* Performance Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <button
          onClick={() => setExpandedStats(!expandedStats)}
          className="w-full flex items-center justify-between mb-3"
        >
          <h3 className="text-white font-semibold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-rose-400" />
            Happy Hour Performance
          </h3>
          {expandedStats ? (
            <ChevronUp className="w-4 h-4 text-zinc-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          )}
        </button>
        <AnimatePresence>
          {expandedStats && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-3 overflow-hidden"
            >
              {[
                { label: "Orders Today", value: "47", icon: Zap, color: "text-rose-400" },
                { label: "Revenue (HH)", value: "Rs 32,400", icon: DollarSign, color: "text-emerald-400" },
                { label: "Avg Discount", value: "25%", icon: Percent, color: "text-amber-400" },
                { label: "Popular Item", value: "Margarita", icon: Star, color: "text-purple-400" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-zinc-800/80 rounded-xl p-4 border border-zinc-700/50"
                >
                  <stat.icon className={`w-5 h-5 ${stat.color} mb-2`} />
                  <p className="text-white font-bold text-lg">{stat.value}</p>
                  <p className="text-zinc-400 text-xs">{stat.label}</p>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Happy Hour Schedules */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-rose-400" />
            Schedules
          </h3>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Schedule
          </button>
        </div>

        {/* Create Form */}
        <AnimatePresence>
          {showCreateForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-4"
            >
              <div className="bg-zinc-800/80 rounded-xl p-5 border border-zinc-700/50 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-white font-medium">Create New Happy Hour</h4>
                  <button onClick={() => setShowCreateForm(false)} className="text-zinc-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <label className="text-zinc-400 text-sm mb-1 block">Name</label>
                  <input
                    type="text"
                    value={newHH.name}
                    onChange={(e) => setNewHH((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Weekday Happy Hour"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="text-zinc-400 text-sm mb-2 block">Days</label>
                  <div className="flex gap-2 flex-wrap">
                    {DAYS.map((day) => (
                      <button
                        key={day}
                        onClick={() => toggleDay(day)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          newHH.days.includes(day)
                            ? "bg-rose-600 text-white"
                            : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-zinc-400 text-sm mb-1 block">Start Time</label>
                    <input
                      type="time"
                      value={newHH.startTime}
                      onChange={(e) => setNewHH((prev) => ({ ...prev, startTime: e.target.value }))}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 text-sm mb-1 block">End Time</label>
                    <input
                      type="time"
                      value={newHH.endTime}
                      onChange={(e) => setNewHH((prev) => ({ ...prev, endTime: e.target.value }))}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-zinc-400 text-sm mb-1 block">Discount Type</label>
                    <select
                      value={newHH.discountType}
                      onChange={(e) =>
                        setNewHH((prev) => ({
                          ...prev,
                          discountType: e.target.value as "percentage" | "flat",
                        }))
                      }
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-rose-500"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="flat">Flat (Rs)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-zinc-400 text-sm mb-1 block">Discount Value</label>
                    <input
                      type="number"
                      value={newHH.discountValue}
                      onChange={(e) => setNewHH((prev) => ({ ...prev, discountValue: e.target.value }))}
                      placeholder={newHH.discountType === "percentage" ? "25" : "200"}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-zinc-400 text-sm mb-1 block">Applicable Category</label>
                  <select
                    value={newHH.category}
                    onChange={(e) => setNewHH((prev) => ({ ...prev, category: e.target.value }))}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-rose-500"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={createHappyHour}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white rounded-lg py-2.5 font-medium transition-colors"
                >
                  Create Happy Hour
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Schedule List */}
        <div className="space-y-3">
          {happyHours.map((hh, index) => (
            <motion.div
              key={hh.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`bg-zinc-800/80 rounded-xl p-4 border ${
                hh.active ? "border-rose-500/50" : "border-zinc-700/50"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-white font-medium">{hh.name}</h4>
                    {hh.active && (
                      <span className="px-2 py-0.5 bg-rose-500/20 text-rose-400 text-xs rounded-full font-medium">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-zinc-400 text-sm mt-0.5">
                    {hh.days.join(", ")} &middot; {hh.startTime} - {hh.endTime}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleHappyHour(hh.id)}
                    className="text-zinc-400 hover:text-white transition-colors"
                  >
                    {hh.active ? (
                      <ToggleRight className="w-6 h-6 text-rose-400" />
                    ) : (
                      <ToggleLeft className="w-6 h-6" />
                    )}
                  </button>
                  <button
                    onClick={() => deleteHappyHour(hh.id)}
                    className="text-zinc-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm">
                <span className="text-zinc-300">
                  {hh.discountType === "percentage"
                    ? `${hh.discountValue}% off`
                    : `Rs ${hh.discountValue} off`}
                </span>
                <span className="text-zinc-500">&middot;</span>
                <span className="text-zinc-400">{hh.category}</span>
                <span className="text-zinc-500">&middot;</span>
                <button
                  onClick={() => toggleAutoActivate(hh.id)}
                  className={`flex items-center gap-1 ${
                    hh.autoActivate ? "text-emerald-400" : "text-zinc-500"
                  }`}
                >
                  <Zap className="w-3 h-3" />
                  {hh.autoActivate ? "Auto" : "Manual"}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Current Happy Hour Items */}
      <div>
        <h3 className="text-white font-semibold flex items-center gap-2 mb-3">
          <Beer className="w-5 h-5 text-rose-400" />
          Discounted Items
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {happyHourItems.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className="bg-zinc-800/80 rounded-xl p-3 border border-zinc-700/50 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
                  {item.category === "Beer" ? (
                    <Beer className="w-4 h-4 text-rose-400" />
                  ) : item.category === "Wine" ? (
                    <Wine className="w-4 h-4 text-rose-400" />
                  ) : (
                    <Martini className="w-4 h-4 text-rose-400" />
                  )}
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{item.name}</p>
                  <p className="text-zinc-500 text-xs">{item.category}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-rose-400 font-semibold text-sm">Rs {item.discountedPrice}</p>
                <p className="text-zinc-500 text-xs line-through">Rs {item.originalPrice}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Special Happy Hour Menu */}
      <div>
        <button
          onClick={() => setExpandedSpecial(!expandedSpecial)}
          className="w-full flex items-center justify-between mb-3"
        >
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Star className="w-5 h-5 text-rose-400" />
            Special Happy Hour Menu
          </h3>
          {expandedSpecial ? (
            <ChevronUp className="w-4 h-4 text-zinc-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          )}
        </button>
        <AnimatePresence>
          {expandedSpecial && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="space-y-2 overflow-hidden"
            >
              <p className="text-zinc-400 text-sm mb-3">
                Items only available during happy hours
              </p>
              {specialItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-zinc-800/80 rounded-xl p-3 border border-zinc-700/50 flex items-center justify-between"
                >
                  <div>
                    <p className="text-white text-sm font-medium">{item.name}</p>
                    <p className="text-zinc-400 text-xs">Rs {item.price}</p>
                  </div>
                  <button
                    onClick={() => toggleSpecialItem(item.id)}
                    className="transition-colors"
                  >
                    {item.available ? (
                      <ToggleRight className="w-6 h-6 text-rose-400" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-zinc-500" />
                    )}
                  </button>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
