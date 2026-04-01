"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Activity,
  Users,
  Store,
  ShoppingBag,
  CreditCard,
  Truck,
  MessageCircle,
  ArrowUpRight,
  Zap,
  Menu,
  X,
  Lock,
  LogOut,
  Eye,
  EyeOff,
  AlertCircle,
  KeyRound,
  BedDouble,
  LayoutTemplate,
} from "lucide-react";
import Link from "next/link";
import MasterOverview from "@/components/admin/MasterOverview";
import AllOrdersTab from "@/components/admin/AllOrdersTab";
import AllRestaurantsTab from "@/components/admin/AllRestaurantsTab";
import AllUsersTab from "@/components/admin/AllUsersTab";
import AllChatsTab from "@/components/admin/AllChatsTab";
import AllPaymentsTab from "@/components/admin/AllPaymentsTab";
import AllDeliveriesTab from "@/components/admin/AllDeliveriesTab";
import AuditTab from "@/components/admin/AuditTab";
import AllBookingsTab from "@/components/admin/AllBookingsTab";
import FooterSettingsTab from "@/components/admin/FooterSettingsTab";

/* ═══════════════════════════════════════════════════════════════════
   Types & Constants
   ═══════════════════════════════════════════════════════════════════ */

type AdminTab =
  | "overview"
  | "orders"
  | "restaurants"
  | "users"
  | "chats"
  | "payments"
  | "deliveries"
  | "bookings"
  | "audit"
  | "footer-settings";

const TABS: { id: AdminTab; label: string; icon: typeof Activity; mobileLabel?: string }[] = [
  { id: "overview", label: "Overview", icon: Activity, mobileLabel: "Home" },
  { id: "orders", label: "All Orders", icon: ShoppingBag, mobileLabel: "Orders" },
  { id: "restaurants", label: "Restaurants", icon: Store, mobileLabel: "Restaurants" },
  { id: "users", label: "Users", icon: Users, mobileLabel: "Users" },
  { id: "chats", label: "Chats", icon: MessageCircle, mobileLabel: "Chats" },
  { id: "payments", label: "Payments", icon: CreditCard, mobileLabel: "Pay" },
  { id: "deliveries", label: "Deliveries", icon: Truck, mobileLabel: "Delivery" },
  { id: "audit", label: "Live Audit", icon: Zap, mobileLabel: "Audit" },
  { id: "bookings", label: "Hotel Bookings", icon: BedDouble, mobileLabel: "Bookings" },
  { id: "footer-settings", label: "Footer", icon: LayoutTemplate, mobileLabel: "Footer" },
];

/* ═══════════════════════════════════════════════════════════════════
   Login Gate Component
   ═══════════════════════════════════════════════════════════════════ */

