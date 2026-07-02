"use client";

import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Loader2,
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Clock,
  Calendar,
  Mail,
  Phone,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { formatPrice } from "@/lib/currency";
import { useRestaurant } from "@/context/RestaurantContext";
import DateRangePicker from "./DateRangePicker";
import RevenueTrendChart from "./charts/RevenueTrendChart";
import PaymentMethodDonut from "./charts/PaymentMethodDonut";
import OrderTypeDonut from "./charts/OrderTypeDonut";
import { formatDuration, ORDER_TYPE_LABELS, PAYMENT_METHOD_LABELS, presetRange } from "./utils";

interface StaffPayload {
  staff: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    role: string;
    staffType: string;
  };
  range: { from: string; to: string };
  totals: {
    revenue: number;
    orderCount: number;
    avgOrderValue: number;
    paidCount: number;
    unpaidCount: number;
  };
  trend: { date: string; revenue: number; orderCount: number }[];
  paymentMethods: { method: string; count: number; amount: number }[];
  orderTypes: { type: string; count: number; amount: number }[];
  attendance: {
    date: string;
    checkIn: string;
    checkOut: string | null;
    durationMinutes: number | null;
    status: string;
  }[];
  shifts: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    actualEndTime: string | null;
    label: string | null;
  }[];
  orders: {
    id: string;
    orderNo: string;
    total: number;
    createdAt: string;
    type: string;
    status: string;
    payment: { method: string; status: string; amount: number } | null;
    items: { name: string; quantity: number }[];
  }[];
}

interface Props {
  staffId: string;
  onClose: () => void;
}

