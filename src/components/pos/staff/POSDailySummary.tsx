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
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <BarChart3 className="h-10 w-10 mb-2 opacity-40" />
        <p className="text-sm">Unable to load summary</p>
        <button onClick={fetchSummary} className="mt-3 text-xs text-amber-600 hover:text-amber-500">Retry</button>
      </div>
    );
  }

  const stats = [
    { label: "Total Orders", value: summary.totalOrders, icon: ShoppingCart, color: "bg-blue-50 text-blue-700 border-blue-200" },
    { label: "Completed", value: summary.completedOrders, icon: TrendingUp, color: "bg-green-50 text-green-700 border-green-200" },
    { label: "Paid Orders", value: summary.paidOrders, icon: CreditCard, color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    { label: "Unpaid Orders", value: summary.unpaidOrders, icon: ShoppingCart, color: "bg-orange-50 text-orange-700 border-orange-200" },
  ];

  const financials = [
    { label: "Total Revenue", value: summary.totalRevenue, color: "text-green-700" },
    { label: "Cash Revenue", value: summary.cashRevenue, color: "text-gray-700" },
    { label: "Online Revenue", value: summary.onlineRevenue, color: "text-blue-700" },
    { label: "Pending Amount", value: summary.pendingAmount, color: "text-orange-700" },
    { label: "Total Discounts", value: summary.totalDiscount, color: "text-red-600" },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Daily Summary (Z-Report)</h2>
          <p className="text-xs text-gray-500">
            {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchSummary}
            className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-200"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <button
            onClick={printReport}
            className="flex items-center gap-1.5 rounded-lg bg-amber-700 px-3 py-2 text-xs font-bold text-white hover:bg-amber-600"
          >
            <Printer className="h-3.5 w-3.5" />
            Print
          </button>
        </div>
      </div>

      {/* Order stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={`rounded-xl border-2 p-4 ${stat.color}`}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-wider">{stat.label}</span>
              </div>
              <p className="text-3xl font-black">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Financial summary */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
          <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Financial Summary
          </h3>
        </div>
        <div className="divide-y divide-gray-50">
          {financials.map((item) => (
            <div key={item.label} className="flex items-center justify-between px-5 py-4">
              <span className="text-sm text-gray-600">{item.label}</span>
              <span className={`text-lg font-black ${item.color}`}>
                {formatPrice(item.value, currency)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
