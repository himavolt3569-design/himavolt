"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useRealtimeSignal } from "@/hooks/useRealtimeSignal";
import { adminTopic } from "@/lib/realtime-topics";
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
  Sparkles,
  BedDouble,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
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
   Types
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
  revenueSeries?: { label: string; val: number }[];
  partners?: { restaurants?: number; hotels?: number };
  topRestaurants?: { id: string; name: string; totalOrders?: number; city?: string }[];
}

interface Presence {
  total?: number;
  customers?: number;
  owners?: number;
  staff?: number;
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
  delay,
  onClick,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: typeof Users;
  tint: string;
  delay: number;
  onClick?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: "easeOut" }}
      onClick={onClick}
      className={`group relative bg-[var(--surface)] rounded-[2rem] p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[var(--border-soft)] transition-all hover:shadow-[0_8px_40px_rgb(0,0,0,0.08)] ${onClick ? "cursor-pointer" : ""}`}
    >
      <div className="flex justify-between items-start mb-5">
        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${tint}`}>
          <Icon className="h-6 w-6" />
        </div>
        {onClick && (
          <ArrowUpRight className="h-5 w-5 text-[var(--text-3)] group-hover:text-[var(--text-1)] transition-colors" />
        )}
      </div>
      <h4 className="text-3xl font-bold text-[var(--text-1)] tracking-tight">{value}</h4>
      <p className="text-sm font-semibold text-[var(--text-3)] mt-1">{label}</p>
      {sub && <p className="text-xs font-medium text-[var(--text-3)] mt-0.5">{sub}</p>}
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
    <div className="flex items-center gap-3 rounded-2xl border border-[var(--border-soft)] bg-gray-50/60 px-4 py-3">
      <div className="h-9 w-9 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[var(--text-3)]">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-[var(--text-3)] truncate">{label}</p>
        <p className="text-base font-bold text-[var(--text-1)] leading-tight">{value}</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Main Overview
   ═══════════════════════════════════════════════════════════════════ */

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
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
  // Live refresh on any order/payment/booking change across all restaurants.
  useRealtimeSignal(adminTopic(), fetchStats);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--border-soft)] border-t-[var(--accent)]" />
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-[2.5rem] border border-[var(--border-soft)] bg-[var(--surface)] py-24 text-center shadow-sm">
        <p className="text-base font-bold text-[var(--text-1)]">We couldn&apos;t load your numbers</p>
        <p className="max-w-sm text-sm text-[var(--text-3)]">
          Please check your connection and try again. If you were away for a while, you may need to sign in again.
        </p>
        <button
          onClick={fetchStats}
          className="flex items-center gap-2 rounded-2xl bg-[var(--accent)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--accent-hover)] transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Try again
        </button>
      </div>
    );
  }

  const todayOrders = num(stats?.orders?.today);
  const todayRevenue = num(stats?.revenue?.today);
  const onlineTotal = num(presence?.total);

  const revenueSeries =
    stats?.revenueSeries && stats.revenueSeries.length > 0
      ? stats.revenueSeries
      : [];

  const partners = [
    { name: "Restaurants", value: num(stats?.partners?.restaurants), color: "var(--accent)" },
    { name: "Hotels", value: num(stats?.partners?.hotels), color: "#3b82f6" },
  ];
  const hasPartners = partners.some((p) => p.value > 0);
  const totalPartners = partners.reduce((a, p) => a + p.value, 0);

  const topRestaurants = (stats?.topRestaurants ?? []).filter((r) => r && r.name);

  return (
    <div className="space-y-8">
      {/* ── Welcome Banner (live) ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[var(--accent)] to-orange-400 p-8 md:p-12 text-white shadow-xl shadow-[var(--accent)]/20"
      >
        <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12 pointer-events-none">
          <Sparkles className="h-44 w-44" />
        </div>
        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
              {greeting()}, Admin.
            </h2>
            <p className="text-base md:text-lg text-white/85 font-medium leading-relaxed">
              {todayOrders > 0 || todayRevenue > 0 ? (
                <>
                  You&apos;ve had <span className="font-bold text-white">{todayOrders.toLocaleString()}</span> orders today
                  {todayRevenue > 0 && (
                    <> worth <span className="font-bold text-white">{formatPrice(todayRevenue, "NPR")}</span></>
                  )}
                  {onlineTotal > 0 && (
                    <>, with <span className="font-bold text-white">{onlineTotal}</span> people online right now.</>
                  )}
                  {onlineTotal === 0 && "."}
                </>
              ) : (
                <>Everything&apos;s quiet so far today. {onlineTotal} people are online right now.</>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-2xl bg-white/15 px-4 py-2.5 backdrop-blur-sm">
              <CircleDot className="h-4 w-4 text-white" />
              <span className="text-sm font-bold tabular-nums">{onlineTotal}</span>
              <span className="text-xs font-medium text-white/70">online</span>
            </div>
            <button
              onClick={fetchStats}
              className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors backdrop-blur-sm"
              aria-label="Refresh dashboard"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Key Metrics ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          delay={0.05}
          label="Total revenue"
          value={formatPrice(num(stats?.revenue?.total), "NPR")}
          sub={`${formatPrice(todayRevenue, "NPR")} today`}
          icon={TrendingUp}
          tint="bg-emerald-50 text-emerald-600"
          onClick={() => onNavigate("payments")}
        />
        <StatCard
          delay={0.1}
          label="Orders today"
          value={todayOrders.toLocaleString()}
          sub={`${num(stats?.orders?.thisWeek).toLocaleString()} this week`}
          icon={ShoppingBag}
          tint="bg-[var(--accent)]/10 text-[var(--accent)]"
          onClick={() => onNavigate("orders")}
        />
        <StatCard
          delay={0.15}
          label="Customers"
          value={num(stats?.users?.total).toLocaleString()}
          sub="People signed up"
          icon={Users}
          tint="bg-blue-50 text-blue-600"
          onClick={() => onNavigate("users")}
        />
        <StatCard
          delay={0.2}
          label="Active partners"
          value={num(stats?.restaurants?.total).toLocaleString()}
          sub={`${num(stats?.restaurants?.active)} open now`}
          icon={Store}
          tint="bg-purple-50 text-purple-600"
          onClick={() => onNavigate("restaurants")}
        />
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue area chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="lg:col-span-2 bg-[var(--surface)] rounded-[2.5rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[var(--border-soft)] flex flex-col"
        >
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-xl font-bold text-[var(--text-1)]">Revenue this week</h3>
              <p className="text-sm font-medium text-[var(--text-3)] mt-1">Daily sales across the platform</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-[var(--text-3)] uppercase tracking-widest">7-day total</p>
              <p className="text-lg font-bold text-[var(--text-1)]">
                {formatPrice(revenueSeries.reduce((a, d) => a + num(d.val), 0), "NPR")}
              </p>
            </div>
          </div>
          <div className="flex-1 min-h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueSeries} margin={{ top: 10, right: 4, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Tooltip
                  contentStyle={{ backgroundColor: "#fff", border: "none", borderRadius: "16px", boxShadow: "0 10px 30px rgba(0,0,0,0.1)" }}
                  labelStyle={{ color: "#94a3b8", fontWeight: 600, fontSize: 12 }}
                  formatter={(value) => [formatPrice(num(Number(value)), "NPR"), "Revenue"] as [string, string]}
                />
                <Area
                  type="monotone"
                  dataKey="val"
                  stroke="var(--accent)"
                  strokeWidth={4}
                  fillOpacity={1}
                  fill="url(#colorRev)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Partner distribution donut */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[var(--surface)] rounded-[2.5rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[var(--border-soft)] flex flex-col"
        >
          <div className="mb-2">
            <h3 className="text-xl font-bold text-[var(--text-1)]">Partners</h3>
            <p className="text-sm font-medium text-[var(--text-3)] mt-1">Restaurants &amp; hotels on board</p>
          </div>

          {!hasPartners ? (
            <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
              <Store className="h-8 w-8 text-[var(--text-3)] mb-2" />
              <p className="text-sm font-medium text-[var(--text-3)]">No partners yet</p>
            </div>
          ) : (
            <>
              <div className="relative h-[220px] w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={partners} innerRadius={65} outerRadius={95} paddingAngle={5} dataKey="value" stroke="none">
                      {partners.map((p) => (
                        <Cell key={p.name} fill={p.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 30px rgba(0,0,0,0.1)" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-3xl font-bold text-[var(--text-1)]">{totalPartners}</span>
                  <span className="text-xs font-semibold text-[var(--text-3)]">total</span>
                </div>
              </div>
              <div className="mt-4 flex justify-center gap-6">
                {partners.map((p) => (
                  <div key={p.name} className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: p.color }} />
                    <span className="text-sm font-semibold text-[var(--text-2)]">
                      {p.name} <span className="text-[var(--text-3)]">({p.value})</span>
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* ── At a glance ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="rounded-[2.5rem] bg-[var(--surface)] border border-[var(--border-soft)] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
      >
        <h3 className="text-base font-bold text-[var(--text-1)] mb-6">At a glance</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <MiniStat label="All orders" value={num(stats?.orders?.total).toLocaleString()} icon={ShoppingBag} />
          <MiniStat label="Waiting orders" value={num(stats?.orders?.pending).toLocaleString()} icon={Clock} />
          <MiniStat label="Active deliveries" value={num(stats?.deliveries?.active).toLocaleString()} icon={Truck} />
          <MiniStat label="Payments received" value={num(stats?.payments?.completed).toLocaleString()} icon={CreditCard} />
          <MiniStat label="Staff on shift" value={num(stats?.staff?.active).toLocaleString()} icon={Users} />
          <MiniStat label="Hotels" value={num(stats?.partners?.hotels).toLocaleString()} icon={BedDouble} />
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-[var(--border-soft)] pt-5 text-xs">
          <span className="font-semibold text-[var(--text-3)] flex items-center gap-1.5">
            <Wallet className="h-3.5 w-3.5" /> Online right now:
          </span>
          <span className="font-bold text-[var(--text-2)]">{num(presence?.customers)} customers</span>
          <span className="font-bold text-[var(--text-2)]">{num(presence?.owners)} owners</span>
          <span className="font-bold text-[var(--text-2)]">{num(presence?.staff)} staff</span>
        </div>
      </motion.div>

      {/* ── Top restaurants ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-[2.5rem] bg-[var(--surface)] border border-[var(--border-soft)] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-base font-bold text-[var(--text-1)]">Top restaurants</h3>
          <div className="h-8 w-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">
            <Star className="h-4 w-4" />
          </div>
        </div>

        {topRestaurants.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--text-3)]">No restaurants yet</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topRestaurants.slice(0, 6).map((r, i) => (
              <button
                key={r.id}
                onClick={() => onNavigate("restaurants")}
                className="flex items-center gap-4 p-4 rounded-2xl text-left hover:bg-[var(--surface-alt)] transition-colors group border border-transparent hover:border-[var(--border)]"
              >
                <div className="h-11 w-11 rounded-xl bg-[var(--surface-alt)] flex items-center justify-center text-[var(--text-1)] font-bold text-sm">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[var(--text-1)] truncate">{r.name}</p>
                  <p className="text-xs font-medium text-[var(--text-3)] mt-0.5">
                    {num(r.totalOrders).toLocaleString()} orders
                    {r.city ? ` · ${r.city}` : ""}
                  </p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-[var(--text-3)] opacity-0 group-hover:opacity-100 transition-all" />
              </button>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
