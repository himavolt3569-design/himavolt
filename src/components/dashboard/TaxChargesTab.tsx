"use client";

import { useEffect, useState } from "react";
import { useRestaurant } from "@/context/RestaurantContext";
import { Loader2, Save, Receipt, Percent, Coins } from "lucide-react";
import { CURRENCIES, formatPrice, type CurrencyCode } from "@/lib/currency";

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
  const [config, setConfig] = useState<TaxConfig>({
    currency: "NPR",
    taxRate: 13,
    taxEnabled: true,
    serviceChargeRate: 10,
    serviceChargeEnabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!selectedRestaurant) return;
    setLoading(true);
    staffFetch(`/api/restaurants/${selectedRestaurant.id}/tax-config`)
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
        <Loader2 className="h-6 w-6 animate-spin text-[#0A4D3C]" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h2 className="text-lg font-extrabold text-[#1F2A2A] flex items-center gap-2">
          <Receipt className="h-5 w-5 text-[#0A4D3C]" />
          Currency, Tax &amp; Service Charge
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Configure currency, tax and service charge for all new orders.
        </p>
      </div>

      {/* Currency */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4 text-[#0A4D3C]" />
          <h3 className="text-sm font-bold text-[#1F2A2A]">Currency</h3>
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
                  ? "border-[#0A4D3C] bg-[#0A4D3C]/5 text-[#0A4D3C] ring-2 ring-[#0A4D3C]/10"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span className="text-lg">{c.flag}</span>
              <span>{c.symbol}</span>
              <span className="text-xs text-gray-400">{c.code}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tax */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#1F2A2A]">Tax (VAT)</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Applied to all orders at checkout
            </p>
          </div>
          <button
            onClick={() =>
              setConfig((c) => ({ ...c, taxEnabled: !c.taxEnabled }))
            }
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              config.taxEnabled ? "bg-[#0A4D3C]" : "bg-gray-300"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                config.taxEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
        {config.taxEnabled && (
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <input
                type="number"
                value={config.taxRate}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    taxRate: Math.max(
                      0,
                      Math.min(100, parseFloat(e.target.value) || 0),
                    ),
                  }))
                }
                min="0"
                max="100"
                step="0.1"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 pr-10 text-sm font-bold text-[#1F2A2A] outline-none focus:border-[#0A4D3C] focus:ring-2 focus:ring-[#0A4D3C]/10 transition-all"
              />
              <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
            <div className="flex gap-1.5">
              {[5, 10, 13, 15].map((v) => (
                <button
                  key={v}
                  onClick={() => setConfig((c) => ({ ...c, taxRate: v }))}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all ${
                    config.taxRate === v
                      ? "bg-[#0A4D3C] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {v}%
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Service Charge */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#1F2A2A]">Service Charge</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Added to the bill at billing time
            </p>
          </div>
          <button
            onClick={() =>
              setConfig((c) => ({
                ...c,
                serviceChargeEnabled: !c.serviceChargeEnabled,
              }))
            }
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              config.serviceChargeEnabled ? "bg-[#0A4D3C]" : "bg-gray-300"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                config.serviceChargeEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
        {config.serviceChargeEnabled && (
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <input
                type="number"
                value={config.serviceChargeRate}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    serviceChargeRate: Math.max(
                      0,
                      Math.min(100, parseFloat(e.target.value) || 0),
                    ),
                  }))
                }
                min="0"
                max="100"
                step="0.1"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 pr-10 text-sm font-bold text-[#1F2A2A] outline-none focus:border-[#0A4D3C] focus:ring-2 focus:ring-[#0A4D3C]/10 transition-all"
              />
              <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
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
                      ? "bg-[#0A4D3C] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {v}%
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Preview */}
      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
          Preview — {formatPrice(1000, cur)} order
        </h3>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Subtotal</span>
            <span className="font-medium">{formatPrice(1000, cur)}</span>
          </div>
          {config.taxEnabled && (
            <div className="flex justify-between">
              <span className="text-gray-500">Tax ({config.taxRate}%)</span>
              <span className="font-medium">
                {formatPrice((1000 * config.taxRate) / 100, cur)}
              </span>
            </div>
          )}
          {config.serviceChargeEnabled && (
            <div className="flex justify-between">
              <span className="text-gray-500">
                Service Charge ({config.serviceChargeRate}%)
              </span>
              <span className="font-medium">
                {formatPrice((1000 * config.serviceChargeRate) / 100, cur)}
              </span>
            </div>
          )}
          <div className="flex justify-between border-t border-gray-200 pt-2 mt-2 font-extrabold text-[#1F2A2A]">
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

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#0A4D3C] py-3.5 text-sm font-bold text-white hover:bg-[#083a2d] disabled:bg-gray-300 transition-all shadow-sm"
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
