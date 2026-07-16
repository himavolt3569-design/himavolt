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
  Image as ImageIcon,
  Loader2,
  Cpu,
  Landmark,
  Zap,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import MasterOverview from "@/components/admin/MasterOverview";

const AdminTabLoader = () => (
  <div className="flex min-h-[400px] items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-100 border-t-[var(--accent)]" />
      <p className="text-sm font-semibold tracking-widest uppercase text-gray-400">Loading module</p>
    </div>
  </div>
);

const AllOrdersTab = dynamic(() => import("@/components/admin/AllOrdersTab"), { loading: AdminTabLoader, ssr: false });
const AllRestaurantsTab = dynamic(() => import("@/components/admin/AllRestaurantsTab"), { loading: AdminTabLoader, ssr: false });
const AllUsersTab = dynamic(() => import("@/components/admin/AllUsersTab"), { loading: AdminTabLoader, ssr: false });
const InactiveUsersTab = dynamic(() => import("@/components/admin/InactiveUsersTab"), { loading: AdminTabLoader, ssr: false });
const AllChatsTab = dynamic(() => import("@/components/admin/AllChatsTab"), { loading: AdminTabLoader, ssr: false });
const AllPaymentsTab = dynamic(() => import("@/components/admin/AllPaymentsTab"), { loading: AdminTabLoader, ssr: false });
const AllDeliveriesTab = dynamic(() => import("@/components/admin/AllDeliveriesTab"), { loading: AdminTabLoader, ssr: false });
const AuditTab = dynamic(() => import("@/components/admin/AuditTab"), { loading: AdminTabLoader, ssr: false });
const AllBookingsTab = dynamic(() => import("@/components/admin/AllBookingsTab"), { loading: AdminTabLoader, ssr: false });
const HardwareTab = dynamic(() => import("@/components/admin/HardwareTab"), { loading: AdminTabLoader, ssr: false });
const GatewaySettingsTab = dynamic(() => import("@/components/admin/GatewaySettingsTab"), { loading: AdminTabLoader, ssr: false });
const FooterSettingsTab = dynamic(() => import("@/components/admin/FooterSettingsTab"), { loading: AdminTabLoader, ssr: false });
const HeroSettingsTab = dynamic(() => import("@/components/admin/HeroSettingsTab"), { loading: AdminTabLoader, ssr: false });
const AllContactsTab = dynamic(() => import("@/components/admin/AllContactsTab"), { loading: AdminTabLoader, ssr: false });
const LandingSettingsTab = dynamic(() => import("@/components/admin/LandingSettingsTab"), { loading: AdminTabLoader, ssr: false });

/* ═══════════════════════════════════════════════════════════════════
   Types & Constants
   ═══════════════════════════════════════════════════════════════════ */

type AdminTab =
  | "overview"
  | "orders"
  | "bookings"
  | "restaurants"
  | "users"
  | "inactive-users"
  | "payments"
  | "deliveries"
  | "chats"
  | "hardware"
  | "gateway-settings"
  | "audit"
  | "footer-settings"
  | "hero-settings"
  | "landing-settings"
  | "contact-submissions";

const TABS: { id: AdminTab; label: string; icon: typeof Activity; category: string }[] = [
  { id: "overview", label: "Overview", icon: Activity, category: "Core" },
  { id: "orders", label: "Orders", icon: ShoppingBag, category: "Core" },
  { id: "bookings", label: "Stays & Bookings", icon: BedDouble, category: "Core" },

  { id: "restaurants", label: "Restaurants", icon: Store, category: "Network" },
  { id: "users", label: "Active Users", icon: Users, category: "Network" },
  { id: "inactive-users", label: "Inactive Users", icon: UserX, category: "Network" },

  { id: "payments", label: "Payments", icon: CreditCard, category: "Operations" },
  { id: "deliveries", label: "Deliveries", icon: Truck, category: "Operations" },
  { id: "chats", label: "Support", icon: MessageCircle, category: "Operations" },

  { id: "hardware", label: "Hardware Nodes", icon: Cpu, category: "System" },
  { id: "gateway-settings", label: "Payment Gateways", icon: Landmark, category: "System" },
  { id: "audit", label: "Audit Log", icon: Zap, category: "System" },
  { id: "hero-settings", label: "Homepage Banner", icon: ImageIcon, category: "System" },
  { id: "footer-settings", label: "Footer Layout", icon: LayoutTemplate, category: "System" },
  { id: "landing-settings", label: "Landing Pages", icon: LayoutTemplate, category: "System" },
  { id: "contact-submissions", label: "Contact Messages", icon: MessageCircle, category: "Operations" }
];

const CATEGORIES = Array.from(new Set(TABS.map((t) => t.category)));

