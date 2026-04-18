"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { formatPrice } from "@/lib/currency";

interface TrendPoint {
  bucket: string;
  revenue: number;
  orderCount: number;
}

interface Props {
  data: TrendPoint[];
  currency: string;
  granularity: "hour" | "day";
}

function formatBucket(bucket: string, granularity: "hour" | "day"): string {
  if (granularity === "hour") {
    const hh = bucket.slice(11, 13);
    return `${hh}:00`;
  }
  const d = new Date(bucket + "T00:00:00.000Z");
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function RevenueTrendChart({ data, currency, granularity }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-xs text-[var(--text-3)]">
        No revenue in this range
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
          <XAxis
            dataKey="bucket"
            tickFormatter={(v) => formatBucket(v, granularity)}
            tick={{ fontSize: 11, fill: "var(--text-3)" }}
            stroke="var(--border)"
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--text-3)" }}
            stroke="var(--border)"
          />
          <Tooltip
            contentStyle={{
              background: "var(--canvas)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelFormatter={(v) => formatBucket(String(v), granularity)}
            formatter={(val: number, name: string) =>
              name === "revenue" ? [formatPrice(val, currency), "Revenue"] : [val, "Orders"]
            }
          />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="var(--accent)"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
