"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TrendingUp, TrendingDown, ChevronRight, Wallet, Receipt } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { formatPrice } from "@/lib/currency";

interface SnapshotData {
  revenue: number;
  expenses: number;
  netProfit: number;
  margin: number;
}

const isoDay = (d: Date) => {
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
};

/**
 * Compact "this month" Profit & Loss card for the dashboard home. Renders
 * nothing until it has data — so it stays invisible if the P&L data isn't
 * available (e.g. before the `expenses` table is deployed), then quietly
 * appears once it is.
 */
export default function PnlSnapshotCard({
  restaurantId,
  currency,
}: {
  restaurantId?: string;
  currency: string;
}) {
  const [data, setData] = useState<SnapshotData | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!restaurantId) return;
    const now = new Date();
    const from = isoDay(new Date(now.getFullYear(), now.getMonth(), 1));
    const to = isoDay(now);
    let alive = true;
    apiFetch<SnapshotData>(`/api/restaurants/${restaurantId}/pnl?from=${from}&to=${to}`)
      .then((d) => {
        if (alive) setData(d);
      })
      .catch(() => {
        /* P&L unavailable (e.g. expenses table not deployed yet) — stay hidden */
      });
    return () => {
      alive = false;
    };
  }, [restaurantId]);

  if (!data) return null;

  const isLoss = data.netProfit < 0;
  const monthName = new Date().toLocaleDateString("en-US", { month: "long" });

  return (
    <button
      onClick={() => router.push("/dashboard/profit-loss")}
      className="group w-full rounded-2xl bg-[var(--canvas)]/90 ring-1 ring-[var(--border)] p-5 text-left shadow-sm transition-colors hover:ring-[var(--accent-border)]"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-bold text-[var(--text-1)]">Profit &amp; Loss · {monthName}</h3>
        <span className="flex items-center gap-0.5 text-[12px] font-semibold text-[var(--accent)]">
          Open <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-3)]">
            {isLoss ? "Net Loss" : "Net Profit"}
          </p>
          <p className={`text-2xl font-black tabular-nums leading-tight ${isLoss ? "text-red-600" : "text-emerald-600"}`}>
            {isLoss ? "- " : ""}{formatPrice(Math.abs(data.netProfit), currency)}
          </p>
          <p className={`mt-0.5 inline-flex items-center gap-1 text-[11px] font-bold ${isLoss ? "text-red-500" : "text-emerald-500"}`}>
            {isLoss ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
            {data.margin.toFixed(1)}% margin
          </p>
        </div>

        <div className="flex gap-5">
          <div>
            <p className="flex items-center gap-1 text-[11px] font-semibold text-[var(--text-3)]">
              <Wallet className="h-3 w-3" /> Revenue
            </p>
            <p className="text-sm font-bold tabular-nums text-[var(--text-1)]">{formatPrice(data.revenue, currency)}</p>
          </div>
          <div>
            <p className="flex items-center gap-1 text-[11px] font-semibold text-[var(--text-3)]">
              <Receipt className="h-3 w-3" /> Expenses
            </p>
            <p className="text-sm font-bold tabular-nums text-[var(--text-1)]">{formatPrice(data.expenses, currency)}</p>
          </div>
        </div>
      </div>
    </button>
  );
}
