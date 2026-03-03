"use client";

import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  ShoppingBag,
  DollarSign,
  Package,
  PiggyBank,
  Wallet,
  Activity,
  ArrowRight,
  Calendar,
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
  const { orders } = useLiveOrders(); // For live order count

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
    return <div className="py-20 text-center font-bold text-gray-400">Loading financials...</div>;
  }

  // Use live data for some metrics if possible, but the API gives us the DB truth
  const totalOrders = data?.totalOrders ?? 0;
  const totalRevenue = data?.totalRevenue ?? 0;
  const todayRevenue = data?.todayRevenue ?? 0;
  const monthRevenue = data?.monthRevenue ?? 0;
  const totalInventoryCost = data?.totalInventoryCost ?? 0;
  
  // Profit = Revenue - Inventory Cost
  const estimatedProfit = data?.estimatedProfit ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold tracking-tight text-[#1F2A2A]">Financial Reports</h2>
        <p className="mt-1 text-sm text-gray-500">
          Revenue, costs, and estimated profit for <strong className="text-[#1F2A2A]">{selectedRestaurant?.name}</strong>
        </p>
      </div>

      {/* Main Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Revenue */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-3xl border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)]"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <TrendingUp className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-gray-500">Total Revenue</h3>
          </div>
          <p className="text-3xl font-black text-[#1F2A2A]">Rs. {totalRevenue.toLocaleString()}</p>
          <div className="mt-4 flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 rounded-lg px-2 py-1 w-fit">
            <Activity className="h-3.5 w-3.5" />
            Active Sales
          </div>
        </motion.div>

        {/* Costs */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.05 }}
          className="rounded-3xl border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)]"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
              <Package className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-gray-500">Inventory Cost</h3>
          </div>
          <p className="text-3xl font-black text-[#1F2A2A]">Rs. {totalInventoryCost.toLocaleString()}</p>
          <div className="mt-4 flex items-center gap-2 text-xs font-bold text-orange-600 bg-orange-50 rounded-lg px-2 py-1 w-fit">
            <Wallet className="h-3.5 w-3.5" />
            Estimated Sunk Cost
          </div>
        </motion.div>

        {/* Profit */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="rounded-3xl border border-[#0A4D3C]/20 bg-gradient-to-br from-[#0A4D3C] to-[#083a2d] p-6 shadow-xl shadow-[#0A4D3C]/20 text-white"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-emerald-300">
              <PiggyBank className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-emerald-50">Estimated Profit</h3>
          </div>
          <p className="text-3xl font-black">Rs. {estimatedProfit.toLocaleString()}</p>
          <div className="mt-4 flex items-center gap-2 text-xs font-bold text-emerald-100 bg-black/20 rounded-lg px-2 py-1 w-fit border border-white/10">
            <DollarSign className="h-3.5 w-3.5" />
            Revenue  minus  Cost
          </div>
        </motion.div>
      </div>

      {/* Breakdown */}
      <h3 className="pt-2 text-base font-extrabold text-[#1F2A2A]">Revenue Breakdown</h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Today's Revenue",
            value: `Rs. ${todayRevenue.toLocaleString()}`,
            icon: DollarSign,
            color: "text-blue-500",
            bg: "bg-blue-50",
          },
          {
            label: "This Month",
            value: `Rs. ${monthRevenue.toLocaleString()}`,
            icon: Calendar,
            color: "text-indigo-500",
            bg: "bg-indigo-50",
          },
          {
            label: "Total Orders",
            value: totalOrders.toLocaleString(),
            icon: ShoppingBag,
            color: "text-[#FF9933]",
            bg: "bg-[#FF9933]/10",
          },
          {
            label: "Live Orders",
            value: orders.filter(o => o.status !== "DELIVERED" && o.status !== "CANCELLED").length.toString(),
            icon: Activity,
            color: "text-emerald-500",
            bg: "bg-emerald-50",
          },
        ].map((s, i) => {
          const Icon = s.icon || DollarSign;
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${s.bg} mb-3`}>
                <Icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <p className="text-xs font-bold text-gray-400 mb-0.5">{s.label}</p>
              <p className="text-lg font-black text-[#1F2A2A]">{s.value}</p>
            </motion.div>
          );
        })}
      </div>
      
      {/* Notice */}
      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 flex gap-3 text-sm text-blue-800">
        <Activity className="h-5 w-5 shrink-0 text-blue-500" />
        <p>
          <strong>Note on Profit:</strong> Estimated profit is calculated by subtracting your current total inventory cost from your total lifetime revenue. This is a simple estimation model intended for a quick financial overview.
        </p>
      </div>
    </div>
  );
}
