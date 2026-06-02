"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  ShoppingBag,
  Users,
  Star,
  Sparkles,
  Eye,
  UtensilsCrossed,
  AlertTriangle,
  ChevronRight,
  Activity,
  Zap,
  Tag,
  Package,
  QrCode,
  UsersRound,
  ClipboardList,
} from "lucide-react";
import { useRestaurant } from "@/context/RestaurantContext";
import { useLiveOrders } from "@/context/LiveOrdersContext";
import { formatPrice } from "@/lib/currency";
import { getTypeLabel } from "@/lib/restaurant-types";
import OnShiftWidget from "@/components/dashboard/OnShiftWidget";
import { useRouter } from "next/navigation";

/* ─── Stat card component ────────────────────────── */
interface StatCardProps {
  label: string;
  value: string;
  numericValue?: number;
  prefix?: string;
  suffix?: string;
  sub: string;
  accent: string;
  icon: any;
}

function StatCard({
  label,
  value,
  numericValue,
  prefix = "",
  suffix = "",
  sub,
  accent,
  icon: Icon,
}: StatCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className="relative rounded-3xl bg-[var(--canvas)]/70 backdrop-blur-md border border-[var(--border-soft)]/50 p-6 cursor-default overflow-hidden group shadow-[0_4px_24px_-4px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)] transition-all"
    >
      <div
        className="absolute -top-12 -right-12 h-32 w-32 rounded-full opacity-0 group-hover:opacity-10 transition-opacity duration-300"
        style={{ background: accent }}
      />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-[12px] font-bold text-[var(--text-2)] mb-1.5 uppercase tracking-wide">
            {label}
          </p>
          <p className="text-3xl font-black text-[var(--text-1)] tracking-tight leading-none mt-2">
            {numericValue !== undefined ? (
              <>
                {prefix}
                {numericValue.toLocaleString()}
                {suffix}
              </>
            ) : (
              value
            )}
          </p>
          <p className="text-[11px] font-bold text-[var(--text-3)] mt-2.5 bg-[var(--surface)] w-fit px-2 py-1 rounded-md">{sub}</p>
        </div>
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-all duration-300 group-hover:scale-110 shadow-sm border border-black/5"
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

export default function OverviewTab({
  userName,
}: {
  userName?: string;
}) {
  const { selectedRestaurant, restaurants } = useRestaurant();
  const { orders } = useLiveOrders();
  const router = useRouter();

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

  const todayRevenue = useMemo(
    () =>
      todayOrders
        .filter((o) => o.status === "DELIVERED")
        .reduce((sum, o) => sum + (o.total ?? 0), 0),
    [todayOrders],
  );

  const pendingCount = orders.filter((o) => o.status === "PENDING").length;
  const deliveredCount = todayOrders.filter(
    (o) => o.status === "DELIVERED",
  ).length;

  const stats: StatCardProps[] = [
    {
      label: "Revenue Today",
      value: formatPrice(todayRevenue, cur),
      numericValue: todayRevenue,
      prefix: "",
      sub: deliveredCount ? `${deliveredCount} delivered` : "No sales yet",
      accent: "#10B981",
      icon: TrendingUp,
    },
    {
      label: "Orders Today",
      value: String(todayOrders.length),
      numericValue: todayOrders.length,
      sub: pendingCount > 0 ? `${pendingCount} pending` : "All clear",
      accent: "#F59E0B",
      icon: ShoppingBag,
    },
    {
      label: "Tables",
      value: String(current?.tableCount ?? 0),
      numericValue: current?.tableCount ?? 0,
      sub: `${current?.tableCount ?? 0} configured`,
      accent: "#6366F1",
      icon: Users,
    },
    {
      label: "Rating",
      value: current?.rating ? `${current.rating}` : "N/A",
      numericValue: current?.rating
        ? parseFloat(String(current.rating))
        : undefined,
      suffix: "",
      sub: current?.rating ? "From reviews" : "No reviews yet",
      accent: "#EF4444",
      icon: Star,
    },
  ];

  const STATUS_COLOR: Record<string, string> = {
    DELIVERED: "#10B981",
    PENDING: "#F59E0B",
    ACCEPTED: "#3B82F6",
    PREPARING: "#F97316",
    READY: "#8B5CF6",
    CANCELLED: "#EF4444",
    REJECTED: "#EF4444",
  };

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
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, 6),
    [orders],
  );

  const statusDistribution = useMemo(() => {
    const STATUS_META: Record<
      string,
      { label: string; color: string; order: number }
    > = {
      PENDING: { label: "Pending", color: "#F59E0B", order: 0 },
      ACCEPTED: { label: "Accepted", color: "#3B82F6", order: 1 },
      PREPARING: { label: "Preparing", color: "#F97316", order: 2 },
      READY: { label: "Ready", color: "#8B5CF6", order: 3 },
      DELIVERED: { label: "Delivered", color: "#10B981", order: 4 },
      CANCELLED: { label: "Cancelled", color: "#EF4444", order: 5 },
      REJECTED: { label: "Rejected", color: "#EF4444", order: 6 },
    };

    const counts: Record<string, number> = {};
    todayOrders.forEach((o) => {
      counts[o.status] = (counts[o.status] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([status, count]) => ({
        status,
        count,
        percent:
          todayOrders.length > 0 ? (count / todayOrders.length) * 100 : 0,
        ...(STATUS_META[status] ?? {
          label: status,
          color: "#9CA3AF",
          order: 99,
        }),
      }))
      .sort((a, b) => a.order - b.order);
  }, [todayOrders]);

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl p-6 sm:p-8 shadow-[0_8px_30px_-4px_rgba(245,158,11,0.2)]"
        style={{
          background: "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)",
        }}
      >
        <div className="absolute top-0 right-0 -mt-12 -mr-12 h-64 w-64 rounded-full bg-[var(--canvas)]/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-16 -ml-16 h-48 w-48 rounded-full bg-[var(--canvas)]/10 blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3 bg-[var(--canvas)]/20 w-fit px-3 py-1.5 rounded-full backdrop-blur-md shadow-sm border border-white/10">
              <Sparkles className="h-3.5 w-3.5 text-white" />
              <span className="text-[10px] font-extrabold text-white uppercase tracking-widest drop-shadow-sm">
                {dateStr}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white mb-1.5 tracking-tight drop-shadow-md">
              {getGreeting()}
              {userName ? `, ${userName}` : ""}!
            </h1>
            <p className="text-sm font-medium text-white drop-shadow-sm">
              Here&apos;s how <strong className="font-extrabold text-white">{restaurantName}</strong> is performing today.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push("/dashboard/orders")}
              className="flex items-center gap-2 rounded-xl bg-[var(--canvas)]/20 backdrop-blur-md px-5 py-3 text-[13px] font-bold text-white hover:bg-[var(--canvas)]/30 transition-colors active:scale-95 border border-white/20 shadow-sm"
            >
              <Eye className="h-4 w-4" />
              View Orders
            </button>
            <button
              onClick={() => router.push("/dashboard/menu")}
              className="flex items-center gap-2 rounded-xl bg-[var(--canvas)] px-5 py-3 text-[13px] font-bold text-[var(--accent-text)] hover:bg-[var(--canvas-sub)] transition-colors active:scale-95 shadow-md hover:shadow-lg"
            >
              <UtensilsCrossed className="h-4 w-4" />
              Manage Menu
            </button>
          </div>
        </div>
      </motion.div>

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
                {pendingCount} order{pendingCount > 1 ? "s" : ""} waiting for
                action
              </p>
              <p className="text-[11px] text-[var(--accent)]">
                Click to review and accept pending orders
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-[var(--text-3)] group-hover:text-[var(--accent)] group-hover:translate-x-0.5 transition-all shrink-0" />
          </motion.button>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
          >
            <StatCard {...s} />
          </motion.div>
        ))}
      </div>

      <OnShiftWidget
        restaurantId={current?.id}
        onOpenShifts={() => router.push("/dashboard/shifts")}
      />

      {todayOrders.length > 0 && statusDistribution.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl bg-[var(--canvas)]/90 ring-1 ring-[var(--border)] p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[14px] font-bold text-[var(--text-1)]">
                Order Pipeline
              </h3>
              <p className="text-[11px] text-[var(--text-3)] mt-0.5">
                Today&apos;s order status breakdown
              </p>
            </div>
            <span className="text-[12px] font-semibold text-[var(--text-2)]">
              {todayOrders.length} total
            </span>
          </div>

          <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
            {statusDistribution.map((s) => (
              <motion.div
                key={s.status}
                initial={{ width: 0 }}
                animate={{ width: `${s.percent}%` }}
                transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
                className="rounded-full first:rounded-l-full last:rounded-r-full"
                style={{ background: s.color, minWidth: s.percent > 0 ? 8 : 0 }}
                title={`${s.label}: ${s.count}`}
              />
            ))}
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3">
            {statusDistribution.map((s) => (
              <span
                key={s.status}
                className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-2)]"
              >
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ background: s.color }}
                />
                {s.label}:{" "}
                <span className="font-bold text-[var(--text-2)]">{s.count}</span>
              </span>
            ))}
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="lg:col-span-3 rounded-2xl bg-[var(--canvas)]/90 ring-1 ring-[var(--border)] p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-[15px] font-bold text-[var(--text-1)]">
                Revenue Trend
              </h3>
              <p className="text-[11px] text-[var(--text-2)] mt-0.5">
                This week&apos;s performance
              </p>
            </div>
            <span className="flex items-center gap-1.5 rounded-lg bg-[var(--accent-muted)] px-3 py-1.5 text-[12px] font-bold text-[var(--accent-text)]">
              <TrendingUp className="h-3 w-3" />
              {formatPrice(todayRevenue, cur)}
            </span>
          </div>

          <div className="flex items-end justify-between gap-2 h-40 mb-3">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => {
              const heights = [40, 60, 45, 75, 65, 85, 30];
              const isToday = i === new Date().getDay() - 1;
              return (
                <div
                  key={day}
                  className="flex-1 flex flex-col items-center gap-2"
                >
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${heights[i]}%` }}
                    transition={{
                      delay: 0.3 + i * 0.06,
                      duration: 0.4,
                      ease: "easeOut",
                    }}
                    className={`w-full rounded-md transition-colors ${
                      isToday ? "bg-[var(--accent)]" : "bg-[var(--surface)] hover:bg-[var(--surface-alt)]"
                    }`}
                  />
                  <span
                    className={`text-[10px] font-semibold ${isToday ? "text-[var(--accent)]" : "text-[var(--text-3)]"}`}
                  >
                    {day}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-[var(--text-3)] text-center">
            Estimated weekly pattern · Real analytics coming soon
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 rounded-2xl bg-[var(--canvas)]/90 ring-1 ring-[var(--border)] p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-[15px] font-bold text-[var(--text-1)]">Activity</h3>
            <button
              onClick={() => router.push("/dashboard/orders")}
              className="text-[12px] font-semibold text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
            >
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
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, x: 6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.14 }}
                    className="flex items-start gap-3 group"
                  >
                    <div className="flex flex-col items-center pt-1">
                      <div
                        className="h-2.5 w-2.5 rounded-full ring-2 ring-[var(--canvas)]"
                        style={{ background: color }}
                      />
                      {i < recentOrders.length - 1 && (
                        <div className="w-px flex-1 bg-[var(--surface)] mt-1" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[13px] font-semibold text-[var(--text-1)] group-hover:text-[var(--accent-text)] transition-colors truncate">
                          #{order.orderNo} ·{" "}
                          {order.status.charAt(0) +
                            order.status.slice(1).toLowerCase()}
                        </p>
                        <span className="shrink-0 text-[10px] text-[var(--text-3)]">
                          {timeAgo(order.createdAt)}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--text-3)] mt-0.5 truncate">
                        {order.tableNo ? `Table ${order.tableNo} · ` : ""}{formatPrice(order.total ?? 0, cur)} ·{" "}
                        {order.items?.length ?? 0} items
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      <div>
        <h3 className="text-[14px] font-bold text-[var(--text-1)] mb-3">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            {
              icon: ClipboardList,
              label: "Live Orders",
              route: "/dashboard/orders",
              accent: "#F59E0B",
              badge: pendingCount || undefined,
            },
            {
              icon: UtensilsCrossed,
              label: "Edit Menu",
              route: "/dashboard/menu",
              accent: "#10B981",
              badge: undefined,
            },
            {
              icon: UsersRound,
              label: "Staff",
              route: "/dashboard/staff",
              accent: "#6366F1",
              badge: undefined,
            },
            {
              icon: QrCode,
              label: "QR Codes",
              route: "/dashboard/qr",
              accent: "#3B82F6",
              badge: undefined,
            },
            {
              icon: Package,
              label: "Stock",
              route: "/dashboard/stock",
              accent: "#F97316",
              badge: undefined,
            },
            {
              icon: Tag,
              label: "Offers",
              route: "/dashboard/offers",
              accent: "#EC4899",
              badge: undefined,
            },
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
                <action.icon
                  className="h-5 w-5"
                  style={{ color: action.accent }}
                />
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
