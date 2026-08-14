"use client";

import { useState, useEffect, useCallback } from "react";
import { DollarSign, ShoppingCart, CreditCard, TrendingUp, RefreshCw, Printer } from "lucide-react";
import { formatPrice } from "@/lib/currency";

interface DailySummary {
  totalOrders: number;
  completedOrders: number;
  paidOrders: number;
  unpaidOrders: number;
  totalRevenue: number;
  cashRevenue: number;
  onlineRevenue: number;
  pendingAmount: number;
  totalDiscount: number;
}

interface Props {
  restaurantId: string;
  currency: string;
}

async function staffFetch<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

export default function POSDailySummary({ restaurantId, currency }: Props) {
  const [summary, setSummary] = useState<DailySummary | null>(null);

  const fetchSummary = useCallback(async () => {
    try {
      const data = await staffFetch<DailySummary>(`/api/restaurants/${restaurantId}/billing/summary`);
      setSummary(data);
    } catch {
      // silent
    }
  }, [restaurantId]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const printReport = () => {
    window.print();
  };

  // Show zero-state while loading — no spinner
  const s = summary ?? {
    totalOrders: 0, completedOrders: 0, paidOrders: 0, unpaidOrders: 0,
    totalRevenue: 0, cashRevenue: 0, onlineRevenue: 0, pendingAmount: 0, totalDiscount: 0,
  };

  const stats = [
    { label: "Total Orders",    value: s.totalOrders,     icon: ShoppingCart, bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-100" },
    { label: "Completed",       value: s.completedOrders, icon: TrendingUp,   bg: "bg-[var(--accent-muted)]",   text: "text-[#b25c1c]",   border: "border-[var(--accent-border)]" },
    { label: "Paid",            value: s.paidOrders,      icon: CreditCard,   bg: "bg-[var(--accent-muted)]", text: "text-[#b25c1c]", border: "border-[var(--accent-border)]" },
    { label: "Unpaid",          value: s.unpaidOrders,    icon: ShoppingCart, bg: "bg-orange-50",  text: "text-orange-700",  border: "border-orange-100" },
  ];

  const financials = [
    { label: "Total Revenue",   value: s.totalRevenue,   valueClass: "text-[#b25c1c]" },
    { label: "Cash Revenue",    value: s.cashRevenue,    valueClass: "text-[var(--text-1)]" },
    { label: "Online Revenue",  value: s.onlineRevenue,  valueClass: "text-blue-700" },
    { label: "Pending Amount",  value: s.pendingAmount,  valueClass: "text-orange-600" },
    { label: "Total Discounts", value: s.totalDiscount,  valueClass: "text-red-600" },
  ];

  return (
    <div className="h-full bg-[var(--canvas-sub)] overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-6">
        {/* Page header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-1)]">Daily Summary</h2>
            <p className="text-sm text-[var(--text-3)] mt-0.5">
              {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchSummary}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--canvas)] px-3.5 py-2 text-xs font-semibold text-[var(--text-2)] hover:bg-[var(--canvas-sub)] transition-colors shadow-sm"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
            <button
              onClick={printReport}
              className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-amber-500 transition-colors shadow-sm"
            >
              <Printer className="h-3.5 w-3.5" />
              Print
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className={`rounded-xl border ${stat.border} ${stat.bg} p-4`}>
                <div className={`flex items-center gap-2 mb-3 ${stat.text}`}>
                  <Icon className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-wide">{stat.label}</span>
                </div>
                <p className={`text-3xl font-bold ${stat.text}`}>{stat.value}</p>
              </div>
            );
          })}
        </div>

        {/* Financial breakdown */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--canvas)] overflow-hidden shadow-sm">
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[var(--border-soft)] bg-[var(--canvas-sub)]">
            <DollarSign className="h-4 w-4 text-[var(--text-2)]" />
            <h3 className="text-sm font-semibold text-[var(--text-2)]">Financial Summary</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {financials.map((item) => (
              <div key={item.label} className="flex items-center justify-between px-5 py-4">
                <span className="text-sm text-[var(--text-2)]">{item.label}</span>
                <span className={`text-lg font-bold ${item.valueClass}`}>
                  {formatPrice(item.value, currency)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
