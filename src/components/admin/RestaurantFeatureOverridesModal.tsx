"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Minus, Zap, Loader2 } from "lucide-react";
import {
  TYPE_FEATURE_TABS,
  type FeatureTabId,
  type FeatureTabDef,
} from "@/lib/restaurant-types";

interface Props {
  restaurantId: string;
  restaurantName: string;
  restaurantType: string;
  onClose: () => void;
  onSaved?: () => void;
}

type OverrideState = "default" | "force-on" | "force-off";

const FEATURE_CATALOG: Map<string, FeatureTabDef> = (() => {
  const map = new Map<string, FeatureTabDef>();
  Object.values(TYPE_FEATURE_TABS).forEach((list) =>
    list.forEach((f) => {
      if (!map.has(f.id)) map.set(f.id, f);
    }),
  );
  return map;
})();

const ALL_FEATURES: FeatureTabDef[] = Array.from(FEATURE_CATALOG.values()).sort((a, b) =>
  a.label.localeCompare(b.label),
);

export default function RestaurantFeatureOverridesModal({
  restaurantId,
  restaurantName,
  restaurantType,
  onClose,
  onSaved,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [states, setStates] = useState<Record<string, OverrideState>>({});

  const typeDefaultIds = new Set(
    (TYPE_FEATURE_TABS[restaurantType] ?? []).map((f) => f.id),
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/restaurants/${restaurantId}/features`);
        if (!res.ok) throw new Error("Failed to load overrides");
        const data = await res.json();
        if (cancelled) return;
        const enabled: string[] = data.restaurant?.featuresEnabled ?? [];
        const disabled: string[] = data.restaurant?.featuresDisabled ?? [];
        const next: Record<string, OverrideState> = {};
        ALL_FEATURES.forEach((f) => {
          if (disabled.includes(f.id)) next[f.id] = "force-off";
          else if (enabled.includes(f.id)) next[f.id] = "force-on";
          else next[f.id] = "default";
        });
        setStates(next);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [restaurantId]);

  const effectiveFor = (id: FeatureTabId): boolean => {
    const s = states[id];
    if (s === "force-off") return false;
    if (s === "force-on") return true;
    return typeDefaultIds.has(id);
  };

  const setState = (id: string, value: OverrideState) => {
    setStates((prev) => ({ ...prev, [id]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const featuresEnabled = Object.entries(states)
        .filter(([, v]) => v === "force-on")
        .map(([k]) => k);
      const featuresDisabled = Object.entries(states)
        .filter(([, v]) => v === "force-off")
        .map(([k]) => k);

      const res = await fetch(`/api/admin/restaurants/${restaurantId}/features`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featuresEnabled, featuresDisabled }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save");
      }
      onSaved?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const overrideCount = Object.values(states).filter((v) => v !== "default").length;

  // Portalled to the body for the same reason as RestaurantManagerModal: the
  // admin page's tab wrapper is a transformed `motion.div`, which would
  // otherwise become the containing block for this `fixed` overlay.
  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 10 }}
          onClick={(e) => e.stopPropagation()}
          className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-[var(--canvas)] text-[var(--text-1)] shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3.5">
            <div className="min-w-0">
              <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--text-1)]">
                <Zap className="h-4 w-4 text-[var(--accent)]" />
                Feature Overrides
              </h2>
              <p className="truncate text-xs text-[var(--text-3)]">
                {restaurantName} · {restaurantType.replace(/_/g, " ")}
                {overrideCount > 0 && ` · ${overrideCount} override${overrideCount > 1 ? "s" : ""}`}
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-[var(--text-3)] hover:bg-[var(--surface)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-[var(--text-3)]">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : (
              <>
                <div className="mb-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[11px] text-[var(--text-2)]">
                  <b>Default</b> follows the type map. <b>Force On</b> enables even if the type doesn&apos;t include it.
                  <b className="ml-1">Force Off</b> hides even if the type does.
                </div>

                <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-3)] pb-2 border-b border-[var(--border)]">
                  <div>Feature</div>
                  <div className="text-right">Override</div>
                  <div className="w-16 text-right">Effective</div>
                </div>

                <ul className="divide-y divide-[var(--border)]">
                  {ALL_FEATURES.map((f) => {
                    const state = states[f.id] ?? "default";
                    const isDefaultOn = typeDefaultIds.has(f.id);
                    const eff = effectiveFor(f.id);
                    return (
                      <li
                        key={f.id}
                        className="grid grid-cols-[1fr_auto_auto] items-center gap-x-3 py-2"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-[var(--text-1)] truncate">
                              {f.label}
                            </span>
                            <span
                              className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                                isDefaultOn
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-[var(--surface)] text-[var(--text-3)]"
                              }`}
                            >
                              {isDefaultOn ? "type ✓" : "type ✗"}
                            </span>
                          </div>
                          <p className="text-[11px] text-[var(--text-3)] truncate">{f.desc}</p>
                        </div>
                        <div className="flex gap-1">
                          {(["default", "force-on", "force-off"] as OverrideState[]).map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setState(f.id, opt)}
                              className={`flex h-7 w-7 items-center justify-center rounded-md border text-[10px] font-bold transition-all ${
                                state === opt
                                  ? opt === "force-on"
                                    ? "border-emerald-500 bg-emerald-500 text-white"
                                    : opt === "force-off"
                                      ? "border-red-500 bg-red-500 text-white"
                                      : "border-[var(--text-2)] bg-[var(--text-1)] text-[var(--canvas)]"
                                  : "border-[var(--border)] bg-[var(--canvas)] text-[var(--text-3)] hover:border-[var(--text-3)]"
                              }`}
                              title={
                                opt === "default" ? "Use type default" : opt === "force-on" ? "Force enable" : "Force disable"
                              }
                            >
                              {opt === "default" ? <Minus className="h-3 w-3" /> : opt === "force-on" ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                            </button>
                          ))}
                        </div>
                        <div className="w-16 text-right">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              eff ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                            }`}
                          >
                            {eff ? "ON" : "OFF"}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}

            {error && (
              <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] px-5 py-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-[var(--border)] px-4 py-1.5 text-xs font-medium text-[var(--text-2)] hover:bg-[var(--surface)] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading || saving}
              className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
            >
              {saving && <Loader2 className="h-3 w-3 animate-spin" />}
              {saving ? "Saving..." : "Save overrides"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
