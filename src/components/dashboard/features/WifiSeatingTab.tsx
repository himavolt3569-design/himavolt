"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wifi,
  Eye,
  EyeOff,
  QrCode,
  ToggleLeft,
  ToggleRight,
  Users,
  Clock,
  Armchair,
  MapPin,
  Plug,
  Volume2,
  RefreshCw,
  Copy,
  Check,
  Settings,
  BarChart3,
} from "lucide-react";

interface Table {
  id: string;
  name: string;
  capacity: number;
  status: "Available" | "Occupied" | "Reserved";
  location: "Indoor" | "Outdoor" | "Window" | "Corner";
  hasPowerOutlet: boolean;
  isQuietZone: boolean;
  avgSessionMin: number;
}

export default function WifiSeatingTab() {
  const [ssid, setSsid] = useState("CafeConnect_5G");
  const [password, setPassword] = useState("welcome2024!");
  const [showPassword, setShowPassword] = useState(false);
  const [bandwidthLimit, setBandwidthLimit] = useState(10);
  const [sessionDuration, setSessionDuration] = useState(120);
  const [wifiEnabled, setWifiEnabled] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const [tables, setTables] = useState<Table[]>([]);

  const totalSeats = tables.reduce((sum, t) => sum + t.capacity, 0);
  const occupiedSeats = tables
    .filter((t) => t.status === "Occupied")
    .reduce((sum, t) => sum + t.capacity, 0);
  const occupancyPct = Math.round((occupiedSeats / totalSeats) * 100);
  const avgSession = Math.round(tables.reduce((sum, t) => sum + t.avgSessionMin, 0) / tables.length);
  const turnoverRate = 3.2;

  const statusColor = (status: Table["status"]) => {
    switch (status) {
      case "Available": return "bg-green-100 text-green-700";
      case "Occupied": return "bg-amber-100 text-amber-700";
      case "Reserved": return "bg-blue-100 text-blue-700";
    }
  };

  const locationIcon = (location: Table["location"]) => {
    switch (location) {
      case "Indoor": return "🏠";
      case "Outdoor": return "🌿";
      case "Window": return "🪟";
      case "Corner": return "📐";
    }
  };

  const cycleStatus = (id: string) => {
    setTables((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const next: Table["status"] =
          t.status === "Available" ? "Occupied" : t.status === "Occupied" ? "Reserved" : "Available";
        return { ...t, status: next };
      })
    );
  };

  const togglePower = (id: string) => {
    setTables((prev) => prev.map((t) => (t.id === id ? { ...t, hasPowerOutlet: !t.hasPowerOutlet } : t)));
  };

  const toggleQuietZone = (id: string) => {
    setTables((prev) => prev.map((t) => (t.id === id ? { ...t, isQuietZone: !t.isQuietZone } : t)));
  };

  const copyPassword = () => {
    navigator.clipboard?.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-amber-100 rounded-xl">
          <Wifi className="w-6 h-6 text-amber-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">WiFi & Seating</h2>
          <p className="text-sm text-gray-500">Manage WiFi access and table availability</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: "Occupancy", value: `${occupiedSeats}/${totalSeats}`, icon: Users, color: "text-amber-600 bg-amber-50" },
          { label: "Occupancy Rate", value: `${occupancyPct}%`, icon: BarChart3, color: "text-green-600 bg-green-50" },
          { label: "Avg Session", value: `${avgSession} min`, icon: Clock, color: "text-blue-600 bg-blue-50" },
          { label: "Turnover Rate", value: `${turnoverRate}x/day`, icon: RefreshCw, color: "text-purple-600 bg-purple-50" },
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

      {/* Occupancy Bar */}
      <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Current Occupancy</span>
          <span className="text-sm font-bold text-amber-600">{occupancyPct}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${occupancyPct}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={`h-3 rounded-full ${occupancyPct > 80 ? "bg-red-400" : occupancyPct > 50 ? "bg-amber-400" : "bg-green-400"}`}
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-400">{occupiedSeats} seats occupied</span>
          <span className="text-xs text-gray-400">{totalSeats - occupiedSeats} seats available</span>
        </div>
      </div>

      {/* WiFi Config & QR */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
              <Settings className="w-4 h-4 text-amber-500" />
              WiFi Configuration
            </h3>
            <button
              onClick={() => setWifiEnabled(!wifiEnabled)}
              className="flex items-center gap-1.5"
            >
              {wifiEnabled ? (
                <ToggleRight className="w-7 h-7 text-amber-500" />
              ) : (
                <ToggleLeft className="w-7 h-7 text-gray-400" />
              )}
            </button>
          </div>

          {wifiEnabled && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-600">Network Name (SSID)</label>
                <input
                  type="text"
                  value={ssid}
                  onChange={(e) => setSsid(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-600">Password</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-amber-300"
                    />
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <button
                    onClick={copyPassword}
                    className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-600">Bandwidth Limit (Mbps per user)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={1}
                    max={50}
                    value={bandwidthLimit}
                    onChange={(e) => setBandwidthLimit(Number(e.target.value))}
                    className="flex-1 accent-amber-500"
                  />
                  <span className="text-sm font-bold text-amber-600 w-16 text-center">{bandwidthLimit} Mbps</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-600">Session Duration Limit (minutes)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={15}
                    max={480}
                    step={15}
                    value={sessionDuration}
                    onChange={(e) => setSessionDuration(Number(e.target.value))}
                    className="flex-1 accent-amber-500"
                  />
                  <span className="text-sm font-bold text-amber-600 w-16 text-center">{sessionDuration} min</span>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* WiFi QR Code */}
        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
            <QrCode className="w-4 h-4 text-amber-500" />
            WiFi QR Code
          </h3>
          <div className="flex flex-col items-center gap-4">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="w-48 h-48 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center cursor-pointer"
              onClick={() => setShowQr(!showQr)}
            >
              {showQr ? (
                <div className="text-center space-y-2">
                  <QrCode className="w-24 h-24 text-gray-800 mx-auto" />
                  <p className="text-xs text-gray-500 font-medium">{ssid}</p>
                </div>
              ) : (
                <div className="text-center space-y-2">
                  <QrCode className="w-12 h-12 text-gray-300 mx-auto" />
                  <p className="text-xs text-gray-400">Click to generate QR</p>
                </div>
              )}
            </motion.div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700">{ssid}</p>
              <p className="text-xs text-gray-400 mt-1">Scan to connect automatically</p>
            </div>
            <button
              onClick={() => setShowQr(true)}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-semibold hover:bg-amber-600 transition-colors"
            >
              Generate QR Code
            </button>
          </div>
        </div>
      </div>

      {/* Seating Map */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
            <Armchair className="w-4 h-4 text-amber-500" />
            Seating Map
          </h3>
          <div className="flex items-center gap-3">
            {(["Available", "Occupied", "Reserved"] as const).map((status) => (
              <span key={status} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(status)}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {status}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-5">
          {tables.map((table) => (
            <motion.div
              key={table.id}
              whileHover={{ scale: 1.02, y: -2 }}
              className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-800">{table.name}</h4>
                <button
                  onClick={() => cycleStatus(table.id)}
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(table.status)} cursor-pointer hover:opacity-80 transition-opacity`}
                >
                  {table.status}
                </button>
              </div>

              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {table.capacity} seats
                </span>
                <span className="flex items-center gap-1">
                  {locationIcon(table.location)} {table.location}
                </span>
              </div>

              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Clock className="w-3 h-3" />
                Avg: {table.avgSessionMin} min
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <button
                  onClick={() => togglePower(table.id)}
                  className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg transition-colors ${
                    table.hasPowerOutlet
                      ? "bg-green-50 text-green-600"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  <Plug className="w-3 h-3" />
                  Power
                </button>
                <button
                  onClick={() => toggleQuietZone(table.id)}
                  className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg transition-colors ${
                    table.isQuietZone
                      ? "bg-blue-50 text-blue-600"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  <Volume2 className="w-3 h-3" />
                  Quiet
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
