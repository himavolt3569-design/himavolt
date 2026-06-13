"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  ShieldCheck,
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
  Eye,
  EyeOff,
  AlertCircle,
  KeyRound,
  BedDouble,
  LayoutTemplate,
  UserX,
  Image,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import MasterOverview from "@/components/admin/MasterOverview";

const AdminTabLoader = () => (
  <div className="flex min-h-[320px] items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
  </div>
);

const AllOrdersTab = dynamic(() => import("@/components/admin/AllOrdersTab"), {
  loading: AdminTabLoader,
  ssr: false,
});
const AllRestaurantsTab = dynamic(
  () => import("@/components/admin/AllRestaurantsTab"),
  { loading: AdminTabLoader, ssr: false },
);
const AllUsersTab = dynamic(() => import("@/components/admin/AllUsersTab"), {
  loading: AdminTabLoader,
  ssr: false,
});
const InactiveUsersTab = dynamic(
  () => import("@/components/admin/InactiveUsersTab"),
  { loading: AdminTabLoader, ssr: false },
);
const AllChatsTab = dynamic(() => import("@/components/admin/AllChatsTab"), {
  loading: AdminTabLoader,
  ssr: false,
});
const AllPaymentsTab = dynamic(
  () => import("@/components/admin/AllPaymentsTab"),
  { loading: AdminTabLoader, ssr: false },
);
const AllDeliveriesTab = dynamic(
  () => import("@/components/admin/AllDeliveriesTab"),
  { loading: AdminTabLoader, ssr: false },
);
const AuditTab = dynamic(() => import("@/components/admin/AuditTab"), {
  loading: AdminTabLoader,
  ssr: false,
});
const AllBookingsTab = dynamic(
  () => import("@/components/admin/AllBookingsTab"),
  { loading: AdminTabLoader, ssr: false },
);
const FooterSettingsTab = dynamic(
  () => import("@/components/admin/FooterSettingsTab"),
  { loading: AdminTabLoader, ssr: false },
);
const HeroSettingsTab = dynamic(
  () => import("@/components/admin/HeroSettingsTab"),
  { loading: AdminTabLoader, ssr: false },
);

/* ═══════════════════════════════════════════════════════════════════
   Types & Constants
   ═══════════════════════════════════════════════════════════════════ */

type AdminTab =
  | "overview"
  | "orders"
  | "restaurants"
  | "users"
  | "inactive-users"
  | "chats"
  | "payments"
  | "deliveries"
  | "bookings"
  | "audit"
  | "footer-settings"
  | "hero-settings";

