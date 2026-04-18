"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { formatPrice } from "@/lib/currency";
import { CHART_COLORS, PAYMENT_METHOD_LABELS } from "../utils";

interface Props {
  data: { method: string; count: number; amount: number }[];
  currency: string;
}

export default function PaymentMethodDonut({ data, currency }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-xs text-[var(--text-3)]">
        No paid orders
      </div>
    );
  }

  const chartData = data.map((d) => ({
    name: PAYMENT_METHOD_LABELS[d.method] ?? d.method,
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
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "var(--canvas)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(val: number, _name, p) => [
              `${formatPrice(val, currency)} · ${p.payload.count} orders`,
              p.payload.name,
            ]}
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
