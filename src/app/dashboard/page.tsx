"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  ClipboardList,
  UtensilsCrossed,
  QrCode,
  BarChart3,
  Mountain,
  X,
  Menu,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Users,
  ShoppingBag,
  Star,
  Bell,
  Search,
  Clock,
} from "lucide-react";
import Link from "next/link";
import LiveOrdersTab from "@/components/dashboard/LiveOrdersTab";
import QRCodesTab from "@/components/dashboard/QRCodesTab";
import MenuManagementTab from "@/components/dashboard/MenuManagementTab";
import ReportsTab from "@/components/dashboard/ReportsTab";
import { useLiveOrders } from "@/context/LiveOrdersContext";

type DashTab = "overview" | "orders" | "menu" | "qr" | "reports";

const NAV_ITEMS: {
  id: DashTab;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: string;
}[] = [
  { id: "overview", label: "Dashboard", icon: LayoutDashboard },
  { id: "orders", label: "Live Orders", icon: ClipboardList, badge: "live" },
  { id: "menu", label: "Menu Management", icon: UtensilsCrossed },
  { id: "qr", label: "Table QR Codes", icon: QrCode },
  { id: "reports", label: "Analytics", icon: BarChart3 },
];

function Sidebar({
  active,
  setActive,
  newOrderCount,
  onClose,
}: {
  active: DashTab;
  setActive: (t: DashTab) => void;
  newOrderCount: number;
  onClose?: () => void;
}) {
  return (
    <aside className="relative flex h-full w-full flex-col overflow-hidden text-white"
      style={{ background: "linear-gradient(165deg, #0A4D3C 0%, #0d3d30 45%, #1F2A2A 100%)" }}
    >
      {/* Decorative orbs */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/3 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 -left-16 h-48 w-48 rounded-full bg-[#FF9933]/5 blur-2xl" />

      {/* Logo row */}
      <div className="relative z-10 flex items-center justify-between px-6 py-7">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm ring-1 ring-white/10">
            <Mountain className="h-5 w-5 text-[#FF9933]" strokeWidth={2.5} />
          </div>
          <span className="text-[1.2rem] font-extrabold tracking-tight leading-none">
            Himal<span className="text-[#FF9933]">Hub</span>
          </span>
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 hover:bg-white/10 transition-colors lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Restaurant card */}
      <div className="relative z-10 mx-4 mb-5">
        <div className="flex items-center gap-3 rounded-2xl bg-white/[0.07] ring-1 ring-white/10 p-3.5">
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl">
            <img
              src="https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=100&q=80"
              alt="Cafe"
              className="h-full w-full object-cover opacity-90"
            />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">The Tech Cafe</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-[11px] font-medium text-white/55">Accepting Orders</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <Star className="h-3 w-3 fill-[#FF9933] text-[#FF9933]" />
            <span className="text-[11px] font-bold text-white/70">4.7</span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex-1 overflow-y-auto px-3 scrollbar-hide">
        <p className="mb-3 px-3 text-[9px] font-black uppercase tracking-[0.18em] text-white/30">
          Navigation
        </p>
        <div className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setActive(item.id); onClose?.(); }}
                className={`group relative flex w-full items-center gap-3.5 overflow-hidden rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                  isActive ? "text-white" : "text-white/55 hover:bg-white/6 hover:text-white"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-xl bg-[#FF9933] shadow-lg shadow-[#FF9933]/30"
                    transition={{ type: "spring", bounce: 0.15, duration: 0.55 }}
                  />
                )}
                <Icon className={`relative z-10 h-[18px] w-[18px] shrink-0 ${isActive ? "text-white" : "text-white/45 group-hover:text-white/80"}`} />
                <span className="relative z-10 flex-1 text-left">{item.label}</span>
                {item.badge === "live" && newOrderCount > 0 && (
                  <span className="relative z-10 flex h-5 min-w-5 items-center justify-center rounded-md bg-white/20 px-1 text-[10px] font-bold text-white backdrop-blur-sm">
                    {newOrderCount}
                  </span>
                )}
                {item.badge === "live" && newOrderCount === 0 && (
                  <span className="relative z-10 flex h-2 w-2 items-center justify-center">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Bottom actions */}
      <div className="relative z-10 space-y-2 px-4 pb-6 pt-4 border-t border-white/10">
        <Link
          href="/"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 py-2.5 text-[13px] font-bold text-white/70 transition-all hover:border-white/30 hover:bg-white/10 hover:text-white"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Switch to Customer View
        </Link>
      </div>
    </aside>
  );
}

/* ─── Metric card ──────────────────────────────────────────────────── */
interface MetricCardProps {
  label: string;
  value: string;
  delta: string;
  isPositive: boolean;
  icon: typeof TrendingUp;
  iconBg: string;
  iconColor: string;
  accentColor: string;
}

function MetricCard({ label, value, delta, isPositive, icon: Icon, iconBg, iconColor, accentColor }: MetricCardProps) {
  return (
    <div className={`relative overflow-hidden rounded-3xl bg-white border border-gray-100 p-6 shadow-[0_4px_24px_rgb(0,0,0,0.04)] transition-shadow hover:shadow-[0_8px_32px_rgb(0,0,0,0.07)]`}>
      {/* subtle corner glow */}
      <div className={`pointer-events-none absolute -top-6 -right-6 h-24 w-24 rounded-full ${iconBg} opacity-40 blur-2xl`} />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-5">
          <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${iconBg}`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
          <div className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold ${
            isPositive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
          }`}>
            {isPositive
              ? <TrendingUp className="h-3 w-3" />
              : <TrendingDown className="h-3 w-3" />}
            {delta}
          </div>
        </div>
        <p className="mb-1 text-[13px] font-semibold text-gray-500">{label}</p>
        <p className="text-[1.85rem] font-black tracking-tight text-[#1F2A2A] leading-none">{value}</p>
      </div>
    </div>
  );
}

/* ─── Overview tab ─────────────────────────────────────────────────── */
function OverviewTab({ setTab }: { setTab: (t: DashTab) => void }) {
  const metrics: MetricCardProps[] = [
    {
      label: "Today's Revenue",
      value: "Rs. 28,450",
      delta: "+12.5%",
      isPositive: true,
      icon: TrendingUp,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      accentColor: "#10b981",
    },
    {
      label: "Orders Today",
      value: "142",
      delta: "+8.2%",
      isPositive: true,
      icon: ShoppingBag,
      iconBg: "bg-orange-50",
      iconColor: "text-[#FF9933]",
      accentColor: "#FF9933",
    },
    {
      label: "Active Tables",
      value: "9 / 12",
      delta: "75% cap.",
      isPositive: true,
      icon: Users,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-500",
      accentColor: "#3b82f6",
    },
    {
      label: "Avg. Rating",
      value: "4.8 ★",
      delta: "+0.1",
      isPositive: true,
      icon: Star,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-500",
      accentColor: "#f59e0b",
    },
  ];

  const CHART_DATA = [
    { day: "Mon", pct: 40, rev: "18.4k" },
    { day: "Tue", pct: 55, rev: "23.8k" },
    { day: "Wed", pct: 30, rev: "16.2k" },
    { day: "Thu", pct: 65, rev: "31.5k" },
    { day: "Fri", pct: 80, rev: "38.9k" },
    { day: "Sat", pct: 95, rev: "46.2k" },
    { day: "Sun", pct: 78, rev: "41.6k" },
  ];

  const ACTIVITY = [
    { msg: "Order #005 delivered", sub: "Table 5 · Rs. 1,590", time: "2m", iconBg: "bg-emerald-100", iconText: "text-emerald-600", icon: ShoppingBag },
    { msg: "New order — Table 4", sub: "Rs. 960 · 3 items", time: "5m", iconBg: "bg-orange-100", iconText: "text-orange-600", icon: ClipboardList },
    { msg: "Table 12 needs service", sub: "Waitstaff requested", time: "18m", iconBg: "bg-blue-100", iconText: "text-blue-600", icon: Users },
    { msg: "Low stock alert", sub: "Tomato Soup running low", time: "30m", iconBg: "bg-rose-100", iconText: "text-rose-600", icon: Bell },
    { msg: "QR codes downloaded", sub: "Tables 1–12 printed", time: "1h", iconBg: "bg-purple-100", iconText: "text-purple-600", icon: QrCode },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Page heading */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-[#1F2A2A]">
            Dashboard Overview
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Good afternoon! Here's how <strong className="text-[#1F2A2A]">The Tech Cafe</strong> is performing today.
          </p>
        </div>
        <div className="flex gap-2.5">
          <button className="hidden sm:flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-600 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:bg-gray-50 transition-all active:scale-[0.97]">
            Download Report
          </button>
          <button
            onClick={() => setTab("menu")}
            className="flex items-center gap-2 rounded-xl bg-[#1F2A2A] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#1F2A2A]/20 hover:bg-[#2a3838] transition-all active:scale-[0.97]"
          >
            <UtensilsCrossed className="h-4 w-4" />
            Manage Menu
          </button>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, ease: "easeOut" }}
          >
            <MetricCard {...m} />
          </motion.div>
        ))}
      </div>

      {/* Body grid: chart 2/3 + activity feed 1/3 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue chart */}
        <div className="lg:col-span-2 rounded-3xl bg-white border border-gray-100 p-6 sm:p-8 shadow-[0_4px_24px_rgb(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-base font-bold text-[#1F2A2A]">Revenue Trend</h3>
              <p className="text-xs text-gray-400 mt-0.5">This week</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-600">
                <TrendingUp className="h-3.5 w-3.5" />
                +18% vs last week
              </span>
            </div>
          </div>
          {/* Bar chart */}
          <div className="flex items-end justify-between gap-2 sm:gap-3 h-[200px]">
            {CHART_DATA.map((d, i) => (
              <div key={d.day} className="group flex w-full flex-col items-center gap-2 h-full justify-end cursor-pointer">
                <span className="text-[11px] font-bold text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  {d.rev}
                </span>
                <div className="w-full h-full flex items-end">
                  <div className="relative w-full overflow-hidden rounded-t-xl bg-gray-100/80 h-full">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${d.pct}%` }}
                      transition={{ duration: 0.8, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute bottom-0 w-full rounded-t-xl bg-[#0A4D3C] group-hover:bg-[#FF9933] transition-colors duration-200"
                    />
                  </div>
                </div>
                <span className="text-[11px] font-bold text-gray-400 group-hover:text-[#1F2A2A] transition-colors">
                  {d.day}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Activity feed */}
        <div className="rounded-3xl bg-white border border-gray-100 p-6 sm:p-8 shadow-[0_4px_24px_rgb(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-bold text-[#1F2A2A]">Activity Feed</h3>
            <button className="rounded-lg bg-[#FF9933]/10 px-3 py-1.5 text-xs font-bold text-[#FF9933] hover:bg-[#FF9933]/20 transition-colors">
              View All
            </button>
          </div>
          <div className="space-y-5">
            {ACTIVITY.map((a, i) => {
              const Icon = a.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.06 }}
                  className="group flex items-start gap-3.5 cursor-pointer"
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition-transform group-hover:scale-105 group-hover:rotate-2 ${a.iconBg}`}>
                    <Icon className={`h-4.5 w-4.5 ${a.iconText}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-[#1F2A2A] leading-snug group-hover:text-[#FF9933] transition-colors truncate">
                        {a.msg}
                      </p>
                      <span className="shrink-0 text-[10px] font-bold text-gray-400">{a.time}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{a.sub}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick-action cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {[
          { label: "New Orders Waiting", value: "2", hint: "Require your attention", color: "#FF9933", bg: "bg-orange-50", border: "border-orange-100", tab: "orders" as DashTab },
          { label: "Active Menu Items", value: "18", hint: "Live on the menu", color: "#0A4D3C", bg: "bg-emerald-50", border: "border-emerald-100", tab: "menu" as DashTab },
          { label: "QR Codes Ready", value: "12 / 12", hint: "All tables configured", color: "#6366f1", bg: "bg-indigo-50", border: "border-indigo-100", tab: "qr" as DashTab },
        ].map((c, i) => (
          <motion.button
            key={c.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + i * 0.07 }}
            onClick={() => setTab(c.tab)}
            className={`text-left rounded-3xl bg-white border ${c.border} p-6 shadow-[0_4px_24px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_32px_rgb(0,0,0,0.08)] transition-all hover:-translate-y-0.5 active:scale-[0.98]`}
          >
            <p className="text-[2rem] font-black leading-none mb-2" style={{ color: c.color }}>
              {c.value}
            </p>
            <p className="text-sm font-bold text-[#1F2A2A]">{c.label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{c.hint}</p>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

/* ─── Root page ────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<DashTab>("overview");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { orders } = useLiveOrders();
  const newOrderCount = orders.filter((o) => o.status === "new").length;

  return (
    <div className="flex h-screen overflow-hidden bg-[#F7F8FA] font-sans selection:bg-[#FF9933]/20 selection:text-[#1F2A2A]">
      {/* Desktop sidebar */}
      <div className="hidden lg:block w-[268px] shrink-0 h-full shadow-[4px_0_40px_rgba(0,0,0,0.10)] z-20">
        <Sidebar active={activeTab} setActive={setActiveTab} newOrderCount={newOrderCount} />
      </div>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <>
            <motion.div
              key="bg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileSidebarOpen(false)}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            />
            <motion.div
              key="drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring" as const, damping: 26, stiffness: 210 }}
              className="fixed top-0 left-0 bottom-0 z-50 w-[268px] shadow-2xl lg:hidden"
            >
              <Sidebar
                active={activeTab}
                setActive={setActiveTab}
                newOrderCount={newOrderCount}
                onClose={() => setMobileSidebarOpen(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Right panel */}
      <div className="relative flex flex-1 flex-col overflow-hidden">
        {/* Glassmorphic topbar */}
        <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between border-b border-gray-200/60 bg-white/75 px-5 py-3.5 backdrop-blur-2xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="rounded-xl p-2 text-[#1F2A2A] hover:bg-gray-100 transition-colors active:scale-95 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2.5 rounded-full bg-gray-100 px-4 py-2 text-gray-500 transition-all hover:bg-gray-200 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#FF9933]/40">
              <Search className="h-3.5 w-3.5 shrink-0" />
              <input
                type="text"
                placeholder="Search orders, menu..."
                className="w-44 bg-transparent text-sm font-medium outline-none placeholder:text-gray-400 text-[#1F2A2A]"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live indicator */}
            <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-bold text-emerald-700">Live</span>
            </div>

            {/* Notification bell */}
            <button className="relative rounded-full p-2 text-gray-500 hover:bg-gray-100 transition-colors active:scale-95">
              <Bell className="h-5 w-5" />
              {newOrderCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white"
                >
                  {newOrderCount}
                </motion.span>
              )}
            </button>

            <div className="hidden sm:block h-7 w-px bg-gray-200" />

            {/* Customer view link */}
            <Link
              href="/"
              className="hidden sm:flex items-center gap-1.5 rounded-xl border border-gray-200 px-3.5 py-2 text-[13px] font-bold text-[#1F2A2A] hover:border-[#0A4D3C]/30 hover:text-[#0A4D3C] transition-all active:scale-95"
            >
              <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
              Customer View
            </Link>

            {/* Avatar */}
            <button className="h-9 w-9 overflow-hidden rounded-full border-2 border-gray-200 hover:border-[#FF9933] transition-all shrink-0">
              <img
                src="https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=100&q=80"
                alt="Avatar"
                className="h-full w-full object-cover"
              />
            </button>
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto px-5 lg:px-10 pt-24 pb-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              {activeTab === "overview" && <OverviewTab setTab={setActiveTab} />}
              {activeTab === "orders" && <LiveOrdersTab />}
              {activeTab === "menu" && <MenuManagementTab />}
              {activeTab === "qr" && <QRCodesTab />}
              {activeTab === "reports" && <ReportsTab />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
