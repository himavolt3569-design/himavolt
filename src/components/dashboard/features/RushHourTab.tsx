"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flame,
  Plus,
  Trash2,
  Clock,
  ToggleLeft,
  ToggleRight,
  Users,
  Timer,
  TrendingUp,
  X,
  Check,
  AlertCircle,
  Activity,
  DollarSign,
  ChefHat,
  Monitor,
} from "lucide-react";

interface RushHourSlot {
  id: string;
  startTime: string;
  endTime: string;
  active: boolean;
  label: string;
}

interface QueueStats {
  ordersInQueue: number;
  avgWaitTime: number;
  longestWait: number;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function RushHourTab() {
  const [rushModeEnabled, setRushModeEnabled] = useState(false);
  const [autoActivate, setAutoActivate] = useState(true);
  const [surgePricingEnabled, setSurgePricingEnabled] = useState(false);
  const [surgePricingPercent, setSurgePricingPercent] = useState(10);
  const [kitchenStaff, setKitchenStaff] = useState(4);
  const [counterStaff, setCounterStaff] = useState(3);

  const [slots, setSlots] = useState<RushHourSlot[]>([]);

  const [showAddSlot, setShowAddSlot] = useState(false);
  const [newSlotLabel, setNewSlotLabel] = useState("");
  const [newSlotStart, setNewSlotStart] = useState("11:00");
  const [newSlotEnd, setNewSlotEnd] = useState("13:00");

  const [queueStats] = useState<QueueStats>({
    ordersInQueue: 0,
    avgWaitTime: 0,
    longestWait: 0,
  });

  const addSlot = () => {
    if (!newSlotLabel.trim()) return;
    setSlots((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        startTime: newSlotStart,
        endTime: newSlotEnd,
        active: true,
        label: newSlotLabel.trim(),
      },
    ]);
    setNewSlotLabel("");
    setNewSlotStart("11:00");
    setNewSlotEnd("13:00");
    setShowAddSlot(false);
  };

  const removeSlot = (id: string) => {
    setSlots((prev) => prev.filter((s) => s.id !== id));
  };

