"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Wifi, WifiOff, Eye, EyeOff, Save, Loader2, Copy, Check } from "lucide-react";
import { useRestaurant } from "@/context/RestaurantContext";
import { useToast } from "@/context/ToastContext";
import { apiFetch } from "@/lib/api-client";

export default function WifiSettingsTab({ restaurantId: propRestaurantId }: { restaurantId?: string }) {
  const { selectedRestaurant, restaurants, updateRestaurant } = useRestaurant();
  const { showToast } = useToast();

  // Owner dashboard: use context. Staff pages: use the prop.
  const contextRestaurant = selectedRestaurant ?? restaurants[0];
  const effectiveId = contextRestaurant?.id ?? propRestaurantId;

  const [wifiName, setWifiName] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loadedId, setLoadedId] = useState<string | null>(null);

  // When used from staff pages, fetch wifi details directly since context is empty.
  const fetchWifiData = useCallback(async (id: string) => {
    try {
      const data = await apiFetch<{ wifiName?: string; wifiPassword?: string }>(
        `/api/restaurants/${id}`
      );
      setWifiName((data as any).wifiName ?? "");
      setWifiPassword((data as any).wifiPassword ?? "");
    } catch { /* silently ignore */ }
  }, []);

  useEffect(() => {
    if (!effectiveId || effectiveId === loadedId) return;
    setLoadedId(effectiveId);
    if (contextRestaurant) {
      setWifiName((contextRestaurant as any).wifiName ?? "");
      setWifiPassword((contextRestaurant as any).wifiPassword ?? "");
    } else {
      fetchWifiData(effectiveId);
    }
  }, [effectiveId, contextRestaurant, loadedId, fetchWifiData]);

  const handleSave = async () => {
    if (!effectiveId) return;
    setSaving(true);
    try {
      if (contextRestaurant) {
        await updateRestaurant(effectiveId, {
          wifiName: wifiName.trim(),
          wifiPassword: wifiPassword.trim(),
        });
      } else {
        // Staff path: call API directly
        await apiFetch(`/api/restaurants/${effectiveId}`, {
          method: "PATCH",
          body: { wifiName: wifiName.trim(), wifiPassword: wifiPassword.trim() },
        });
      }
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

  if (!effectiveId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[var(--text-3)]">
        <Wifi className="h-10 w-10 mb-3" />
        <p className="text-sm font-medium">No restaurant found</p>
      </div>
    );
  }

  const hasWifi = !!wifiName;

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h2 className="text-lg font-bold text-[var(--text-1)]">WiFi Settings</h2>
        <p className="text-sm text-[var(--text-3)] mt-1">
          Share your WiFi credentials with customers on the menu page.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-2xl border p-4 ${hasWifi ? "bg-[var(--accent-muted)] border-[var(--accent-border)]" : "bg-[var(--canvas-sub)] border-[var(--border)]"}`}
      >
        <div className="flex items-center gap-2 mb-1">
          {hasWifi ? (
            <Wifi className="h-4 w-4 text-[var(--accent-text)]" />
          ) : (
            <WifiOff className="h-4 w-4 text-[var(--text-3)]" />
          )}
          <span className={`text-xs font-bold ${hasWifi ? "text-[var(--accent-text)]" : "text-[var(--text-2)]"}`}>
            {hasWifi ? "WiFi Visible to Customers" : "No WiFi Configured"}
          </span>
        </div>
        {hasWifi && (
          <p className="text-xs text-[var(--accent-text)] mt-1">
            Customers will see <strong>{wifiName}</strong> on the menu page.
          </p>
        )}
      </motion.div>

      <div className="space-y-4 bg-[var(--canvas)] rounded-2xl border border-[var(--border)] p-5">
        <div>
          <label className="text-xs font-bold text-[var(--text-2)] uppercase tracking-wider block mb-1.5">
            Network Name (SSID)
          </label>
          <input
            value={wifiName}
            onChange={(e) => setWifiName(e.target.value)}
            placeholder="e.g. HimaVolt_Guest"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] px-4 py-2.5 text-sm text-[var(--text-1)] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)] focus:bg-[var(--canvas)] transition-all"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-[var(--text-2)] uppercase tracking-wider block mb-1.5">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={wifiPassword}
              onChange={(e) => setWifiPassword(e.target.value)}
              placeholder="WiFi password (leave blank if open)"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] px-4 py-2.5 pr-20 text-sm text-[var(--text-1)] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)] focus:bg-[var(--canvas)] transition-all"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {wifiPassword && (
                <button
                  type="button"
                  onClick={handleCopyPassword}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--text-3)] hover:text-[var(--accent-text)] hover:bg-[var(--accent-muted)] transition-colors"
                  title="Copy password"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-[var(--accent-hover)]" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--text-3)] hover:text-[var(--accent-text)] hover:bg-[var(--accent-muted)] transition-colors"
              >
                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
          <p className="text-[11px] text-[var(--text-3)] mt-1">
            Leave blank if your network has no password.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-[var(--accent-hover)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--accent-hover)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving..." : "Save WiFi Details"}
        </button>
      </div>

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
