"use client";

import { useCallback, useEffect, useState } from "react";
import { DollarSign, ShoppingBag, Activity, Loader2, TrendingUp } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { formatPrice } from "@/lib/currency";
import { useRestaurant } from "@/context/RestaurantContext";
import { useLiveOrders } from "@/context/LiveOrdersContext";
import HourlyBarChart from "./charts/HourlyBarChart";
import PaymentMethodDonut from "./charts/PaymentMethodDonut";
import { toYMD } from "./utils";

interface OverviewData {
  totals: {
    collectedRevenue: number;
    billedRevenue: number;
    orderCount: number;
    paidOrderCount: number;
    unpaidOrderCount: number;
    avgOrderValue: number;
  };
  trend: { bucket: string; revenue: number; orderCount: number }[];
  paymentMethods: { method: string; count: number; amount: number }[];
}

export default function TodayTab() {
  const { selectedRestaurant } = useRestaurant();
  const cur = selectedRestaurant?.currency ?? "NPR";
  const { orders } = useLiveOrders();
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  const today = toYMD(new Date());

  const load = useCallback(async () => {
    if (!selectedRestaurant) return;
    setLoading(true);
    try {
      const res = await apiFetch(
        `/api/restaurants/${selectedRestaurant.id}/reports/overview?from=${today}&to=${today}&granularity=hour`,
      );
      setData(res as OverviewData);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, [selectedRestaurant, today]);

  useEffect(() => {
    load();
  }, [load]);

  const liveCount = orders.filter(
    (o) => o.status !== "DELIVERED" && o.status !== "CANCELLED",
  ).length;

  const hourly = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    orderCount: 0,
    revenue: 0,
  }));
  if (data) {
    for (const p of data.trend) {
      const hh = Number(p.bucket.slice(11, 13));
      if (!Number.isNaN(hh) && hh >= 0 && hh < 24) {
        hourly[hh] = {
          hour: hh,
          orderCount: p.orderCount,
          revenue: p.revenue,
        };
      }
    }
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI
          icon={DollarSign}
          label="Today Revenue"
          value={formatPrice(data?.totals.collectedRevenue ?? 0, cur)}
          sub={`Billed: ${formatPrice(data?.totals.billedRevenue ?? 0, cur)}`}
          accent="#f59e0b"
        />
        <KPI
          icon={ShoppingBag}
          label="Orders Today"
          value={String(data?.totals.orderCount ?? 0)}
          sub={`${data?.totals.paidOrderCount ?? 0} paid`}
          accent="#3b82f6"
        />
        <KPI
          icon={TrendingUp}
          label="Avg Order"
          value={formatPrice(data?.totals.avgOrderValue ?? 0, cur)}
          sub="Per paid order"
          accent="#10b981"
        />
        <KPI
          icon={Activity}
          label="Live Orders"
          value={String(liveCount)}
          sub="In kitchen / out for delivery"
          accent="#6366f1"
        />
      </div>

      <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--canvas)]/70 p-5">
        <h3 className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider mb-3">
          Orders by Hour
        </h3>
        <HourlyBarChart data={hourly} currency={cur} />
      </section>

      <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--canvas)]/70 p-5">
        <h3 className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider mb-3">
          Today&apos;s Payment Methods
        </h3>
        <PaymentMethodDonut data={data?.paymentMethods ?? []} currency={cur} />
      </section>
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
  icon: React.ElementType;
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
