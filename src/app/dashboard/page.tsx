"use client";

import { useState, useRef, useEffect, useMemo } from "react";
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
  Store,
  UsersRound,
  ChevronDown,
  Settings,
  Plus,
  MapPin,
  MessageCircle,
  Receipt,
  Camera,
  ArrowUpRight,
  Sparkles,
  Activity,
  ChevronRight,
  CalendarDays,
  Zap,
  CircleDot,
  Wallet,
  Package,
  Tag,
  Image as ImageIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser, UserButton } from "@clerk/nextjs";
import LiveOrdersTab from "@/components/dashboard/LiveOrdersTab";
import QRCodesTab from "@/components/dashboard/QRCodesTab";
import MenuManagementTab from "@/components/dashboard/MenuManagementTab";
import ReportsTab from "@/components/dashboard/ReportsTab";
import StaffManagementTab from "@/components/dashboard/StaffManagementTab";
import ChatTab from "@/components/dashboard/ChatTab";
import BillingTab from "@/components/billing/BillingTab";
import StoryManager from "@/components/stories/StoryManager";
import PaymentQRTab from "@/components/dashboard/PaymentQRTab";
import PaymentSettingsTab from "@/components/dashboard/PaymentSettingsTab";
import TaxChargesTab from "@/components/dashboard/TaxChargesTab";
import StockTab from "@/components/dashboard/StockTab";
import OffersTab from "@/components/dashboard/OffersTab";
import HeroSlidesManager from "@/components/dashboard/HeroSlidesManager";
import { useLiveOrders } from "@/context/LiveOrdersContext";
import { useRestaurant } from "@/context/RestaurantContext";
import { getTypeLabel } from "@/lib/restaurant-types";

type DashTab =
  | "overview"
  | "orders"
  | "menu"
  | "qr"
  | "reports"
  | "staff"
  | "chat"
  | "billing"
  | "stories"
  | "payment-qr"
  | "payment-settings"
  | "tax-charges"
  | "stock"
  | "offers"
  | "hero-slides";

/* ─── Navigation groups for sidebar ───────────────────────────────── */
const NAV_MAIN: {
  id: DashTab;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: string;
}[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "orders", label: "Live Orders", icon: ClipboardList, badge: "live" },
  { id: "billing", label: "Billing", icon: Receipt },
  { id: "chat", label: "Chats", icon: MessageCircle },
  { id: "offers" as DashTab, label: "Offers", icon: Tag },
];

const NAV_MANAGE: typeof NAV_MAIN = [
  { id: "menu", label: "Menu", icon: UtensilsCrossed },
  { id: "staff", label: "Staff", icon: UsersRound },
  { id: "qr", label: "QR Codes", icon: QrCode },
  { id: "payment-qr", label: "Payment QR", icon: Wallet },
  { id: "payment-settings", label: "Payment Settings", icon: Settings },
  { id: "tax-charges" as DashTab, label: "Tax & Charges", icon: Receipt },
  { id: "stock" as DashTab, label: "Stock", icon: Package },
  { id: "hero-slides" as DashTab, label: "Hero Slides", icon: ImageIcon },
];

const NAV_MORE: typeof NAV_MAIN = [
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "stories", label: "Stories", icon: Camera },
];

const ALL_NAV = [...NAV_MAIN, ...NAV_MANAGE, ...NAV_MORE];

