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
  LogOut,
  Eye,
  EyeOff,
  AlertCircle,
  KeyRound,
  BedDouble,
  LayoutTemplate,
  UserX,
  Image,
  Loader2,
  Sparkles,
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
  { id: "audit", label: "Live Audit", icon: Zap, mobileLabel: "Audit" },
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
    label: "Hero",
    icon: Image,
    mobileLabel: "Hero",
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
        <div className="bg-white border border-slate-200 p-8 md:p-12 rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.06)] relative overflow-hidden">
          
          {/* Top Status Bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-transparent via-blue-500/20 to-transparent" />

          <AnimatePresence mode="wait">
            {success ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, filter: "blur(10px)" }}
                animate={{ opacity: 1, filter: "blur(0px)" }}
                className="flex flex-col items-center text-center py-10"
              >
                <motion.div
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  className="h-20 w-20 rounded-full bg-slate-900 flex items-center justify-center mb-8 shadow-2xl"
                >
                  <ShieldCheck className="h-10 w-10 text-white" />
                </motion.div>
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-2">Verified</h2>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Master Node Sequence Initiated</p>
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
                  <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Master Access</h1>
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">HimaVolt Control Node</span>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Identity Node</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <KeyRound className="h-4 w-4 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                      </div>
                      <input
                        type="text"
                        value={adminId}
                        onChange={(e) => { setAdminId(e.target.value); setError(""); }}
                        placeholder="ADMIN-NODE-01"
                        required
                        className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-mono tracking-widest focus:outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:tracking-normal placeholder:font-sans placeholder:text-slate-300 uppercase"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Secure Key</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className="h-4 w-4 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setError(""); }}
                        placeholder="••••••••"
                        required
                        className="w-full pl-11 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-mono tracking-widest focus:outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-300"
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
                      className="flex items-center gap-3 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-500"
                    >
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span className="text-[10px] font-black uppercase tracking-wider">{error}</span>
                    </motion.div>
                  )}

                  <motion.button
                    type="submit"
                    disabled={loading || !adminId || !password}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className={`w-full py-4.5 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] transition-all flex items-center justify-center gap-3 shadow-xl ${
                      loading || !adminId || !password 
                        ? "bg-slate-100 text-slate-300 cursor-not-allowed" 
                        : "bg-slate-900 text-white shadow-slate-900/10"
                    }`}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        Authorize node
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
            className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-slate-900 transition-colors"
          >
            &larr; Exit Control Node
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
              <h1 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900 leading-none">Control Node</h1>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-emerald-500" />
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Alpha-HH-7</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="hidden md:flex h-10 px-4 items-center gap-2 rounded-xl border border-slate-200 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all"
            >
              Public <ArrowUpRight className="h-3 w-3 opacity-40" />
            </Link>

            <button
              onClick={handleLogout}
              className="h-10 px-5 rounded-xl bg-slate-100 text-slate-900 text-[10px] font-bold uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-[0.98]"
            >
              Terminate Session
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
                   <h2 className="text-xl font-black tracking-tight text-slate-900 uppercase">Directory</h2>
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
               <section className="rounded-[2rem] bg-white border border-slate-200 p-8 md:p-12 shadow-sm min-h-[600px]">
                  <header className="mb-10 flex items-center justify-between">
                     <div>
                        <div className="flex items-center gap-2 mb-2">
                           <div className="h-1.5 w-1.5 rounded-full bg-slate-900" />
                           <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-400">Node Cluster Active</span>
                        </div>
                        <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">
                           {TABS.find(t => t.id === tab)?.label}
                        </h2>
                     </div>
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