const TABS: {
  id: AdminTab;
  label: string;
  icon: typeof Activity;
  mobileLabel?: string;
}[] = [
  { id: "overview", label: "Overview", icon: Activity, mobileLabel: "Home" },
  {
    id: "orders",
    label: "All Orders",
    icon: ShoppingBag,
    mobileLabel: "Orders",
  },
  {
    id: "restaurants",
    label: "Restaurants",
    icon: Store,
    mobileLabel: "Restaurants",
  },
  { id: "users", label: "Users", icon: Users, mobileLabel: "Users" },
  {
    id: "inactive-users",
    label: "Inactive Users",
    icon: UserX,
    mobileLabel: "Inactive",
  },
  { id: "chats", label: "Chats", icon: MessageCircle, mobileLabel: "Chats" },
  { id: "payments", label: "Payments", icon: CreditCard, mobileLabel: "Pay" },
  {
    id: "deliveries",
    label: "Deliveries",
    icon: Truck,
    mobileLabel: "Delivery",
  },
  { id: "audit", label: "Activity Log", icon: Zap, mobileLabel: "Activity" },
  {
    id: "bookings",
    label: "Hotel Bookings",
    icon: BedDouble,
    mobileLabel: "Bookings",
  },
  {
    id: "footer-settings",
    label: "Footer",
    icon: LayoutTemplate,
    mobileLabel: "Footer",
  },
  {
    id: "hero-settings",
    label: "Homepage Banner",
    icon: Image,
    mobileLabel: "Banner",
  },
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
  const [success, setSuccess] = useState(false);

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

      setSuccess(true);
      setTimeout(onSuccess, 1500);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-4 overflow-hidden relative">
      {/* ── Technical Background ── */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-500/[0.03] rounded-full blur-[120px] -mr-64 -mt-64" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-500/[0.03] rounded-full blur-[100px] -ml-32 -mb-32" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-[420px] z-10"
      >
        <div className="bg-white border border-slate-200 p-8 md:p-10 rounded-3xl shadow-[0_24px_48px_-16px_rgba(0,0,0,0.08)] relative overflow-hidden">

          {/* Top accent bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-transparent via-blue-500/20 to-transparent" />

          <AnimatePresence mode="wait">
            {success ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center text-center py-10"
              >
                <motion.div
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  className="h-20 w-20 rounded-full bg-slate-900 flex items-center justify-center mb-8 shadow-2xl"
                >
                  <ShieldCheck className="h-10 w-10 text-white" />
                </motion.div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">Signed in</h2>
                <p className="text-slate-500 text-sm">Taking you to the dashboard…</p>
              </motion.div>
            ) : (
              <div key="form">
                {/* Header */}
                <div className="mb-12 text-center">
                  <motion.div
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.7 }}
                    className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 shadow-xl"
                  >
                    <Shield className="h-8 w-8 text-white" />
                  </motion.div>
                  <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Admin sign in</h1>
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                    <span className="text-xs font-semibold text-slate-400 tracking-wide">HimaVolt Admin</span>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-600 ml-1">Admin ID</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <KeyRound className="h-4 w-4 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                      </div>
                      <input
                        type="text"
                        value={adminId}
                        onChange={(e) => { setAdminId(e.target.value); setError(""); }}
                        placeholder="Your admin ID"
                        required
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-600 ml-1">Password</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className="h-4 w-4 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setError(""); }}
                        placeholder="Your password"
                        required
                        className="w-full pl-11 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center text-slate-300 hover:text-slate-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-600"
                    >
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span className="text-sm font-medium">{error}</span>
                    </motion.div>
                  )}

                  <motion.button
                    type="submit"
                    disabled={loading || !adminId || !password}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-lg ${
                      loading || !adminId || !password
                        ? "bg-slate-100 text-slate-300 cursor-not-allowed"
                        : "bg-slate-900 text-white shadow-slate-900/10 hover:bg-slate-800"
                    }`}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        Sign in
                        <ArrowUpRight className="h-4 w-4" />
                      </>
                    )}
                  </motion.button>
                </form>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Link */}
        <div className="mt-10 text-center">
          <Link 
            href="/" 
            className="text-sm font-medium text-slate-400 hover:text-slate-900 transition-colors"
          >
            &larr; Back to website
          </Link>
        </div>
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
  // Restore the last-viewed tab from localStorage. Safe as a lazy initializer:
  // the tab-dependent UI isn't rendered until the async `checking` state
  // resolves, so there's no SSR/hydration mismatch on first paint.
  const [tab, setTab] = useState<AdminTab>(() => {
    if (typeof window === "undefined") return "overview";
    return (localStorage.getItem(ADMIN_TAB_KEY) as AdminTab | null) ?? "overview";
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSetTab = (t: AdminTab) => {
    setTab(t);
    localStorage.setItem(ADMIN_TAB_KEY, t);
  };

  // Check for an existing admin session on mount.
  useEffect(() => {
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

  if (!authenticated) {
    return <AdminLoginGate onSuccess={() => setAuthenticated(true)} />;
  }

  // Authenticated — show dashboard
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 selection:bg-blue-500/10">
      {/* ── High-Precision Global Header ────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-4 md:px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 shadow-lg shadow-slate-900/10">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900 leading-none">HimaVolt Admin</h1>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-emerald-500" />
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Live</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="hidden md:flex h-10 px-4 items-center gap-2 rounded-xl border border-slate-200 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all"
            >
              View Site <ArrowUpRight className="h-3 w-3 opacity-40" />
            </Link>

            <button
              onClick={handleLogout}
              className="h-10 px-5 rounded-xl bg-slate-100 text-slate-900 text-[10px] font-bold uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-[0.98]"
            >
              Sign Out
            </button>

            <button
              onClick={() => setMobileMenuOpen((p) => !p)}
              className="md:hidden h-10 w-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-500 border border-slate-200"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* ── Precision Ribbon Navigation (Desktop) ───────────────── */}
      <div className="sticky top-[73px] z-40 hidden md:block border-b border-slate-200 bg-white/60 backdrop-blur-lg">
        <div className="mx-auto max-w-[1600px] px-8 py-3">
          <div className="flex gap-1 overflow-x-auto scrollbar-none">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => handleSetTab(t.id)}
                className={`relative px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                  tab === t.id
                    ? "bg-slate-900 text-white shadow-md"
                    : "text-slate-400 hover:text-slate-700 hover:bg-slate-50"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Enterprise Mobile Overlay ─────────────────────────── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-md flex items-end sm:items-center justify-center p-4 sm:p-6"
            onClick={() => setMobileMenuOpen(false)}
          >
             <motion.div
               initial={{ y: 100 }}
               animate={{ y: 0 }}
               exit={{ y: 100 }}
               className="w-full max-w-lg bg-white rounded-[2.5rem] p-8 shadow-2xl overflow-hidden"
               onClick={(e) => e.stopPropagation()}
             >
                <div className="flex items-center justify-between mb-8">
                   <h2 className="text-xl font-black tracking-tight text-slate-900 uppercase">Menu</h2>
                   <button onClick={() => setMobileMenuOpen(false)} className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400">
                      <X className="h-5 w-5" />
                   </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                   {TABS.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => { handleSetTab(t.id); setMobileMenuOpen(false); }}
                        className={`flex items-center gap-3 p-4 rounded-2xl transition-all ${
                          tab === t.id ? "bg-slate-900 text-white" : "bg-slate-50 hover:bg-slate-100"
                        }`}
                      >
                         <t.icon className={`h-4 w-4 ${tab === t.id ? "text-white" : "text-slate-400"}`} />
                         <span className="text-[10px] font-bold uppercase tracking-widest">{t.label}</span>
                      </button>
                   ))}
                </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Command Canvas ────────────────────────────────── */}
      <main className="mx-auto max-w-[1600px] px-4 py-8 md:px-8 md:py-12 pb-24 md:pb-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {tab === "overview" && (
              <MasterOverview onNavigate={(t) => handleSetTab(t as AdminTab)} />
            )}
            <div className={`${tab === "overview" ? "hidden" : "block"}`}>
               <section className="rounded-3xl bg-white border border-slate-200 p-6 md:p-8 shadow-sm min-h-[600px]">
                  <header className="mb-8">
                     <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">HimaVolt Admin</span>
                     <h2 className="mt-1 text-2xl font-bold text-slate-900 tracking-tight">
                        {TABS.find(t => t.id === tab)?.label}
                     </h2>
                  </header>

                  <div className="grid gap-8">
                     {tab === "orders" && <AllOrdersTab />}
                     {tab === "restaurants" && <AllRestaurantsTab />}
                     {tab === "users" && <AllUsersTab />}
                     {tab === "inactive-users" && <InactiveUsersTab />}
                     {tab === "chats" && <AllChatsTab />}
                     {tab === "payments" && <AllPaymentsTab />}
                     {tab === "deliveries" && <AllDeliveriesTab />}
                     {tab === "audit" && <AuditTab />}
                     {tab === "bookings" && <AllBookingsTab />}
                     {tab === "footer-settings" && <FooterSettingsTab />}
                     {tab === "hero-settings" && <HeroSettingsTab />}
                  </div>
               </section>
            </div>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── Discrete Mobile Dock ───────────────────────────────── */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 md:hidden w-[90vw] max-w-[400px]">
         <div className="bg-white border border-slate-200 rounded-3xl p-1.5 flex items-center justify-around shadow-2xl">
            {TABS.slice(0, 4).map((t) => (
              <button
                key={t.id}
                onClick={() => handleSetTab(t.id)}
                className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-all ${
                  tab === t.id ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:bg-slate-50"
                }`}
              >
                <t.icon className="h-5 w-5" />
              </button>
            ))}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-900 border border-slate-100"
            >
              <Menu className="h-5 w-5" />
            </button>
         </div>
      </div>
    </div>
  );
}
