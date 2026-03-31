"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Palette,
  Type,
  Layout,
  Eye,
  EyeOff,
  Save,
  Loader2,
  RefreshCw,
  Check,
  RotateCcw,
} from "lucide-react";
import { useRestaurant } from "@/context/RestaurantContext";
import { apiFetch } from "@/lib/api-client";
import { useToast } from "@/context/ToastContext";

interface ThemeConfig {
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  fontFamily: string | null;
  menuLayout: string;
  footerText: string | null;
  showStories: boolean;
  showReviews: boolean;
}

const BLANK_THEME: ThemeConfig = {
  primaryColor: null,
  secondaryColor: null,
  accentColor: null,
  fontFamily: null,
  menuLayout: "grid",
  footerText: null,
  showStories: true,
  showReviews: true,
};

const FONT_OPTIONS = [
  { value: "Inter", label: "Inter", style: { fontFamily: "Inter, sans-serif" } },
  { value: "Poppins", label: "Poppins", style: { fontFamily: "Poppins, sans-serif" } },
  { value: "Lato", label: "Lato", style: { fontFamily: "Lato, sans-serif" } },
  { value: "Roboto", label: "Roboto", style: { fontFamily: "Roboto, sans-serif" } },
  { value: "Nunito", label: "Nunito", style: { fontFamily: "Nunito, sans-serif" } },
  { value: "Montserrat", label: "Montserrat", style: { fontFamily: "Montserrat, sans-serif" } },
];

const LAYOUT_OPTIONS = [
  {
    value: "grid",
    label: "Grid",
    desc: "Cards arranged in a grid",
    preview: (
      <div className="grid grid-cols-3 gap-0.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-4 rounded-sm bg-current opacity-60" />
        ))}
      </div>
    ),
  },
  {
    value: "list",
    label: "List",
    desc: "Items in a vertical list",
    preview: (
      <div className="space-y-0.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-2 rounded-sm bg-current opacity-60" />
        ))}
      </div>
    ),
  },
  {
    value: "compact",
    label: "Compact",
    desc: "Dense 2-column layout",
    preview: (
      <div className="grid grid-cols-2 gap-0.5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-2 rounded-sm bg-current opacity-60" />
        ))}
      </div>
    ),
  },
];

const COLOR_PRESETS = [
  { label: "Amber", primary: "#eaa94d", secondary: "#3e1e0c", accent: "#f5d78c" },
  { label: "Indigo", primary: "#4f46e5", secondary: "#1e1b4b", accent: "#a5b4fc" },
  { label: "Emerald", primary: "#059669", secondary: "#064e3b", accent: "#6ee7b7" },
  { label: "Rose", primary: "#e11d48", secondary: "#4c0519", accent: "#fda4af" },
  { label: "Sky", primary: "#0284c7", secondary: "#082f49", accent: "#7dd3fc" },
  { label: "Slate", primary: "#475569", secondary: "#1e293b", accent: "#cbd5e1" },
];

