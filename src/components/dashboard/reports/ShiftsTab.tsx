"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  Clock,
  Users,
  Phone,
  Mail,
  Loader2,
  Receipt,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { formatPrice } from "@/lib/currency";
import { useRestaurant } from "@/context/RestaurantContext";
import { PAYMENT_METHOD_LABELS, formatDuration, toYMD } from "./utils";

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
  unassigned: {
    orderCount: number;
    revenue: number;
    orders: ShiftOrderSummary[];
  };
  totalRevenue: number;
  totalOrders: number;
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
    (o) => !o.payment || o.payment.status !== "COMPLETED",
  );
  const paidRevenue = paidOrders.reduce(
    (sum, o) => sum + (o.bill?.total ?? o.total),
    0,
  );

  return (
    <div className="rounded-2xl bg-[var(--canvas)] border border-[var(--border-soft)] shadow-[0_2px_16px_-4px_rgba(0,0,0,0.06)] overflow-hidden">
      <div className={`h-0.5 w-full ${labelGradient}`} />
      <button
        onClick={() => onToggle(id)}
        className="w-full text-left px-5 py-4 hover:bg-[var(--surface)]/40 transition-colors"
      >
        <div className="flex items-start justify-between gap-4">
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
              <div className="flex items-center gap-6 px-5 py-2.5 bg-[var(--canvas-sub)] border-b border-[var(--border-soft)]">
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                  <span className="text-[11px] font-bold text-[var(--text-2)]">
                    Paid: {paidOrders.length} · {formatPrice(paidRevenue, cur)}
                  </span>
                </div>
                {unpaidOrders.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                    <span className="text-[11px] font-bold text-[var(--text-2)]">
                      Unpaid: {unpaidOrders.length}
                    </span>
                  </div>
                )}
              </div>
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
                              : "bg-red-100 text-red-700"
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

export default function ShiftsTab() {
  const { selectedRestaurant } = useRestaurant();
  const cur = selectedRestaurant?.currency ?? "NPR";
  const [shiftDate, setShiftDate] = useState<string>(toYMD(new Date()));
  const [shiftReport, setShiftReport] = useState<ShiftReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!selectedRestaurant) return;
    setLoading(true);
    try {
      const res = await apiFetch(
        `/api/restaurants/${selectedRestaurant.id}/shifts/report?date=${shiftDate}`,
      );
      setShiftReport(res as ShiftReportData);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, [selectedRestaurant, shiftDate]);

  useEffect(() => {
    load();
  }, [load]);

  const allOrders = shiftReport
    ? [
        ...shiftReport.fullTimeStaff.flatMap((f) => f.orders),
        ...shiftReport.shifts.flatMap((s) => s.orders),
        ...shiftReport.unassigned.orders,
      ]
    : [];
  const paidCount = allOrders.filter(
    (o) => o.payment?.status === "COMPLETED",
  ).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-[13px] font-bold text-[var(--text-3)] uppercase tracking-wider">
            Shift Report
          </h3>
          {shiftReport && (
            <p className="text-[11px] text-[var(--text-3)] font-medium mt-0.5">
              {shiftReport.totalOrders} orders ·{" "}
              {formatPrice(shiftReport.totalRevenue, cur)} total · {paidCount} paid
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
          {loading && <Loader2 className="h-4 w-4 animate-spin text-[var(--accent)]" />}
        </div>
      </div>

      {shiftReport && shiftReport.fullTimeStaff.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-bold text-indigo-500 uppercase tracking-wider flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> Full-Time Staff
            </p>
            <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
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
              onToggle={(id) => setExpandedId((p) => (p === id ? null : id))}
            />
          ))}
        </div>
      )}

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
                onToggle={(id) => setExpandedId((p) => (p === id ? null : id))}
              />
            );
          })}
        </div>
      )}

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
          onToggle={(id) => setExpandedId((p) => (p === id ? null : id))}
        />
      )}

      {shiftReport &&
        shiftReport.fullTimeStaff.length === 0 &&
        shiftReport.shifts.length === 0 &&
        shiftReport.unassigned.orderCount === 0 && (
          <div className="rounded-2xl bg-[var(--canvas)]/70 border border-[var(--border-soft)] px-4 py-10 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-[var(--text-3)] mb-2" />
            <p className="text-sm font-bold text-[var(--text-3)]">
              No orders or shifts found for this date
            </p>
          </div>
        )}
    </div>
  );
}
