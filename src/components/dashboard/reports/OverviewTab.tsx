"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  TrendingUp,
  ShoppingBag,
  DollarSign,
  AlertTriangle,
  Loader2,
  Percent,
} from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { formatPrice } from "@/lib/currency";
import { useRestaurant } from "@/context/RestaurantContext";
import DateRangePicker from "./DateRangePicker";
import RevenueTrendChart from "./charts/RevenueTrendChart";
import PaymentMethodDonut from "./charts/PaymentMethodDonut";
import OrderTypeDonut from "./charts/OrderTypeDonut";
import StaffLeaderboardBar from "./charts/StaffLeaderboardBar";
import { presetRange } from "./utils";

interface OverviewData {
  range: { from: string; to: string; granularity: "hour" | "day" };
  totals: {
    collectedRevenue: number;
    billedRevenue: number;
    revenueGap: number;
    orderCount: number;
    paidOrderCount: number;
    unpaidOrderCount: number;
    avgOrderValue: number;
    cancelledCount: number;
  };
  trend: { bucket: string; revenue: number; orderCount: number }[];
  paymentMethods: { method: string; count: number; amount: number }[];
  orderTypes: { type: string; count: number; amount: number }[];
  topItems: { name: string; quantity: number; revenue: number }[];
  topStaff: {
    staffId: string;
    name: string;
    orderCount: number;
    revenue: number;
  }[];
  discrepancies: {
    id: string;
    orderNo: string;
    total: number;
    createdAt: string;
    paymentStatus: string | null;
    paymentMethod: string | null;
  }[];
}

interface Props {
  onOpenStaff: (staffId: string) => void;
}

export default function OverviewTab({ onOpenStaff }: Props) {
  const { selectedRestaurant } = useRestaurant();
  const cur = selectedRestaurant?.currency ?? "NPR";
  const [range, setRange] = useState(() => presetRange("last7"));
  // keepPreviousData paints the prior range's report instantly while a new
  // date range loads in the background, instead of blanking the page.
  const overviewQuery = useQuery({
    queryKey: ["reports-overview", selectedRestaurant?.id, range.from, range.to],
    queryFn: () =>
      apiFetch<OverviewData>(
        `/api/restaurants/${selectedRestaurant!.id}/reports/overview?from=${range.from}&to=${range.to}&granularity=day`,
      ),
    enabled: !!selectedRestaurant,
    placeholderData: keepPreviousData,
  });
  const data = overviewQuery.data ?? null;
  const loading = overviewQuery.isLoading;

  const paidPct =
    data && data.totals.orderCount > 0
      ? Math.round((data.totals.paidOrderCount / data.totals.orderCount) * 100)
      : 0;

  return (
    <div className="space-y-6">
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPI
              icon={TrendingUp}
              label="Collected Revenue"
              value={formatPrice(data.totals.collectedRevenue, cur)}
              sub={`Billed: ${formatPrice(data.totals.billedRevenue, cur)}`}
              accent="#f59e0b"
            />
            <KPI
              icon={ShoppingBag}
              label="Orders"
              value={data.totals.orderCount.toLocaleString()}
              sub={`${data.totals.paidOrderCount} paid · ${data.totals.unpaidOrderCount} unpaid`}
              accent="#3b82f6"
            />
            <KPI
              icon={DollarSign}
              label="Avg Order Value"
              value={formatPrice(data.totals.avgOrderValue, cur)}
              sub={
                data.totals.cancelledCount > 0
                  ? `${data.totals.cancelledCount} cancelled`
                  : "—"
              }
              accent="#10b981"
            />
            <KPI
              icon={Percent}
              label="Paid %"
              value={`${paidPct}%`}
              sub={
                data.totals.revenueGap > 0
                  ? `Gap: ${formatPrice(data.totals.revenueGap, cur)}`
                  : "Fully reconciled"
              }
              accent="#6366f1"
            />
          </div>

          {data.discrepancies.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-amber-300/60 bg-amber-50/80 px-4 py-3"
            >
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-amber-900">
                    {data.discrepancies.length} delivered order
                    {data.discrepancies.length === 1 ? "" : "s"} without a completed payment
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {data.discrepancies.slice(0, 10).map((d) => (
                      <span
                        key={d.id}
                        className="rounded-md bg-[var(--surface)]/80 px-2 py-0.5 text-[10px] font-bold text-amber-900 border border-amber-200"
                      >
                        #{d.orderNo} · {formatPrice(d.total, cur)} ·{" "}
                        {d.paymentStatus ?? "NO PAYMENT ROW"}
                      </span>
                    ))}
                    {data.discrepancies.length > 10 && (
                      <span className="text-[10px] text-amber-800">
                        +{data.discrepancies.length - 10} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--canvas)]/70 p-5">
            <h3 className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider mb-3">
              Revenue Trend
            </h3>
            <RevenueTrendChart
              data={data.trend}
              currency={cur}
              granularity={data.range.granularity}
            />
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--canvas)]/70 p-5">
              <h3 className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider mb-2">
                Payment Methods
              </h3>
              <PaymentMethodDonut data={data.paymentMethods} currency={cur} />
            </section>
            <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--canvas)]/70 p-5">
              <h3 className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider mb-2">
                Order Types
              </h3>
              <OrderTypeDonut data={data.orderTypes} currency={cur} />
            </section>
          </div>

          <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--canvas)]/70 p-5">
            <h3 className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider mb-3">
              Top Items
            </h3>
            {data.topItems.length === 0 ? (
              <p className="text-xs text-[var(--text-3)]">No items sold in this range.</p>
            ) : (
              <ul className="divide-y divide-[var(--border-soft)]">
                {data.topItems.map((it, i) => (
                  <li
                    key={it.name}
                    className="flex items-center justify-between py-2 text-sm"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] font-bold text-[var(--text-3)] w-5">
                        {i + 1}.
                      </span>
                      <span className="font-semibold text-[var(--text-1)] truncate">
                        {it.name}
                      </span>
                    </span>
                    <span className="flex items-center gap-4 shrink-0">
                      <span className="text-xs text-[var(--text-3)]">
                        {it.quantity} sold
                      </span>
                      <span className="font-bold text-[var(--text-1)]">
                        {formatPrice(it.revenue, cur)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--canvas)]/70 p-5">
            <h3 className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider mb-3">
              Staff Leaderboard
            </h3>
            <p className="text-[11px] text-[var(--text-3)] mb-2">
              Click a bar to open that staff member&apos;s full drill-down.
            </p>
            <StaffLeaderboardBar
              data={data.topStaff}
              currency={cur}
              onClick={onOpenStaff}
            />
          </section>
        </>
      ) : null}
    </div>
  );
}

function KPI({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--canvas)]/70 p-4">
      <div className="flex items-center gap-2 mb-2">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ background: `${accent}15`, color: accent }}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-[11px] font-bold text-[var(--text-2)] uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="text-xl font-black text-[var(--text-1)] tracking-tight">{value}</p>
      <p className="text-[11px] text-[var(--text-3)] mt-0.5">{sub}</p>
    </div>
  );
}