/* ─── Restaurant Switcher ──────────────────────────────────────────── */
function RestaurantSwitcher({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const { restaurants, selectedRestaurant, selectRestaurant } = useRestaurant();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const current = selectedRestaurant ?? restaurants[0];
  const otherRestaurants = restaurants.filter((r) => r.id !== current?.id);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  if (!current) return null;

  const handleSwitch = (id: string) => {
    selectRestaurant(id);
    setOpen(false);
  };

  return (
    <div className="relative mx-3 mb-4" ref={panelRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 rounded-xl bg-amber-50/60 p-3 transition-all duration-150 hover:bg-amber-100/50 ring-1 ring-amber-200/40 cursor-pointer"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50">
          <Store className="h-4 w-4 text-amber-500" />
        </div>
        <div className="min-w-0 flex-1 text-left">
          <p className="truncate text-[13px] font-semibold text-gray-800">
            {current.name}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <p className="text-[10px] text-gray-400">Active</p>
          </div>
        </div>
        <ChevronDown
          className={`h-3.5 w-3.5 text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl bg-white ring-1 ring-gray-200 overflow-hidden shadow-xl"
          >
            {/* Current */}
            <div className="p-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
                  <Store className="h-4.5 w-4.5 text-amber-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold text-gray-800">
                    {current.name}
                  </p>
                  <span className="text-[10px] text-gray-400">
                    {getTypeLabel(current.type)}
                  </span>
                </div>
                <span className="h-2 w-2 rounded-full bg-amber-400" />
              </div>
            </div>

            {/* Quick links */}
            <div className="px-1.5 py-1.5 border-b border-gray-100">
              {[
                { icon: UsersRound, label: "Manage Users" },
                { icon: Settings, label: "Settings" },
              ].map((item) => (
                <button
                  key={item.label}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-all"
                >
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                </button>
              ))}
            </div>

            {/* Other restaurants */}
            {otherRestaurants.length > 0 && (
              <div className="px-3 py-2.5 border-b border-gray-100">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                  Switch to
                </p>
                <div className="space-y-1">
                  {otherRestaurants.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => handleSwitch(r.id)}
                      className="flex w-full items-center gap-3 rounded-lg p-2 hover:bg-gray-50 transition-all"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100">
                        <Store className="h-3.5 w-3.5 text-gray-500" />
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <p className="truncate text-[12px] font-semibold text-gray-700">
                          {r.name}
                        </p>
                        {r.address && (
                          <span className="flex items-center gap-0.5 text-[10px] text-gray-400 truncate">
                            <MapPin className="h-2.5 w-2.5 shrink-0" />
                            {r.address}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom actions */}
            <div className="flex items-center p-2 gap-2">
              <Link
                href="/manage-restaurants"
                onClick={() => {
                  setOpen(false);
                  onNavigate?.();
                }}
                className="flex-1 text-center text-[12px] font-semibold text-amber-600 hover:text-amber-500 transition-colors py-2 rounded-lg hover:bg-amber-50"
              >
                Manage All
              </Link>
              <button
                onClick={() => {
                  setOpen(false);
                  onNavigate?.();
                  router.push("/manage-restaurants");
                }}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-amber-500 py-2 text-[12px] font-bold text-white hover:bg-amber-400 transition-all active:scale-[0.97]"
              >
                <Plus className="h-3 w-3" />
                New
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Sidebar ──────────────────────────────────────────────────────── */
function NavSection({
  label,
  items,
  active,
  setActive,
  newOrderCount,
  onClose,
}: {
  label: string;
  items: typeof NAV_MAIN;
  active: DashTab;
  setActive: (t: DashTab) => void;
  newOrderCount: number;
  onClose?: () => void;
}) {
  return (
    <div className="mb-3">
      <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">
        {label}
      </p>
      <div className="space-y-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActive(item.id);
                onClose?.();
              }}
              className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-150 cursor-pointer ${
                isActive
                  ? "bg-amber-100/80 text-black shadow-sm ring-1 ring-amber-200/60"
                  : "text-amber-800/60 hover:bg-amber-50 hover:text-black"
              }`}
            >
              {/* Left accent bar */}
              {isActive && (
                <motion.span
                  layoutId="sidebar-accent"
                  className="absolute left-0 top-1.5 bottom-1.5 w-0.75 rounded-full bg-amber-400"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                />
              )}
              <Icon
                className={`h-4 w-4 shrink-0 transition-colors ${isActive ? "text-amber-500" : ""}`}
              />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge === "live" && newOrderCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-md bg-rose-50 px-1.5 text-[10px] font-bold text-rose-500 ring-1 ring-rose-100">
                  {newOrderCount}
                </span>
              )}
              {item.badge === "live" && newOrderCount === 0 && (
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

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
    <aside className="flex h-full w-full flex-col bg-[#fffbeb] border-r border-amber-100">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 pt-6 pb-5">
        <Link href="/" className="group flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 shadow-sm">
            <Mountain className="h-4 w-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-[17px] font-bold tracking-tight text-gray-900">
            Himal<span className="text-amber-500">Hub</span>
          </span>
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-gray-100 transition-colors lg:hidden text-gray-500"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Restaurant switcher */}
      <RestaurantSwitcher onNavigate={onClose} />

      {/* Navigation sections */}
      <nav className="flex-1 overflow-y-auto px-3 pb-2 scrollbar-hide">
        <NavSection
          label="Main"
          items={NAV_MAIN}
          active={active}
          setActive={setActive}
          newOrderCount={newOrderCount}
          onClose={onClose}
        />
        <NavSection
          label="Manage"
          items={NAV_MANAGE}
          active={active}
          setActive={setActive}
          newOrderCount={newOrderCount}
          onClose={onClose}
        />
        <NavSection
          label="More"
          items={NAV_MORE}
          active={active}
          setActive={setActive}
          newOrderCount={newOrderCount}
          onClose={onClose}
        />
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4 pt-2">
        <div className="h-px w-full bg-amber-200/40 mb-3" />
        <Link
          href="/"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-100/50 py-2.5 text-[12px] font-medium text-amber-700/60 transition-all hover:bg-amber-200/50 hover:text-amber-800 ring-1 ring-amber-200/30 cursor-pointer"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Customer View
        </Link>
      </div>
    </aside>
  );
}

/* ─── Stat card (fresh strip-accent design) ────────────────────────── */
interface StatCardProps {
  label: string;
  value: string;
  sub: string;
  accent: string;
  icon: typeof TrendingUp;
}

function StatCard({ label, value, sub, accent, icon: Icon }: StatCardProps) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      className="relative rounded-2xl bg-white/80 backdrop-blur-sm ring-1 ring-amber-100/50 p-5 cursor-default overflow-hidden group"
    >
      {/* Colored top strip */}
      <div
        className="absolute top-0 inset-x-0 h-1 rounded-t-2xl"
        style={{ background: accent }}
      />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[12px] font-medium text-black/60 mb-1">
            {label}
          </p>
          <p className="text-2xl font-extrabold text-black tracking-tight">
            {value}
          </p>
          <p className="text-[11px] font-medium text-gray-500 mt-1">
            {sub}
          </p>
        </div>
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl transition-transform group-hover:scale-110"
          style={{ background: `${accent}12` }}
        >
          <Icon className="h-4.5 w-4.5" style={{ color: accent }} />
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Overview tab (complete bento-grid redesign) ──────────────────── */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
}

function OverviewTab({ setTab }: { setTab: (t: DashTab) => void }) {
  const { selectedRestaurant, restaurants } = useRestaurant();
  const { orders } = useLiveOrders();
  const current = selectedRestaurant ?? restaurants[0];
  const restaurantName = current?.name ?? "Your Restaurant";

  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  const todayOrders = useMemo(
    () => orders.filter((o) => new Date(o.createdAt).getTime() >= todayStart),
    [orders, todayStart],
  );

  const todayRevenue = useMemo(
    () =>
      todayOrders
        .filter((o) => o.status === "DELIVERED")
        .reduce((sum, o) => sum + (o.total ?? 0), 0),
    [todayOrders],
  );

  const pendingCount = orders.filter((o) => o.status === "PENDING").length;
  const menuItemCount = current?._count?.menuItems ?? 0;

  const stats: StatCardProps[] = [
    {
      label: "Revenue Today",
      value: `Rs. ${todayRevenue.toLocaleString()}`,
      sub: todayOrders.filter((o) => o.status === "DELIVERED").length
        ? `${todayOrders.filter((o) => o.status === "DELIVERED").length} delivered`
        : "No sales yet",
      accent: "#10B981",
      icon: TrendingUp,
    },
    {
      label: "Orders",
      value: String(todayOrders.length),
      sub: pendingCount > 0 ? `${pendingCount} pending` : "All clear",
      accent: "#F59E0B",
      icon: ShoppingBag,
    },
    {
      label: "Tables",
      value: String(current?.tableCount ?? 0),
      sub: `${current?.tableCount ?? 0} configured`,
      accent: "#6366F1",
      icon: Users,
    },
    {
      label: "Rating",
      value: current?.rating ? `${current.rating} ★` : "N/A",
      sub: current?.rating ? "From reviews" : "No reviews yet",
      accent: "#EF4444",
      icon: Star,
    },
  ];

  const STATUS_COLOR: Record<string, string> = {
    DELIVERED: "#10B981",
    PENDING: "#F59E0B",
    ACCEPTED: "#3B82F6",
    PREPARING: "#F97316",
    READY: "#8B5CF6",
    CANCELLED: "#EF4444",
    REJECTED: "#EF4444",
  };

  function timeAgo(date: string) {
    const diff = Math.max(0, Date.now() - new Date(date).getTime());
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  const recentOrders = useMemo(
    () =>
      [...orders]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, 6),
    [orders],
  );

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10">
      {/* ── Welcome banner ────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl p-6 sm:p-8"
        style={{
          background:
            "linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fde68a 100%)",
        }}
      >
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-amber-600" />
              <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">
                {dateStr}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-black mb-1">
              {getGreeting()}, welcome back!
            </h1>
            <p className="text-sm text-gray-600">
              Here&apos;s how{" "}
              <span className="text-amber-800 font-semibold">
                {restaurantName}
              </span>{" "}
              is performing today.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setTab("menu")}
              className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-amber-500 transition-all active:scale-[0.97]"
            >
              <UtensilsCrossed className="h-3.5 w-3.5" />
              Manage Menu
            </button>
          </div>
        </div>
        {/* Decorative dots grid */}
        <div
          className="absolute top-0 right-0 w-48 h-48 opacity-[0.15]"
          style={{
            backgroundImage:
              "radial-gradient(circle, #d97706 1px, transparent 1px)",
            backgroundSize: "16px 16px",
          }}
        />
      </motion.div>

      {/* ── Stat cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <StatCard {...s} />
          </motion.div>
        ))}
      </div>

      {/* ── Body grid ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Revenue chart area — 3 cols */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="lg:col-span-3 rounded-2xl bg-white/80 ring-1 ring-amber-100/40 p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-[15px] font-bold text-black">
                Revenue Trend
              </h3>
              <p className="text-[11px] text-gray-500 mt-0.5">
                This week&apos;s performance
              </p>
            </div>
            <span className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-[12px] font-bold text-emerald-600">
              <TrendingUp className="h-3 w-3" />
              Rs. {todayRevenue.toLocaleString()}
            </span>
          </div>

          {/* Bar chart */}
          <div className="flex items-end justify-between gap-2 h-40 mb-3">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => {
              const heights = [40, 60, 45, 75, 65, 85, 30];
              const isToday = i === new Date().getDay() - 1;
              return (
                <div
                  key={day}
                  className="flex-1 flex flex-col items-center gap-2"
                >
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${heights[i]}%` }}
                    transition={{
                      delay: 0.3 + i * 0.06,
                      duration: 0.4,
                      ease: "easeOut",
                    }}
                    className={`w-full rounded-md transition-colors ${
                      isToday ? "bg-amber-400" : "bg-gray-100 hover:bg-gray-200"
                    }`}
                  />
                  <span
                    className={`text-[10px] font-semibold ${isToday ? "text-amber-500" : "text-gray-400"}`}
                  >
                    {day}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-gray-300 text-center">
            Estimated weekly pattern · Real analytics coming soon
          </p>
        </motion.div>

        {/* Activity timeline — 2 cols */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 rounded-2xl bg-white/80 ring-1 ring-amber-100/40 p-6"
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-[15px] font-bold text-black">Activity</h3>
            <button
              onClick={() => setTab("orders")}
              className="text-[12px] font-semibold text-amber-500 hover:text-amber-600 transition-colors"
            >
              View all
            </button>
          </div>

          {recentOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-300">
              <Activity className="h-8 w-8 mb-2" />
              <p className="text-sm">No orders yet</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {recentOrders.map((order, i) => {
                const color = STATUS_COLOR[order.status] ?? "#9CA3AF";
                return (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.35 + i * 0.04 }}
                    className="flex items-start gap-3 group"
                  >
                    {/* Timeline dot */}
                    <div className="flex flex-col items-center pt-1">
                      <div
                        className="h-2.5 w-2.5 rounded-full ring-2 ring-white"
                        style={{ background: color }}
                      />
                      {i < recentOrders.length - 1 && (
                        <div className="w-px flex-1 bg-gray-100 mt-1" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[13px] font-semibold text-black group-hover:text-amber-600 transition-colors truncate">
                          #{order.orderNo} ·{" "}
                          {order.status.charAt(0) +
                            order.status.slice(1).toLowerCase()}
                        </p>
                        <span className="shrink-0 text-[10px] text-gray-400">
                          {timeAgo(order.createdAt)}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                        {order.tableNo ? `Table ${order.tableNo} · ` : ""}Rs.{" "}
                        {(order.total ?? 0).toLocaleString()} ·{" "}
                        {order.items?.length ?? 0} items
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Quick actions ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: "Pending Orders",
            value: String(pendingCount),
            hint: pendingCount > 0 ? "Needs attention" : "All caught up",
            accent: "#F59E0B",
            tab: "orders" as DashTab,
            icon: ClipboardList,
          },
          {
            label: "Menu Items",
            value: String(menuItemCount),
            hint: menuItemCount > 0 ? "On your menu" : "Add items to start",
            accent: "#10B981",
            tab: "menu" as DashTab,
            icon: UtensilsCrossed,
          },
          {
            label: "Tables",
            value: String(current?.tableCount ?? 0),
            hint: "Generate QR codes",
            accent: "#6366F1",
            tab: "qr" as DashTab,
            icon: QrCode,
          },
        ].map((c, i) => (
          <motion.button
            key={c.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + i * 0.06 }}
            whileHover={{ y: -2 }}
            onClick={() => setTab(c.tab)}
            className="group text-left rounded-2xl bg-white/80 ring-1 ring-amber-100/40 p-5 transition-all hover:ring-amber-200/60 active:scale-[0.98] cursor-pointer"
          >
            <div className="flex items-center justify-between mb-3">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg"
                style={{ background: `${c.accent}15` }}
              >
                <c.icon className="h-4 w-4" style={{ color: c.accent }} />
              </div>
              <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all" />
            </div>
            <p
              className="text-2xl font-extrabold text-gray-900"
              style={{ color: c.accent }}
            >
              {c.value}
            </p>
            <p className="text-[13px] font-semibold text-black mt-1">
              {c.label}
            </p>
            <p className="text-[11px] text-gray-500">{c.hint}</p>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

/* ─── Root page ────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const [isHydrated, setIsHydrated] = useState(false);
  const [activeTab, setActiveTab] = useState<DashTab>("overview");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { orders, setRestaurantId } = useLiveOrders();
  const { restaurants, selectedRestaurant, selectRestaurant } = useRestaurant();
  const newOrderCount = orders.filter((o) => o.status === "PENDING").length;

  const activeLabel =
    ALL_NAV.find((n) => n.id === activeTab)?.label ?? "Overview";

  useEffect(() => {
    if (!selectedRestaurant && restaurants.length > 0) {
      selectRestaurant(restaurants[0].id);
    }
  }, [selectedRestaurant, restaurants, selectRestaurant]);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    setRestaurantId(selectedRestaurant?.id ?? null);
  }, [selectedRestaurant?.id, setRestaurantId]);

  if (!isHydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#fefcf6]">
        <span className="text-sm font-medium text-amber-700/70">
          Loading dashboard...
        </span>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#fefcf6] font-sans">
      {/* ── Desktop sidebar ───────────────────────────────────── */}
      <div className="hidden lg:block w-56 shrink-0 h-full">
        <Sidebar
          active={activeTab}
          setActive={setActiveTab}
          newOrderCount={newOrderCount}
        />
      </div>

      {/* ── Mobile sidebar overlay ────────────────────────────── */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileSidebarOpen(false)}
              className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            />
            <motion.div
              key="drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="fixed top-0 left-0 bottom-0 z-50 w-56 lg:hidden"
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

      {/* ── Main area ─────────────────────────────────────────── */}
      <div className="relative flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center justify-between border-b border-amber-100/60 bg-[#fffdf5] px-5 lg:px-8 py-3 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 transition-colors lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Breadcrumb */}
            <div className="hidden sm:flex items-center gap-1.5 text-[13px]">
              <span className="text-gray-400">Dashboard</span>
              <ChevronRight className="h-3 w-3 text-gray-300" />
              <span className="font-semibold text-gray-800">{activeLabel}</span>
            </div>

            {/* Search */}
            <div className="hidden md:flex items-center gap-2 ml-4 rounded-lg bg-gray-50 px-3.5 py-2 text-gray-400 ring-1 ring-gray-100 focus-within:ring-amber-300 focus-within:bg-white transition-all">
              <Search className="h-3.5 w-3.5 shrink-0" />
              <input
                type="text"
                placeholder="Search..."
                className="w-36 bg-transparent text-[13px] outline-none placeholder:text-gray-400 text-gray-800"
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Live pill */}
            <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-semibold text-emerald-700">
                Live
              </span>
            </div>

            {/* Bell */}
            <button className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100 transition-colors">
              <Bell className="h-4.5 w-4.5" />
              {newOrderCount > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500 text-[8px] font-bold text-white">
                  {newOrderCount}
                </span>
              )}
            </button>

            <div className="hidden sm:block h-6 w-px bg-gray-200" />

            {/* User */}
            <UserButton
              appearance={{
                elements: {
                  avatarBox:
                    "h-8 w-8 ring-2 ring-gray-100 hover:ring-amber-300 transition-all",
                },
              }}
            />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto px-5 lg:px-8 pt-6 pb-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              {activeTab === "overview" && (
                <OverviewTab setTab={setActiveTab} />
              )}
              {activeTab === "orders" && <LiveOrdersTab />}
              {activeTab === "billing" && selectedRestaurant && (
                <BillingTab restaurantId={selectedRestaurant.id} />
              )}
              {activeTab === "chat" && <ChatTab />}
              {activeTab === "menu" && <MenuManagementTab />}
              {activeTab === "staff" && <StaffManagementTab />}
              {activeTab === "qr" && <QRCodesTab />}
              {activeTab === "payment-qr" && <PaymentQRTab />}
              {activeTab === "payment-settings" && <PaymentSettingsTab />}
              {activeTab === "tax-charges" && <TaxChargesTab />}
              {activeTab === "stock" && <StockTab />}
              {activeTab === "offers" && <OffersTab />}
              {activeTab === "hero-slides" && <HeroSlidesManager />}
              {activeTab === "reports" && <ReportsTab />}
              {activeTab === "stories" && selectedRestaurant && (
                <StoryManager
                  restaurantId={selectedRestaurant.id}
                  restaurantName={selectedRestaurant.name}
                  restaurantAvatar={selectedRestaurant.imageUrl ?? undefined}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
