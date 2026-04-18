"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { formatPrice } from "@/lib/currency";

interface Bucket {
  hour: number;
  orderCount: number;
  revenue: number;
}

interface Props {
  data: Bucket[];
  currency: string;
}

export default function HourlyBarChart({ data, currency }: Props) {
  if (data.every((d) => d.orderCount === 0)) {
    return (
      <div className="flex h-56 items-center justify-center text-xs text-[var(--text-3)]">
        No orders yet today
      </div>
    );
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
          <XAxis
            dataKey="hour"
            tickFormatter={(v) => `${String(v).padStart(2, "0")}h`}
            tick={{ fontSize: 10, fill: "var(--text-3)" }}
            stroke="var(--border)"
            interval={1}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--text-3)" }}
            stroke="var(--border)"
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              background: "var(--canvas)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelFormatter={(v) => `${String(v).padStart(2, "0")}:00`}
            formatter={(val: number, name: string) =>
              name === "orderCount"
                ? [val, "Orders"]
                : [formatPrice(val, currency), "Revenue"]
            }
          />
          <Bar dataKey="orderCount" fill="var(--accent)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