  const toggleSlot = (id: string) => {
    setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, active: !s.active } : s)));
  };

  const timeToHour = (time: string) => {
    const [h] = time.split(":").map(Number);
    return h;
  };

  const isInRushHour = (hour: number) => {
    return slots.some((slot) => {
      if (!slot.active) return false;
      const start = timeToHour(slot.startTime);
      const end = timeToHour(slot.endTime);
      return hour >= start && hour < end;
    });
  };

  // Check if current time is within any active rush hour
  const currentHour = new Date().getHours();
  const isCurrentlyRush = isInRushHour(currentHour);

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
          <div className={`p-2.5 rounded-xl ${isCurrentlyRush && rushModeEnabled ? "bg-red-100" : "bg-amber-100"}`}>
            <Flame className={`w-6 h-6 ${isCurrentlyRush && rushModeEnabled ? "text-red-500" : "text-amber-600"}`} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Rush Hour</h2>
            <p className="text-sm text-gray-500">Queue management for peak times</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {isCurrentlyRush && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 rounded-full text-xs font-bold"
            >
              <Activity className="w-3.5 h-3.5 animate-pulse" />
              RUSH ACTIVE
            </motion.span>
          )}
          <button
            onClick={() => setRushModeEnabled(!rushModeEnabled)}
            className="flex items-center gap-2 text-sm font-medium"
          >
            {rushModeEnabled ? (
              <ToggleRight className="w-8 h-8 text-amber-500" />
            ) : (
              <ToggleLeft className="w-8 h-8 text-gray-400" />
            )}
            <span className={rushModeEnabled ? "text-amber-600" : "text-gray-400"}>
              {rushModeEnabled ? "On" : "Off"}
            </span>
          </button>
        </div>
      </div>

      {rushModeEnabled && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {/* Queue Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                label: "Orders in Queue",
                value: queueStats.ordersInQueue,
                icon: Users,
                color: "text-amber-600 bg-amber-50",
                badge: queueStats.ordersInQueue > 15 ? "High" : "Normal",
                badgeColor: queueStats.ordersInQueue > 15 ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600",
              },
              {
                label: "Avg Wait Time",
                value: `${queueStats.avgWaitTime} min`,
                icon: Timer,
                color: "text-orange-600 bg-orange-50",
                badge: null,
                badgeColor: "",
              },
              {
                label: "Longest Wait",
                value: `${queueStats.longestWait} min`,
                icon: AlertCircle,
                color: "text-red-600 bg-red-50",
                badge: queueStats.longestWait > 20 ? "Attention" : null,
                badgeColor: "bg-red-100 text-red-600",
              },
            ].map((stat) => (
              <motion.div
                key={stat.label}
                whileHover={{ scale: 1.02 }}
                className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${stat.color}`}>
                      <stat.icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">{stat.label}</p>
                      <p className="text-lg font-bold text-gray-900">{stat.value}</p>
                    </div>
                  </div>
                  {stat.badge && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stat.badgeColor}`}>
                      {stat.badge}
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Real-time Queue Indicator */}
          <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Queue Count</h3>
              <span className="text-2xl font-black text-amber-600">{queueStats.ordersInQueue}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((queueStats.ordersInQueue / 30) * 100, 100)}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className={`h-full rounded-full ${
                  queueStats.ordersInQueue > 20 ? "bg-red-500" : queueStats.ordersInQueue > 10 ? "bg-amber-500" : "bg-green-500"
                }`}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>0</span>
              <span>10</span>
              <span>20</span>
              <span>30+</span>
            </div>
          </div>

          {/* Timeline & Slots */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Visual Timeline */}
            <div className="lg:col-span-2 bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Daily Timeline</h3>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-amber-400 rounded-sm" /> Rush Hour</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-400 rounded-sm" /> Now</span>
                </div>
              </div>
              <div className="flex gap-[2px] items-end h-20">
                {HOURS.map((hour) => {
                  const isRush = isInRushHour(hour);
                  const isCurrent = hour === currentHour;
                  return (
                    <div key={hour} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className={`w-full rounded-t-sm transition-colors ${
                          isCurrent
                            ? "bg-blue-500"
                            : isRush
                            ? "bg-amber-400"
                            : "bg-gray-100"
                        }`}
                        style={{ height: isRush ? "100%" : "40%" }}
                      />
                      {hour % 3 === 0 && (
                        <span className="text-[10px] text-gray-400">{hour.toString().padStart(2, "0")}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Time Slots */}
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Rush Slots</h3>
                <button
                  onClick={() => setShowAddSlot(!showAddSlot)}
                  className="p-1.5 bg-amber-100 text-amber-600 rounded-lg hover:bg-amber-200 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <AnimatePresence>
                {showAddSlot && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-amber-50 rounded-lg p-3 space-y-2">
                      <input
                        type="text"
                        placeholder="Label (e.g. Brunch Rush)"
                        value={newSlotLabel}
                        onChange={(e) => setNewSlotLabel(e.target.value)}
                        className="w-full border border-amber-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-300"
                      />
                      <div className="flex gap-2">
                        <input
                          type="time"
                          value={newSlotStart}
                          onChange={(e) => setNewSlotStart(e.target.value)}
                          className="flex-1 border border-amber-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-300"
                        />
                        <input
                          type="time"
                          value={newSlotEnd}
                          onChange={(e) => setNewSlotEnd(e.target.value)}
                          className="flex-1 border border-amber-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-300"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowAddSlot(false)}
                          className="flex-1 text-xs text-gray-500 py-1.5 hover:text-gray-700"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={addSlot}
                          disabled={!newSlotLabel.trim()}
                          className="flex-1 flex items-center justify-center gap-1 bg-amber-500 text-white rounded-lg py-1.5 text-xs font-semibold hover:bg-amber-600 disabled:opacity-40 transition-colors"
                        >
                          <Check className="w-3 h-3" /> Add
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                {slots.map((slot) => (
                  <motion.div
                    key={slot.id}
                    layout
                    className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-800">{slot.label}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {slot.startTime} - {slot.endTime}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => toggleSlot(slot.id)}>
                        {slot.active ? (
                          <ToggleRight className="w-6 h-6 text-amber-500" />
                        ) : (
                          <ToggleLeft className="w-6 h-6 text-gray-400" />
                        )}
                      </button>
                      <button
                        onClick={() => removeSlot(slot.id)}
                        className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Auto Activate Toggle */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <span className="text-xs font-medium text-gray-600">Auto-activate by schedule</span>
                <button onClick={() => setAutoActivate(!autoActivate)}>
                  {autoActivate ? (
                    <ToggleRight className="w-6 h-6 text-amber-500" />
                  ) : (
                    <ToggleLeft className="w-6 h-6 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Staff Allocation & Surge Pricing */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Staff Allocation */}
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-5">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Rush Hour Staff</h3>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      <ChefHat className="w-4 h-4 text-amber-500" />
                      Kitchen Staff
                    </label>
                    <span className="text-sm font-bold text-gray-800">{kitchenStaff}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setKitchenStaff(Math.max(1, kitchenStaff - 1))}
                      className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg text-gray-600 hover:bg-gray-200 transition-colors font-bold"
                    >
                      -
                    </button>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-amber-500 h-full rounded-full transition-all"
                        style={{ width: `${(kitchenStaff / 10) * 100}%` }}
                      />
                    </div>
                    <button
                      onClick={() => setKitchenStaff(Math.min(10, kitchenStaff + 1))}
                      className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg text-gray-600 hover:bg-gray-200 transition-colors font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      <Monitor className="w-4 h-4 text-amber-500" />
                      Counter Staff
                    </label>
                    <span className="text-sm font-bold text-gray-800">{counterStaff}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCounterStaff(Math.max(1, counterStaff - 1))}
                      className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg text-gray-600 hover:bg-gray-200 transition-colors font-bold"
                    >
                      -
                    </button>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-orange-500 h-full rounded-full transition-all"
                        style={{ width: `${(counterStaff / 10) * 100}%` }}
                      />
                    </div>
                    <button
                      onClick={() => setCounterStaff(Math.min(10, counterStaff + 1))}
                      className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg text-gray-600 hover:bg-gray-200 transition-colors font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Surge Pricing */}
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Surge Pricing</h3>
                <button onClick={() => setSurgePricingEnabled(!surgePricingEnabled)}>
                  {surgePricingEnabled ? (
                    <ToggleRight className="w-7 h-7 text-amber-500" />
                  ) : (
                    <ToggleLeft className="w-7 h-7 text-gray-400" />
                  )}
                </button>
              </div>

              {surgePricingEnabled ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <p className="text-xs text-gray-500">
                    Automatically adjust prices during rush hours to manage demand.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-amber-500" />
                        Price Increase
                      </label>
                      <span className="text-sm font-bold text-amber-600">{surgePricingPercent}%</span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={30}
                      step={5}
                      value={surgePricingPercent}
                      onChange={(e) => setSurgePricingPercent(Number(e.target.value))}
                      className="w-full accent-amber-500"
                    />
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>5%</span>
                      <span>15%</span>
                      <span>30%</span>
                    </div>
                  </div>

                  <div className="bg-amber-50 rounded-lg p-3 flex items-start gap-2">
                    <TrendingUp className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-700">
                      Prices will increase by {surgePricingPercent}% during active rush hour slots. Customers will be notified of adjusted pricing.
                    </p>
                  </div>
                </motion.div>
              ) : (
                <div className="text-center py-6 text-gray-400">
                  <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Enable surge pricing to manage demand during peak hours</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
