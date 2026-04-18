export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  ESEWA: "eSewa",
  KHALTI: "Khalti",
  BANK: "Bank Transfer",
  CASH: "Cash",
  COUNTER: "Manual Pay",
  DIRECT: "Fast Pay",
};

export const ORDER_TYPE_LABELS: Record<string, string> = {
  DINE_IN: "Dine-in",
  TAKEAWAY: "Takeaway",
  DELIVERY: "Delivery",
};

export const CHART_COLORS = [
  "#f59e0b",
  "#3b82f6",
  "#10b981",
  "#6366f1",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
];

export function formatDuration(mins: number): string {
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export function toYMD(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export type PresetKey =
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "thisMonth"
  | "lifetime";

export function presetRange(key: PresetKey): { from: string; to: string } {
  const now = new Date();
  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);

  if (key === "today") {
    return { from: toYMD(today), to: toYMD(today) };
  }
  if (key === "yesterday") {
    const y = new Date(today);
    y.setUTCDate(y.getUTCDate() - 1);
    return { from: toYMD(y), to: toYMD(y) };
  }
  if (key === "last7") {
    const from = new Date(today);
    from.setUTCDate(from.getUTCDate() - 6);
    return { from: toYMD(from), to: toYMD(today) };
  }
  if (key === "last30") {
    const from = new Date(today);
    from.setUTCDate(from.getUTCDate() - 29);
    return { from: toYMD(from), to: toYMD(today) };
  }
  if (key === "thisMonth") {
    const from = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
    return { from: toYMD(from), to: toYMD(today) };
  }
  // lifetime — use a far-past anchor; backend clamps on its side
  return { from: "2020-01-01", to: toYMD(today) };
}
