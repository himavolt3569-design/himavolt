"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  Users,
  Store,
  ShoppingBag,
  TrendingUp,
  Clock,
  Truck,
  Zap,
  CreditCard,
  RefreshCw,
  Star,
  ArrowUpRight,
  MessageCircle,
  AlertCircle,
} from "lucide-react";
import { formatPrice } from "@/lib/currency";

interface Stats {
  users: { total: number };
  restaurants: { total: number; active: number };
  orders: {
    total: number;
    today: number;
    thisWeek: number;
    pending: number;
    byStatus: Record<string, number>;
  };
  revenue: { total: number; today: number };
  staff: { active: number };
  deliveries: { active: number };
  payments: { completed: number };
  audit: { today: number };
  topRestaurants: {
    id: string;
    name: string;
    slug: string;
    totalOrders: number;
    rating: number;
    city: string;
  }[];
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  onClick,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: typeof Activity;
  color: string;
  onClick?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, transition: { type: "spring", stiffness: 400, damping: 20 } }}
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl border border-brand-100 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md ${onClick ? "cursor-pointer" : ""}`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gompa-slate">{value}</p>
          {sub && <p className="text-xs text-gray-400">{sub}</p>}
        </div>
        <div className={`rounded-xl p-2.5 ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {onClick && (
        <ArrowUpRight className="absolute bottom-2 right-2 h-3.5 w-3.5 text-gray-300" />
      )}
    </motion.div>
  );
}

function formatCurrency(amount: number): string {
  return formatPrice(amount, "NPR");
}

export default function MasterOverview({
  onNavigate,
}: {
  onNavigate: (tab: string) => void;
}) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stats");
      if (!res.ok) throw new Error("Failed to load stats");
      setStats(await res.json());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stats");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="mb-3 h-10 w-10 text-red-400" />
        <p className="text-sm text-gray-500">{error || "Failed to load"}</p>
        <button onClick={fetchStats} className="mt-3 text-sm text-brand-500 hover:underline">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Refresh indicator */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-gompa-slate">System Overview</h2>
        <button
          onClick={fetchStats}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-brand-500 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard
          label="Total Users"
          value={stats.users.total.toLocaleString()}
          icon={Users}
          color="text-indigo-600 bg-indigo-50"
          onClick={() => onNavigate("users")}
        />
        <StatCard
          label="Restaurants"
          value={stats.restaurants.total}
          sub={`${stats.restaurants.active} active`}
          icon={Store}
          color="text-saffron-flame bg-orange-50"
          onClick={() => onNavigate("restaurants")}
        />
        <StatCard
          label="Orders Today"
          value={stats.orders.today}
          sub={`${stats.orders.thisWeek} this week | ${stats.orders.total.toLocaleString()} total`}
          icon={ShoppingBag}
          color="text-blue-600 bg-blue-50"
          onClick={() => onNavigate("orders")}
        />
        <StatCard
          label="Revenue Today"
          value={formatCurrency(stats.revenue.today)}
          sub={`${formatCurrency(stats.revenue.total)} lifetime`}
          icon={TrendingUp}
          color="text-green-600 bg-green-50"
          onClick={() => onNavigate("payments")}
        />
        <StatCard
          label="Active Staff"
          value={stats.staff.active}
          icon={Users}
          color="text-purple-600 bg-purple-50"
        />
        <StatCard
          label="Pending Orders"
          value={stats.orders.pending}
          icon={Clock}
          color="text-amber-600 bg-amber-50"
          onClick={() => onNavigate("orders")}
        />
        <StatCard
          label="Active Deliveries"
          value={stats.deliveries.active}
          icon={Truck}
          color="text-teal-600 bg-teal-50"
          onClick={() => onNavigate("deliveries")}
        />
        <StatCard
          label="Completed Payments"
          value={stats.payments.completed.toLocaleString()}
          icon={CreditCard}
          color="text-emerald-600 bg-emerald-50"
          onClick={() => onNavigate("payments")}
        />
      </div>

      {/* Bottom Grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Order Status Breakdown */}
        <div className="rounded-2xl border border-brand-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gompa-slate">Orders by Status</h3>
            <span className="text-xs text-gray-400">{stats.orders.total.toLocaleString()} total</span>
          </div>
          <div className="space-y-2.5">
            {Object.entries(stats.orders.byStatus).map(([status, count]) => {
              const total = stats.orders.total || 1;
              const pct = Math.round((count / total) * 100);
              const barColor =
                status === "DELIVERED"
                  ? "bg-green-500"
                  : status === "CANCELLED" || status === "REJECTED"
                    ? "bg-red-400"
                    : status === "PENDING"
                      ? "bg-amber-400"
                      : status === "PREPARING"
                        ? "bg-blue-400"
                        : "bg-brand-500";
              return (
                <div key={status}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-gray-600">{status}</span>
                    <span className="tabular-nums text-gray-400">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-brand-50">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6 }}
                      className={`h-full rounded-full ${barColor}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Restaurants */}
        <div className="rounded-2xl border border-brand-100 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-gompa-slate">Top Restaurants</h3>
          <div className="space-y-2.5">
            {stats.topRestaurants.map((r, i) => (
              <div
                key={r.id}
                className="flex items-center gap-3 rounded-xl p-2 transition-all hover:bg-brand-50/60"
              >
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-gompa-slate text-xs font-bold text-white">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gompa-slate">{r.name}</p>
                  <div className="flex items-center gap-2 text-[11px] text-gray-400">
                    <span>{r.city}</span>
                    {r.rating > 0 && (
                      <>
                        <span>|</span>
                        <span className="flex items-center gap-0.5">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          {r.rating.toFixed(1)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gompa-slate">{r.totalOrders}</p>
                  <p className="text-[11px] text-gray-400">orders</p>
                </div>
              </div>
            ))}
            {stats.topRestaurants.length === 0 && (
              <p className="py-6 text-center text-sm text-gray-400">No restaurants yet</p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-2xl border border-brand-100 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-gompa-slate">Quick Actions</h3>
          <div className="space-y-2">
            {[
              { label: "View All Orders", icon: ShoppingBag, tab: "orders", color: "text-blue-600" },
              { label: "Manage Restaurants", icon: Store, tab: "restaurants", color: "text-saffron-flame" },
              { label: "Manage Users", icon: Users, tab: "users", color: "text-indigo-600" },
              { label: "View Chats", icon: MessageCircle, tab: "chats", color: "text-purple-600" },
              { label: "Payment History", icon: CreditCard, tab: "payments", color: "text-green-600" },
              { label: "Active Deliveries", icon: Truck, tab: "deliveries", color: "text-teal-600" },
              { label: "Audit Events", icon: Zap, tab: "audit", color: "text-pink-600" },
            ].map((action) => (
              <button
                key={action.tab}
                onClick={() => onNavigate(action.tab)}
                className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-all hover:bg-brand-50/60"
              >
                <action.icon className={`h-4 w-4 ${action.color}`} />
                <span className="flex-1 text-sm font-medium text-gompa-slate">{action.label}</span>
                <ArrowUpRight className="h-3.5 w-3.5 text-gray-300" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
