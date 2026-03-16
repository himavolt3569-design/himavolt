"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Activity,
  Users,
  Store,
  ShoppingBag,
  TrendingUp,
  Clock,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Truck,
  CreditCard,
  UserPlus,
  Utensils,
  Package,
  LogIn,
  LogOut,
  Eye,
  Zap,
  ArrowUpRight,
  Radio,
  X,
} from "lucide-react";
import { useUser, UserButton } from "@clerk/nextjs";
import { formatPrice } from "@/lib/currency";
import Link from "next/link";

/* ═══════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════ */

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  detail: string | null;
  metadata: string | null;
  ipAddress: string | null;
  createdAt: string;
  userId: string | null;
  restaurantId: string | null;
  user: { name: string; email: string; imageUrl: string | null } | null;
  restaurant: { name: string; slug: string } | null;
}

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

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

type AdminTab = "overview" | "audit";

/* ═══════════════════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════════════════ */

const ACTION_ICONS: Record<string, typeof Activity> = {
  ORDER_CREATED: ShoppingBag,
  ORDER_ACCEPTED: CheckCircle2,
  ORDER_PREPARING: Clock,
  ORDER_READY: CheckCircle2,
  ORDER_DELIVERED: Truck,
  ORDER_CANCELLED: XCircle,
  ORDER_REJECTED: XCircle,
  MENU_ITEM_CREATED: Utensils,
  MENU_ITEM_UPDATED: Utensils,
  MENU_ITEM_DELETED: Utensils,
  CATEGORY_CREATED: Utensils,
  STAFF_ADDED: UserPlus,
  STAFF_REMOVED: Users,
  STAFF_UPDATED: Users,
  STAFF_LOGIN: LogIn,
  STAFF_LOGOUT: LogOut,
  STAFF_CHECKIN: LogIn,
  STAFF_CHECKOUT: LogOut,
  PAYMENT_INITIATED: CreditCard,
  PAYMENT_COMPLETED: CreditCard,
  PAYMENT_FAILED: AlertCircle,
  PAYMENT_COLLECTED: CreditCard,
  BILL_CREATED: CreditCard,
  DISCOUNT_APPLIED: CreditCard,
  RESTAURANT_CREATED: Store,
  RESTAURANT_UPDATED: Store,
  RESTAURANT_DELETED: Store,
  INVENTORY_ADDED: Package,
  INVENTORY_UPDATED: Package,
  INVENTORY_DELETED: Package,
  DELIVERY_ASSIGNED: Truck,
  DELIVERY_STATUS_UPDATED: Truck,
  USER_CREATED: UserPlus,
  USER_UPDATED: Users,
  USER_DELETED: Users,
};

const ACTION_COLORS: Record<string, string> = {
  ORDER_CREATED: "text-blue-600 bg-blue-50",
  ORDER_ACCEPTED: "text-emerald-600 bg-emerald-50",
  ORDER_PREPARING: "text-amber-600 bg-amber-50",
  ORDER_READY: "text-green-600 bg-green-50",
  ORDER_DELIVERED: "text-green-700 bg-green-50",
  ORDER_CANCELLED: "text-red-600 bg-red-50",
  ORDER_REJECTED: "text-red-600 bg-red-50",
  MENU_ITEM_CREATED: "text-purple-600 bg-purple-50",
  MENU_ITEM_UPDATED: "text-purple-600 bg-purple-50",
  MENU_ITEM_DELETED: "text-red-500 bg-red-50",
  STAFF_ADDED: "text-indigo-600 bg-indigo-50",
  STAFF_REMOVED: "text-red-500 bg-red-50",
  STAFF_LOGIN: "text-teal-600 bg-teal-50",
  STAFF_LOGOUT: "text-gray-500 bg-gray-100",
  PAYMENT_COMPLETED: "text-green-600 bg-green-50",
  PAYMENT_FAILED: "text-red-600 bg-red-50",
  RESTAURANT_CREATED: "text-saffron-flame bg-orange-50",
  RESTAURANT_UPDATED: "text-saffron-flame bg-orange-50",
  INVENTORY_ADDED: "text-cyan-600 bg-cyan-50",
  INVENTORY_UPDATED: "text-cyan-600 bg-cyan-50",
  USER_CREATED: "text-indigo-600 bg-indigo-50",
};

const ENTITY_FILTERS = [
  "All",
  "Order",
  "MenuItem",
  "StaffMember",
  "Payment",
  "Restaurant",
  "InventoryItem",
  "Delivery",
  "User",
];

/* ═══════════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════════ */

function timeAgo(date: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(date).getTime()) / 1000,
  );
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatCurrency(amount: number): string {
  return formatPrice(amount, "NPR");
}

