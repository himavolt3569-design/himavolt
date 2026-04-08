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
  Clock,
  ChevronDown,
  ChevronRight,
  Users,
  Receipt,
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

interface FullTimeResult {
  staff: { id: string; staffType: string; user: { name: string } };
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
  staff: { id: string; staffType: string; user: { name: string } };
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

function ShiftCard({
  id,
  label,
  labelColor,
  staffName,
  timeRange,
  orderCount,
  revenue,
  orders,
  cur,
  expanded,
  onToggle,
}: {
  id: string;
  label: string;
  labelColor: string;
  staffName: string;
  timeRange: string;
  orderCount: number;
  revenue: number;
  orders: ShiftOrderSummary[];
  cur: string;
  expanded: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-md border border-gray-100/50 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] overflow-hidden">
      <button
        onClick={() => onToggle(id)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50/50 transition-colors"
      >
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`rounded-lg px-2 py-0.5 text-[10px] font-bold ${labelColor}`}>
            {label}
          </span>
          <span className="text-sm font-extrabold text-gray-800">{staffName}</span>
          <span className="flex items-center gap-1 text-xs text-gray-400 font-medium">
            <Clock className="h-3 w-3" />
            {timeRange}
          </span>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <p className="text-xs text-gray-400 font-medium">{orderCount} order{orderCount !== 1 ? "s" : ""}</p>
            <p className="text-sm font-black text-[#3e1e0c]">{formatPrice(revenue, cur)}</p>
          </div>
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-400" />
          )}
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
            <div className="border-t border-gray-100 px-5 py-3 space-y-2">
              {orders.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between text-xs py-1.5 border-b border-gray-50 last:border-0"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-gray-700">#{o.orderNo}</span>
                    <span className="text-gray-400">
                      {new Date(o.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="text-gray-400">{o.items.length} item{o.items.length !== 1 ? "s" : ""}</span>
                    {o.payment && (
                      <span className={`rounded px-1.5 py-0.5 font-bold ${
                        o.payment.status === "COMPLETED"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-orange-50 text-orange-600"
                      }`}>
                        {PAYMENT_METHOD_LABELS[o.payment.method] ?? o.payment.method}
                        {" · "}
                        {o.payment.status === "COMPLETED" ? "Paid" : "Unpaid"}
                      </span>
                    )}
                  </div>
                  <span className="font-extrabold text-gray-800 ml-2">
                    {formatPrice(o.bill?.total ?? o.total, cur)}
                  </span>
                </div>
              ))}
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
            <div className="border-t border-gray-100 px-5 py-4 text-center">
              <Receipt className="mx-auto h-5 w-5 text-gray-300 mb-1" />
              <p className="text-xs text-gray-400">No orders during this period</p>
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
  const [shiftDate, setShiftDate] = useState<string>(new Date().toISOString().slice(0, 10));
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
    <div className="max-w-5xl space-y-8 pb-12">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-gray-900">Financial Reports</h2>
        <p className="text-sm font-medium text-gray-500 mt-1.5">
          Revenue, costs &amp; profit for{" "}
          <strong className="text-gray-900">{selectedRestaurant?.name}</strong>
        </p>
      </div>

      {/* Top-line numbers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-white/70 backdrop-blur-md border border-gray-100/50 p-6 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.03)]"
        >
          <div className="flex items-center gap-3 mb-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 shadow-sm border border-emerald-100/50">
              <TrendingUp className="h-5 w-5" />
            </span>
            <span className="text-[13px] font-bold tracking-wide text-gray-500 uppercase">Total Revenue</span>
          </div>
          <p className="text-3xl font-black text-gray-900 leading-none tracking-tight">
            {formatPrice(totalRevenue, cur)}
          </p>
          <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50/50 w-fit px-2 py-1 rounded-md">
            <ArrowUpRight className="h-3.5 w-3.5" />
            Lifetime earnings
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="relative overflow-hidden rounded-3xl bg-white/70 backdrop-blur-md border border-gray-100/50 p-6 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.03)]"
        >
          <div className="flex items-center gap-3 mb-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600 shadow-sm border border-orange-100/50">
              <Package className="h-5 w-5" />
            </span>
            <span className="text-[13px] font-bold tracking-wide text-gray-500 uppercase">Inventory Cost</span>
          </div>
          <p className="text-3xl font-black text-gray-900 leading-none tracking-tight">
            {formatPrice(totalInventoryCost, cur)}
          </p>
          <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-orange-600 bg-orange-50/50 w-fit px-2 py-1 rounded-md">
            <ArrowDownRight className="h-3.5 w-3.5" />
            Total sunk cost
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500 to-orange-500 p-6 text-white shadow-[0_4px_20px_-4px_rgba(245,158,11,0.4)]"
        >
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute bottom-0 left-0 -mb-4 -ml-4 h-24 w-24 rounded-full bg-white/10 blur-xl" />
          
          <div className="relative flex items-center gap-3 mb-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white shadow-sm backdrop-blur-md">
              <PiggyBank className="h-5 w-5" />
            </span>
            <span className="text-[13px] font-bold tracking-wide text-amber-50 uppercase drop-shadow-sm">Estimated Profit</span>
          </div>
          <p className="relative text-3xl font-black leading-none drop-shadow-md tracking-tight">
            {formatPrice(estimatedProfit, cur)}
          </p>
          <div className="relative mt-4 flex items-center gap-1.5 text-xs font-bold text-white bg-white/20 w-fit px-2 py-1 rounded-md backdrop-blur-sm">
            <DollarSign className="h-3.5 w-3.5" />
            {profitMargin}% margin
          </div>
        </motion.div>
      </div>

      <div>
        <h3 className="text-[13px] font-bold text-gray-400 uppercase tracking-wider mb-4">Revenue Breakdown</h3>
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
                className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 rounded-2xl bg-white/70 backdrop-blur-md border border-gray-100/50 px-5 py-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.06)] transition-all hover:-translate-y-0.5"
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm border border-black/5"
                  style={{ background: `${s.accent}15` }}
                >
                  <Icon className="h-5 w-5" style={{ color: s.accent }} />
                </span>
                <div>
                  <p className="text-xs font-bold text-gray-500 mb-0.5">{s.label}</p>
                  <p className="text-lg font-black tracking-tight text-gray-900">{s.value}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <p className="text-[12px] font-medium text-gray-400 leading-relaxed max-w-2xl bg-gray-100/50 backdrop-blur-sm p-4 rounded-xl border border-gray-200/50">
        <span className="font-bold text-gray-500">Note:</span> Profit is estimated by subtracting total inventory cost from lifetime revenue. This is a simplified overview for quick reference and does not account for operational expenses.
      </p>

      {/* ── Shift Report ───────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h3 className="text-[13px] font-bold text-gray-400 uppercase tracking-wider">
            Shift Report
          </h3>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2">
              <Calendar className="h-3.5 w-3.5 text-gray-400" />
              <input
                type="date"
                value={shiftDate}
                onChange={(e) => setShiftDate(e.target.value)}
                className="text-sm font-medium text-[#3e1e0c] outline-none bg-transparent"
              />
            </div>
            {shiftLoading && <Loader2 className="h-4 w-4 animate-spin text-amber-400" />}
          </div>
        </div>

        {/* Full-time staff cards */}
        {shiftReport && shiftReport.fullTimeStaff.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-indigo-500 uppercase tracking-wider flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> Full-Time Staff
            </p>
            {shiftReport.fullTimeStaff.map((ft) => (
              <ShiftCard
                key={ft.staff.id}
                id={`ft-${ft.staff.id}`}
                label="Full-Time"
                labelColor="bg-indigo-100 text-indigo-700"
                staffName={ft.staff.user.name}
                timeRange="All day"
                orderCount={ft.orderCount}
                revenue={ft.revenue}
                orders={ft.orders}
                cur={cur}
                expanded={expandedId === `ft-${ft.staff.id}`}
                onToggle={(id) => setExpandedId((prev) => (prev === id ? null : id))}
              />
            ))}
          </div>
        )}

        {/* Shift-based cards */}
        {shiftReport && shiftReport.shifts.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> Shift-Based Staff
            </p>
            {shiftReport.shifts.map((sr) => (
              <ShiftCard
                key={sr.shift.id}
                id={sr.shift.id}
                label={sr.shift.label ?? "Shift"}
                labelColor="bg-amber-100 text-amber-700"
                staffName={sr.staff.user.name}
                timeRange={`${sr.shift.startTime} – ${sr.shift.actualEndTime
                  ? new Date(sr.shift.actualEndTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : sr.shift.endTime}`}
                orderCount={sr.orderCount}
                revenue={sr.revenue}
                orders={sr.orders}
                cur={cur}
                expanded={expandedId === sr.shift.id}
                onToggle={(id) => setExpandedId((prev) => (prev === id ? null : id))}
              />
            ))}
          </div>
        )}

        {/* Unassigned */}
        {shiftReport && shiftReport.unassigned.orderCount > 0 && (
          <ShiftCard
            id="unassigned"
            label="Unassigned"
            labelColor="bg-gray-100 text-gray-600"
            staffName="No Shift Assigned"
            timeRange="Outside shift windows"
            orderCount={shiftReport.unassigned.orderCount}
            revenue={shiftReport.unassigned.revenue}
            orders={shiftReport.unassigned.orders}
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
            <div className="rounded-2xl bg-white/70 border border-gray-100 px-4 py-10 text-center">
              <Clock className="mx-auto h-8 w-8 text-gray-300 mb-2" />
              <p className="text-sm font-bold text-gray-400">No orders or shifts found for this date</p>
              <p className="text-xs text-gray-400 mt-1">
                Go to the Shifts tab to define shifts for your staff.
              </p>
            </div>
          )}
      </div>
    </div>
  );
}