export default function ThemeSettingsTab() {
  const { selectedRestaurant, restaurants } = useRestaurant();
  const { showToast } = useToast();
  const restaurant = selectedRestaurant ?? restaurants[0];

  const [theme, setTheme] = useState<ThemeConfig>(BLANK_THEME);
  const [saved, setSaved] = useState<ThemeConfig>(BLANK_THEME);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchTheme = useCallback(async () => {
    if (!restaurant) return;
    setLoading(true);
    try {
      const data = await apiFetch<ThemeConfig>(`/api/restaurants/${restaurant.id}/theme`);
      setTheme(data);
      setSaved(data);
    } catch {
      showToast("Failed to load theme settings", "error");
    } finally {
      setLoading(false);
    }
  }, [restaurant?.id]);

  useEffect(() => {
    fetchTheme();
  }, [fetchTheme]);

  const handleSave = async () => {
    if (!restaurant) return;
    setSaving(true);
    try {
      const updated = await apiFetch<ThemeConfig>(`/api/restaurants/${restaurant.id}/theme`, {
        method: "PATCH",
        body: theme,
      });
      setSaved(updated);
      setTheme(updated);
      showToast("Theme saved!");
    } catch {
      showToast("Failed to save theme", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setTheme(saved);
  };

  const applyPreset = (preset: typeof COLOR_PRESETS[0]) => {
    setTheme((t) => ({
      ...t,
      primaryColor: preset.primary,
      secondaryColor: preset.secondary,
      accentColor: preset.accent,
    }));
  };

  const isDirty = JSON.stringify(theme) !== JSON.stringify(saved);

  const previewPrimary = theme.primaryColor ?? "#eaa94d";
  const previewSecondary = theme.secondaryColor ?? "#3e1e0c";

  if (!restaurant) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <Palette className="h-10 w-10 mb-3" />
        <p className="text-sm font-medium">Select a restaurant first</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-amber-950">Theme Settings</h2>
          <p className="text-sm text-gray-400">
            Customize colors, fonts, and layout for your public menu page.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isDirty && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!isDirty || saving}
            className="flex items-center gap-2 rounded-xl bg-amber-700 px-5 py-2 text-sm font-bold text-white hover:bg-amber-600 shadow-md shadow-amber-700/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving..." : "Save Theme"}
          </button>
        </div>
      </div>

      {/* Live preview strip */}
      <div
        className="rounded-2xl p-5 text-white overflow-hidden relative"
        style={{ background: `linear-gradient(135deg, ${previewPrimary}, ${previewSecondary})` }}
      >
        <p className="text-xs font-bold uppercase tracking-widest opacity-70 mb-1">Live Preview</p>
        <p
          className="text-2xl font-black"
          style={{ fontFamily: theme.fontFamily ? `${theme.fontFamily}, sans-serif` : undefined }}
        >
          {restaurant.name}
        </p>
        <p className="text-sm opacity-70 mt-1" style={{ fontFamily: theme.fontFamily ? `${theme.fontFamily}, sans-serif` : undefined }}>
          {theme.footerText ?? "Serving great food since day one"}
        </p>
        <div
          className="absolute right-5 top-1/2 -translate-y-1/2 h-16 w-16 rounded-full opacity-20"
          style={{ background: theme.accentColor ?? "#f5d78c" }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Colors section */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-5">
          <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <Palette className="h-4 w-4 text-amber-600" />
            Brand Colors
          </h3>

          {/* Color presets */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Presets</p>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => applyPreset(preset)}
                  className="group relative flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all"
                >
                  <span
                    className="h-4 w-4 rounded-full border border-white shadow-sm"
                    style={{ background: preset.primary }}
                  />
                  {preset.label}
                  {theme.primaryColor === preset.primary && (
                    <Check className="h-3 w-3 text-green-500" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Manual color pickers */}
          <div className="space-y-3">
            {[
              { key: "primaryColor" as const, label: "Primary Color" },
              { key: "secondaryColor" as const, label: "Secondary Color" },
              { key: "accentColor" as const, label: "Accent Color" },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center gap-3">
                <label className="text-xs font-semibold text-gray-600 w-32 shrink-0">{label}</label>
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="color"
                    value={theme[key] ?? "#eaa94d"}
                    onChange={(e) => setTheme((t) => ({ ...t, [key]: e.target.value }))}
                    className="h-9 w-12 cursor-pointer rounded-lg border border-gray-200 p-0.5"
                  />
                  <input
                    type="text"
                    value={theme[key] ?? ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "" || /^#[0-9a-fA-F]{0,6}$/.test(val)) {
                        setTheme((t) => ({ ...t, [key]: val || null }));
                      }
                    }}
                    placeholder="#eaa94d"
                    className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#eaa94d]/30 focus:bg-white transition-all"
                  />
                  {theme[key] && (
                    <button
                      onClick={() => setTheme((t) => ({ ...t, [key]: null }))}
                      className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Typography & Layout */}
        <div className="space-y-5">
          {/* Font family */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
            <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <Type className="h-4 w-4 text-amber-600" />
              Font Family
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {FONT_OPTIONS.map((font) => (
                <button
                  key={font.value}
                  onClick={() => setTheme((t) => ({ ...t, fontFamily: font.value }))}
                  style={font.style}
                  className={`rounded-xl border px-3 py-2.5 text-sm text-left transition-all ${
                    theme.fontFamily === font.value
                      ? "border-amber-400 bg-amber-50 text-amber-700"
                      : "border-gray-200 hover:border-gray-300 text-gray-700"
                  }`}
                >
                  {font.label}
                </button>
              ))}
              <button
                onClick={() => setTheme((t) => ({ ...t, fontFamily: null }))}
                className={`rounded-xl border px-3 py-2.5 text-sm text-left transition-all ${
                  !theme.fontFamily
                    ? "border-amber-400 bg-amber-50 text-amber-700"
                    : "border-gray-200 hover:border-gray-300 text-gray-700"
                }`}
              >
                Default
              </button>
            </div>
          </div>

          {/* Menu layout */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
            <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <Layout className="h-4 w-4 text-amber-600" />
              Menu Layout
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {LAYOUT_OPTIONS.map((layout) => (
                <button
                  key={layout.value}
                  onClick={() => setTheme((t) => ({ ...t, menuLayout: layout.value }))}
                  className={`rounded-xl border p-3 text-left transition-all ${
                    theme.menuLayout === layout.value
                      ? "border-amber-400 bg-amber-50 text-amber-700"
                      : "border-gray-200 hover:border-gray-300 text-gray-500"
                  }`}
                >
                  <div className="mb-2">{layout.preview}</div>
                  <p className="text-[11px] font-bold">{layout.label}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Feature toggles & footer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feature toggles */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
          <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <Eye className="h-4 w-4 text-amber-600" />
            Visible Sections
          </h3>
          {[
            { key: "showStories" as const, label: "Stories Section", desc: "Show stories carousel on menu page" },
            { key: "showReviews" as const, label: "Reviews Section", desc: "Show customer reviews on menu page" },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between py-2 border-t border-gray-50 first:border-0 first:pt-0">
              <div>
                <p className="text-sm font-semibold text-gray-700">{label}</p>
                <p className="text-xs text-gray-400">{desc}</p>
              </div>
              <button
                onClick={() => setTheme((t) => ({ ...t, [key]: !t[key] }))}
                className="shrink-0"
              >
                {theme[key] ? (
                  <Eye className="h-5 w-5 text-amber-600" />
                ) : (
                  <EyeOff className="h-5 w-5 text-gray-300" />
                )}
              </button>
            </div>
          ))}
        </div>

        {/* Footer text */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
          <h3 className="text-sm font-bold text-gray-700">Footer Text</h3>
          <p className="text-xs text-gray-400">Shown at the bottom of the public menu page.</p>
          <textarea
            value={theme.footerText ?? ""}
            onChange={(e) => setTheme((t) => ({ ...t, footerText: e.target.value || null }))}
            placeholder="e.g. Thank you for visiting! Follow us on Instagram @yourhandle"
            rows={4}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#eaa94d]/30 focus:bg-white transition-all resize-none"
          />
        </div>
      </div>

      {/* Save bar */}
      {isDirty && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky bottom-4 flex items-center justify-between rounded-2xl bg-amber-950 px-5 py-3 text-white shadow-2xl"
        >
          <p className="text-sm font-semibold">You have unsaved changes</p>
          <div className="flex items-center gap-2">
            <button onClick={handleReset} className="rounded-xl px-4 py-1.5 text-sm font-semibold text-amber-200 hover:text-white transition-colors">
              Discard
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-1.5 text-sm font-bold text-white hover:bg-amber-400 disabled:opacity-60 transition-colors"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
