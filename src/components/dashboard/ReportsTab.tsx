"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  ChevronDown,
  ChevronRight,
  Users,
  Receipt,
  Phone,
  Mail,
  Clock,
  CheckCircle2,
  AlertCircle,
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

interface ShiftOrderSummary {
  id: string;
  orderNo: string;
  total: number;
  createdAt: string;
  payment: { method: string; status: string; amount: number } | null;
  bill: { total: number } | null;
  items: { name: string; quantity: number }[];
}

interface StaffAttendanceSummary {
  checkIn: string;
  checkOut: string | null;
  status: string;
  durationMinutes: number | null;
}

interface FullTimeResult {
  staff: {
    id: string;
    staffType: string;
    user: { name: string; email: string; phone: string | null };
  };
  attendance: StaffAttendanceSummary | null;
  orderCount: number;
  revenue: number;
  orders: ShiftOrderSummary[];
}

interface ShiftResult {
  shift: {
    id: string;
    label: string | null;
    startTime: string;
    endTime: string;
    actualEndTime: string | null;
  };
  staff: {
    id: string;
    staffType: string;
    user: { name: string; email: string; phone: string | null };
  };
  attendance: StaffAttendanceSummary | null;
  orderCount: number;
  revenue: number;
  orders: ShiftOrderSummary[];
}

interface ShiftReportData {
  date: string;
  fullTimeStaff: FullTimeResult[];
  shifts: ShiftResult[];
  unassigned: { orderCount: number; revenue: number; orders: ShiftOrderSummary[] };
  totalRevenue: number;
  totalOrders: number;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  ESEWA: "eSewa",
  KHALTI: "Khalti",
  BANK: "Bank Transfer",
  CASH: "Cash",
  COUNTER: "Manual Pay",
  DIRECT: "Direct Pay",
};

function formatDuration(mins: number): string {
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function AttendancePill({ attendance }: { attendance: StaffAttendanceSummary | null }) {
  if (!attendance) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] px-2.5 py-1 text-[10px] font-bold text-[var(--text-3)]">
        <AlertCircle className="h-3 w-3" />
        No check-in
      </span>
    );
  }

  const checkInTime = new Date(attendance.checkIn).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const checkOutTime = attendance.checkOut
    ? new Date(attendance.checkOut).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="flex items-center gap-1.5 rounded-lg bg-[var(--canvas-sub)] border border-[var(--border-soft)] px-2.5 py-1">
      <Clock className="h-3 w-3 text-[var(--text-3)] shrink-0" />
      <span className="text-[11px] font-bold text-[var(--text-2)]">{checkInTime}</span>
      <span className="text-[var(--text-3)] text-[10px]">→</span>
      {checkOutTime ? (
        <>
          <span className="text-[11px] font-bold text-[var(--text-2)]">{checkOutTime}</span>
          {attendance.durationMinutes != null && (
            <span className="ml-0.5 text-[10px] font-bold text-[var(--accent-text)] bg-[var(--accent-muted)] px-1.5 py-0.5 rounded-md border border-[var(--accent-border)]">
              {formatDuration(attendance.durationMinutes)}
            </span>
          )}
        </>
      ) : (
        <span className="flex items-center gap-1 text-[10px] font-bold text-[var(--accent-text)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
          On shift
        </span>
      )}
    </div>
  );
}

