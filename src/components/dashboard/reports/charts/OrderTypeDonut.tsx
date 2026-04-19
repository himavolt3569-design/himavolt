"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { formatPrice } from "@/lib/currency";
import { CHART_COLORS, ORDER_TYPE_LABELS } from "../utils";

interface Props {
  data: { type: string; count: number; amount: number }[];
  currency: string;
}

export default function OrderTypeDonut({ data, currency }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-xs text-[var(--text-3)]">
        No orders
      </div>
    );
  }

  const chartData = data.map((d) => ({
    name: ORDER_TYPE_LABELS[d.type] ?? d.type,
    value: d.amount,
    count: d.count,
  }));

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            innerRadius={40}
            outerRadius={70}
            dataKey="value"
            nameKey="name"
            paddingAngle={2}
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[(i + 2) % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "var(--canvas)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(val, _name, p) => {
              const n = Number(val ?? 0);
              const payload = (p as { payload?: { count: number; name: string } })
                .payload;
              return [
                `${formatPrice(n, currency)} · ${payload?.count ?? 0} orders`,
                payload?.name ?? "",
              ];
            }}
          />
          <Legend
            verticalAlign="bottom"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, color: "var(--text-2)" }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