export default function StaffDrillDownPanel({ staffId, onClose }: Props) {
  const { selectedRestaurant } = useRestaurant();
  const cur = selectedRestaurant?.currency ?? "NPR";
  const [range, setRange] = useState(() => presetRange("last30"));

  // keepPreviousData paints the prior range's drill-down instantly while a
  // new range loads, and re-opening the same staff member's panel (or
  // switching between staff) reuses the cache instead of spinning.
  const staffQuery = useQuery({
    queryKey: ["reports-staff", selectedRestaurant?.id, staffId, range.from, range.to],
    queryFn: () =>
      apiFetch<StaffPayload>(
        `/api/restaurants/${selectedRestaurant!.id}/reports/staff/${staffId}?from=${range.from}&to=${range.to}`,
      ),
    enabled: !!selectedRestaurant,
    placeholderData: keepPreviousData,
  });
  const data = staffQuery.data ?? null;
  const loading = staffQuery.isLoading;

  const trendForChart = (data?.trend ?? []).map((t) => ({
    bucket: t.date,
    revenue: t.revenue,
    orderCount: t.orderCount,
  }));

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />
      <motion.aside
        key="panel"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "tween", duration: 0.25 }}
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-2xl overflow-y-auto border-l border-[var(--border)] bg-[var(--canvas)] shadow-xl"
      >
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[var(--border-soft)] bg-[var(--canvas)] px-5 py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-3)]">
              Staff report
            </p>
            <h2 className="text-lg font-black text-[var(--text-1)] truncate">
              {data?.staff.name ?? "Loading…"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[var(--text-2)] hover:bg-[var(--canvas-sub)]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="px-5 py-5 space-y-5">
          <DateRangePicker
            from={range.from}
            to={range.to}
            onChange={setRange}
            disabled={loading}
          />

          {loading && !data ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-[var(--accent)]" />
            </div>
          ) : data ? (
            <>
              <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--canvas)]/70 p-4">
                <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-2)]">
                  <span className="inline-flex items-center gap-1 rounded-md bg-[var(--accent-muted)] px-2 py-0.5 font-bold text-[var(--accent-text)]">
                    {data.staff.role}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md border border-[var(--border-soft)] px-2 py-0.5">
                    {data.staff.staffType === "SHIFT_BASED"
                      ? "Shift-based"
                      : "Full-time"}
                  </span>
                  {data.staff.email && (
                    <span className="inline-flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {data.staff.email}
                    </span>
                  )}
                  {data.staff.phone && (
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {data.staff.phone}
                    </span>
                  )}
                </div>
              </section>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <MiniKPI
                  icon={DollarSign}
                  label="Revenue"
                  value={formatPrice(data.totals.revenue, cur)}
                />
                <MiniKPI
                  icon={ShoppingBag}
                  label="Orders"
                  value={String(data.totals.orderCount)}
                />
                <MiniKPI
                  icon={TrendingUp}
                  label="Avg Order"
                  value={formatPrice(data.totals.avgOrderValue, cur)}
                />
                <MiniKPI
                  icon={CheckCircle2}
                  label="Paid / Unpaid"
                  value={`${data.totals.paidCount} / ${data.totals.unpaidCount}`}
                />
              </div>

              <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--canvas)]/70 p-4">
                <h3 className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider mb-3">
                  Revenue Trend
                </h3>
                {trendForChart.length > 0 ? (
                  <RevenueTrendChart
                    data={trendForChart}
                    currency={cur}
                    granularity="day"
                  />
                ) : (
                  <p className="text-xs text-[var(--text-3)]">
                    No paid orders in this range.
                  </p>
                )}
              </section>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--canvas)]/70 p-4">
                  <h3 className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider mb-2">
                    Payment Methods
                  </h3>
                  <PaymentMethodDonut
                    data={data.paymentMethods}
                    currency={cur}
                  />
                </section>
                <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--canvas)]/70 p-4">
                  <h3 className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider mb-2">
                    Order Types
                  </h3>
                  <OrderTypeDonut data={data.orderTypes} currency={cur} />
                </section>
              </div>

              <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--canvas)]/70 p-4">
                <h3 className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Calendar className="h-3 w-3" /> Shifts Worked
                </h3>
                {data.shifts.length === 0 ? (
                  <p className="text-xs text-[var(--text-3)]">
                    No shifts in this range.
                  </p>
                ) : (
                  <ul className="divide-y divide-[var(--border-soft)]">
                    {data.shifts.map((s) => (
                      <li
                        key={s.id}
                        className="flex items-center justify-between py-2 text-xs"
                      >
                        <span className="flex items-center gap-2">
                          <span className="font-semibold text-[var(--text-1)]">
                            {s.date}
                          </span>
                          {s.label && (
                            <span className="rounded-md bg-[var(--canvas-sub)] px-1.5 py-0.5 text-[10px] text-[var(--text-2)]">
                              {s.label}
                            </span>
                          )}
                        </span>
                        <span className="text-[var(--text-2)]">
                          {s.startTime} → {s.endTime}
                          {s.actualEndTime && (
                            <span className="ml-1 text-[var(--text-3)]">
                              (left{" "}
                              {new Date(s.actualEndTime).toLocaleTimeString(
                                undefined,
                                { hour: "2-digit", minute: "2-digit" },
                              )}
                              )
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--canvas)]/70 p-4">
                <h3 className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Clock className="h-3 w-3" /> Attendance
                </h3>
                {data.attendance.length === 0 ? (
                  <p className="text-xs text-[var(--text-3)]">
                    No attendance records in this range.
                  </p>
                ) : (
                  <ul className="divide-y divide-[var(--border-soft)]">
                    {data.attendance.map((a) => (
                      <li
                        key={a.date + a.checkIn}
                        className="flex items-center justify-between py-2 text-xs"
                      >
                        <span className="font-semibold text-[var(--text-1)]">
                          {a.date}
                        </span>
                        <span className="text-[var(--text-2)]">
                          {new Date(a.checkIn).toLocaleTimeString(undefined, {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {" → "}
                          {a.checkOut
                            ? new Date(a.checkOut).toLocaleTimeString(
                                undefined,
                                { hour: "2-digit", minute: "2-digit" },
                              )
                            : "active"}
                          {a.durationMinutes != null && (
                            <span className="ml-2 text-[var(--text-3)]">
                              {formatDuration(a.durationMinutes)}
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--canvas)]/70 p-4">
                <h3 className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider mb-2">
                  Orders ({data.orders.length})
                </h3>
                {data.orders.length === 0 ? (
                  <p className="text-xs text-[var(--text-3)]">
                    No orders in this range.
                  </p>
                ) : (
                  <ul className="divide-y divide-[var(--border-soft)]">
                    {data.orders.map((o) => {
                      const paid = o.payment?.status === "COMPLETED";
                      return (
                        <li key={o.id} className="py-2 text-xs">
                          <div className="flex items-center justify-between gap-3">
                            <span className="flex items-center gap-2 min-w-0">
                              <span className="font-bold text-[var(--text-1)]">
                                #{o.orderNo}
                              </span>
                              <span className="rounded-md bg-[var(--canvas-sub)] px-1.5 py-0.5 text-[10px] text-[var(--text-2)]">
                                {ORDER_TYPE_LABELS[o.type] ?? o.type}
                              </span>
                              {paid ? (
                                <span className="inline-flex items-center gap-0.5 text-emerald-600">
                                  <CheckCircle2 className="h-3 w-3" />
                                  {o.payment
                                    ? PAYMENT_METHOD_LABELS[o.payment.method] ??
                                      o.payment.method
                                    : ""}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 text-amber-600">
                                  <AlertCircle className="h-3 w-3" />
                                  {o.payment?.status ?? "No payment"}
                                </span>
                              )}
                            </span>
                            <span className="font-bold text-[var(--text-1)]">
                              {formatPrice(o.total, cur)}
                            </span>
                          </div>
                          {o.items.length > 0 && (
                            <p className="mt-0.5 text-[11px] text-[var(--text-3)] truncate">
                              {o.items
                                .map((it) => `${it.quantity}× ${it.name}`)
                                .join(", ")}
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </>
          ) : (
            <p className="text-xs text-[var(--text-3)]">
              Could not load staff data.
            </p>
          )}
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}

function MiniKPI({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--canvas)]/70 p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--text-3)]">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <p className="mt-1 text-base font-black text-[var(--text-1)] tracking-tight">
        {value}
      </p>
    </div>
  );
}