function AdminLoginGate({ onSuccess }: { onSuccess: () => void }) {
  const [adminId, setAdminId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Invalid credentials");
        return;
      }

      onSuccess();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-[#EFF6FF] via-[#F5F8FF] to-[#EDF2FF] p-4">
      {/* Soft background blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-blue-100/70 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-indigo-100/60 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative w-full max-w-sm"
      >
        {/* Logo/Header */}
        <div className="mb-8 text-center">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-blue-500 to-indigo-500 shadow-lg shadow-blue-200/60"
          >
            <Shield className="h-8 w-8 text-white" />
          </motion.div>
          <h1 className="text-2xl font-bold text-[#1A2744]">Master Admin</h1>
          <p className="mt-1 text-sm text-slate-400">HimaVolt System Control Panel</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white/90 shadow-xl shadow-blue-100/40 backdrop-blur-sm">
            {/* Admin ID Field */}
            <div className="border-b border-slate-100 p-4">
              <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <KeyRound className="h-3.5 w-3.5" />
                Admin ID
              </label>
              <input
                type="text"
                value={adminId}
                onChange={(e) => setAdminId(e.target.value)}
                placeholder="Enter admin ID"
                required
                autoFocus
                autoComplete="off"
                className="w-full bg-transparent text-sm font-medium text-slate-800 placeholder:text-slate-300 focus:outline-none"
              />
            </div>

            {/* Password Field */}
            <div className="p-4">
              <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <Lock className="h-3.5 w-3.5" />
                Password
              </label>
              <div className="flex items-center gap-2">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  autoComplete="off"
                  className="flex-1 bg-transparent text-sm font-medium text-slate-800 placeholder:text-slate-300 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="text-slate-300 hover:text-slate-500 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 px-4 py-2.5 text-xs text-red-500"
              >
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !adminId || !password}
            className="w-full rounded-xl bg-linear-to-r from-blue-500 to-indigo-500 py-3 text-sm font-bold text-white shadow-md shadow-blue-200/60 transition-all hover:from-blue-600 hover:to-indigo-600 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Authenticating...
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <Lock className="h-4 w-4" />
                Access Admin Panel
              </div>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-[11px] text-slate-300">
          Authorized personnel only. All actions are logged.
        </p>
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Master Admin Page
   ═══════════════════════════════════════════════════════════════════ */

const ADMIN_TAB_KEY = "hh_admin_tab";

export default function MasterAdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState<AdminTab>("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSetTab = (t: AdminTab) => {
    setTab(t);
    localStorage.setItem(ADMIN_TAB_KEY, t);
  };

  // Check for existing admin session on mount
  useEffect(() => {
    const saved = localStorage.getItem(ADMIN_TAB_KEY) as AdminTab | null;
    if (saved) setTab(saved);
    fetch("/api/admin/verify")
      .then((res) => {
        if (res.ok) setAuthenticated(true);
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthenticated(false);
  };

  // Loading state
  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-[#EFF6FF] via-[#F5F8FF] to-[#EDF2FF]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
          <p className="text-sm text-slate-400">Verifying session...</p>
        </div>
      </div>
    );
  }

  // Login gate
  if (!authenticated) {
    return <AdminLoginGate onSuccess={() => setAuthenticated(true)} />;
  }

  // Authenticated — show dashboard
  return (
    <div className="min-h-screen bg-[#F5F8FF]">
      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-blue-100/80 bg-white/90 backdrop-blur-xl shadow-sm shadow-blue-50/60">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-blue-500 to-indigo-500 shadow-sm shadow-blue-200/50">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#1A2744]">Master Admin</h1>
              <p className="text-[11px] text-slate-400">HimaVolt System Control</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen((p) => !p)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 sm:hidden transition-colors"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <Link
              href="/dashboard"
              className="hidden rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 transition-all hover:bg-slate-100 sm:inline-flex sm:items-center sm:gap-1"
            >
              Dashboard <ArrowUpRight className="h-3 w-3" />
            </Link>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-400 transition-all hover:bg-red-100"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Desktop Tab Bar ────────────────────────────────────── */}
      <div className="sticky top-[57px] z-30 hidden border-b border-blue-100/80 bg-white/90 backdrop-blur-xl shadow-sm sm:block">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
          <div className="flex gap-0 overflow-x-auto scrollbar-none">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => handleSetTab(t.id)}
                className={`relative flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-medium transition-all ${
                  tab === t.id ? "text-blue-500" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
                {tab === t.id && (
                  <motion.div
                    layoutId="master-admin-tab"
                    className="absolute inset-x-0 -bottom-px h-0.5 bg-linear-to-r from-blue-500 to-indigo-500 rounded-full"
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Mobile Tab Menu (Dropdown) ─────────────────────────── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-b border-blue-100/80 bg-white/95 sm:hidden"
          >
            <div className="grid grid-cols-4 gap-1 p-3">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    handleSetTab(t.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex flex-col items-center gap-1 rounded-xl p-2.5 text-center transition-all ${
                    tab === t.id
                      ? "bg-blue-50 text-blue-500"
                      : "text-slate-400 hover:bg-slate-50"
                  }`}
                >
                  <t.icon className="h-5 w-5" />
                  <span className="text-[10px] font-medium">{t.mobileLabel || t.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Mobile Bottom Tab Bar ──────────────────────────────── */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-blue-100/80 bg-white/95 backdrop-blur-lg sm:hidden">
        <div className="flex items-center justify-around px-1 py-1">
          {TABS.slice(0, 5).map((t) => (
            <button
              key={t.id}
              onClick={() => handleSetTab(t.id)}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 transition-all ${
                tab === t.id ? "text-blue-500" : "text-slate-400"
              }`}
            >
              <t.icon className="h-4.5 w-4.5" />
              <span className="text-[9px] font-medium">{t.mobileLabel || t.label}</span>
            </button>
          ))}
          <button
            onClick={() => setMobileMenuOpen((p) => !p)}
            className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 transition-all ${
              TABS.slice(5).some((t) => t.id === tab) ? "text-blue-500" : "text-slate-400"
            }`}
          >
            <Menu className="h-4.5 w-4.5" />
            <span className="text-[9px] font-medium">More</span>
          </button>
        </div>
      </div>

      {/* ── Tab Content ────────────────────────────────────────── */}
      <main className="mx-auto max-w-[1400px] px-4 py-6 pb-24 sm:px-6 sm:pb-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {tab === "overview" && <MasterOverview onNavigate={(t) => handleSetTab(t as AdminTab)} />}
            {tab === "orders" && <AllOrdersTab />}
            {tab === "restaurants" && <AllRestaurantsTab />}
            {tab === "users" && <AllUsersTab />}
            {tab === "chats" && <AllChatsTab />}
            {tab === "payments" && <AllPaymentsTab />}
            {tab === "deliveries" && <AllDeliveriesTab />}
            {tab === "audit" && <AuditTab />}
            {tab === "bookings" && <AllBookingsTab />}
            {tab === "footer-settings" && <FooterSettingsTab />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