function formatAction(action: string): string {
  return action
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

/* ═══════════════════════════════════════════════════════════════════
   Stat Card Component
   ═══════════════════════════════════════════════════════════════════ */

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: typeof Activity;
  color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gompa-slate">{value}</p>
          {sub && (
            <p className="text-xs text-gray-400">{sub}</p>
          )}
        </div>
        <div className={`rounded-xl p-2.5 ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Audit Row Component
   ═══════════════════════════════════════════════════════════════════ */

function AuditRow({ log, isNew }: { log: AuditLog; isNew?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = ACTION_ICONS[log.action] ?? Activity;
  const colorClass = ACTION_COLORS[log.action] ?? "text-gray-500 bg-gray-100";

  return (
    <motion.div
      layout
      initial={isNew ? { opacity: 0, x: -20, scale: 0.98 } : false}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      className={`group border-b border-gray-50 transition-colors hover:bg-gray-50/60 ${
        isNew ? "bg-saffron-flame/5" : ""
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <div className={`flex-shrink-0 rounded-lg p-2 ${colorClass}`}>
          <Icon className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gompa-slate">
              {formatAction(log.action)}
            </span>
            {isNew && (
              <span className="inline-flex items-center rounded-full bg-saffron-flame px-1.5 py-0.5 text-[10px] font-bold text-white">
                NEW
              </span>
            )}
          </div>
          <p className="truncate text-xs text-gray-500">
            {log.detail ?? `${log.entity} ${log.entityId ? `#${log.entityId.slice(-6)}` : ""}`}
          </p>
        </div>

        <div className="hidden flex-shrink-0 text-right sm:block">
          {log.user && (
            <p className="text-xs font-medium text-gray-600">
              {log.user.name}
            </p>
          )}
          {log.restaurant && (
            <p className="text-[11px] text-gray-400">
              {log.restaurant.name}
            </p>
          )}
        </div>

        <span className="flex-shrink-0 text-[11px] text-gray-400 tabular-nums">
          {timeAgo(log.createdAt)}
        </span>

        <Eye className="h-3.5 w-3.5 flex-shrink-0 text-gray-300 transition-colors group-hover:text-gray-500" />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-3">
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs sm:grid-cols-4">
                <div>
                  <span className="text-gray-400">Entity</span>
                  <p className="font-medium text-gompa-slate">{log.entity}</p>
                </div>
                <div>
                  <span className="text-gray-400">Entity ID</span>
                  <p className="font-mono text-gompa-slate">
                    {log.entityId ? `...${log.entityId.slice(-8)}` : "—"}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">User</span>
                  <p className="font-medium text-gompa-slate">
                    {log.user?.email ?? "System"}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">IP Address</span>
                  <p className="font-mono text-gompa-slate">
                    {log.ipAddress ?? "—"}
                  </p>
                </div>
                <div className="col-span-2 sm:col-span-4">
                  <span className="text-gray-400">Timestamp</span>
                  <p className="font-medium text-gompa-slate">
                    {new Date(log.createdAt).toLocaleString()}
                  </p>
                </div>
                {log.metadata && (
                  <div className="col-span-2 sm:col-span-4">
                    <span className="text-gray-400">Metadata</span>
                    <pre className="mt-1 max-h-32 overflow-auto rounded-lg bg-gompa-slate p-2 text-[11px] text-green-300">
                      {JSON.stringify(JSON.parse(log.metadata), null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Main Admin Page
   ═══════════════════════════════════════════════════════════════════ */

export default function AdminPage() {
  const { user, isLoaded } = useUser();
  const [tab, setTab] = useState<AdminTab>("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveEnabled, setLiveEnabled] = useState(true);
  const [newLogIds, setNewLogIds] = useState<Set<string>>(new Set());

  // Filters
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  // ── Fetch stats ──────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stats");
      if (!res.ok) throw new Error("Failed to load stats");
      const data = await res.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stats");
    }
  }, []);

  // ── Fetch audit logs ─────────────────────────────────────────────
  const fetchLogs = useCallback(
    async (p = page) => {
      setLogsLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(p),
          limit: "30",
        });
        if (search) params.set("search", search);
        if (entityFilter !== "All") params.set("entity", entityFilter);

        const res = await fetch(`/api/admin/audit?${params}`);
        if (!res.ok) throw new Error("Failed to load audit logs");
        const data = await res.json();
        setLogs(data.logs);
        setPagination(data.pagination);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load audit logs",
        );
      } finally {
        setLogsLoading(false);
      }
    },
    [page, search, entityFilter],
  );

  // ── Initial load ─────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([fetchStats(), fetchLogs(1)]).finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Refetch logs when filters change ─────────────────────────────
  useEffect(() => {
    if (!loading) fetchLogs(page);
  }, [page, entityFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Debounced search ─────────────────────────────────────────────
  useEffect(() => {
    if (loading) return;
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setPage(1);
      fetchLogs(1);
    }, 400);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── SSE for live updates ─────────────────────────────────────────
  useEffect(() => {
    if (!liveEnabled || tab !== "audit") {
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
      return;
    }

    const es = new EventSource("/api/admin/audit/stream");
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "logs" && data.logs?.length > 0) {
          setLogs((prev) => {
            const existing = new Set(prev.map((l) => l.id));
            const incoming = (data.logs as AuditLog[]).filter(
              (l) => !existing.has(l.id),
            );
            if (incoming.length === 0) return prev;

            setNewLogIds(
              (ids) => new Set([...ids, ...incoming.map((l) => l.id)]),
            );

            // Auto-clear "new" highlight after 5s
            setTimeout(() => {
              setNewLogIds((ids) => {
                const next = new Set(ids);
                incoming.forEach((l) => next.delete(l.id));
                return next;
              });
            }, 5000);

            return [...incoming, ...prev].slice(0, 50);
          });

          setPagination((p) =>
            p ? { ...p, total: p.total + data.logs.length } : p,
          );
        }
      } catch {
        // ignore malformed messages
      }
    };

    es.onerror = () => {
      es.close();
      // Reconnect after 5s
      setTimeout(() => {
        if (liveEnabled && tab === "audit") {
          setLiveEnabled(false);
          setTimeout(() => setLiveEnabled(true), 100);
        }
      }, 5000);
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [liveEnabled, tab]);

  // ── Loading / Error states ───────────────────────────────────────
  if (!isLoaded || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-saffron-flame border-t-transparent" />
          <p className="text-sm text-gray-500">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm">
          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-red-400" />
          <h2 className="mb-2 text-lg font-bold text-gompa-slate">Access Denied</h2>
          <p className="text-sm text-gray-500">{error}</p>
          <Link
            href="/"
            className="mt-4 inline-block rounded-xl bg-gompa-slate px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-700"
          >
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/80">
      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gompa-slate">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gompa-slate">
                Admin Panel
              </h1>
              <p className="text-[11px] text-gray-400">
                HimaVolt System Administration
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="hidden rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 sm:inline-flex sm:items-center sm:gap-1"
            >
              Dashboard <ArrowUpRight className="h-3 w-3" />
            </Link>
            {user && <UserButton />}
          </div>
        </div>
      </header>

      {/* ── Tab Switcher ────────────────────────────────────────── */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl gap-0 px-4 sm:px-6">
          {(
            [
              { id: "overview", label: "Overview", icon: Activity },
              { id: "audit", label: "Live Audit", icon: Radio },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                tab === t.id
                  ? "text-saffron-flame"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
              {t.id === "audit" && liveEnabled && tab === "audit" && (
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                </span>
              )}
              {tab === t.id && (
                <motion.div
                  layoutId="admin-tab-indicator"
                  className="absolute inset-x-0 -bottom-px h-0.5 bg-saffron-flame"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <AnimatePresence mode="wait">
          {tab === "overview" && stats && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-6"
            >
              {/* ── KPI Grid ──────────────────────────────────── */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                <StatCard
                  label="Total Users"
                  value={stats.users.total}
                  icon={Users}
                  color="text-indigo-600 bg-indigo-50"
                />
                <StatCard
                  label="Restaurants"
                  value={stats.restaurants.total}
                  sub={`${stats.restaurants.active} active`}
                  icon={Store}
                  color="text-saffron-flame bg-orange-50"
                />
                <StatCard
                  label="Orders Today"
                  value={stats.orders.today}
                  sub={`${stats.orders.thisWeek} this week`}
                  icon={ShoppingBag}
                  color="text-blue-600 bg-blue-50"
                />
                <StatCard
                  label="Revenue Today"
                  value={formatCurrency(stats.revenue.today)}
                  sub={`${formatCurrency(stats.revenue.total)} total`}
                  icon={TrendingUp}
                  color="text-green-600 bg-green-50"
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
                />
                <StatCard
                  label="Active Deliveries"
                  value={stats.deliveries.active}
                  icon={Truck}
                  color="text-teal-600 bg-teal-50"
                />
                <StatCard
                  label="Audit Events Today"
                  value={stats.audit.today}
                  icon={Zap}
                  color="text-pink-600 bg-pink-50"
                />
              </div>

              {/* ── Order Status Breakdown ─────────────────────── */}
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <h3 className="mb-4 text-sm font-bold text-gompa-slate">
                    Orders by Status
                  </h3>
                  <div className="space-y-2.5">
                    {Object.entries(stats.orders.byStatus).map(
                      ([status, count]) => {
                        const total = stats.orders.total || 1;
                        const pct = Math.round((count / total) * 100);
                        const barColor =
                          status === "DELIVERED"
                            ? "bg-green-500"
                            : status === "CANCELLED" || status === "REJECTED"
                              ? "bg-red-400"
                              : status === "PENDING"
                                ? "bg-amber-400"
                                : "bg-blue-400";
                        return (
                          <div key={status}>
                            <div className="mb-1 flex items-center justify-between text-xs">
                              <span className="font-medium text-gray-600">
                                {status}
                              </span>
                              <span className="tabular-nums text-gray-400">
                                {count} ({pct}%)
                              </span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.6 }}
                                className={`h-full rounded-full ${barColor}`}
                              />
                            </div>
                          </div>
                        );
                      },
                    )}
                  </div>
                </div>

                {/* ── Top Restaurants ───────────────────────────── */}
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <h3 className="mb-4 text-sm font-bold text-gompa-slate">
                    Top Restaurants
                  </h3>
                  <div className="space-y-3">
                    {stats.topRestaurants.map((r, i) => (
                      <div
                        key={r.id}
                        className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-gray-50"
                      >
                        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-gompa-slate text-xs font-bold text-white">
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-gompa-slate">
                            {r.name}
                          </p>
                          <p className="text-[11px] text-gray-400">{r.city}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-gompa-slate">
                            {r.totalOrders}
                          </p>
                          <p className="text-[11px] text-gray-400">orders</p>
                        </div>
                      </div>
                    ))}
                    {stats.topRestaurants.length === 0 && (
                      <p className="py-6 text-center text-sm text-gray-400">
                        No restaurants yet
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════
             LIVE AUDIT TAB
             ═══════════════════════════════════════════════════════ */}
          {tab === "audit" && (
            <motion.div
              key="audit"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-4"
            >
              {/* ── Controls Bar ─────────────────────────────────── */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Search */}
                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search logs..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gompa-slate placeholder:text-gray-400 focus:border-saffron-flame focus:outline-none focus:ring-1 focus:ring-saffron-flame"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter Toggle */}
                <button
                  type="button"
                  onClick={() => setShowFilters((p) => !p)}
                  className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
                    showFilters || entityFilter !== "All"
                      ? "border-saffron-flame bg-saffron-flame/5 text-saffron-flame"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Filter className="h-3.5 w-3.5" />
                  Filter
                </button>

                {/* Live Toggle */}
                <button
                  type="button"
                  onClick={() => setLiveEnabled((p) => !p)}
                  className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
                    liveEnabled
                      ? "border-green-300 bg-green-50 text-green-700"
                      : "border-gray-200 text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  <Radio className="h-3.5 w-3.5" />
                  {liveEnabled ? "Live" : "Paused"}
                </button>

                {/* Refresh */}
                <button
                  type="button"
                  onClick={() => {
                    fetchLogs(page);
                    fetchStats();
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${logsLoading ? "animate-spin" : ""}`}
                  />
                  Refresh
                </button>
              </div>

              {/* ── Entity Filter Chips ──────────────────────────── */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-wrap gap-1.5 pb-2">
                      {ENTITY_FILTERS.map((e) => (
                        <button
                          key={e}
                          onClick={() => {
                            setEntityFilter(e);
                            setPage(1);
                          }}
                          className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                            entityFilter === e
                              ? "bg-gompa-slate text-white"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Audit Log List ────────────────────────────────── */}
              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-gray-400" />
                    <span className="text-xs font-semibold text-gray-500">
                      Activity Feed
                    </span>
                    {pagination && (
                      <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                        {pagination.total.toLocaleString()} total
                      </span>
                    )}
                  </div>
                  {liveEnabled && (
                    <div className="flex items-center gap-1.5 text-[11px] text-green-600">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
                      </span>
                      Streaming
                    </div>
                  )}
                </div>

                {/* Rows */}
                {logsLoading && logs.length === 0 ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-saffron-flame border-t-transparent" />
                  </div>
                ) : logs.length === 0 ? (
                  <div className="py-16 text-center">
                    <Activity className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                    <p className="text-sm text-gray-400">
                      No audit events found
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {logs.map((log) => (
                      <AuditRow
                        key={log.id}
                        log={log}
                        isNew={newLogIds.has(log.id)}
                      />
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2.5">
                    <span className="text-xs text-gray-400">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => p - 1)}
                        className="rounded-lg border border-gray-200 p-1.5 text-gray-500 transition-colors hover:bg-gray-50 disabled:opacity-40"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={page >= pagination.totalPages}
                        onClick={() => setPage((p) => p + 1)}
                        className="rounded-lg border border-gray-200 p-1.5 text-gray-500 transition-colors hover:bg-gray-50 disabled:opacity-40"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
