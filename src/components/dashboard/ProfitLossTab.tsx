"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Receipt,
  Percent,
  Plus,
  Trash2,
  Loader2,
  Building2,
  ShoppingCart,
  Users,
  Home,
  Zap,
  Megaphone,
  Wrench,
  Package,
  Boxes,
  MoreHorizontal,
  CalendarDays,
  X,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { apiFetch, invalidateApiCache, peekApiCache } from "@/lib/api-client";
import { useRestaurant } from "@/context/RestaurantContext";
import { formatPrice } from "@/lib/currency";
import { EXPENSE_CATEGORIES } from "@/lib/validations";
import Skeleton from "@/components/shared/Skeleton";

/* ── types (mirror the API responses) ─────────────────────────────────── */
interface Summary {
  revenue: number;
  ordersCount: number;
  expenses: number;
  expensesByCategory: { category: string; amount: number }[];
  netProfit: number;
  margin: number;
  trend?: { date: string; revenue: number; expense: number }[];
}
interface SinglePnl extends Summary {
  restaurant: { id: string; name: string; currency: string };
  range: { from: string; to: string };
}
interface ExpenseRow {
  id: string;
  category: string;
  amount: number;
  note: string | null;
  incurredAt: string;
}
interface OverallPnl {
  range: { from: string; to: string };
  currency: string;
  mixedCurrencies: boolean;
  restaurantCount: number;
  combined: Summary;
  restaurants: {
    id: string;
    name: string;
    currency: string;
    revenue: number;
    expenses: number;
    netProfit: number;
    margin: number;
    ordersCount: number;
  }[];
}

const CATEGORY_META: Record<string, { label: string; icon: typeof Home }> = {
  INGREDIENTS: { label: "Ingredients / Purchases", icon: ShoppingCart },
  SALARIES: { label: "Salaries & Wages", icon: Users },
  RENT: { label: "Rent", icon: Home },
  UTILITIES: { label: "Utilities", icon: Zap },
  MARKETING: { label: "Marketing", icon: Megaphone },
  EQUIPMENT: { label: "Equipment", icon: Wrench },
  MAINTENANCE: { label: "Maintenance", icon: Wrench },
  SUPPLIES: { label: "Supplies", icon: Boxes },
  OTHER: { label: "Other", icon: MoreHorizontal },
};
const catLabel = (c: string) => CATEGORY_META[c]?.label ?? c;
const catIcon = (c: string) => CATEGORY_META[c]?.icon ?? Package;

const PRESETS = [
  { id: "7d", label: "7 Days" },
  { id: "30d", label: "30 Days" },
  { id: "month", label: "This Month" },
  { id: "year", label: "This Year" },
] as const;
type PresetId = (typeof PRESETS)[number]["id"] | "custom";

const isoDay = (d: Date) => {
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
};