function ShiftCard({
  id,
  label,
  labelColor,
  labelGradient,
  staffName,
  email,
  phone,
  shiftTime,
  orderCount,
  revenue,
  orders,
  attendance,
  cur,
  expanded,
  onToggle,
}: {
  id: string;
  label: string;
  labelColor: string;
  labelGradient: string;
  staffName: string;
  email: string;
  phone: string | null;
  shiftTime?: string;
  orderCount: number;
  revenue: number;
  orders: ShiftOrderSummary[];
  attendance: StaffAttendanceSummary | null;
  cur: string;
  expanded: boolean;
  onToggle: (id: string) => void;
}) {
  const paidOrders = orders.filter((o) => o.payment?.status === "COMPLETED");
  const unpaidOrders = orders.filter(
    (o) => o.payment && o.payment.status !== "COMPLETED",
  );
  const paidRevenue = paidOrders.reduce(
    (sum, o) => sum + (o.bill?.total ?? o.total),
    0,
  );

  return (
    <div className="rounded-2xl bg-[var(--canvas)] border border-[var(--border-soft)] shadow-[0_2px_16px_-4px_rgba(0,0,0,0.06)] overflow-hidden">
      {/* Gradient accent bar */}
      <div className={`h-0.5 w-full ${labelGradient}`} />

      <button
        onClick={() => onToggle(id)}
        className="w-full text-left px-5 py-4 hover:bg-[var(--surface)]/40 transition-colors"
      >
        <div className="flex items-start justify-between gap-4">
          {/* Left: identity */}
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${labelColor}`}>
                {label}
              </span>
              <span className="text-[15px] font-extrabold text-[var(--text-1)] leading-tight">
                {staffName}
              </span>
            </div>
            {shiftTime && (
              <p className="text-[11px] font-semibold text-[var(--text-3)]">{shiftTime}</p>
            )}
            <div className="flex items-center gap-3 flex-wrap">
              {email && (
                <span className="flex items-center gap-1 text-[11px] text-[var(--text-3)] font-medium">
                  <Mail className="h-3 w-3 shrink-0" />
                  {email}
                </span>
              )}
              {phone && (
                <span className="flex items-center gap-1 text-[11px] text-[var(--text-3)] font-medium">
                  <Phone className="h-3 w-3 shrink-0" />
                  {phone}
                </span>
              )}
            </div>
          </div>

          {/* Right: attendance + financials */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            <AttendancePill attendance={attendance} />
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[var(--text-3)] font-medium">
                {orderCount} order{orderCount !== 1 ? "s" : ""}
              </span>
              <span className="text-[13px] font-black text-[var(--text-1)]">
                {formatPrice(revenue, cur)}
              </span>
              {expanded ? (
                <ChevronDown className="h-3.5 w-3.5 text-[var(--text-3)]" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-[var(--text-3)]" />
              )}
            </div>
          </div>
        </div>
      </button>

      <AnimatePresence>
        {expanded && orders.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="border-t border-[var(--border-soft)]">
              {/* Paid / unpaid breakdown header */}
              <div className="flex items-center gap-6 px-5 py-2.5 bg-[var(--canvas-sub)] border-b border-[var(--border-soft)]">
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                  <span className="text-[11px] font-bold text-[var(--text-2)]">
                    Paid: {paidOrders.length} &middot; {formatPrice(paidRevenue, cur)}
                  </span>
                </div>
                {unpaidOrders.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                    <span className="text-[11px] font-bold text-[var(--text-2)]">
                      Unpaid: {unpaidOrders.length}
                    </span>
                  </div>
                )}
              </div>

              {/* Order rows */}
              <div className="px-5 py-3 space-y-2">
                {orders.map((o) => (
                  <div
                    key={o.id}
                    className="flex items-center justify-between text-xs py-1.5 border-b border-[var(--border-soft)] last:border-0"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-[var(--text-2)]">#{o.orderNo}</span>
                      <span className="text-[var(--text-3)]">
                        {new Date(o.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span className="text-[var(--text-3)]">
                        {o.items.length} item{o.items.length !== 1 ? "s" : ""}
                      </span>
                      {o.payment && (
                        <span
                          className={`rounded px-1.5 py-0.5 font-bold ${
                            o.payment.status === "COMPLETED"
                              ? "bg-[var(--accent-muted)] text-[var(--accent-text)]"
                              : "bg-[var(--accent)] text-[var(--accent)]"
                          }`}
                        >
                          {PAYMENT_METHOD_LABELS[o.payment.method] ?? o.payment.method}
                          {" · "}
                          {o.payment.status === "COMPLETED" ? "Paid" : "Unpaid"}
                        </span>
                      )}
                    </div>
                    <span className="font-extrabold text-[var(--text-1)] ml-2">
                      {formatPrice(o.bill?.total ?? o.total, cur)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {expanded && orders.length === 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t border-[var(--border-soft)] px-5 py-4 text-center">
              <Receipt className="mx-auto h-5 w-5 text-[var(--text-3)] mb-1" />
              <p className="text-xs text-[var(--text-3)]">No orders during this period</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ReportsTab() {
  const { selectedRestaurant } = useRestaurant();
  const cur = selectedRestaurant?.currency ?? "NPR";
  const { orders } = useLiveOrders();

  const [data, setData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [shiftDate, setShiftDate] = useState<string>(
    new Date().toISOString().slice(0, 10),
  );
  const [shiftReport, setShiftReport] = useState<ShiftReportData | null>(null);
  const [shiftLoading, setShiftLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadFinancials = useCallback(async () => {
    if (!selectedRestaurant) return;
    try {
      const res = await apiFetch(`/api/restaurants/${selectedRestaurant.id}/financials`);
      setData(res as FinancialData);
    } catch { /* ignore */ }
    setLoading(false);
  }, [selectedRestaurant]);

  const loadShiftReport = useCallback(async () => {
    if (!selectedRestaurant) return;
    setShiftLoading(true);
    try {
      const res = await apiFetch(
        `/api/restaurants/${selectedRestaurant.id}/shifts/report?date=${shiftDate}`,
      );
      setShiftReport(res as ShiftReportData);
    } catch { /* ignore */ }
    setShiftLoading(false);
  }, [selectedRestaurant, shiftDate]);

  useEffect(() => { loadFinancials(); }, [loadFinancials]);
  useEffect(() => { loadShiftReport(); }, [loadShiftReport]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  const totalOrders = data?.totalOrders ?? 0;
  const totalRevenue = data?.totalRevenue ?? 0;
  const todayRevenue = data?.todayRevenue ?? 0;
  const monthRevenue = data?.monthRevenue ?? 0;
  const totalInventoryCost = data?.totalInventoryCost ?? 0;
  const estimatedProfit = data?.estimatedProfit ?? 0;
  const liveCount = orders.filter(
    (o) => o.status !== "DELIVERED" && o.status !== "CANCELLED",
  ).length;
  const profitMargin =
    totalRevenue > 0 ? ((estimatedProfit / totalRevenue) * 100).toFixed(1) : "0";

  // Shift report totals
  const shiftTotalPaidOrders =
    shiftReport
      ? [
          ...shiftReport.fullTimeStaff.flatMap((f) => f.orders),
          ...shiftReport.shifts.flatMap((s) => s.orders),
          ...shiftReport.unassigned.orders,
        ].filter((o) => o.payment?.status === "COMPLETED").length
      : 0;

  return (
    <div className="max-w-5xl space-y-8 pb-12">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-[var(--text-1)]">
          Financial Reports
        </h2>
        <p className="text-sm font-medium text-[var(--text-2)] mt-1.5">
          Revenue, costs &amp; profit for{" "}
          <strong className="text-[var(--text-1)]">{selectedRestaurant?.name}</strong>
        </p>
      </div>

      {/* Top-line numbers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-[var(--canvas)]/70 backdrop-blur-md border border-[var(--border-soft)]/50 p-6 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.03)]"
        >
          <div className="flex items-center gap-3 mb-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-muted)] text-[var(--accent-text)] shadow-sm border border-[var(--accent-border)]/50">
              <TrendingUp className="h-5 w-5" />
            </span>
            <span className="text-[13px] font-bold tracking-wide text-[var(--text-2)] uppercase">
              Total Revenue
            </span>
          </div>
          <p className="text-3xl font-black text-[var(--text-1)] leading-none tracking-tight">
            {formatPrice(totalRevenue, cur)}
          </p>
          <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-[var(--accent-text)] bg-[#fef9ef]/50 w-fit px-2 py-1 rounded-md">
            <ArrowUpRight className="h-3.5 w-3.5" />
            Lifetime earnings
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="relative overflow-hidden rounded-3xl bg-[var(--canvas)]/70 backdrop-blur-md border border-[var(--border-soft)]/50 p-6 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.03)]"
        >
          <div className="flex items-center gap-3 mb-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)] text-[var(--accent)] shadow-sm border border-[var(--accent-border)]0/50">
              <Package className="h-5 w-5" />
            </span>
            <span className="text-[13px] font-bold tracking-wide text-[var(--text-2)] uppercase">
              Inventory Cost
            </span>
          </div>
          <p className="text-3xl font-black text-[var(--text-1)] leading-none tracking-tight">
            {formatPrice(totalInventoryCost, cur)}
          </p>
          <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-[var(--accent)] bg-[var(--accent)]0/50 w-fit px-2 py-1 rounded-md">
            <ArrowDownRight className="h-3.5 w-3.5" />
            Total sunk cost
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] p-6 text-white shadow-[0_4px_20px_-4px_rgba(245,158,11,0.4)]"
        >
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-32 w-32 rounded-full bg-[var(--canvas)]/10 blur-2xl" />
          <div className="absolute bottom-0 left-0 -mb-4 -ml-4 h-24 w-24 rounded-full bg-[var(--canvas)]/10 blur-xl" />

          <div className="relative flex items-center gap-3 mb-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--canvas)]/20 text-white shadow-sm backdrop-blur-md">
              <PiggyBank className="h-5 w-5" />
            </span>
            <span className="text-[13px] font-bold tracking-wide text-white uppercase drop-shadow-sm">
              Estimated Profit
            </span>
          </div>
          <p className="relative text-3xl font-black leading-none drop-shadow-md tracking-tight">
            {formatPrice(estimatedProfit, cur)}
          </p>
          <div className="relative mt-4 flex items-center gap-1.5 text-xs font-bold text-white bg-[var(--canvas)]/20 w-fit px-2 py-1 rounded-md backdrop-blur-sm">
            <DollarSign className="h-3.5 w-3.5" />
            {profitMargin}% margin
          </div>
        </motion.div>
      </div>

      <div>
        <h3 className="text-[13px] font-bold text-[var(--text-3)] uppercase tracking-wider mb-4">
          Revenue Breakdown
        </h3>
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
                className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 rounded-2xl bg-[var(--canvas)]/70 backdrop-blur-md border border-[var(--border-soft)]/50 px-5 py-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.06)] transition-all hover:-translate-y-0.5"
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm border border-black/5"
                  style={{ background: `${s.accent}15` }}
                >
                  <Icon className="h-5 w-5" style={{ color: s.accent }} />
                </span>
                <div>
                  <p className="text-xs font-bold text-[var(--text-2)] mb-0.5">{s.label}</p>
                  <p className="text-lg font-black tracking-tight text-[var(--text-1)]">{s.value}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <p className="text-[12px] font-medium text-[var(--text-3)] leading-relaxed max-w-2xl bg-[var(--surface)] backdrop-blur-sm p-4 rounded-xl border border-[var(--border)]/50">
        <span className="font-bold text-[var(--text-2)]">Note:</span> Profit is estimated by
        subtracting total inventory cost from lifetime revenue. This is a simplified
        overview for quick reference and does not account for operational expenses.
      </p>

      {/* ── Shift Report ─────────────────────────────────────────────────── */}
      <div className="space-y-5">
        {/* Header + date picker */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-[13px] font-bold text-[var(--text-3)] uppercase tracking-wider">
              Shift Report
            </h3>
            {shiftReport && (
              <p className="text-[11px] text-[var(--text-3)] font-medium mt-0.5">
                {shiftReport.totalOrders} orders &middot;{" "}
                {formatPrice(shiftReport.totalRevenue, cur)} total &middot;{" "}
                {shiftTotalPaidOrders} paid
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--canvas)] px-3 py-2">
              <Calendar className="h-3.5 w-3.5 text-[var(--text-3)]" />
              <input
                type="date"
                value={shiftDate}
                onChange={(e) => setShiftDate(e.target.value)}
                className="text-sm font-medium text-[var(--text-1)] outline-none bg-transparent"
              />
            </div>
            {shiftLoading && <Loader2 className="h-4 w-4 animate-spin text-[var(--accent)]" />}
          </div>
        </div>

        {/* Full-time staff cards */}
        {shiftReport && shiftReport.fullTimeStaff.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-bold text-indigo-500 uppercase tracking-wider flex items-center gap-1">
                <Users className="h-3.5 w-3.5" /> Full-Time Staff
              </p>
              <span className="text-[10px] font-bold text-indigo-300 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                {shiftReport.fullTimeStaff.length}
              </span>
            </div>
            {shiftReport.fullTimeStaff.map((ft) => (
              <ShiftCard
                key={`ft-${ft.staff.id}`}
                id={`ft-${ft.staff.id}`}
                label="Full-Time"
                labelColor="bg-indigo-100 text-indigo-700"
                labelGradient="bg-gradient-to-r from-indigo-400 to-violet-400"
                staffName={ft.staff.user.name}
                email={ft.staff.user.email}
                phone={ft.staff.user.phone}
                shiftTime="All day"
                orderCount={ft.orderCount}
                revenue={ft.revenue}
                orders={ft.orders}
                attendance={ft.attendance}
                cur={cur}
                expanded={expandedId === `ft-${ft.staff.id}`}
                onToggle={(id) => setExpandedId((prev) => (prev === id ? null : id))}
              />
            ))}
          </div>
        )}

        {/* Shift-based cards */}
        {shiftReport && shiftReport.shifts.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-bold text-[var(--accent)] uppercase tracking-wider flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> Shift-Based Staff
              </p>
              <span className="text-[10px] font-bold text-[var(--accent)] bg-[var(--accent-muted)] px-2 py-0.5 rounded-full border border-[var(--accent-border)]">
                {shiftReport.shifts.length}
              </span>
            </div>
            {shiftReport.shifts.map((sr) => {
              const shiftEnd = sr.shift.actualEndTime
                ? new Date(sr.shift.actualEndTime).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : sr.shift.endTime;
              return (
                <ShiftCard
                  key={sr.shift.id}
                  id={sr.shift.id}
                  label={sr.shift.label ?? "Shift"}
                  labelColor="bg-[var(--accent-muted)] text-[var(--accent-text)]"
                  labelGradient="bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)]"
                  staffName={sr.staff.user.name}
                  email={sr.staff.user.email}
                  phone={sr.staff.user.phone}
                  shiftTime={`${sr.shift.startTime} – ${shiftEnd}`}
                  orderCount={sr.orderCount}
                  revenue={sr.revenue}
                  orders={sr.orders}
                  attendance={sr.attendance}
                  cur={cur}
                  expanded={expandedId === sr.shift.id}
                  onToggle={(id) => setExpandedId((prev) => (prev === id ? null : id))}
                />
              );
            })}
          </div>
        )}

        {/* Unassigned */}
        {shiftReport && shiftReport.unassigned.orderCount > 0 && (
          <ShiftCard
            id="unassigned"
            label="Unassigned"
            labelColor="bg-[var(--surface)] text-[var(--text-2)]"
            labelGradient="bg-[var(--surface-alt)]"
            staffName="No Shift Assigned"
            email=""
            phone={null}
            shiftTime="Outside shift windows"
            orderCount={shiftReport.unassigned.orderCount}
            revenue={shiftReport.unassigned.revenue}
            orders={shiftReport.unassigned.orders}
            attendance={null}
            cur={cur}
            expanded={expandedId === "unassigned"}
            onToggle={(id) => setExpandedId((prev) => (prev === id ? null : id))}
          />
        )}

        {/* Empty state */}
        {shiftReport &&
          shiftReport.fullTimeStaff.length === 0 &&
          shiftReport.shifts.length === 0 &&
          shiftReport.unassigned.orderCount === 0 && (
            <div className="rounded-2xl bg-[var(--canvas)]/70 border border-[var(--border-soft)] px-4 py-10 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-[var(--text-3)] mb-2" />
              <p className="text-sm font-bold text-[var(--text-3)]">
                No orders or shifts found for this date
              </p>
              <p className="text-xs text-[var(--text-3)] mt-1">
                Go to the Shifts tab to define shifts for your staff.
              </p>
            </div>
          )}

        {/* No report loaded yet */}
        {!shiftReport && !shiftLoading && (
          <div className="rounded-2xl bg-[var(--canvas)]/70 border border-[var(--border-soft)] px-4 py-10 text-center">
            <Calendar className="mx-auto h-8 w-8 text-[var(--text-3)] mb-2" />
            <p className="text-sm font-bold text-[var(--text-3)]">Select a date to load the shift report</p>
          </div>
        )}
      </div>
    </div>
  );
}
