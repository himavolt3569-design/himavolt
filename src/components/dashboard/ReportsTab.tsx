"use client";

import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  ShoppingBag,
  DollarSign,
  Package,
  PiggyBank,
  Activity,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
} from "lucide-react";
import { useRestaurant } from "@/context/RestaurantContext";
import { useLiveOrders } from "@/context/LiveOrdersContext";
import { apiFetch } from "@/lib/api-client";
import { formatPrice } from "@/lib/currency";

interface FinancialData {
  totalRevenue: number;
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  totalInventoryCost: number;
  estimatedProfit: number;
  totalOrders: number;
}

export default function ReportsTab() {
  const { selectedRestaurant } = useRestaurant();
  const cur = selectedRestaurant?.currency ?? "NPR";
  const { orders } = useLiveOrders();

  const [data, setData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadFinancials = useCallback(async () => {
    if (!selectedRestaurant) return;
    try {
      const res = await apiFetch(`/api/restaurants/${selectedRestaurant.id}/financials`);
      setData(res as FinancialData);
    } catch { /* ignore */ }
    setLoading(false);
  }, [selectedRestaurant]);

  useEffect(() => { loadFinancials(); }, [loadFinancials]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
      </div>
    );
  }

  const totalOrders = data?.totalOrders ?? 0;
  const totalRevenue = data?.totalRevenue ?? 0;
  const todayRevenue = data?.todayRevenue ?? 0;
  const monthRevenue = data?.monthRevenue ?? 0;
  const totalInventoryCost = data?.totalInventoryCost ?? 0;
  const estimatedProfit = data?.estimatedProfit ?? 0;
  const liveCount = orders.filter(o => o.status !== "DELIVERED" && o.status !== "CANCELLED").length;
  const profitMargin = totalRevenue > 0 ? ((estimatedProfit / totalRevenue) * 100).toFixed(1) : "0";

  return (
    <div className="max-w-5xl space-y-8 pb-12">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-gray-900">Financial Reports</h2>
        <p className="text-sm font-medium text-gray-500 mt-1.5">
          Revenue, costs &amp; profit for{" "}
          <strong className="text-gray-900">{selectedRestaurant?.name}</strong>
        </p>
      </div>

      {/* Top-line numbers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-white/70 backdrop-blur-md border border-gray-100/50 p-6 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.03)]"
        >
          <div className="flex items-center gap-3 mb-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 shadow-sm border border-emerald-100/50">
              <TrendingUp className="h-5 w-5" />
            </span>
            <span className="text-[13px] font-bold tracking-wide text-gray-500 uppercase">Total Revenue</span>
          </div>
          <p className="text-3xl font-black text-gray-900 leading-none tracking-tight">
            {formatPrice(totalRevenue, cur)}
          </p>
          <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50/50 w-fit px-2 py-1 rounded-md">
            <ArrowUpRight className="h-3.5 w-3.5" />
            Lifetime earnings
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="relative overflow-hidden rounded-3xl bg-white/70 backdrop-blur-md border border-gray-100/50 p-6 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.03)]"
        >
          <div className="flex items-center gap-3 mb-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600 shadow-sm border border-orange-100/50">
              <Package className="h-5 w-5" />
            </span>
            <span className="text-[13px] font-bold tracking-wide text-gray-500 uppercase">Inventory Cost</span>
          </div>
          <p className="text-3xl font-black text-gray-900 leading-none tracking-tight">
            {formatPrice(totalInventoryCost, cur)}
          </p>
          <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-orange-600 bg-orange-50/50 w-fit px-2 py-1 rounded-md">
            <ArrowDownRight className="h-3.5 w-3.5" />
            Total sunk cost
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500 to-orange-500 p-6 text-white shadow-[0_4px_20px_-4px_rgba(245,158,11,0.4)]"
        >
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute bottom-0 left-0 -mb-4 -ml-4 h-24 w-24 rounded-full bg-white/10 blur-xl" />
          
          <div className="relative flex items-center gap-3 mb-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white shadow-sm backdrop-blur-md">
              <PiggyBank className="h-5 w-5" />
            </span>
            <span className="text-[13px] font-bold tracking-wide text-amber-50 uppercase drop-shadow-sm">Estimated Profit</span>
          </div>
          <p className="relative text-3xl font-black leading-none drop-shadow-md tracking-tight">
            {formatPrice(estimatedProfit, cur)}
          </p>
          <div className="relative mt-4 flex items-center gap-1.5 text-xs font-bold text-white bg-white/20 w-fit px-2 py-1 rounded-md backdrop-blur-sm">
            <DollarSign className="h-3.5 w-3.5" />
            {profitMargin}% margin
          </div>
        </motion.div>
      </div>

      {/* Revenue breakdown */}
      <div>
        <h3 className="text-[13px] font-bold text-gray-400 uppercase tracking-wider mb-4">Revenue Breakdown</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Today", value: formatPrice(todayRevenue, cur), icon: DollarSign, accent: "#3b82f6" },
            { label: "This Month", value: formatPrice(monthRevenue, cur), icon: Calendar, accent: "#6366f1" },
            { label: "Total Orders", value: totalOrders.toLocaleString(), icon: ShoppingBag, accent: "#f59e0b" },
            { label: "Live Orders", value: liveCount.toString(), icon: Activity, accent: "#10b981" },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.04 }}
                className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 rounded-2xl bg-white/70 backdrop-blur-md border border-gray-100/50 px-5 py-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.06)] transition-all hover:-translate-y-0.5"
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm border border-black/5"
                  style={{ background: `${s.accent}15` }}
                >
                  <Icon className="h-5 w-5" style={{ color: s.accent }} />
                </span>
                <div>
                  <p className="text-xs font-bold text-gray-500 mb-0.5">{s.label}</p>
                  <p className="text-lg font-black tracking-tight text-gray-900">{s.value}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Note */}
      <p className="text-[12px] font-medium text-gray-400 leading-relaxed max-w-2xl bg-gray-100/50 backdrop-blur-sm p-4 rounded-xl border border-gray-200/50">
        <span className="font-bold text-gray-500">Note:</span> Profit is estimated by subtracting total inventory cost from lifetime revenue. This is a simplified overview for quick reference and does not account for operational expenses.
      </p>
    </div>
  );
}
