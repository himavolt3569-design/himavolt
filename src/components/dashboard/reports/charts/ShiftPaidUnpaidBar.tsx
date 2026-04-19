"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { formatPrice } from "@/lib/currency";

interface Props {
  data: { label: string; paid: number; unpaid: number }[];
  currency: string;
}

export default function ShiftPaidUnpaidBar({ data, currency }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-xs text-[var(--text-3)]">
        No shift data
      </div>
    );
  }

  const height = Math.max(160, data.length * 36 + 48);

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 24, left: 16, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: "var(--text-3)" }}
            stroke="var(--border)"
          />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fontSize: 11, fill: "var(--text-2)" }}
            stroke="var(--border)"
            width={120}
          />
          <Tooltip
            contentStyle={{
              background: "var(--canvas)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(val, name) => [formatPrice(Number(val ?? 0), currency), name]}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="paid" name="Paid" stackId="s" fill="var(--accent)" radius={[0, 0, 0, 0]} />
          <Bar dataKey="unpaid" name="Unpaid" stackId="s" fill="#ef4444" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
