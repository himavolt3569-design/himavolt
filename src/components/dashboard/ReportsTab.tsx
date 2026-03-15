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
    <div className="max-w-5xl space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-amber-950">Financial Reports</h2>
        <p className="text-sm text-amber-700/50 mt-0.5">
          Revenue, costs &amp; profit for{" "}
          <span className="font-semibold text-amber-800">{selectedRestaurant?.name}</span>
        </p>
      </div>

      {/* Top-line numbers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl bg-white/80 ring-1 ring-amber-100/40 p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-500">
              <TrendingUp className="h-4 w-4" />
            </span>
            <span className="text-[13px] font-semibold text-amber-700/60">Total Revenue</span>
          </div>
          <p className="text-[28px] font-extrabold text-amber-950 leading-none">
            Rs. {totalRevenue.toLocaleString()}
          </p>
          <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-emerald-600">
            <ArrowUpRight className="h-3 w-3" />
            Lifetime earnings
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="relative overflow-hidden rounded-2xl bg-white/80 ring-1 ring-amber-100/40 p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-500">
              <Package className="h-4 w-4" />
            </span>
            <span className="text-[13px] font-semibold text-amber-700/60">Inventory Cost</span>
          </div>
          <p className="text-[28px] font-extrabold text-amber-950 leading-none">
            Rs. {totalInventoryCost.toLocaleString()}
          </p>
          <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-orange-500">
            <ArrowDownRight className="h-3 w-3" />
            Total sunk cost
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative overflow-hidden rounded-2xl bg-linear-to-br from-amber-600 to-amber-700 p-6 text-white"
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-amber-100">
              <PiggyBank className="h-4 w-4" />
            </span>
            <span className="text-[13px] font-semibold text-amber-100/80">Estimated Profit</span>
          </div>
          <p className="text-[28px] font-extrabold leading-none">
            Rs. {estimatedProfit.toLocaleString()}
          </p>
          <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-amber-100/70">
            <DollarSign className="h-3 w-3" />
            {profitMargin}% margin
          </div>
        </motion.div>
      </div>

      {/* Revenue breakdown */}
      <div>
        <h3 className="text-[13px] font-bold text-amber-700/50 uppercase tracking-wider mb-4">Revenue Breakdown</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Today", value: `Rs. ${todayRevenue.toLocaleString()}`, icon: DollarSign, accent: "#3b82f6" },
            { label: "This Month", value: `Rs. ${monthRevenue.toLocaleString()}`, icon: Calendar, accent: "#6366f1" },
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
                className="flex items-center gap-4 rounded-xl bg-white/80 ring-1 ring-amber-100/40 px-4 py-4"
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: `${s.accent}12` }}
                >
                  <Icon className="h-4 w-4" style={{ color: s.accent }} />
                </span>
                <div>
                  <p className="text-[11px] font-semibold text-amber-700/50">{s.label}</p>
                  <p className="text-base font-extrabold text-amber-950">{s.value}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Note */}
      <p className="text-[12px] text-amber-600/40 leading-relaxed">
        Profit is estimated by subtracting total inventory cost from lifetime revenue. This is a simplified overview for quick reference.
      </p>
    </div>
  );
}