const SUBTITLES: Partial<Record<AdminTab, string>> = {
  orders: "Every order across all restaurants and hotels",
  bookings: "Hotel stays and room reservations",
  restaurants: "Manage partner restaurants and hotels",
  users: "Active customers, owners, and staff",
  "inactive-users": "Dormant and never-activated accounts",
  payments: "Collected payments and settlements",
  deliveries: "Live and completed deliveries",
  chats: "Customer support conversations",
  hardware: "POS terminals, displays, and printers you sell",
  "gateway-settings": "Payment gateway credentials and webhooks",
  audit: "Every privileged action, logged",
  "hero-settings": "Homepage banner carousel",
  "footer-settings": "Public site footer content",
  "landing-settings": "Dynamic landing page content sections",
  "contact-submissions": "Messages from the contact page",
};

/* ═══════════════════════════════════════════════════════════════════
   Sidebar navigation (shared by desktop rail + mobile drawer)
   ═══════════════════════════════════════════════════════════════════ */

function SidebarNav({
  current,
  onSelect,
}: {
  current: AdminTab;
  onSelect: (t: AdminTab) => void;
}) {
  return (
    <div className="space-y-8">
      {CATEGORIES.map((category) => (
        <div key={category}>
          <h3 className="px-4 text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3">{category}</h3>
          <div className="space-y-1">
            {TABS.filter((t) => t.category === category).map((t) => (
              <button
                key={t.id}
                onClick={() => onSelect(t.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-semibold text-sm ${
                  current === t.id
                    ? "bg-[var(--accent)] text-white shadow-md shadow-[var(--accent)]/20"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <t.icon className={`h-5 w-5 ${current === t.id ? "text-white" : "text-gray-400"}`} />
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Login Gate
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
        setError(data.error || "Incorrect credentials");
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
    <div className="flex min-h-screen items-center justify-center bg-[#F7F9FC] p-4 relative overflow-hidden">
      {/* Soft aesthetic background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.05, 1], rotate: [0, 5, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[20%] -right-[10%] w-[70vw] h-[70vw] rounded-full bg-gradient-to-br from-[var(--accent)]/10 to-transparent blur-[120px]"
        />
        <motion.div
          animate={{ scale: [1, 1.1, 1], rotate: [0, -5, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-[20%] -left-[10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-tr from-blue-500/5 to-transparent blur-[100px]"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md z-10"
      >
        <div className="bg-white/80 backdrop-blur-3xl border border-white p-8 sm:p-12 rounded-[2.5rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.08)]">
          <AnimatePresence mode="wait">
            {success ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center text-center py-10"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", bounce: 0.6 }}
                  className="h-20 w-20 rounded-3xl bg-[var(--accent)] flex items-center justify-center shadow-[0_20px_40px_-10px_var(--accent)] mb-6"
                >
                  <ShieldCheck className="h-10 w-10 text-white" />
                </motion.div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome back</h2>
                <p className="text-gray-500 text-sm">Redirecting to your dashboard…</p>
              </motion.div>
            ) : (
              <div key="form">
                <div className="mb-10 text-center">
                  <div className="inline-flex items-center justify-center p-4 rounded-3xl bg-[var(--accent)]/10 text-[var(--accent)] mb-6">
                    <Shield className="h-8 w-8" />
                  </div>
                  <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Master Admin</h1>
                  <p className="text-sm font-medium text-gray-400 mt-2">Sign in to manage HimaVolt</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-2 ml-1">Admin ID</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <KeyRound className="h-5 w-5 text-gray-400 group-focus-within:text-[var(--accent)] transition-colors" />
                      </div>
                      <input
                        type="text"
                        value={adminId}
                        onChange={(e) => { setAdminId(e.target.value); setError(""); }}
                        placeholder="Enter your ID"
                        required
                        className="w-full pl-12 pr-4 py-4 bg-gray-50/50 border border-gray-200 rounded-2xl text-sm text-gray-900 font-medium focus:outline-none focus:border-[var(--accent)] focus:bg-white focus:ring-4 focus:ring-[var(--accent)]/10 transition-all placeholder:text-gray-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-2 ml-1">Password</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-[var(--accent)] transition-colors" />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setError(""); }}
                        placeholder="Enter your password"
                        required
                        className="w-full pl-12 pr-12 py-4 bg-gray-50/50 border border-gray-200 rounded-2xl text-sm text-gray-900 font-medium focus:outline-none focus:border-[var(--accent)] focus:bg-white focus:ring-4 focus:ring-[var(--accent)]/10 transition-all placeholder:text-gray-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors bg-white rounded-xl shadow-sm border border-gray-100"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-3 p-4 rounded-2xl bg-red-50 text-red-600 text-sm font-semibold"
                    >
                      <AlertCircle className="h-5 w-5 shrink-0" />
                      <span>{error}</span>
                    </motion.div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !adminId || !password}
                    className="w-full py-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] shadow-xl shadow-[var(--accent)]/20 active:scale-[0.98]"
                  >
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        Sign in <ArrowUpRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-8 text-center">
          <Link href="/" className="text-sm font-semibold text-gray-400 hover:text-gray-700 transition-colors">
            &larr; Return to website
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Master Admin Dashboard
   ═══════════════════════════════════════════════════════════════════ */

const ADMIN_TAB_KEY = "hh_admin_tab";

export default function MasterAdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState<AdminTab>(() => {
    if (typeof window === "undefined") return "overview";
    return (localStorage.getItem(ADMIN_TAB_KEY) as AdminTab | null) ?? "overview";
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSetTab = (t: AdminTab) => {
    setTab(t);
    localStorage.setItem(ADMIN_TAB_KEY, t);
    setMobileMenuOpen(false);
  };

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
      <div className="flex min-h-screen items-center justify-center bg-[#F7F9FC]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-[var(--accent)]" />
      </div>
    );
  }

  if (!authenticated) {
    return <AdminLoginGate onSuccess={() => setAuthenticated(true)} />;
  }

  const active = TABS.find((t) => t.id === tab);

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-gray-900 flex overflow-hidden">
      {/* ── Bright sidebar ── */}
      <aside className="hidden lg:flex flex-col w-72 bg-white h-screen shrink-0 relative z-20 border-r border-gray-100 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <div className="p-8 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-[var(--accent)] rounded-2xl flex items-center justify-center shadow-lg shadow-[var(--accent)]/30">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900 leading-tight">HimaVolt</h1>
              <span className="text-xs font-semibold text-gray-400">Master Admin</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4 scrollbar-hide">
          <SidebarNav current={tab} onSelect={handleSetTab} />
        </div>

        <div className="p-6 space-y-2">
          <Link
            href="/"
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-all text-sm font-semibold"
          >
            <ArrowUpRight className="h-4 w-4" />
            View website
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-gray-50 hover:bg-red-50 text-gray-500 hover:text-red-600 transition-all text-sm font-semibold group"
          >
            <LogOut className="h-4 w-4 group-hover:scale-110 transition-transform" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 h-screen overflow-y-auto relative">
        {/* Mobile header */}
        <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-[var(--accent)] rounded-xl flex items-center justify-center">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-bold text-gray-900">HimaVolt Admin</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 bg-gray-50 rounded-xl text-gray-600"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 md:p-10 max-w-[1600px] mx-auto pb-24 lg:pb-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              {/* Every tab except the Overview (which has its own banner) gets a page header */}
              {tab !== "overview" && (
                <div className="mb-8">
                  <h2 className="text-3xl font-bold tracking-tight text-gray-900">{active?.label}</h2>
                  <p className="text-sm font-medium text-gray-500 mt-1">
                    {SUBTITLES[tab] ?? "Manage and monitor your operations"}
                  </p>
                </div>
              )}

              <div className="min-h-[70vh]">
                {tab === "overview" && <MasterOverview onNavigate={(t) => handleSetTab(t as AdminTab)} />}
                {tab === "orders" && <AllOrdersTab />}
                {tab === "restaurants" && <AllRestaurantsTab />}
                {tab === "users" && <AllUsersTab />}
                {tab === "inactive-users" && <InactiveUsersTab />}
                {tab === "chats" && <AllChatsTab />}
                {tab === "payments" && <AllPaymentsTab />}
                {tab === "deliveries" && <AllDeliveriesTab />}
                {tab === "audit" && <AuditTab />}
                {tab === "bookings" && <AllBookingsTab />}
                {tab === "hardware" && <HardwareTab />}
                { tab === "gateway-settings" && <GatewaySettingsTab /> }
                { tab === "footer-settings" && <FooterSettingsTab /> }
                { tab === "hero-settings" && <HeroSettingsTab /> }
                { tab === "landing-settings" && <LandingSettingsTab /> }
                { tab === "contact-submissions" && <AllContactsTab /> }
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* ── Mobile drawer ── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 z-40 bg-gray-900/40 backdrop-blur-sm lg:hidden"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.5 }}
              className="fixed inset-y-0 left-0 z-50 w-4/5 max-w-sm bg-white shadow-2xl flex flex-col lg:hidden"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 bg-[var(--accent)] rounded-xl flex items-center justify-center">
                    <Shield className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-lg font-bold text-gray-900">Menu</span>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="text-gray-400 hover:text-gray-900" aria-label="Close menu">
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto py-4 px-4">
                <SidebarNav current={tab} onSelect={handleSetTab} />
              </div>
              <div className="p-4 border-t border-gray-100">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gray-50 hover:bg-red-50 text-gray-500 hover:text-red-600 transition-all text-sm font-semibold"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
