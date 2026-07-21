"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Building2,
  Smartphone,
  Wallet,
  Save,
  ShieldCheck,
  Loader2,
  Check,
  Eye,
  EyeOff,
  Link2,
} from "lucide-react";

interface Gateway {
  id: string;
  label: string;
  subtitle: string;
  merchantLabel: string;
  enabled: boolean;
  merchantCode: string;
  hasSecret: boolean;
  webhookPath: string;
}

interface Draft {
  merchantCode: string;
  secretKey: string;
  enabled: boolean;
  showSecret: boolean;
}

const ICONS: Record<string, { icon: typeof Building2; tint: string }> = {
  esewa: { icon: Smartphone, tint: "bg-green-50 text-green-600" },
  khalti: { icon: Wallet, tint: "bg-purple-50 text-purple-600" },
  imepay: { icon: Building2, tint: "bg-red-50 text-red-600" },
};

export default function GatewaySettingsTab() {
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  const applyGateways = useCallback((list: Gateway[]) => {
    setGateways(list);
    setDrafts((prev) => {
      const next = { ...prev };
      for (const g of list) {
        next[g.id] = {
          merchantCode: g.merchantCode,
          secretKey: "",
          enabled: g.enabled,
          showSecret: false,
        };
      }
      return next;
    });
  }, []);

  const fetchGateways = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/gateways", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      applyGateways(Array.isArray(data.gateways) ? data.gateways : []);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [applyGateways]);

  useEffect(() => {
    fetchGateways();
  }, [fetchGateways]);

  const patchDraft = (id: string, patch: Partial<Draft>) =>
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const handleSave = async (id: string) => {
    const draft = drafts[id];
    if (!draft) return;
    setSavingId(id);
    setSavedId(null);
    try {
      const res = await fetch("/api/admin/gateways", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          enabled: draft.enabled,
          merchantCode: draft.merchantCode,
          // Only send the secret when the admin actually typed a new one.
          ...(draft.secretKey.trim() ? { secretKey: draft.secretKey } : {}),
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.gateway) {
        setGateways((prev) => prev.map((g) => (g.id === id ? data.gateway : g)));
        // Clear the typed secret; keep the rest of the draft in sync.
        patchDraft(id, {
          merchantCode: data.gateway.merchantCode,
          enabled: data.gateway.enabled,
          secretKey: "",
          showSecret: false,
        });
      }
      setSavedId(id);
      setTimeout(() => setSavedId((cur) => (cur === id ? null : cur)), 2000);
    } catch {
      setError(true);
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-gray-100 border-t-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Payment gateway configuration</h3>
        <p className="text-sm font-medium text-gray-500">
          Credentials used to process platform billing. Secret keys are stored securely and are never shown again after saving.
        </p>
      </div>

      {error && (
        <div className="rounded-2xl bg-red-50 border border-red-100 px-5 py-3 text-sm font-semibold text-red-600">
          Something went wrong. Your last change may not have been saved, please try again.
        </div>
      )}

      <div className="grid gap-6">
        {gateways.map((g, idx) => {
          const draft = drafts[g.id];
          if (!draft) return null;
          const meta = ICONS[g.id] ?? { icon: Building2, tint: "bg-gray-100 text-gray-600" };
          const Icon = meta.icon;
          const dirty =
            draft.merchantCode !== g.merchantCode ||
            draft.enabled !== g.enabled ||
            draft.secretKey.trim().length > 0;

          return (
            <motion.div
              key={g.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              className="bg-white rounded-[2rem] p-8 shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-gray-100"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${meta.tint}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900">{g.label}</h4>
                  <p className="text-xs font-semibold text-gray-400">{g.subtitle}</p>
                </div>

                {/* Enable toggle */}
                <button
                  onClick={() => patchDraft(g.id, { enabled: !draft.enabled })}
                  className="ml-auto flex items-center gap-2"
                  aria-label={draft.enabled ? "Disable gateway" : "Enable gateway"}
                >
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${draft.enabled ? "text-emerald-600" : "text-gray-400"}`}>
                    {draft.enabled ? "Active" : "Disabled"}
                  </span>
                  <span
                    className={`relative h-6 w-11 rounded-full transition-colors ${draft.enabled ? "bg-emerald-500" : "bg-gray-200"}`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${draft.enabled ? "translate-x-5" : "translate-x-0"}`}
                    />
                  </span>
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">
                    {g.merchantLabel}
                  </label>
                  <input
                    type="text"
                    value={draft.merchantCode}
                    onChange={(e) => patchDraft(g.id, { merchantCode: e.target.value })}
                    placeholder={`Enter ${g.label} merchant code`}
                    className="w-full px-5 py-3.5 bg-gray-50 rounded-2xl border-none focus:ring-4 focus:ring-[var(--accent)]/10 text-gray-900 font-semibold text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">
                    API Secret Key
                  </label>
                  <div className="relative">
                    <input
                      type={draft.showSecret ? "text" : "password"}
                      value={draft.secretKey}
                      onChange={(e) => patchDraft(g.id, { secretKey: e.target.value })}
                      placeholder={g.hasSecret ? "•••••••••• (saved, type to replace)" : "Enter secret key"}
                      className="w-full pl-5 pr-12 py-3.5 bg-gray-50 rounded-2xl border-none focus:ring-4 focus:ring-[var(--accent)]/10 text-gray-900 font-semibold text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => patchDraft(g.id, { showSecret: !draft.showSecret })}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      aria-label={draft.showSecret ? "Hide secret" : "Show secret"}
                    >
                      {draft.showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="mt-2 ml-1 flex items-center gap-1.5 text-[11px] font-semibold text-gray-400">
                    <ShieldCheck className={`h-3.5 w-3.5 ${g.hasSecret ? "text-emerald-500" : "text-gray-300"}`} />
                    {g.hasSecret ? "Secret key on file" : "No secret key set"}
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">
                    Webhook URL
                  </label>
                  <div className="flex items-center gap-2 px-5 py-3.5 bg-gray-100 rounded-2xl">
                    <Link2 className="h-4 w-4 text-gray-400 shrink-0" />
                    <span className="text-gray-500 font-mono text-sm truncate">
                      {origin}{g.webhookPath}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => handleSave(g.id)}
                  disabled={savingId === g.id || !dirty}
                  className="flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-6 py-3 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-[var(--accent)]/20 active:scale-95 disabled:opacity-40 disabled:shadow-none"
                >
                  {savingId === g.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : savedId === g.id ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {savedId === g.id ? "Saved" : "Save changes"}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
