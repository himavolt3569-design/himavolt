"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Store,
  ShoppingBag,
  TrendingUp,
  RefreshCw,
  Star,
  ArrowUpRight,
  Truck,
  CreditCard,
  Clock,
  Wallet,
  CircleDot,
} from "lucide-react";
import {
  ResponsiveContainer,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { formatPrice } from "@/lib/currency";

/* ═══════════════════════════════════════════════════════════════════
   Helpers — read values safely so a missing/partial response never
   crashes the dashboard.
   ═══════════════════════════════════════════════════════════════════ */

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

/* ═══════════════════════════════════════════════════════════════════
   Summary Card
   ═══════════════════════════════════════════════════════════════════ */

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tint,
  onClick,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: typeof Users;
  tint: string;
  onClick?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className={`group relative overflow-hidden rounded-3xl bg-white border border-slate-200 p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:border-slate-300 ${onClick ? "cursor-pointer" : ""}`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-500">{label}</p>
          <h4 className="text-3xl font-black text-slate-900 tracking-tight">{value}</h4>
          {sub && <p className="text-xs font-medium text-slate-400">{sub}</p>}
        </div>
        <div className={`h-11 w-11 rounded-2xl flex items-center justify-center ${tint}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {onClick && (
        <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-slate-400 group-hover:text-slate-700 transition-colors">
          View details
          <ArrowUpRight className="h-3.5 w-3.5" />
        </div>
      )}
    </motion.div>
  );
}

function MiniStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: typeof Users;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3">
      <div className="h-9 w-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-slate-400 truncate">{label}</p>
        <p className="text-base font-black text-slate-900 leading-tight">{value}</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Main Overview
   ═══════════════════════════════════════════════════════════════════ */

interface Stats {
  users?: { total?: number };
  restaurants?: { total?: number; active?: number };
  orders?: {
    total?: number;
    today?: number;
    thisWeek?: number;
    pending?: number;
    byStatus?: Record<string, number>;
  };
  revenue?: { total?: number; today?: number };
  staff?: { active?: number };
  deliveries?: { active?: number };
  payments?: { completed?: number };
  topRestaurants?: { id: string; name: string; totalOrders?: number; city?: string }[];
}

interface Presence {
  total?: number;
  customers?: number;
  owners?: number;
  staff?: number;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  PREPARING: "Preparing",
  READY: "Ready",
  SERVED: "Served",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  DELIVERED: "Delivered",
};

function prettyStatus(s: string): string {
  return STATUS_LABELS[s] ?? s.charAt(0) + s.slice(1).toLowerCase();
}

export default function MasterOverview({
  onNavigate,
}: {
  onNavigate: (tab: string) => void;
}) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [presence, setPresence] = useState<Presence | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const fetchStats = useCallback(async () => {
    setRefreshing(true);
    // Guard against a slow or stalled request leaving the dashboard stuck on a
    // spinner forever — abort after 12s so we surface the retry card instead.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    try {
      const [sRes, pRes] = await Promise.all([
        fetch("/api/admin/stats", { cache: "no-store", signal: controller.signal }),
        fetch("/api/admin/presence", { cache: "no-store", signal: controller.signal }),
      ]);
      if (sRes.ok) {
        setStats(await sRes.json());
        setError(false);
      } else {
        setError(true);
      }
      if (pRes.ok) setPresence(await pRes.json());
    } catch {
      setError(true);
    } finally {
      clearTimeout(timeout);
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-[2rem] border border-slate-200 bg-white py-24 text-center shadow-sm">
        <p className="text-base font-bold text-slate-900">We couldn&apos;t load your numbers</p>
        <p className="max-w-sm text-sm text-slate-500">
          Please check your connection and try again. If you were away for a while, you may need to sign in again.
        </p>
        <button
          onClick={fetchStats}
          className="flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-800 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Try again
        </button>
      </div>
    );
  }

  const byStatus = stats?.orders?.byStatus ?? {};
  const statusData = Object.entries(byStatus)
    .map(([name, value]) => ({ name: prettyStatus(name), value: num(value) }))
    .filter((s) => s.value > 0);
  const PIE_COLORS = ["#0f172a", "#f59e0b", "#3b82f6", "#10b981", "#8b5cf6", "#ef4444", "#64748b"];

  const topRestaurants = (stats?.topRestaurants ?? []).filter((r) => r && r.name);

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Dashboard</h2>
          <p className="mt-1 text-sm text-slate-500">A live snapshot of everything happening across HimaVolt.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white border border-slate-200 px-4 py-2.5 rounded-2xl flex items-center gap-2.5 shadow-sm">
            <CircleDot className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-bold text-slate-900 tabular-nums">{num(presence?.total)}</span>
            <span className="text-xs font-medium text-slate-400">online now</span>
          </div>
          <button
            onClick={fetchStats}
            className="h-11 w-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center hover:bg-slate-800 transition-colors shadow-sm"
            aria-label="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      {/* ── Key numbers ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="Customers"
          value={num(stats?.users?.total).toLocaleString()}
          sub="People signed up"
          icon={Users}
          tint="bg-slate-100 text-slate-700"
          onClick={() => onNavigate("users")}
        />
        <StatCard
          label="Restaurants"
          value={num(stats?.restaurants?.total).toLocaleString()}
          sub={`${num(stats?.restaurants?.active)} open now`}
          icon={Store}
          tint="bg-amber-100 text-amber-700"
          onClick={() => onNavigate("restaurants")}
        />
        <StatCard
          label="Orders today"
          value={num(stats?.orders?.today).toLocaleString()}
          sub={`${num(stats?.orders?.thisWeek)} this week`}
          icon={ShoppingBag}
          tint="bg-blue-100 text-blue-700"
          onClick={() => onNavigate("orders")}
        />
        <StatCard
          label="Today's sales"
          value={formatPrice(num(stats?.revenue?.today), "NPR")}
          sub={`${formatPrice(num(stats?.revenue?.total), "NPR")} all time`}
          icon={TrendingUp}
          tint="bg-emerald-100 text-emerald-700"
          onClick={() => onNavigate("payments")}
        />
      </div>

      {/* ── At a glance + Order status ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* At a glance */}
        <div className="lg:col-span-2 rounded-[2rem] bg-white border border-slate-200 p-8 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-6">At a glance</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <MiniStat label="All orders" value={num(stats?.orders?.total).toLocaleString()} icon={ShoppingBag} />
            <MiniStat label="Waiting orders" value={num(stats?.orders?.pending).toLocaleString()} icon={Clock} />
            <MiniStat label="Active deliveries" value={num(stats?.deliveries?.active).toLocaleString()} icon={Truck} />
            <MiniStat label="Payments received" value={num(stats?.payments?.completed).toLocaleString()} icon={CreditCard} />
            <MiniStat label="Staff on shift" value={num(stats?.staff?.active).toLocaleString()} icon={Users} />
            <MiniStat label="Total sales" value={formatPrice(num(stats?.revenue?.total), "NPR")} icon={Wallet} />
          </div>

          {/* Who's online breakdown */}
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-slate-100 pt-5 text-xs">
            <span className="font-semibold text-slate-400">Online right now:</span>
            <span className="font-bold text-slate-700">{num(presence?.customers)} customers</span>
            <span className="font-bold text-slate-700">{num(presence?.owners)} owners</span>
            <span className="font-bold text-slate-700">{num(presence?.staff)} staff</span>
          </div>
        </div>

        {/* Order status */}
        <div className="rounded-[2rem] bg-white border border-slate-200 p-8 shadow-sm flex flex-col">
          <h3 className="text-base font-bold text-slate-900 mb-6">Order status</h3>

          {statusData.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
              <ShoppingBag className="h-8 w-8 text-slate-300 mb-2" />
              <p className="text-sm font-medium text-slate-400">No orders yet</p>
            </div>
          ) : (
            <>
              <div className="h-[200px] w-full mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                      {statusData.map((_, index) => (
                        <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-1 mt-auto">
                {statusData.map((s, i) => (
                  <div key={s.name} className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-xs font-medium text-slate-600">{s.name}</span>
                    </div>
                    <span className="text-xs font-black text-slate-900">{s.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Top restaurants ── */}
      <div className="rounded-[2rem] bg-white border border-slate-200 p-8 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-base font-bold text-slate-900">Top restaurants</h3>
          <div className="h-8 w-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">
            <Star className="h-4 w-4" />
          </div>
        </div>

        {topRestaurants.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No restaurants yet</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topRestaurants.slice(0, 6).map((r, i) => (
              <button
                key={r.id}
                onClick={() => onNavigate("restaurants")}
                className="flex items-center gap-4 p-4 rounded-2xl text-left hover:bg-slate-50 transition-colors group border border-transparent hover:border-slate-200"
              >
                <div className="h-11 w-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-900 font-black text-sm">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{r.name}</p>
                  <p className="text-xs font-medium text-slate-400 mt-0.5">
                    {num(r.totalOrders).toLocaleString()} orders
                    {r.city ? ` · ${r.city}` : ""}
                  </p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-all" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