function rangeFor(preset: PresetId): { from: string; to: string } {
  const now = new Date();
  const to = isoDay(now);
  if (preset === "month") {
    return { from: isoDay(new Date(now.getFullYear(), now.getMonth(), 1)), to };
  }
  if (preset === "year") {
    return { from: isoDay(new Date(now.getFullYear(), 0, 1)), to };
  }
  const days = preset === "7d" ? 6 : 29;
  const from = new Date(now);
  from.setDate(from.getDate() - days);
  return { from: isoDay(from), to };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Optimistically fold an expense delta into a single-restaurant summary so the
 *  headline numbers + category breakdown update instantly; the background
 *  refetch then reconciles the exact figures (and the trend). */
function bumpSingle<T extends Summary>(s: T, category: string, delta: number): T {
  const expenses = round2(Math.max(0, s.expenses + delta));
  const netProfit = round2(s.revenue - expenses);
  const margin = s.revenue > 0 ? round2((netProfit / s.revenue) * 100) : 0;
  const cats = s.expensesByCategory.map((c) => ({ ...c }));
  const idx = cats.findIndex((c) => c.category === category);
  if (idx >= 0) cats[idx].amount = round2(cats[idx].amount + delta);
  else if (delta > 0) cats.push({ category, amount: round2(delta) });
  const expensesByCategory = cats
    .filter((c) => c.amount > 0.005)
    .sort((a, b) => b.amount - a.amount);
  return { ...s, expenses, netProfit, margin, expensesByCategory };
}

export default function ProfitLossTab({ restaurantId }: { restaurantId?: string }) {
  const { restaurants, selectedRestaurant } = useRestaurant();
  const hasMultiple = restaurants.length > 1;

  const rid = restaurantId ?? selectedRestaurant?.id;
  const [scope, setScope] = useState<"single" | "all">("single");
  const [preset, setPreset] = useState<PresetId>("30d");
  const [range, setRange] = useState(() => rangeFor("30d"));

  const [single, setSingle] = useState<SinglePnl | null>(() => {
    if (!rid) return null;
    const qs = `from=${range.from}&to=${range.to}`;
    return peekApiCache<SinglePnl>(`/api/restaurants/${rid}/pnl?${qs}`) || null;
  });
  const [overall, setOverall] = useState<OverallPnl | null>(() => {
    const qs = `from=${range.from}&to=${range.to}`;
    return peekApiCache<OverallPnl>(`/api/me/pnl?${qs}`) || null;
  });
  const [expenses, setExpenses] = useState<ExpenseRow[]>(() => {
    if (!rid) return [];
    const qs = `from=${range.from}&to=${range.to}`;
    const ex = peekApiCache<{ expenses: ExpenseRow[] }>(`/api/restaurants/${rid}/expenses?${qs}`);
    return ex && Array.isArray(ex.expenses) ? ex.expenses : [];
  });
  // `firstLoad` gates the full skeleton; once we have data we keep it on screen
  // and only show a subtle spinner during refreshes (filter/scope changes,
  // post-mutation) — no blanking.
  const [firstLoad, setFirstLoad] = useState(() => {
    const qs = `from=${range.from}&to=${range.to}`;
    if (scope === "all") return !peekApiCache(`/api/me/pnl?${qs}`);
    if (rid) return !peekApiCache(`/api/restaurants/${rid}/pnl?${qs}`);
    return true;
  });
  const [refreshing, setRefreshing] = useState(false);
  const [, setLoadError] = useState(false);

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    category: "INGREDIENTS",
    amount: "",
    note: "",
    date: isoDay(new Date()),
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const currency =
    scope === "all"
      ? overall?.currency ?? selectedRestaurant?.currency ?? "NPR"
      : single?.restaurant.currency ?? selectedRestaurant?.currency ?? "NPR";

  const applyPreset = (p: PresetId) => {
    setPreset(p);
    if (p !== "custom") setRange(rangeFor(p));
  };

  const load = useCallback(
    async (fresh = false) => {
      setRefreshing(true);
      setLoadError(false);
      // `fresh` (after a mutation) bypasses the apiFetch GET cache; otherwise a
      // short TTL keeps repeat views snappy without going stale.
      const cacheTtl = fresh ? 0 : 8_000;
      const qs = `from=${range.from}&to=${range.to}`;
      try {
        if (scope === "all") {
          const data = await apiFetch<OverallPnl>(`/api/me/pnl?${qs}`, { cacheTtl });
          setOverall(data);
        } else if (rid) {
          const [p, ex] = await Promise.all([
            apiFetch<SinglePnl>(`/api/restaurants/${rid}/pnl?${qs}`, { cacheTtl }),
            apiFetch<{ expenses: ExpenseRow[] }>(`/api/restaurants/${rid}/expenses?${qs}`, { cacheTtl }),
          ]);
          setSingle(p);
          setExpenses(Array.isArray(ex.expenses) ? ex.expenses : []);
        }
      } catch {
        setLoadError(true);
      } finally {
        setRefreshing(false);
        setFirstLoad(false);
      }
    },
    [scope, rid, range.from, range.to],
  );

  useEffect(() => {
    load();
  }, [load]);

  // Drop cached P&L for this owner so the next reads are fresh after a mutation.
  const bustCache = () => {
    if (rid) invalidateApiCache(`/api/restaurants/${rid}`);
    invalidateApiCache("/api/me/pnl");
  };

  const addExpense = async () => {
    setFormError("");
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) {
      setFormError("Enter an amount greater than 0.");
      return;
    }
    if (!rid) return;

    // Optimistic: show it instantly (list + headline numbers), then reconcile.
    const optimistic: ExpenseRow = {
      id: `temp-${Date.now()}`,
      category: form.category,
      amount,
      note: form.note.trim() || null,
      incurredAt: new Date(`${form.date}T00:00:00`).toISOString(),
    };
    setExpenses((prev) => [optimistic, ...prev]);
    setSingle((prev) => (prev ? bumpSingle(prev, form.category, amount) : prev));
    setShowAdd(false);
    setForm({ category: form.category, amount: "", note: "", date: form.date });
    setSaving(true);

    try {
      const res = await fetch(`/api/restaurants/${rid}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: optimistic.category,
          amount,
          note: optimistic.note || undefined,
          incurredAt: form.date,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        // Roll back the optimistic entry.
        setExpenses((prev) => prev.filter((e) => e.id !== optimistic.id));
        setSingle((prev) => (prev ? bumpSingle(prev, form.category, -amount) : prev));
        setFormError(d.error ?? "Couldn't save the expense.");
        setShowAdd(true);
        return;
      }
      bustCache();
      await load(true);
    } catch {
      setExpenses((prev) => prev.filter((e) => e.id !== optimistic.id));
      setSingle((prev) => (prev ? bumpSingle(prev, form.category, -amount) : prev));
      setFormError("Couldn't save the expense.");
      setShowAdd(true);
    } finally {
      setSaving(false);
    }
  };

  const deleteExpense = async (id: string) => {
    if (!rid) return;
    setDeletingId(id);
    const removed = expenses.find((e) => e.id === id);
    const snapshot = expenses;
    // Optimistic remove + headline update.
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    if (removed) setSingle((prev) => (prev ? bumpSingle(prev, removed.category, -removed.amount) : prev));
    try {
      const res = await fetch(`/api/restaurants/${rid}/expenses/${id}`, { method: "DELETE" });
      if (!res.ok) {
        setExpenses(snapshot);
        if (removed) setSingle((prev) => (prev ? bumpSingle(prev, removed.category, removed.amount) : prev));
        return;
      }
      bustCache();
      await load(true);
    } catch {
      setExpenses(snapshot);
      if (removed) setSingle((prev) => (prev ? bumpSingle(prev, removed.category, removed.amount) : prev));
    } finally {
      setDeletingId(null);
    }
  };

  const summary: Summary | null = scope === "all" ? overall?.combined ?? null : single;
  const isLoss = (summary?.netProfit ?? 0) < 0;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-1)]">Profit &amp; Loss</h1>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-[var(--text-3)]">
            <span>
              {scope === "all"
                ? `Across all ${overall?.restaurantCount ?? restaurants.length} restaurants`
                : single?.restaurant.name ?? selectedRestaurant?.name ?? ""}
              {" · "}
              {range.from} → {range.to}
            </span>
            {refreshing && !firstLoad && <Loader2 className="h-3 w-3 shrink-0 animate-spin text-[var(--accent)]" />}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasMultiple && (
            <div className="flex rounded-xl border border-[var(--border)] bg-[var(--canvas)] p-0.5 text-xs font-bold">
              <button
                onClick={() => setScope("single")}
                className={`rounded-lg px-3 py-1.5 transition-colors ${scope === "single" ? "bg-[var(--accent)] text-white" : "text-[var(--text-2)] hover:text-[var(--text-1)]"}`}
              >
                This restaurant
              </button>
              <button
                onClick={() => setScope("all")}
                className={`rounded-lg px-3 py-1.5 transition-colors ${scope === "all" ? "bg-[var(--accent)] text-white" : "text-[var(--text-2)] hover:text-[var(--text-1)]"}`}
              >
                All restaurants
              </button>
            </div>
          )}

          <div className="flex rounded-xl border border-[var(--border)] bg-[var(--canvas)] p-0.5 text-xs font-bold">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => applyPreset(p.id)}
                className={`rounded-lg px-2.5 py-1.5 transition-colors ${preset === p.id ? "bg-[var(--surface-alt)] text-[var(--text-1)]" : "text-[var(--text-3)] hover:text-[var(--text-1)]"}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Custom range inputs */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-3)]">
        <CalendarDays className="h-3.5 w-3.5" />
        <input
          type="date"
          value={range.from}
          max={range.to}
          onChange={(e) => { setPreset("custom"); setRange((r) => ({ ...r, from: e.target.value })); }}
          className="rounded-lg border border-[var(--border)] bg-[var(--canvas)] px-2 py-1 text-[var(--text-1)]"
        />
        <span>to</span>
        <input
          type="date"
          value={range.to}
          min={range.from}
          max={isoDay(new Date())}
          onChange={(e) => { setPreset("custom"); setRange((r) => ({ ...r, to: e.target.value })); }}
          className="rounded-lg border border-[var(--border)] bg-[var(--canvas)] px-2 py-1 text-[var(--text-1)]"
        />
      </div>

      {overall?.mixedCurrencies && scope === "all" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-700">
          Your restaurants use different currencies. Combined totals are shown in {currency} without conversion.
        </div>
      )}

      {!summary && (firstLoad || refreshing) ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      ) : !summary ? (
        <button
          onClick={() => load(true)}
          className="w-full rounded-2xl border border-[var(--border)] py-16 text-center text-sm text-[var(--text-3)] hover:bg-[var(--canvas-sub)] transition-colors"
        >
          Couldn&apos;t load the profit &amp; loss data. Tap to retry.
        </button>
      ) : (
        <>
          {/* ── Stat tiles ── */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile icon={Wallet} label="Revenue" value={formatPrice(summary.revenue, currency)}
              sub={`${summary.ordersCount} paid orders`} tone="neutral" />
            <StatTile icon={Receipt} label="Expenses" value={formatPrice(summary.expenses, currency)}
              sub={`${summary.expensesByCategory.length} categories`} tone="neutral" />
            <StatTile icon={isLoss ? TrendingDown : TrendingUp}
              label={isLoss ? "Net Loss" : "Net Profit"}
              value={formatPrice(Math.abs(summary.netProfit), currency)}
              tone={isLoss ? "loss" : "profit"} />
            <StatTile icon={Percent} label="Profit Margin"
              value={`${summary.margin.toFixed(1)}%`}
              tone={isLoss ? "loss" : "profit"} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* ── Income statement ── */}
            <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--canvas)] p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-bold text-[var(--text-1)]">Income Statement</h2>
              <div className="space-y-2.5 text-sm">
                <Line label="Revenue (collected)" value={formatPrice(summary.revenue, currency)} strong />
                <div className="my-2 border-t border-dashed border-[var(--border)]" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-3)]">Expenses</p>
                {summary.expensesByCategory.length === 0 ? (
                  <p className="py-1 text-xs text-[var(--text-3)]">No expenses recorded for this range.</p>
                ) : (
                  summary.expensesByCategory.map((e) => (
                    <Line key={e.category} label={catLabel(e.category)} value={`- ${formatPrice(e.amount, currency)}`} muted />
                  ))
                )}
                <Line label="Total Expenses" value={`- ${formatPrice(summary.expenses, currency)}`} strong />
                <div className="my-2 border-t-2 border-[var(--border)]" />
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-extrabold ${isLoss ? "text-red-600" : "text-emerald-600"}`}>
                    {isLoss ? "Net Loss" : "Net Profit"}
                  </span>
                  <span className={`text-base font-extrabold tabular-nums ${isLoss ? "text-red-600" : "text-emerald-600"}`}>
                    {isLoss ? "- " : ""}{formatPrice(Math.abs(summary.netProfit), currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-[var(--text-3)]">
                  <span>Profit margin</span>
                  <span className="tabular-nums">{summary.margin.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* ── Expense breakdown ── */}
            <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--canvas)] p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-bold text-[var(--text-1)]">Where the money went</h2>
              {summary.expensesByCategory.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center gap-2 text-center">
                  <Receipt className="h-8 w-8 text-[var(--text-3)]/50" />
                  <p className="text-xs text-[var(--text-3)]">Log expenses to see the breakdown.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {summary.expensesByCategory.map((e) => {
                    const pct = summary.expenses > 0 ? (e.amount / summary.expenses) * 100 : 0;
                    const Icon = catIcon(e.category);
                    return (
                      <div key={e.category}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5 font-semibold text-[var(--text-2)]">
                            <Icon className="h-3.5 w-3.5 text-[var(--accent)]" />
                            {catLabel(e.category)}
                          </span>
                          <span className="tabular-nums text-[var(--text-2)]">
                            {formatPrice(e.amount, currency)} · {pct.toFixed(0)}%
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-[var(--surface)]">
                          <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Revenue vs Expenses trend ── */}
          {summary.trend && summary.trend.length > 0 && (
            <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--canvas)] p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-bold text-[var(--text-1)]">Revenue vs Expenses</h2>
              <div className="-ml-2 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary.trend} margin={{ top: 5, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d: string) => d.slice(5)}
                      tick={{ fontSize: 10, fill: "var(--text-3)" }}
                      minTickGap={20}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis tick={{ fontSize: 10, fill: "var(--text-3)" }} axisLine={false} tickLine={false} width={48} />
                    <Tooltip
                      formatter={(v, name) => [
                        formatPrice(Number(v), currency),
                        name === "revenue" ? "Revenue" : "Expenses",
                      ]}
                      contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontSize: 12 }}
                    />
                    <Legend
                      iconType="circle"
                      wrapperStyle={{ fontSize: 11 }}
                      formatter={(value) => (value === "revenue" ? "Revenue" : "Expenses")}
                    />
                    <Bar dataKey="revenue" fill="#10B981" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="expense" fill="#F59E0B" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── All-restaurants breakdown table ── */}
          {scope === "all" && overall && (
            <div className="overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--canvas)] shadow-sm">
              <div className="border-b border-[var(--border-soft)] px-5 py-3.5">
                <h2 className="text-sm font-bold text-[var(--text-1)]">By restaurant</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border-soft)] text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-3)]">
                      <th className="px-5 py-2.5">Restaurant</th>
                      <th className="px-3 py-2.5 text-right">Revenue</th>
                      <th className="px-3 py-2.5 text-right">Expenses</th>
                      <th className="px-3 py-2.5 text-right">Net</th>
                      <th className="px-5 py-2.5 text-right">Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overall.restaurants.map((r) => {
                      const loss = r.netProfit < 0;
                      return (
                        <tr key={r.id} className="border-b border-[var(--border-soft)] last:border-0">
                          <td className="px-5 py-3 font-semibold text-[var(--text-1)]">
                            <span className="flex items-center gap-2">
                              <Building2 className="h-3.5 w-3.5 text-[var(--text-3)]" />
                              {r.name}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums text-[var(--text-2)]">{formatPrice(r.revenue, currency)}</td>
                          <td className="px-3 py-3 text-right tabular-nums text-[var(--text-2)]">{formatPrice(r.expenses, currency)}</td>
                          <td className={`px-3 py-3 text-right font-bold tabular-nums ${loss ? "text-red-600" : "text-emerald-600"}`}>
                            {loss ? "- " : ""}{formatPrice(Math.abs(r.netProfit), currency)}
                          </td>
                          <td className={`px-5 py-3 text-right tabular-nums ${loss ? "text-red-600" : "text-emerald-600"}`}>{r.margin.toFixed(1)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Expense management (single restaurant only) ── */}
          {scope === "single" && (
            <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--canvas)] p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-[var(--text-1)]">Expenses</h2>
                  <p className="text-xs text-[var(--text-3)]">Record what you spend. It feeds the P&amp;L above.</p>
                </div>
                <button
                  onClick={() => setShowAdd((v) => !v)}
                  className="flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-[var(--accent-hover)]"
                >
                  {showAdd ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {showAdd ? "Cancel" : "Add Expense"}
                </button>
              </div>

              {showAdd && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mb-4 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] p-4"
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-xs font-semibold text-[var(--text-2)]">
                      Category
                      <select
                        value={form.category}
                        onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                        className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] px-3 py-2 text-sm text-[var(--text-1)] focus:border-[var(--accent)] focus:outline-none"
                      >
                        {EXPENSE_CATEGORIES.map((c) => (
                          <option key={c} value={c}>{catLabel(c)}</option>
                        ))}
                      </select>
                    </label>
                    <label className="text-xs font-semibold text-[var(--text-2)]">
                      Amount ({currency})
                      <input
                        type="text"
                        inputMode="decimal"
                        value={form.amount}
                        onChange={(e) =>
                          // Digits + one decimal point only — no negatives, no letters.
                          setForm((f) => ({
                            ...f,
                            amount: e.target.value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1"),
                          }))
                        }
                        placeholder="0.00"
                        className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] px-3 py-2 text-sm text-[var(--text-1)] focus:border-[var(--accent)] focus:outline-none"
                      />
                    </label>
                    <label className="text-xs font-semibold text-[var(--text-2)]">
                      Date
                      <input
                        type="date"
                        value={form.date}
                        max={isoDay(new Date())}
                        onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                        className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] px-3 py-2 text-sm text-[var(--text-1)] focus:border-[var(--accent)] focus:outline-none"
                      />
                    </label>
                    <label className="text-xs font-semibold text-[var(--text-2)]">
                      Note (optional)
                      <input
                        type="text"
                        value={form.note}
                        maxLength={200}
                        onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                        placeholder="e.g. Vegetable supplier"
                        className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] px-3 py-2 text-sm text-[var(--text-1)] focus:border-[var(--accent)] focus:outline-none"
                      />
                    </label>
                  </div>
                  {formError && <p className="mt-2 text-xs text-red-500">{formError}</p>}
                  <button
                    onClick={addExpense}
                    disabled={saving}
                    className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Save Expense
                  </button>
                </motion.div>
              )}

              {expenses.length === 0 ? (
                <p className="py-6 text-center text-xs text-[var(--text-3)]">
                  No expenses in this range yet. Add rent, salaries, purchases and more to complete your P&amp;L.
                </p>
              ) : (
                <div className="divide-y divide-[var(--border-soft)]">
                  {expenses.map((e) => {
                    const Icon = catIcon(e.category);
                    return (
                      <div key={e.id} className="flex items-center gap-3 py-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-muted)]">
                          <Icon className="h-4 w-4 text-[var(--accent)]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[var(--text-1)]">
                            {catLabel(e.category)}
                            {e.note ? <span className="font-normal text-[var(--text-3)]"> · {e.note}</span> : null}
                          </p>
                          <p className="text-[11px] text-[var(--text-3)]">{e.incurredAt.slice(0, 10)}</p>
                        </div>
                        <span className="shrink-0 text-sm font-bold tabular-nums text-[var(--text-1)]">
                          {formatPrice(e.amount, currency)}
                        </span>
                        <button
                          onClick={() => deleteExpense(e.id)}
                          disabled={deletingId === e.id}
                          className="shrink-0 rounded-lg p-1.5 text-[var(--text-3)] transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                          title="Delete expense"
                        >
                          {deletingId === e.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ── small presentational bits ────────────────────────────────────────── */
function StatTile({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  sub?: string;
  tone: "neutral" | "profit" | "loss";
}) {
  const color =
    tone === "profit" ? "text-emerald-600" : tone === "loss" ? "text-red-600" : "text-[var(--text-1)]";
  const iconBg =
    tone === "profit" ? "bg-emerald-50 text-emerald-600" : tone === "loss" ? "bg-red-50 text-red-600" : "bg-[var(--accent-muted)] text-[var(--accent)]";
  return (
    <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--canvas)] p-4 shadow-sm">
      <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-xl ${iconBg}`}>
        <Icon className="h-4 w-4" strokeWidth={2} />
      </div>
      <p className={`text-lg font-extrabold tabular-nums leading-tight ${color}`}>{value}</p>
      <p className="mt-0.5 text-[11px] font-medium text-[var(--text-3)]">{label}</p>
      {sub && <p className="text-[10px] text-[var(--text-3)]">{sub}</p>}
    </div>
  );
}

function Line({ label, value, strong, muted }: { label: string; value: string; strong?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`${strong ? "font-bold text-[var(--text-1)]" : muted ? "text-[var(--text-2)]" : "text-[var(--text-2)]"}`}>{label}</span>
      <span className={`tabular-nums ${strong ? "font-bold text-[var(--text-1)]" : "text-[var(--text-2)]"}`}>{value}</span>
    </div>
  );
}
