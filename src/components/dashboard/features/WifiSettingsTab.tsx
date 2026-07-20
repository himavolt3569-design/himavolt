"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import QRCode from "qrcode";
import {
  Wifi,
  WifiOff,
  Eye,
  EyeOff,
  Save,
  Loader2,
  Copy,
  Check,
  Download,
  QrCode,
  Trash2,
} from "lucide-react";
import { useRestaurant } from "@/context/RestaurantContext";
import { useToast } from "@/context/ToastContext";
import { apiFetch } from "@/lib/api-client";

/**
 * Escapes a value for the WIFI: QR payload. Per the de-facto spec, the
 * characters \ ; , : " must be backslash-escaped so SSIDs/passwords containing
 * them still parse when a phone camera reads the code.
 */
function escapeWifi(value: string): string {
  return value.replace(/([\\;,:"])/g, "\\$1");
}

/** Build the standard WIFI: auto-connect string any phone camera understands. */
function buildWifiPayload(ssid: string, password: string): string {
  const auth = password ? "WPA" : "nopass";
  const pass = password ? `P:${escapeWifi(password)};` : "";
  return `WIFI:T:${auth};S:${escapeWifi(ssid)};${pass};`;
}

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
  const [copiedField, setCopiedField] = useState<"ssid" | "password" | null>(null);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");

  // When used from staff pages, fetch wifi details directly since context is empty.
  const fetchWifiData = useCallback(async (id: string) => {
    try {
      const data = await apiFetch<{ wifiName?: string; wifiPassword?: string }>(
        `/api/restaurants/${id}`,
      );
      setWifiName(data.wifiName ?? "");
      setWifiPassword(data.wifiPassword ?? "");
    } catch { /* silently ignore */ }
  }, []);

  useEffect(() => {
    if (!effectiveId || effectiveId === loadedId) return;
    setLoadedId(effectiveId);
    if (contextRestaurant) {
      setWifiName((contextRestaurant as { wifiName?: string }).wifiName ?? "");
      setWifiPassword((contextRestaurant as { wifiPassword?: string }).wifiPassword ?? "");
    } else {
      fetchWifiData(effectiveId);
    }
  }, [effectiveId, contextRestaurant, loadedId, fetchWifiData]);

  const hasWifi = !!wifiName.trim();

  // Live auto-connect QR — regenerated whenever the credentials change so the
  // preview always matches what a guest would scan.
  const payload = useMemo(
    () => (hasWifi ? buildWifiPayload(wifiName.trim(), wifiPassword.trim()) : ""),
    [hasWifi, wifiName, wifiPassword],
  );
  useEffect(() => {
    if (!payload) { setQrDataUrl(""); return; }
    let alive = true;
    QRCode.toDataURL(payload, { width: 480, margin: 2, color: { dark: "#3e1e0c", light: "#ffffff" } })
      .then((url) => { if (alive) setQrDataUrl(url); })
      .catch(() => { if (alive) setQrDataUrl(""); });
    return () => { alive = false; };
  }, [payload]);

  const persist = useCallback(
    async (name: string, password: string) => {
      if (!effectiveId) return;
      if (contextRestaurant) {
        await updateRestaurant(effectiveId, { wifiName: name, wifiPassword: password });
      } else {
        await apiFetch(`/api/restaurants/${effectiveId}`, {
          method: "PATCH",
          body: { wifiName: name, wifiPassword: password },
        });
      }
    },
    [effectiveId, contextRestaurant, updateRestaurant],
  );

  const handleSave = async () => {
    if (!effectiveId) return;
    setSaving(true);
    try {
      await persist(wifiName.trim(), wifiPassword.trim());
      showToast("WiFi details saved!");
    } catch {
      showToast("Failed to save WiFi details", "error");
    } finally {
      setSaving(false);
    }
  };

  // The old "remove" only cleared local inputs — it never wrote to the DB, so a
  // reload brought the WiFi straight back. Now it persists the removal.
  const handleRemove = async () => {
    setSaving(true);
    try {
      await persist("", "");
      setWifiName("");
      setWifiPassword("");
      showToast("WiFi removed from menu");
    } catch {
      showToast("Failed to remove WiFi", "error");
    } finally {
      setSaving(false);
    }
  };

  const copy = async (field: "ssid" | "password", value: string) => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `${(wifiName.trim() || "wifi").replace(/\s+/g, "-").toLowerCase()}-wifi-qr.png`;
    a.click();
  };

  if (!effectiveId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[var(--text-3)]">
        <Wifi className="h-10 w-10 mb-3" />
        <p className="text-sm font-medium">No restaurant found</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg space-y-6 pb-12">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-muted)] text-[var(--accent-text)]">
          <Wifi className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-extrabold text-[var(--text-1)]">WiFi Settings</h2>
        <p className="mt-1 text-sm text-[var(--text-3)]">
          Share your WiFi with guests — they scan the code to connect, no typing.
        </p>
      </div>

      {/* Status */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-center ${hasWifi ? "bg-[var(--accent-muted)] border-[var(--accent-border)]" : "bg-[var(--canvas-sub)] border-[var(--border)]"}`}
      >
        {hasWifi ? <Wifi className="h-4 w-4 text-[var(--accent-text)]" /> : <WifiOff className="h-4 w-4 text-[var(--text-3)]" />}
        <span className={`text-xs font-bold ${hasWifi ? "text-[var(--accent-text)]" : "text-[var(--text-2)]"}`}>
          {hasWifi ? `Guests see "${wifiName.trim()}" on the menu` : "No WiFi configured yet"}
        </span>
      </motion.div>

      {/* Auto-connect QR — the new feature. Appears once an SSID is set. */}
      {hasWifi && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--canvas)] p-6">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--text-3)]">
            <QrCode className="h-4 w-4 text-[var(--accent)]" />
            Scan to connect
          </div>
          <div className="flex h-52 w-52 items-center justify-center rounded-2xl bg-white p-3 ring-1 ring-[var(--border)]">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUrl} alt="WiFi auto-connect QR" className="h-full w-full" />
            ) : (
              <Loader2 className="h-6 w-6 animate-spin text-[var(--text-3)]" />
            )}
          </div>
          <p className="text-center text-[11px] text-[var(--text-3)]">
            Print this for tables — a phone camera connects instantly. Reflects unsaved edits live.
          </p>
          <button
            onClick={handleDownloadQr}
            disabled={!qrDataUrl}
            className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-xs font-bold text-white hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Download QR (PNG)
          </button>
        </div>
      )}

      {/* Credentials */}
      <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--canvas)] p-5">
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--text-2)]">
            Network Name (SSID)
          </label>
          <div className="relative">
            <input
              value={wifiName}
              onChange={(e) => setWifiName(e.target.value)}
              placeholder="e.g. HimaVolt_Guest"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] px-4 py-2.5 pr-12 text-sm text-[var(--text-1)] placeholder-gray-400 focus:bg-[var(--canvas)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)] transition-all"
            />
            {wifiName && (
              <button
                type="button"
                onClick={() => copy("ssid", wifiName.trim())}
                title="Copy network name"
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--text-3)] hover:bg-[var(--accent-muted)] hover:text-[var(--accent-text)] transition-colors"
              >
                {copiedField === "ssid" ? <Check className="h-3.5 w-3.5 text-[var(--accent-hover)]" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--text-2)]">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={wifiPassword}
              onChange={(e) => setWifiPassword(e.target.value)}
              placeholder="WiFi password (leave blank if open)"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] px-4 py-2.5 pr-20 text-sm text-[var(--text-1)] placeholder-gray-400 focus:bg-[var(--canvas)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)] transition-all"
            />
            <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
              {wifiPassword && (
                <button
                  type="button"
                  onClick={() => copy("password", wifiPassword)}
                  title="Copy password"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--text-3)] hover:bg-[var(--accent-muted)] hover:text-[var(--accent-text)] transition-colors"
                >
                  {copiedField === "password" ? <Check className="h-3.5 w-3.5 text-[var(--accent-hover)]" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--text-3)] hover:bg-[var(--accent-muted)] hover:text-[var(--accent-text)] transition-colors"
              >
                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
          <p className="mt-1 text-[11px] text-[var(--text-3)]">Leave blank if your network has no password.</p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent-hover)] px-5 py-2.5 text-sm font-bold text-white hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving…" : "Save WiFi Details"}
        </button>
      </div>

      {hasWifi && (
        <div className="text-center">
          <button
            onClick={handleRemove}
            disabled={saving}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove WiFi from menu
          </button>
        </div>
      )}
    </div>
  );
}
