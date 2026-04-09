"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart3, DollarSign, ShoppingCart, CreditCard, TrendingUp,
  RefreshCw, Loader2, Printer,
} from "lucide-react";
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
  const [loading, setLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    try {
      const data = await staffFetch<DailySummary>(`/api/restaurants/${restaurantId}/billing/summary`);
      setSummary(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const printReport = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400 bg-gray-50">
        <div className="rounded-full bg-gray-100 p-4">
          <BarChart3 className="h-8 w-8 opacity-50" />
        </div>
        <p className="text-sm font-medium">Unable to load summary</p>
        <button
          onClick={fetchSummary}
          className="text-xs font-semibold text-amber-600 hover:text-amber-500 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const stats = [
    { label: "Total Orders",    value: summary.totalOrders,     icon: ShoppingCart, bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-100" },
    { label: "Completed",       value: summary.completedOrders, icon: TrendingUp,   bg: "bg-green-50",   text: "text-green-700",   border: "border-green-100" },
    { label: "Paid",            value: summary.paidOrders,      icon: CreditCard,   bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-100" },
    { label: "Unpaid",          value: summary.unpaidOrders,    icon: ShoppingCart, bg: "bg-orange-50",  text: "text-orange-700",  border: "border-orange-100" },
  ];

  const financials = [
    { label: "Total Revenue",   value: summary.totalRevenue,   valueClass: "text-green-700" },
    { label: "Cash Revenue",    value: summary.cashRevenue,    valueClass: "text-gray-800" },
    { label: "Online Revenue",  value: summary.onlineRevenue,  valueClass: "text-blue-700" },
    { label: "Pending Amount",  value: summary.pendingAmount,  valueClass: "text-orange-600" },
    { label: "Total Discounts", value: summary.totalDiscount,  valueClass: "text-red-600" },
  ];

  return (
    <div className="h-full bg-gray-50 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-6">
        {/* Page header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Daily Summary</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchSummary}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
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
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100 bg-gray-50">
            <DollarSign className="h-4 w-4 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-700">Financial Summary</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {financials.map((item) => (
              <div key={item.label} className="flex items-center justify-between px-5 py-4">
                <span className="text-sm text-gray-600">{item.label}</span>
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
