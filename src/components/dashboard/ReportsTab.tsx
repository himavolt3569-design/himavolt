"use client";

import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  Users,
  Star,
} from "lucide-react";

const WEEKLY_DATA = [
  { day: "Mon", orders: 32, revenue: 18400 },
  { day: "Tue", orders: 41, revenue: 23800 },
  { day: "Wed", orders: 28, revenue: 16200 },
  { day: "Thu", orders: 55, revenue: 31500 },
  { day: "Fri", orders: 67, revenue: 38900 },
  { day: "Sat", orders: 80, revenue: 46200 },
  { day: "Sun", orders: 72, revenue: 41600 },
];

const TOP_DISHES = [
  { name: "Rotini Delight", orders: 87, revenue: 50460, trend: "up" },
  { name: "Chicken Tikka Bowl", orders: 74, revenue: 38480, trend: "up" },
  { name: "Masala Chai", orders: 163, revenue: 13040, trend: "up" },
  { name: "Nepali Thali Set", orders: 58, revenue: 22040, trend: "down" },
  { name: "Chocolate Lava Cake", orders: 52, revenue: 16640, trend: "up" },
];

const maxRevenue = Math.max(...WEEKLY_DATA.map((d) => d.revenue));

export default function ReportsTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-[#1F2A2A]">Reports</h2>
        <p className="text-sm text-gray-400">
          Performance overview for this week
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Orders",
            value: "375",
            sub: "+18% vs last week",
            icon: ShoppingBag,
            color: "text-[#FF9933]",
            positive: true,
          },
          {
            label: "Total Revenue",
            value: "Rs. 2.16L",
            sub: "+22% vs last week",
            icon: TrendingUp,
            color: "text-[#0A4D3C]",
            positive: true,
          },
          {
            label: "New Customers",
            value: "48",
            sub: "+5% vs last week",
            icon: Users,
            color: "text-purple-500",
            positive: true,
          },
          {
            label: "Avg. Rating",
            value: "4.7 ★",
            sub: "-0.1 vs last week",
            icon: Star,
            color: "text-yellow-500",
            positive: false,
          },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <Icon className={`h-5 w-5 ${s.color} mb-3`} />
              <p className="text-[11px] font-medium text-gray-400 mb-0.5">
                {s.label}
              </p>
              <p className="text-lg font-extrabold text-[#1F2A2A]">{s.value}</p>
              <p
                className={`text-[11px] font-semibold mt-0.5 ${s.positive ? "text-green-500" : "text-red-400"}`}
              >
                {s.sub}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* Bar chart */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-bold text-[#1F2A2A] mb-5">
          Weekly Revenue
        </h3>
        <div className="flex items-end gap-2 h-40">
          {WEEKLY_DATA.map((d, i) => {
            const pct = (d.revenue / maxRevenue) * 100;
            return (
              <div
                key={d.day}
                className="flex flex-1 flex-col items-center gap-1.5"
              >
                <span className="text-[10px] font-semibold text-gray-400">
                  {(d.revenue / 1000).toFixed(0)}k
                </span>
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${pct}%` }}
                  transition={{
                    duration: 0.6,
                    delay: i * 0.07,
                    ease: "easeOut",
                  }}
                  className="w-full rounded-t-lg bg-[#0A4D3C] min-h-[4px] relative group cursor-pointer hover:bg-[#FF9933] transition-colors"
                  style={{ minHeight: 4 }}
                >
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-[#1F2A2A] text-white text-[10px] font-bold px-2 py-1 rounded-lg whitespace-nowrap z-10">
                    {d.orders} orders
                  </div>
                </motion.div>
                <span className="text-[10px] font-bold text-gray-400">
                  {d.day}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top dishes */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold text-[#1F2A2A] mb-4">
          Top Performing Dishes
        </h3>
        <div className="space-y-3">
          {TOP_DISHES.map((d, i) => (
            <motion.div
              key={d.name}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.07 }}
              className="flex items-center justify-between py-2 border-b border-gray-50 last:border-b-0"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-[10px] font-black text-gray-500">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-bold text-[#1F2A2A]">{d.name}</p>
                  <p className="text-[11px] text-gray-400">{d.orders} orders</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#1F2A2A]">
                  Rs. {d.revenue.toLocaleString()}
                </span>
                {d.trend === "up" ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-400" />
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Peak hours */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold text-[#1F2A2A] mb-4">Peak Hours</h3>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {[
            { time: "12–2 PM", load: 90, label: "Lunch Rush" },
            { time: "2–4 PM", load: 40, label: "Slow" },
            { time: "4–6 PM", load: 55, label: "Moderate" },
            { time: "6–8 PM", load: 85, label: "Dinner Peak" },
            { time: "8–10 PM", load: 70, label: "Busy" },
            { time: "10–11 PM", load: 30, label: "Winding" },
          ].map((h) => (
            <div
              key={h.time}
              className="flex flex-col items-center gap-1.5 text-center"
            >
              <div className="relative h-16 w-full rounded-xl overflow-hidden bg-gray-100">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${h.load}%` }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                  className="absolute bottom-0 left-0 right-0 rounded-xl"
                  style={{
                    backgroundColor:
                      h.load > 75
                        ? "#FF9933"
                        : h.load > 50
                          ? "#0A4D3C"
                          : "#d1fae5",
                  }}
                />
              </div>
              <span className="text-[10px] font-bold text-gray-500">
                {h.time}
              </span>
              <span className="text-[9px] text-gray-400">{h.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
