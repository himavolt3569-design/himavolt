/**
 * Profit & Loss math, shared by the per-restaurant and the owner-wide routes.
 *
 * Revenue is cash-basis — the money actually collected (paid, non-cancelled
 * orders) — so it lines up with expenses (money actually spent) to give a
 * net cash profit/loss. This matches the "collectedRevenue" the Reports tab
 * already shows, so the two screens never disagree.
 */

export type OrderForPnl = {
  total: number;
  status: string;
  createdAt: Date;
  payment: { status: string } | null;
  bill: { total: number } | null;
};

export type ExpenseForPnl = {
  category: string;
  amount: number;
  incurredAt: Date;
};

export interface PnlSummary {
  revenue: number;
  ordersCount: number;
  expenses: number;
  expensesByCategory: { category: string; amount: number }[];
  netProfit: number;
  /** Net profit as a % of revenue (0 when there's no revenue). */
  margin: number;
  /** Daily revenue vs expense series for the range. */
  trend: { date: string; revenue: number; expense: number }[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const dayKey = (d: Date) => d.toISOString().slice(0, 10);

/** Collected revenue for one order — 0 unless it's paid and not cancelled. */
export function orderRevenue(o: OrderForPnl): number {
  const cancelled = o.status === "REJECTED";
  const paid = o.payment?.status === "COMPLETED";
  if (cancelled || !paid) return 0;
  return o.bill?.total ?? o.total;
}

export function summarizePnl(
  orders: OrderForPnl[],
  expenses: ExpenseForPnl[],
): PnlSummary {
  const dayMap = new Map<string, { revenue: number; expense: number }>();
  const bump = (k: string, field: "revenue" | "expense", v: number) => {
    const cur = dayMap.get(k) ?? { revenue: 0, expense: 0 };
    cur[field] += v;
    dayMap.set(k, cur);
  };

  let revenue = 0;
  let ordersCount = 0;
  for (const o of orders) {
    const r = orderRevenue(o);
    if (r <= 0) continue;
    revenue += r;
    ordersCount += 1;
    bump(dayKey(o.createdAt), "revenue", r);
  }

  const byCat = new Map<string, number>();
  let expenseTotal = 0;
  for (const e of expenses) {
    expenseTotal += e.amount;
    byCat.set(e.category, (byCat.get(e.category) ?? 0) + e.amount);
    bump(dayKey(e.incurredAt), "expense", e.amount);
  }

  const netProfit = revenue - expenseTotal;
  const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

  const trend = Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({
      date,
      revenue: round2(v.revenue),
      expense: round2(v.expense),
    }));

  const expensesByCategory = Array.from(byCat.entries())
    .map(([category, amount]) => ({ category, amount: round2(amount) }))
    .sort((a, b) => b.amount - a.amount);

  return {
    revenue: round2(revenue),
    ordersCount,
    expenses: round2(expenseTotal),
    expensesByCategory,
    netProfit: round2(netProfit),
    margin: round2(margin),
    trend,
  };
}

/** Parse a YYYY-MM-DD (or ISO) string to a UTC Date, falling back on bad input. */
export function parsePnlDate(s: string | null, fallback: Date): Date {
  if (!s) return fallback;
  const d = new Date(s.length <= 10 ? s + "T00:00:00.000Z" : s);
  return isNaN(d.getTime()) ? fallback : d;
}

/** Default range: last 30 days through end of today (UTC). */
export function defaultPnlRange(): { from: Date; to: Date } {
  const now = new Date();
  const to = new Date(now);
  to.setUTCHours(23, 59, 59, 999);
  const from = new Date(now);
  from.setUTCDate(from.getUTCDate() - 29);
  from.setUTCHours(0, 0, 0, 0);
  return { from, to };
}
