"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import { formatPrice } from "@/lib/currency";
import { CHART_COLORS } from "../utils";

interface Props {
  data: { staffId: string; name: string; orderCount: number; revenue: number }[];
  currency: string;
  onClick?: (staffId: string) => void;
}

export default function StaffLeaderboardBar({ data, currency, onClick }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-xs text-[var(--text-3)]">
        No attributed staff orders
      </div>
    );
  }

  const height = Math.max(180, data.length * 32 + 24);

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 40, left: 60, bottom: 5 }}
        >
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: "var(--text-3)" }}
            stroke="var(--border)"
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fill: "var(--text-2)" }}
            stroke="var(--border)"
            width={90}
          />
          <Tooltip
            contentStyle={{
              background: "var(--canvas)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(val: number, _name, p) => [
              `${formatPrice(val, currency)} · ${p.payload.orderCount} orders`,
              "Revenue",
            ]}
          />
          <Bar
            dataKey="revenue"
            radius={[0, 4, 4, 0]}
            onClick={(d) => onClick?.(d.staffId)}
            cursor={onClick ? "pointer" : "default"}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
