"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Wifi, WifiOff, Eye, EyeOff, Save, Loader2, Copy, Check } from "lucide-react";
import { useRestaurant } from "@/context/RestaurantContext";
import { useToast } from "@/context/ToastContext";

export default function WifiSettingsTab() {
  const { selectedRestaurant, restaurants, updateRestaurant } = useRestaurant();
  const { showToast } = useToast();
  const restaurant = selectedRestaurant ?? restaurants[0];

  const [wifiName, setWifiName] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (restaurant) {
      setWifiName((restaurant as any).wifiName ?? "");
      setWifiPassword((restaurant as any).wifiPassword ?? "");
    }
  }, [restaurant?.id]);

  const handleSave = async () => {
    if (!restaurant) return;
    setSaving(true);
    try {
      await updateRestaurant(restaurant.id, {
        wifiName: wifiName.trim(),
        wifiPassword: wifiPassword.trim(),
      });
      showToast("WiFi details saved!");
    } catch {
      showToast("Failed to save WiFi details", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleCopyPassword = async () => {
    if (!wifiPassword) return;
    await navigator.clipboard.writeText(wifiPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!restaurant) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <Wifi className="h-10 w-10 mb-3" />
        <p className="text-sm font-medium">Select a restaurant first</p>
      </div>
    );
  }

  const hasWifi = !!wifiName;

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h2 className="text-lg font-bold text-amber-950">WiFi Settings</h2>
        <p className="text-sm text-gray-400 mt-1">
          Share your WiFi credentials with customers on the menu page.
        </p>
      </div>

      {/* Preview card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-2xl border p-4 ${hasWifi ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}
      >
        <div className="flex items-center gap-2 mb-1">
          {hasWifi ? (
            <Wifi className="h-4 w-4 text-green-600" />
          ) : (
            <WifiOff className="h-4 w-4 text-gray-400" />
          )}
          <span className={`text-xs font-bold ${hasWifi ? "text-green-700" : "text-gray-500"}`}>
            {hasWifi ? "WiFi Visible to Customers" : "No WiFi Configured"}
          </span>
        </div>
        {hasWifi && (
          <p className="text-xs text-green-600 mt-1">
            Customers will see <strong>{wifiName}</strong> on the menu page.
          </p>
        )}
      </motion.div>

      {/* Form */}
      <div className="space-y-4 bg-white rounded-2xl border border-gray-200 p-5">
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
            Network Name (SSID)
          </label>
          <input
            value={wifiName}
            onChange={(e) => setWifiName(e.target.value)}
            placeholder="e.g. HimaVolt_Guest"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-amber-950 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#eaa94d]/30 focus:bg-white transition-all"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={wifiPassword}
              onChange={(e) => setWifiPassword(e.target.value)}
              placeholder="WiFi password (leave blank if open)"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 pr-20 text-sm text-amber-950 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#eaa94d]/30 focus:bg-white transition-all"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {wifiPassword && (
                <button
                  type="button"
                  onClick={handleCopyPassword}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                  title="Copy password"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:text-amber-700 hover:bg-amber-50 transition-colors"
              >
                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            Leave blank if your network has no password.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-amber-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving..." : "Save WiFi Details"}
        </button>
      </div>

      {/* Clear option */}
      {hasWifi && (
        <button
          onClick={() => { setWifiName(""); setWifiPassword(""); }}
          className="text-xs text-red-400 hover:text-red-600 transition-colors underline"
        >
          Remove WiFi from menu
        </button>
      )}
    </div>
  );
}
