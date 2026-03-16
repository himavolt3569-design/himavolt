"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  Plus,
  Trash2,
  Clock,
  ChevronRight,
  ToggleLeft,
  ToggleRight,
  Hash,
  Users,
  Timer,
  Bell,
  CheckCircle2,
  Loader2,
  Package,
} from "lucide-react";

interface CounterStation {
  id: string;
  name: string;
  active: boolean;
}

interface ActiveOrder {
  id: string;
  tokenNumber: number;
  items: string;
  timeElapsed: number; // minutes
  status: "Preparing" | "Ready" | "Picked Up";
  counter: string;
}

export default function QuickCounterTab() {
  const [quickCounterEnabled, setQuickCounterEnabled] = useState(true);
  const [tokenSystemEnabled, setTokenSystemEnabled] = useState(true);
  const [avgPickupTime, setAvgPickupTime] = useState(8);
  const [stations, setStations] = useState<CounterStation[]>([]);
  const [orders, setOrders] = useState<ActiveOrder[]>([]);
  const [newStationName, setNewStationName] = useState("");

  const activeOrders = orders.filter((o) => o.status !== "Picked Up");
  const readyOrders = orders.filter((o) => o.status === "Ready");
  const estimatedWait = activeOrders.length > 0 ? Math.round(activeOrders.length * avgPickupTime / stations.filter((s) => s.active).length) : 0;

  const addStation = () => {
    if (!newStationName.trim()) return;
    setStations((prev) => [...prev, { id: Date.now().toString(), name: newStationName.trim(), active: true }]);
    setNewStationName("");
  };

  const removeStation = (id: string) => {
    setStations((prev) => prev.filter((s) => s.id !== id));
  };

  const toggleStation = (id: string) => {
    setStations((prev) => prev.map((s) => (s.id === id ? { ...s, active: !s.active } : s)));
  };

  const callNext = () => {
    setOrders((prev) => {
      const idx = prev.findIndex((o) => o.status === "Ready");
      if (idx === -1) return prev;
      const updated = [...prev];
      updated[idx] = { ...updated[idx], status: "Picked Up" };
      return updated;
    });
  };

  const advanceOrder = (id: string) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== id) return o;
        if (o.status === "Preparing") return { ...o, status: "Ready" };
        if (o.status === "Ready") return { ...o, status: "Picked Up" };
        return o;
      })
    );
  };

  const statusColor = (status: ActiveOrder["status"]) => {
    switch (status) {
      case "Preparing":
        return "bg-amber-100 text-amber-700";
      case "Ready":
        return "bg-green-100 text-green-700";
      case "Picked Up":
        return "bg-gray-100 text-gray-500";
    }
  };

  const statusIcon = (status: ActiveOrder["status"]) => {
    switch (status) {
      case "Preparing":
        return <Loader2 className="w-3.5 h-3.5 animate-spin" />;
      case "Ready":
        return <Bell className="w-3.5 h-3.5" />;
      case "Picked Up":
        return <CheckCircle2 className="w-3.5 h-3.5" />;
    }
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
            <Zap className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Quick Counter</h2>
            <p className="text-sm text-gray-500">Fast order processing & pickup flow</p>
          </div>
        </div>
        <button
          onClick={() => setQuickCounterEnabled(!quickCounterEnabled)}
          className="flex items-center gap-2 text-sm font-medium"
        >
          {quickCounterEnabled ? (
            <ToggleRight className="w-8 h-8 text-amber-500" />
          ) : (
            <ToggleLeft className="w-8 h-8 text-gray-400" />
          )}
          <span className={quickCounterEnabled ? "text-amber-600" : "text-gray-400"}>
            {quickCounterEnabled ? "Active" : "Inactive"}
          </span>
        </button>
      </div>

      {quickCounterEnabled && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          {/* Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {[
              { label: "Active Orders", value: activeOrders.length, icon: Package, color: "text-amber-600 bg-amber-50" },
              { label: "Ready for Pickup", value: readyOrders.length, icon: Bell, color: "text-green-600 bg-green-50" },
              { label: "Est. Wait Time", value: `${estimatedWait} min`, icon: Timer, color: "text-orange-600 bg-orange-50" },
              { label: "Active Counters", value: stations.filter((s) => s.active).length, icon: Users, color: "text-blue-600 bg-blue-50" },
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

          {/* Settings Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pickup Time & Token System */}
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-5">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Settings</h3>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  Average Pickup Time (minutes)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={1}
                    max={30}
                    value={avgPickupTime}
                    onChange={(e) => setAvgPickupTime(Number(e.target.value))}
                    className="flex-1 accent-amber-500"
                  />
                  <span className="text-lg font-bold text-amber-600 w-12 text-center">{avgPickupTime}</span>
                </div>
              </div>

              <div className="flex items-center justify-between py-3 border-t border-gray-50">
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium text-gray-700">Token / Ticket Number System</span>
                </div>
                <button onClick={() => setTokenSystemEnabled(!tokenSystemEnabled)}>
                  {tokenSystemEnabled ? (
                    <ToggleRight className="w-7 h-7 text-amber-500" />
                  ) : (
                    <ToggleLeft className="w-7 h-7 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Counter Stations */}
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Counter Stations</h3>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Counter 3"
                  value={newStationName}
                  onChange={(e) => setNewStationName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addStation()}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
                <button
                  onClick={addStation}
                  className="px-3 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                <AnimatePresence>
                  {stations.map((station) => (
                    <motion.div
                      key={station.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
                    >
                      <span className="text-sm font-medium text-gray-700">{station.name}</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => toggleStation(station.id)}>
                          {station.active ? (
                            <ToggleRight className="w-6 h-6 text-amber-500" />
                          ) : (
                            <ToggleLeft className="w-6 h-6 text-gray-400" />
                          )}
                        </button>
                        <button
                          onClick={() => removeStation(station.id)}
                          className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Active Orders & Call Next */}
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Active Counter Orders</h3>
              <button
                onClick={callNext}
                disabled={readyOrders.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-semibold hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
                Call Next
              </button>
            </div>

            <div className="divide-y divide-gray-50">
              <AnimatePresence>
                {orders.map((order) => (
                  <motion.div
                    key={order.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, x: 40 }}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      {tokenSystemEnabled && (
                        <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                          <span className="text-sm font-bold text-amber-700">#{order.tokenNumber}</span>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-800">{order.items}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {order.counter} &middot; {order.timeElapsed} min ago
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusColor(order.status)}`}>
                        {statusIcon(order.status)}
                        {order.status}
                      </span>
                      {order.status !== "Picked Up" && (
                        <button
                          onClick={() => advanceOrder(order.id)}
                          className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title={order.status === "Preparing" ? "Mark Ready" : "Mark Picked Up"}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
