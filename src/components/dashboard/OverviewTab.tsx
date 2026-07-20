"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  ShoppingBag,
  Wallet,
  Timer,
  CheckCircle2,
  Receipt,
  CreditCard,
  Banknote,
  Sparkles,
  Eye,
  UtensilsCrossed,
  AlertTriangle,
  ChevronRight,
  Activity,
  Tag,
  Package,
  QrCode,
  UsersRound,
  ClipboardList,
  LayoutDashboard,
  type LucideIcon,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import { useRestaurant } from "@/context/RestaurantContext";
import { useLiveOrders } from "@/context/LiveOrdersContext";
import { formatPrice } from "@/lib/currency";
import OnShiftWidget from "@/components/dashboard/OnShiftWidget";
import PnlSnapshotCard from "@/components/dashboard/PnlSnapshotCard";
import InstallAppButton from "@/components/shared/InstallAppButton";
import { useRouter } from "next/navigation";

/* ─── Stat card component ────────────────────────── */
interface StatCardProps {
  label: string;
  value: string;
  sub: string;
  accent: string;
  icon: LucideIcon;
}

function StatCard({ label, value, sub, accent, icon: Icon }: StatCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className="relative rounded-3xl bg-[var(--canvas)]/70 backdrop-blur-md border border-[var(--border-soft)]/50 p-5 cursor-default overflow-hidden group shadow-[0_4px_24px_-4px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)] transition-all"
    >
      <div
        className="absolute -top-12 -right-12 h-32 w-32 rounded-full opacity-0 group-hover:opacity-10 transition-opacity duration-300"
        style={{ background: accent }}
      />
      <div className="relative flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-[var(--text-2)] mb-1.5 uppercase tracking-wide">
            {label}
          </p>
          <p className="text-2xl sm:text-[28px] font-black text-[var(--text-1)] tracking-tight leading-none mt-2 truncate">
            {value}
          </p>
          <p className="text-[11px] font-bold text-[var(--text-3)] mt-2.5 bg-[var(--surface)] w-fit px-2 py-1 rounded-md">
            {sub}
          </p>
        </div>
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-all duration-300 group-hover:scale-110 shadow-sm border border-black/5"
          style={{ background: `${accent}15` }}
        >
          <Icon className="h-5 w-5" style={{ color: accent }} />
        </div>
      </div>
    </motion.div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
}

/* ─── Chart palette (fixed so it reads in both themes) ───── */
const C = {
  sales: "#F59E0B",
  orders: "#6366F1",
  green: "#10B981",
  red: "#EF4444",
  blue: "#3B82F6",
  purple: "#8B5CF6",
  orange: "#F97316",
};

const STATUS_META: Record<string, { label: string; color: string; order: number }> = {
  PENDING: { label: "Pending", color: "#F59E0B", order: 0 },
  ACCEPTED: { label: "Accepted", color: "#3B82F6", order: 1 },
  PREPARING: { label: "Preparing", color: "#F97316", order: 2 },
  READY: { label: "Ready", color: "#8B5CF6", order: 3 },
  DELIVERED: { label: "Completed", color: "#10B981", order: 4 },
  CANCELLED: { label: "Cancelled", color: "#EF4444", order: 5 },
  REJECTED: { label: "Rejected", color: "#EF4444", order: 6 },
};

type Segment = "overview" | "finance" | "order";

const SEGMENTS: { id: Segment; label: string; icon: LucideIcon }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "finance", label: "Finance", icon: Receipt },
  { id: "order", label: "Order", icon: ShoppingBag },
];

function isDigital(method?: string | null) {
  const m = (method ?? "").toUpperCase();
  return ["ESEWA", "KHALTI", "DIRECT", "QR", "ONLINE", "CARD"].some((k) => m.includes(k));
}

