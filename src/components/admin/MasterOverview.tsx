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

interface Presence {
  total: number;
  signedInCustomers: number;
  anonymousCustomers: number;
  customers: number;
  owners: number;
  staff: number;
  admins: number;
  generatedAt: string;
  ttlSeconds: number;
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
      className={`relative overflow-hidden rounded-2xl border border-[var(--accent-border)] bg-[var(--canvas)] p-5 shadow-sm transition-all duration-200 hover:shadow-md ${onClick ? "cursor-pointer" : ""}`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-[var(--text-2)]">{label}</p>
          <p className="text-2xl font-bold text-[var(--text-1)]">{value}</p>
          {sub && <p className="text-xs text-[var(--text-3)]">{sub}</p>}
        </div>
        <div className={`rounded-xl p-2.5 ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {onClick && (
        <ArrowUpRight className="absolute bottom-2 right-2 h-3.5 w-3.5 text-[var(--text-3)]" />
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
  const [presence, setPresence] = useState<Presence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const [statsRes, presenceRes] = await Promise.all([
        fetch("/api/admin/stats"),
        fetch("/api/admin/presence"),
      ]);
      if (!statsRes.ok) throw new Error("Failed to load stats");
      setStats(await statsRes.json());
      // Presence is best-effort — if the in-memory store hasn't seen any
      // pings yet (e.g. fresh deploy) just leave the cards at zero.
      if (presenceRes.ok) setPresence(await presenceRes.json());
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
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="mb-3 h-10 w-10 text-red-400" />
        <p className="text-sm text-[var(--text-2)]">{error || "Failed to load"}</p>
        <button onClick={fetchStats} className="mt-3 text-sm text-[var(--accent)] hover:underline">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-[var(--text-1)]">System Overview</h2>
        <button
          onClick={fetchStats}
          className="flex items-center gap-1.5 text-xs text-[var(--text-2)] hover:text-[var(--accent)] transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {/* ── Live presence ───────────────────────────────────────── */}
      <div className="rounded-2xl border border-[var(--accent-border)] bg-[var(--canvas)] p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />
            </span>
            <h3 className="text-sm font-bold text-[var(--text-1)]">
              Live Right Now
            </h3>
            <span className="text-xs font-medium text-[var(--text-3)]">
              {presence ? `${presence.total.toLocaleString()} online` : "—"}
            </span>
          </div>
          {presence && (
            <span className="text-[11px] text-[var(--text-3)]">
              window: {Math.round(presence.ttlSeconds / 60)}m
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Live Customers"
            value={presence ? presence.customers.toLocaleString() : "—"}
            sub={
              presence
                ? `${presence.signedInCustomers} signed in · ${presence.anonymousCustomers} guest`
                : undefined
            }
            icon={Users}
            color="text-blue-600 bg-blue-50"
          />
          <StatCard
            label="Live Owners"
            value={presence ? presence.owners.toLocaleString() : "—"}
            icon={Store}
            color="text-[var(--accent)] bg-[var(--accent-muted)]"
          />
          <StatCard
            label="Live Staff"
            value={presence ? presence.staff.toLocaleString() : "—"}
            icon={Users}
            color="text-purple-600 bg-purple-50"
          />
          <StatCard
            label="Live Admins"
            value={presence ? presence.admins.toLocaleString() : "—"}
            icon={Activity}
            color="text-pink-600 bg-pink-50"
          />
        </div>
      </div>

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
          color="text-[var(--accent)] bg-[var(--accent)]"
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
          color="text-[var(--accent-text)] bg-[var(--accent-muted)]"
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
          color="text-[var(--accent-text)] bg-[var(--accent-muted)]"
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
          color="text-[var(--accent-text)] bg-[var(--accent-muted)]"
          onClick={() => onNavigate("payments")}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-[var(--accent-border)] bg-[var(--canvas)] p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-[var(--text-1)]">Orders by Status</h3>
            <span className="text-xs text-[var(--text-3)]">{stats.orders.total.toLocaleString()} total</span>
          </div>
          <div className="space-y-2.5">
            {Object.entries(stats.orders.byStatus).map(([status, count]) => {
              const total = stats.orders.total || 1;
              const pct = Math.round((count / total) * 100);
              const barColor =
                status === "DELIVERED"
                  ? "bg-[var(--accent)]"
                  : status === "CANCELLED" || status === "REJECTED"
                    ? "bg-red-400"
                    : status === "PENDING"
                      ? "bg-[var(--accent)]"
                      : status === "PREPARING"
                        ? "bg-blue-400"
                        : "bg-[var(--accent)]";
              return (
                <div key={status}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-[var(--text-2)]">{status}</span>
                    <span className="tabular-nums text-[var(--text-3)]">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[var(--accent-muted)]">
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

        <div className="rounded-2xl border border-[var(--accent-border)] bg-[var(--canvas)] p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-[var(--text-1)]">Top Restaurants</h3>
          <div className="space-y-2.5">
            {stats.topRestaurants.map((r, i) => (
              <div
                key={r.id}
                className="flex items-center gap-3 rounded-xl p-2 transition-all hover:bg-[var(--accent-muted)]"
              >
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--text-1)] text-xs font-bold text-white">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[var(--text-1)]">{r.name}</p>
                  <div className="flex items-center gap-2 text-[11px] text-[var(--text-3)]">
                    <span>{r.city}</span>
                    {r.rating > 0 && (
                      <>
                        <span>|</span>
                        <span className="flex items-center gap-0.5">
                          <Star className="h-3 w-3 fill-[var(--accent)] text-[var(--accent)]" />
                          {r.rating.toFixed(1)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-[var(--text-1)]">{r.totalOrders}</p>
                  <p className="text-[11px] text-[var(--text-3)]">orders</p>
                </div>
              </div>
            ))}
            {stats.topRestaurants.length === 0 && (
              <p className="py-6 text-center text-sm text-[var(--text-3)]">No restaurants yet</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--accent-border)] bg-[var(--canvas)] p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-[var(--text-1)]">Quick Actions</h3>
          <div className="space-y-2">
            {[
              { label: "View All Orders", icon: ShoppingBag, tab: "orders", color: "text-blue-600" },
              { label: "Manage Restaurants", icon: Store, tab: "restaurants", color: "text-[var(--accent)]" },
              { label: "Manage Users", icon: Users, tab: "users", color: "text-indigo-600" },
              { label: "View Chats", icon: MessageCircle, tab: "chats", color: "text-purple-600" },
              { label: "Payment History", icon: CreditCard, tab: "payments", color: "text-[var(--accent-text)]" },
              { label: "Active Deliveries", icon: Truck, tab: "deliveries", color: "text-teal-600" },
              { label: "Audit Events", icon: Zap, tab: "audit", color: "text-pink-600" },
            ].map((action) => (
              <button
                key={action.tab}
                onClick={() => onNavigate(action.tab)}
                className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-all hover:bg-[var(--accent-muted)]"
              >
                <action.icon className={`h-4 w-4 ${action.color}`} />
                <span className="flex-1 text-sm font-medium text-[var(--text-1)]">{action.label}</span>
                <ArrowUpRight className="h-3.5 w-3.5 text-[var(--text-3)]" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
