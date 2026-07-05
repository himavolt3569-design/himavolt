"use client";

import { useEffect, useState } from "react";
import { useRestaurant } from "@/context/RestaurantContext";
import { Loader2, Save, Receipt, Percent, Coins } from "lucide-react";
import { CURRENCIES, formatPrice, type CurrencyCode } from "@/lib/currency";
import Toggle from "@/components/ui/Toggle";
import NumberInput from "@/components/shared/NumberInput";
import { apiFetch, peekApiCache, invalidateApiCache } from "@/lib/api-client";

interface TaxConfig {
  currency: string;
  taxRate: number;
  taxEnabled: boolean;
  serviceChargeRate: number;
  serviceChargeEnabled: boolean;
}

async function staffFetch(url: string, opts?: RequestInit) {
  const res = await fetch(url, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts?.headers || {}) },
    credentials: "include",
  });
  if (!res.ok) throw new Error("Request failed");
  return res.json();
}

export default function TaxChargesTab() {
  const { selectedRestaurant } = useRestaurant();
  // Seed from the warm GET cache (BillingTab also warms /tax-config) so this
  // tab paints instantly on open.
  const taxPath = selectedRestaurant ? `/api/restaurants/${selectedRestaurant.id}/tax-config` : "";
  const [config, setConfig] = useState<TaxConfig>(() => peekApiCache<TaxConfig>(taxPath) ?? {
    currency: "NPR",
    taxRate: 13,
    taxEnabled: true,
    serviceChargeRate: 10,
    serviceChargeEnabled: true,
  });
  const [loading, setLoading] = useState(() => !peekApiCache(taxPath));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!selectedRestaurant) return;
    const path = `/api/restaurants/${selectedRestaurant.id}/tax-config`;
    if (!peekApiCache(path)) setLoading(true);
    apiFetch<TaxConfig>(path, { cacheTtl: 300_000 })
      .then((data: TaxConfig) => {
        setConfig(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedRestaurant]);

  const handleSave = async () => {
    if (!selectedRestaurant) return;
    setSaving(true);
    try {
      const updated = await staffFetch(
        `/api/restaurants/${selectedRestaurant.id}/tax-config`,
        { method: "PUT", body: JSON.stringify(config) },
      );
      setConfig(updated);
      // Keep the apiFetch cache (read here and by BillingTab) coherent.
      invalidateApiCache(`/api/restaurants/${selectedRestaurant.id}/tax-config`);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      /* ignore */
    }
    setSaving(false);
  };

  const cur = config.currency;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-1)]" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h2 className="text-lg font-extrabold text-[var(--text-1)] flex items-center gap-2">
          <Receipt className="h-5 w-5 text-[var(--text-1)]" />
          Currency, Tax &amp; Service Charge
        </h2>
        <p className="text-sm text-[var(--text-2)] mt-1">
          Configure currency, tax and service charge for all new orders.
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--canvas)] p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4 text-[var(--text-1)]" />
          <h3 className="text-sm font-bold text-[var(--text-1)]">Currency</h3>
        </div>
        <div className="flex gap-2">
          {CURRENCIES.map((c) => (
            <button
              key={c.code}
              onClick={() =>
                setConfig((prev) => ({ ...prev, currency: c.code }))
              }
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-all border ${
                config.currency === c.code
                  ? "border-[var(--text-1)] bg-[var(--text-1)]/5 text-[var(--text-1)] ring-2 ring-[var(--text-1)]/10"
                  : "border-[var(--border)] bg-[var(--canvas)] text-[var(--text-2)] hover:bg-[var(--canvas-sub)]"
              }`}
            >
              <span className="text-lg">{c.flag}</span>
              <span>{c.symbol}</span>
              <span className="text-xs text-[var(--text-3)]">{c.code}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--canvas)] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-1)]">Tax (VAT)</h3>
            <p className="text-xs text-[var(--text-3)] mt-0.5">
              Applied to all orders at checkout
            </p>
          </div>
          <Toggle
            checked={config.taxEnabled}
            onChange={(v) => setConfig((c) => ({ ...c, taxEnabled: v }))}
            label="Toggle tax"
          />
        </div>
        {config.taxEnabled && (
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <NumberInput
                value={config.taxRate}
                onChange={(n) => setConfig((c) => ({ ...c, taxRate: n }))}
                min={0}
                max={100}
                step={0.1}
                decimal
                className="w-full rounded-xl border border-[var(--border)] px-4 py-2.5 pr-10 text-sm font-bold text-[var(--text-1)] outline-none focus:border-[var(--text-1)] focus:ring-2 focus:ring-[var(--text-1)]/10 transition-all"
              />
              <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-3)]" />
            </div>
            <div className="flex gap-1.5">
              {[5, 10, 13, 15].map((v) => (
                <button
                  key={v}
                  onClick={() => setConfig((c) => ({ ...c, taxRate: v }))}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all ${
                    config.taxRate === v
                      ? "bg-[var(--text-1)] text-white"
                      : "bg-[var(--surface)] text-[var(--text-2)] hover:bg-[var(--surface-alt)]"
                  }`}
                >
                  {v}%
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--canvas)] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-1)]">Service Charge</h3>
            <p className="text-xs text-[var(--text-3)] mt-0.5">
              Added to the bill at billing time
            </p>
          </div>
          <Toggle
            checked={config.serviceChargeEnabled}
            onChange={(v) => setConfig((c) => ({ ...c, serviceChargeEnabled: v }))}
            label="Toggle service charge"
          />
        </div>
        {config.serviceChargeEnabled && (
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <NumberInput
                value={config.serviceChargeRate}
                onChange={(n) => setConfig((c) => ({ ...c, serviceChargeRate: n }))}
                min={0}
                max={100}
                step={0.1}
                decimal
                className="w-full rounded-xl border border-[var(--border)] px-4 py-2.5 pr-10 text-sm font-bold text-[var(--text-1)] outline-none focus:border-[var(--text-1)] focus:ring-2 focus:ring-[var(--text-1)]/10 transition-all"
              />
              <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-3)]" />
            </div>
            <div className="flex gap-1.5">
              {[5, 10, 12, 15].map((v) => (
                <button
                  key={v}
                  onClick={() =>
                    setConfig((c) => ({ ...c, serviceChargeRate: v }))
                  }
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all ${
                    config.serviceChargeRate === v
                      ? "bg-[var(--text-1)] text-white"
                      : "bg-[var(--surface)] text-[var(--text-2)] hover:bg-[var(--surface-alt)]"
                  }`}
                >
                  {v}%
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--canvas-sub)] p-5">
        <h3 className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider mb-3">
          Preview — {formatPrice(1000, cur)} order
        </h3>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--text-2)]">Subtotal</span>
            <span className="font-medium">{formatPrice(1000, cur)}</span>
          </div>
          {config.taxEnabled && (
            <div className="flex justify-between">
              <span className="text-[var(--text-2)]">Tax ({config.taxRate}%)</span>
              <span className="font-medium">
                {formatPrice((1000 * config.taxRate) / 100, cur)}
              </span>
            </div>
          )}
          {config.serviceChargeEnabled && (
            <div className="flex justify-between">
              <span className="text-[var(--text-2)]">
                Service Charge ({config.serviceChargeRate}%)
              </span>
              <span className="font-medium">
                {formatPrice((1000 * config.serviceChargeRate) / 100, cur)}
              </span>
            </div>
          )}
          <div className="flex justify-between border-t border-[var(--border)] pt-2 mt-2 font-extrabold text-[var(--text-1)]">
            <span>Total</span>
            <span>
              {formatPrice(
                1000 +
                  (config.taxEnabled ? (1000 * config.taxRate) / 100 : 0) +
                  (config.serviceChargeEnabled
                    ? (1000 * config.serviceChargeRate) / 100
                    : 0),
                cur,
              )}
            </span>
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--text-1)] py-3.5 text-sm font-bold text-[var(--canvas)] hover:opacity-90 disabled:bg-[var(--border)] transition-all shadow-sm"
      >
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : saved ? (
          <>
            <Save className="h-4 w-4" />
            Saved!
          </>
        ) : (
          <>
            <Save className="h-4 w-4" />
            Save Changes
          </>
        )}
      </button>
    </div>
  );
}