function ChartCard({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-[var(--canvas)]/90 ring-1 ring-[var(--border)] p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-[14px] font-bold text-[var(--text-1)]">{title}</h3>
        {desc && <p className="text-[11px] text-[var(--text-3)] mt-0.5">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

export default function OverviewTab({ userName }: { userName?: string }) {
  const { selectedRestaurant, restaurants } = useRestaurant();
  const { orders } = useLiveOrders();
  const router = useRouter();
  const [segment, setSegment] = useState<Segment>("overview");

  const current = selectedRestaurant ?? restaurants[0];
  const cur = selectedRestaurant?.currency ?? "NPR";
  const restaurantName = current?.name ?? "Your Restaurant";

  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  const [now, setNow] = useState(0);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  const todayOrders = useMemo(
    () => orders.filter((o) => new Date(o.createdAt).getTime() >= todayStart),
    [orders, todayStart],
  );

  const completed = useMemo(
    () => todayOrders.filter((o) => o.status === "ACCEPTED"),
    [todayOrders],
  );
  const todayRevenue = useMemo(
    () => completed.reduce((sum, o) => sum + (o.total ?? 0), 0),
    [completed],
  );
  const pendingCount = orders.filter((o) => o.status === "PENDING").length;
  const deliveredCount = completed.length;
  const avgOrder = deliveredCount ? todayRevenue / deliveredCount : 0;

  // Cash vs digital split of completed revenue.
  const { cashRevenue, digitalRevenue } = useMemo(() => {
    let cash = 0;
    let digital = 0;
    for (const o of completed) {
      if (isDigital(o.payment?.method)) digital += o.total ?? 0;
      else cash += o.total ?? 0;
    }
    return { cashRevenue: cash, digitalRevenue: digital };
  }, [completed]);

  // Hourly sales / orders series for today.
  const hourly = useMemo(() => {
    const buckets = Array.from({ length: 24 }, (_, h) => ({
      label: `${((h % 12) || 12)}${h < 12 ? "a" : "p"}`,
      sales: 0,
      orders: 0,
    }));
    todayOrders.forEach((o) => {
      const h = new Date(o.createdAt).getHours();
      buckets[h].orders += 1;
      if (o.status === "ACCEPTED") buckets[h].sales += o.total ?? 0;
    });
    return buckets;
  }, [todayOrders]);

  // Revenue by payment method (completed orders).
  const byPayment = useMemo(() => {
    const map: Record<string, number> = {};
    for (const o of completed) {
      const key = (o.payment?.method ?? "OTHER").toUpperCase();
      map[key] = (map[key] ?? 0) + (o.total ?? 0);
    }
    return Object.entries(map).map(([method, amount]) => ({ method, amount }));
  }, [completed]);

  // Revenue + count by order type.
  const byType = useMemo(() => {
    const map: Record<string, { amount: number; count: number }> = {};
    for (const o of todayOrders) {
      const key = (o.type ?? "OTHER").replace(/_/g, " ");
      const cur2 = map[key] ?? { amount: 0, count: 0 };
      cur2.count += 1;
      if (o.status === "ACCEPTED") cur2.amount += o.total ?? 0;
      map[key] = cur2;
    }
    return Object.entries(map).map(([type, v]) => ({ type, ...v }));
  }, [todayOrders]);

  const statusDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    todayOrders.forEach((o) => {
      counts[o.status] = (counts[o.status] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([status, count]) => ({
        status,
        count,
        percent: todayOrders.length > 0 ? (count / todayOrders.length) * 100 : 0,
        ...(STATUS_META[status] ?? { label: status, color: "#9CA3AF", order: 99 }),
      }))
      .sort((a, b) => a.order - b.order);
  }, [todayOrders]);

  function timeAgo(date: string) {
    if (!now) return "";
    const diff = Math.max(0, now - new Date(date).getTime());
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  const recentOrders = useMemo(
    () =>
      [...orders]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 6),
    [orders],
  );

  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  /* ── KPI cards per segment ──────────────────────────── */
  const kpis: StatCardProps[] =
    segment === "finance"
      ? [
          { label: "Sales", value: formatPrice(todayRevenue, cur), sub: `${deliveredCount} completed`, accent: C.sales, icon: TrendingUp },
          { label: "Cash", value: formatPrice(cashRevenue, cur), sub: "Counter / cash", accent: C.green, icon: Banknote },
          { label: "Digital", value: formatPrice(digitalRevenue, cur), sub: "eSewa / Khalti / QR", accent: C.blue, icon: CreditCard },
          { label: "Avg Order", value: formatPrice(avgOrder, cur), sub: "Per completed order", accent: C.purple, icon: Wallet },
        ]
      : segment === "order"
        ? [
            { label: "Orders", value: String(todayOrders.length), sub: "Today", accent: C.orders, icon: ShoppingBag },
            { label: "Served", value: String(deliveredCount), sub: "Completed", accent: C.green, icon: CheckCircle2 },
            { label: "Pending KOT", value: String(pendingCount), sub: pendingCount ? "Needs action" : "All clear", accent: C.sales, icon: Timer },
            { label: "Avg Order", value: formatPrice(avgOrder, cur), sub: "Per completed order", accent: C.purple, icon: Wallet },
          ]
        : [
            { label: "Revenue Today", value: formatPrice(todayRevenue, cur), sub: deliveredCount ? `${deliveredCount} completed` : "No sales yet", accent: C.green, icon: TrendingUp },
            { label: "Orders Today", value: String(todayOrders.length), sub: pendingCount ? `${pendingCount} pending` : "All clear", accent: C.sales, icon: ShoppingBag },
            { label: "Avg Order", value: formatPrice(avgOrder, cur), sub: "Per completed order", accent: C.purple, icon: Wallet },
            { label: "Pending", value: String(pendingCount), sub: pendingCount ? "Awaiting action" : "All clear", accent: C.blue, icon: Timer },
          ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10">
      {/* Hero greeting */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl p-6 sm:p-7 shadow-[0_8px_30px_-4px_rgba(245,158,11,0.2)]"
        style={{ background: "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)" }}
      >
        <div className="absolute top-0 right-0 -mt-12 -mr-12 h-64 w-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-3 bg-white/20 w-fit px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10">
              <Sparkles className="h-3.5 w-3.5 text-white" />
              <span className="text-[10px] font-extrabold text-white uppercase tracking-widest">
                {dateStr}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white mb-1 tracking-tight drop-shadow">
              {getGreeting()}
              {userName ? `, ${userName}` : ""}!
            </h1>
            <p className="text-sm font-medium text-white/95">
              Here&apos;s how <strong className="font-extrabold">{restaurantName}</strong> is doing today.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {/* Subtle "Install app" — only renders when the browser offers it
                and the app isn't already installed. */}
            <InstallAppButton tone="light" className="px-4 py-2.5" />
            <button
              onClick={() => router.push("/dashboard/orders")}
              className="flex items-center gap-2 rounded-xl bg-white/20 backdrop-blur-md px-4 py-2.5 text-[13px] font-bold text-white hover:bg-white/30 transition-colors active:scale-95 border border-white/20"
            >
              <Eye className="h-4 w-4" />
              Orders
            </button>
            <button
              onClick={() => router.push("/dashboard/menu")}
              className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[13px] font-bold text-[var(--accent-text)] hover:bg-[var(--canvas-sub)] transition-colors active:scale-95 shadow-md"
            >
              <UtensilsCrossed className="h-4 w-4" />
              Menu
            </button>
          </div>
        </div>
      </motion.div>

      {/* Pending alert */}
      <AnimatePresence>
        {pendingCount > 0 && (
          <motion.button
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onClick={() => router.push("/dashboard/orders")}
            className="flex items-center gap-3 w-full rounded-xl bg-[var(--accent-muted)] border border-[var(--accent-border)] p-4 text-left hover:bg-[var(--surface)] transition-colors group cursor-pointer"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-muted)]">
              <AlertTriangle className="h-5 w-5 text-[var(--accent)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-[var(--accent-text)]">
                {pendingCount} order{pendingCount > 1 ? "s" : ""} waiting for action
              </p>
              <p className="text-[11px] text-[var(--accent)]">
                Click to review and accept pending orders
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-[var(--text-3)] group-hover:text-[var(--accent)] group-hover:translate-x-0.5 transition-all shrink-0" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Segment switch */}
      <div className="inline-flex rounded-2xl bg-[var(--canvas-sub)] p-1 ring-1 ring-[var(--border)]">
        {SEGMENTS.map(({ id, label, icon: Icon }) => {
          const active = segment === id;
          return (
            <button
              key={id}
              onClick={() => setSegment(id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-bold transition-colors ${
                active
                  ? "bg-[var(--canvas)] text-[var(--text-1)] shadow-sm"
                  : "text-[var(--text-3)] hover:text-[var(--text-2)]"
              }`}
            >
              <Icon className={`h-4 w-4 ${active ? "text-[var(--accent)]" : ""}`} />
              {label}
            </button>
          );
        })}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((s) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
            <StatCard {...s} />
          </motion.div>
        ))}
      </div>

      {/* ── OVERVIEW segment ─────────────────────────────── */}
      {segment === "overview" && (
        <>
          <ChartCard title="Sales Overview" desc="Today's completed sales by hour">
            <div className="h-56 -ml-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourly} margin={{ top: 5, right: 8, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.sales} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={C.sales} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--text-3)" }} interval={2} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--text-3)" }} axisLine={false} tickLine={false} width={44} />
                  <Tooltip
                    formatter={(v) => [formatPrice(Number(v), cur), "Sales"]}
                    contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontSize: 12 }}
                  />
                  <Area type="monotone" dataKey="sales" stroke={C.sales} strokeWidth={2.5} fill="url(#salesFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <PnlSnapshotCard restaurantId={current?.id} currency={cur} />

          <OnShiftWidget restaurantId={current?.id} onOpenShifts={() => router.push("/dashboard/shifts")} />

          <RecentActivity recentOrders={recentOrders} cur={cur} timeAgo={timeAgo} onViewAll={() => router.push("/dashboard/orders")} />
        </>
      )}

      {/* ── ORDER segment ────────────────────────────────── */}
      {segment === "order" && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            <div className="lg:col-span-3">
              <ChartCard title="Order Insight" desc="Orders placed by hour today">
                <div className="h-56 -ml-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hourly} margin={{ top: 5, right: 8, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--text-3)" }} interval={2} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "var(--text-3)" }} axisLine={false} tickLine={false} width={28} />
                      <Tooltip
                        formatter={(v) => [v, "Orders"]}
                        contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontSize: 12 }}
                      />
                      <Bar dataKey="orders" fill={C.orders} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>
            </div>
            <div className="lg:col-span-2">
              <ChartCard title="Live Order Status" desc="Today's order breakdown">
                {statusDistribution.length === 0 ? (
                  <div className="flex h-48 flex-col items-center justify-center text-[var(--text-3)]">
                    <Activity className="h-8 w-8 mb-2" />
                    <p className="text-sm">No orders yet</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="h-44 w-1/2">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={statusDistribution} dataKey="count" nameKey="label" innerRadius={38} outerRadius={62} paddingAngle={2}>
                            {statusDistribution.map((s) => (
                              <Cell key={s.status} fill={s.color} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontSize: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1 space-y-1.5">
                      {statusDistribution.map((s) => (
                        <div key={s.status} className="flex items-center justify-between text-[12px]">
                          <span className="flex items-center gap-1.5 text-[var(--text-2)]">
                            <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                            {s.label}
                          </span>
                          <span className="font-bold text-[var(--text-1)]">{s.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </ChartCard>
            </div>
          </div>

          <RecentActivity recentOrders={recentOrders} cur={cur} timeAgo={timeAgo} onViewAll={() => router.push("/dashboard/orders")} />
        </>
      )}

      {/* ── FINANCE segment ──────────────────────────────── */}
      {segment === "finance" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ChartCard title="Revenue by Payment" desc="Completed sales per method today">
            {byPayment.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center text-[var(--text-3)]">
                <Wallet className="h-8 w-8 mb-2" />
                <p className="text-sm">No completed sales yet</p>
              </div>
            ) : (
              <div className="h-52 -ml-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byPayment} layout="vertical" margin={{ top: 5, right: 12, bottom: 0, left: 8 }}>
                    <XAxis type="number" tick={{ fontSize: 10, fill: "var(--text-3)" }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="method" tick={{ fontSize: 11, fill: "var(--text-2)" }} axisLine={false} tickLine={false} width={70} />
                    <Tooltip
                      formatter={(v) => [formatPrice(Number(v), cur), "Revenue"]}
                      contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontSize: 12 }}
                    />
                    <Bar dataKey="amount" fill={C.green} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCard>

          <ChartCard title="Sales by Service" desc="Completed revenue per order type">
            {byType.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center text-[var(--text-3)]">
                <Receipt className="h-8 w-8 mb-2" />
                <p className="text-sm">No orders yet</p>
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                {byType.map((t, i) => {
                  const max = Math.max(...byType.map((x) => x.amount), 1);
                  const colors = [C.sales, C.blue, C.purple, C.orange, C.green];
                  const color = colors[i % colors.length];
                  return (
                    <div key={t.type}>
                      <div className="flex items-center justify-between text-[12px] mb-1">
                        <span className="font-semibold capitalize text-[var(--text-2)]">
                          {t.type.toLowerCase()} · {t.count}
                        </span>
                        <span className="font-bold text-[var(--text-1)]">{formatPrice(t.amount, cur)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-[var(--surface)] overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(t.amount / max) * 100}%` }}
                          transition={{ duration: 0.5 }}
                          className="h-full rounded-full"
                          style={{ background: color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ChartCard>
        </div>
      )}

      {/* Quick actions (always) */}
      <div>
        <h3 className="text-[14px] font-bold text-[var(--text-1)] mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { icon: ClipboardList, label: "Live Orders", route: "/dashboard/orders", accent: C.sales, badge: pendingCount || undefined },
            { icon: UtensilsCrossed, label: "Edit Menu", route: "/dashboard/menu", accent: C.green, badge: undefined },
            { icon: UsersRound, label: "Staff", route: "/dashboard/staff", accent: C.orders, badge: undefined },
            { icon: QrCode, label: "QR Codes", route: "/dashboard/qr", accent: C.blue, badge: undefined },
            { icon: Package, label: "Stock", route: "/dashboard/stock", accent: C.orange, badge: undefined },
            { icon: Tag, label: "Offers", route: "/dashboard/offers", accent: "#EC4899", badge: undefined },
          ].map((action) => (
            <motion.button
              key={action.label}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
              whileHover={{ y: -3, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push(action.route)}
              className="relative flex flex-col items-center gap-3 rounded-2xl bg-[var(--canvas)] border border-[var(--border)] p-4 hover:border-[var(--accent-border)] transition-colors active:scale-[0.97] group cursor-pointer"
            >
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-300 group-hover:scale-110 shadow-sm border border-black/5"
                style={{ background: `${action.accent}15` }}
              >
                <action.icon className="h-5 w-5" style={{ color: action.accent }} />
              </div>
              <span className="text-[12px] font-bold text-[var(--text-2)] group-hover:text-[var(--text-1)] transition-colors">
                {action.label}
              </span>
              {action.badge && (
                <span className="absolute top-2 right-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--accent)] text-[9px] font-bold text-white px-1 shadow-sm ring-2 ring-[var(--canvas)]">
                  {action.badge}
                </span>
              )}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Recent activity timeline ───────────────────────── */
function RecentActivity({
  recentOrders,
  cur,
  timeAgo,
  onViewAll,
}: {
  recentOrders: ReturnType<typeof useLiveOrders>["orders"];
  cur: string;
  timeAgo: (d: string) => string;
  onViewAll: () => void;
}) {
  const STATUS_COLOR: Record<string, string> = {
    DELIVERED: "#10B981",
    PENDING: "#F59E0B",
    ACCEPTED: "#3B82F6",
    PREPARING: "#F97316",
    READY: "#8B5CF6",
    CANCELLED: "#EF4444",
    REJECTED: "#EF4444",
  };
  return (
    <div className="rounded-2xl bg-[var(--canvas)]/90 ring-1 ring-[var(--border)] p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[14px] font-bold text-[var(--text-1)]">Recent Activity</h3>
        <button onClick={onViewAll} className="text-[12px] font-semibold text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors">
          View all
        </button>
      </div>
      {recentOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-[var(--text-3)]">
          <Activity className="h-8 w-8 mb-2" />
          <p className="text-sm">No orders yet</p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {recentOrders.map((order, i) => {
            const color = STATUS_COLOR[order.status] ?? "#9CA3AF";
            return (
              <div key={order.id} className="flex items-start gap-3 group">
                <div className="flex flex-col items-center pt-1">
                  <div className="h-2.5 w-2.5 rounded-full ring-2 ring-[var(--canvas)]" style={{ background: color }} />
                  {i < recentOrders.length - 1 && <div className="w-px flex-1 bg-[var(--surface)] mt-1" />}
                </div>
                <div className="flex-1 min-w-0 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[13px] font-semibold text-[var(--text-1)] truncate">
                      #{order.orderNo} · {order.status.charAt(0) + order.status.slice(1).toLowerCase()}
                    </p>
                    <span className="shrink-0 text-[10px] text-[var(--text-3)]">{timeAgo(order.createdAt)}</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-3)] mt-0.5 truncate">
                    {order.tableNo ? `Table ${order.tableNo} · ` : ""}
                    {formatPrice(order.total ?? 0, cur)} · {order.items?.length ?? 0} items
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
