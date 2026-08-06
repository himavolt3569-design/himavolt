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
  UserX,
  Loader2,
  Cpu,
  Landmark,
  Zap,
  LogOut,
  Building2,
  Radio,
  UserCog,
  Package,
  Settings,
  Check,
  Smartphone,
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useQueryClient } from "@tanstack/react-query";
import MasterOverview from "@/components/admin/MasterOverview";
import type { BusinessLite } from "@/components/admin/AdminProductsTab";

const AdminTabLoader = () => (
  <div className="flex min-h-[400px] items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--border-soft)] border-t-[var(--accent)]" />
      <p className="text-sm font-semibold tracking-widest uppercase text-[var(--text-3)]">Loading module</p>
    </div>
  </div>
);

const AllOrdersTab = dynamic(() => import("@/components/admin/AllOrdersTab"), { loading: AdminTabLoader, ssr: false });
const AllRestaurantsTab = dynamic(() => import("@/components/admin/AllRestaurantsTab"), { loading: AdminTabLoader, ssr: false });
const AllUsersTab = dynamic(() => import("@/components/admin/AllUsersTab"), { loading: AdminTabLoader, ssr: false });
const AllStaffTab = dynamic(() => import("@/components/admin/AllStaffTab"), { loading: AdminTabLoader, ssr: false });
const LiveUsersTab = dynamic(() => import("@/components/admin/LiveUsersTab"), { loading: AdminTabLoader, ssr: false });
const AdminProductsTab = dynamic(() => import("@/components/admin/AdminProductsTab"), { loading: AdminTabLoader, ssr: false });
const UserDetailDrawer = dynamic(() => import("@/components/admin/UserDetailDrawer"), { ssr: false });
const InactiveUsersTab = dynamic(() => import("@/components/admin/InactiveUsersTab"), { loading: AdminTabLoader, ssr: false });
const AllChatsTab = dynamic(() => import("@/components/admin/AllChatsTab"), { loading: AdminTabLoader, ssr: false });
const AllPaymentsTab = dynamic(() => import("@/components/admin/AllPaymentsTab"), { loading: AdminTabLoader, ssr: false });
const AllDeliveriesTab = dynamic(() => import("@/components/admin/AllDeliveriesTab"), { loading: AdminTabLoader, ssr: false });
const AuditTab = dynamic(() => import("@/components/admin/AuditTab"), { loading: AdminTabLoader, ssr: false });
const AllBookingsTab = dynamic(() => import("@/components/admin/AllBookingsTab"), { loading: AdminTabLoader, ssr: false });
const HardwareTab = dynamic(() => import("@/components/admin/HardwareTab"), { loading: AdminTabLoader, ssr: false });
const GatewaySettingsTab = dynamic(() => import("@/components/admin/GatewaySettingsTab"), { loading: AdminTabLoader, ssr: false });
const BusinessInfoTab = dynamic(() => import("@/components/admin/BusinessInfoTab"), { loading: AdminTabLoader, ssr: false });
const AllContactsTab = dynamic(() => import("@/components/admin/AllContactsTab"), { loading: AdminTabLoader, ssr: false });

// Platform Management
const PlatformStaffTab = dynamic(() => import("@/components/admin/PlatformStaffTab"), { loading: AdminTabLoader, ssr: false });
const PlatformStaffAttendanceTab = dynamic(() => import("@/components/admin/PlatformStaffAttendanceTab"), { loading: AdminTabLoader, ssr: false });
const RolesTab = dynamic(() => import("@/components/admin/RolesTab"), { loading: AdminTabLoader, ssr: false });

/* ═══════════════════════════════════════════════════════════════════
   Types & Constants
   ═══════════════════════════════════════════════════════════════════ */

type AdminTab =
  | "overview"
  | "orders"
  | "bookings"
  | "products"
  | "restaurants"
  | "live"
  | "users"
  | "staff"
  | "inactive-users"
  | "payments"
  | "deliveries"
  | "chats"
  | "hardware"
  | "gateway-settings"
  | "audit"
  | "business-info"
  | "contact-submissions"
  | "platform-staff"
  | "platform-attendance"
  | "platform-roles";

const TABS: { id: AdminTab; label: string; icon: typeof Activity; category: string }[] = [
  { id: "overview", label: "Overview", icon: Activity, category: "Core" },
  { id: "orders", label: "Orders", icon: ShoppingBag, category: "Core" },
  { id: "bookings", label: "Stays & Bookings", icon: BedDouble, category: "Core" },
  { id: "products", label: "Add Products", icon: Package, category: "Core" },

  { id: "live", label: "Live Now", icon: Radio, category: "Network" },
  { id: "restaurants", label: "Restaurants", icon: Store, category: "Network" },
  { id: "users", label: "Active Users", icon: Users, category: "Network" },
  { id: "staff", label: "Staff", icon: UserCog, category: "Network" },
  { id: "inactive-users", label: "Inactive Users", icon: UserX, category: "Network" },

  { id: "payments", label: "Payments", icon: CreditCard, category: "Operations" },
  { id: "deliveries", label: "Deliveries", icon: Truck, category: "Operations" },
  { id: "chats", label: "Support", icon: MessageCircle, category: "Operations" },

  { id: "hardware", label: "Hardware Nodes", icon: Cpu, category: "System" },
  { id: "gateway-settings", label: "Payment Gateways", icon: Landmark, category: "System" },
  { id: "audit", label: "Audit Log", icon: Zap, category: "System" },
  { id: "business-info", label: "Business Info", icon: Building2, category: "System" },
  { id: "contact-submissions", label: "Contact Messages", icon: MessageCircle, category: "Operations" },

  { id: "platform-staff", label: "Platform Staff", icon: ShieldCheck, category: "Platform" },
  { id: "platform-attendance", label: "Staff Attendance", icon: Activity, category: "Platform" },
  { id: "platform-roles", label: "Platform Roles", icon: KeyRound, category: "Platform" },
];

const CATEGORIES = Array.from(new Set(TABS.map((t) => t.category)));

const SUBTITLES: Partial<Record<AdminTab, string>> = {
  orders: "Every order across all restaurants and hotels",
  bookings: "Hotel stays and room reservations",
  products: "Add menu items, rooms and hardware on behalf of any business",
  restaurants: "Manage partner restaurants and hotels",
  live: "Who is on the site right now, in real time",
  users: "Active customers, owners, and admins",
  staff: "Every team member across all businesses",
  "inactive-users": "Dormant and never-activated accounts",
  payments: "Collected payments and settlements",
  deliveries: "Live and completed deliveries",
  chats: "Customer support conversations",
  hardware: "POS terminals, displays, and printers you sell",
  "gateway-settings": "Payment gateway credentials and webhooks",
  audit: "Every privileged action, logged",
  "business-info": "Your public phone, email, name and opening hours",
  "contact-submissions": "Messages from the contact page",
  "platform-staff": "Manage platform-wide administrators and limit overrides",
  "platform-attendance": "Check platform staff attendance and manage leave",
  "platform-roles": "Define roles and granular permissions",
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
          <h3 className="px-4 text-[11px] font-bold uppercase tracking-widest text-[var(--text-3)] mb-3">{category}</h3>
          <div className="space-y-1">
            {TABS.filter((t) => t.category === category).map((t) => (
              <button
                key={t.id}
                onClick={() => onSelect(t.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-semibold text-sm ${
                  current === t.id
                    ? "bg-[var(--accent)] text-white shadow-md shadow-[var(--accent)]/20"
                    : "text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--surface-alt)]"
                }`}
              >
                <t.icon className={`h-5 w-5 ${current === t.id ? "text-white" : "text-[var(--text-3)]"}`} />
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
  const [mfaCode, setMfaCode] = useState("");
  const [requiresMfa, setRequiresMfa] = useState(false);
  const [mfaSetupQr, setMfaSetupQr] = useState<string | null>(null);
  const [mfaSecret, setMfaSecret] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const emailParam = params.get("email");
      const pwdParam = params.get("pwd");
      
      if (emailParam && pwdParam) {
        setAdminId(emailParam);
        setPassword(pwdParam);
        
        // Hide credentials from URL immediately
        window.history.replaceState({}, document.title, window.location.pathname);

        const autoLogin = async () => {
          setError("");
          setLoading(true);
          try {
            const res = await fetch("/api/admin/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ adminId: emailParam, password: pwdParam }),
            });
            const data = await res.json();
            
            if (!res.ok) {
              if (data.mfaRequired || data.mfaSetupRequired) {
                 setRequiresMfa(true);
                 if (data.mfaSetupRequired) {
                   setMfaSetupQr(data.qrCodeUrl);
                   setMfaSecret(data.secret);
                 }
              } else {
                 setError(data.error || "Incorrect credentials from QR link");
              }
              return;
            }
            
            if (data.mfaRequired || data.mfaSetupRequired) {
               setRequiresMfa(true);
               if (data.mfaSetupRequired) {
                 setMfaSetupQr(data.qrCodeUrl);
                 setMfaSecret(data.secret);
               }
               return;
            }

            setSuccess(true);
            setTimeout(onSuccess, 1500);
          } catch {
            setError("Network error auto-logging in.");
          } finally {
            setLoading(false);
          }
        };
        
        autoLogin();
      }
    }
  }, [onSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId, password, mfaCode: mfaCode || undefined }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.mfaRequired || data.mfaSetupRequired) {
           setRequiresMfa(true);
           if (data.mfaSetupRequired) {
             setMfaSetupQr(data.qrCodeUrl);
             setMfaSecret(data.secret);
           }
           setError("");
        } else {
           setError(data.error || "Incorrect credentials");
        }
        return;
      }
      
      if (data.mfaRequired || data.mfaSetupRequired) {
         setRequiresMfa(true);
         if (data.mfaSetupRequired) {
           setMfaSetupQr(data.qrCodeUrl);
           setMfaSecret(data.secret);
         }
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
        <div className="bg-[var(--surface)]/80 backdrop-blur-3xl border border-[var(--border-soft)] p-8 sm:p-12 rounded-[2.5rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.08)]">
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
                <h2 className="text-2xl font-bold text-[var(--text-1)] mb-2">Welcome back</h2>
                <p className="text-[var(--text-3)] text-sm">Redirecting to your dashboard…</p>
              </motion.div>
            ) : requiresMfa ? (
              <motion.div key="mfa" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                <div className="mb-6">
                  <div className="inline-flex items-center justify-center p-4 rounded-3xl bg-[var(--accent)]/10 text-[var(--accent)] mb-4">
                    <KeyRound className="h-8 w-8" />
                  </div>
                  <h2 className="text-2xl font-bold text-[var(--text-1)] mb-2">Two-Factor Auth</h2>
                  {mfaSetupQr ? (
                    <p className="text-sm font-medium text-[var(--text-3)] mb-4">Scan the QR code with your Authenticator app to setup MFA.</p>
                  ) : (
                    <p className="text-sm font-medium text-[var(--text-3)]">Enter the 6-digit code from your app.</p>
                  )}
                </div>

                {mfaSetupQr && (
                  <div className="flex flex-col items-center mb-6">
                    <img src={mfaSetupQr} alt="MFA QR Code" className="w-48 h-48 rounded-xl border border-[var(--border)] mb-2" />
                    <p className="text-xs text-[var(--text-3)] font-mono bg-gray-100 px-3 py-1 rounded-md">{mfaSecret}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <input
                    type="text"
                    value={mfaCode}
                    onChange={(e) => { setMfaCode(e.target.value); setError(""); }}
                    placeholder="000000"
                    maxLength={6}
                    required
                    className="w-full py-4 text-center tracking-[0.5em] font-mono text-xl bg-[var(--surface-alt)]/50 border border-[var(--border)] rounded-2xl text-[var(--text-1)] focus:outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10 transition-all"
                  />
                  {error && <p className="text-red-500 text-sm font-semibold">{error}</p>}
                  <button
                    type="submit"
                    disabled={loading || mfaCode.length < 6}
                    className="w-full py-4 rounded-2xl font-bold text-sm bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Verify Code"}
                  </button>
                  <button type="button" onClick={() => { setRequiresMfa(false); setMfaCode(""); }} className="text-xs text-[var(--text-3)] hover:text-[var(--text-2)] font-semibold mt-4">
                    Back to login
                  </button>
                </form>
              </motion.div>
            ) : (
              <div key="form">
                <div className="mb-10 text-center">
                  <div className="inline-flex items-center justify-center p-4 rounded-3xl bg-[var(--accent)]/10 text-[var(--accent)] mb-6">
                    <Shield className="h-8 w-8" />
                  </div>
                  <h1 className="text-3xl font-bold text-[var(--text-1)] tracking-tight">Master Admin</h1>
                  <p className="text-sm font-medium text-[var(--text-3)] mt-2">Sign in to manage HimaVolt</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-2)] mb-2 ml-1">Admin ID</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <KeyRound className="h-5 w-5 text-[var(--text-3)] group-focus-within:text-[var(--accent)] transition-colors" />
                      </div>
                      <input
                        type="text"
                        value={adminId}
                        onChange={(e) => { setAdminId(e.target.value); setError(""); }}
                        placeholder="Enter your ID"
                        required
                        className="w-full pl-12 pr-4 py-4 bg-[var(--surface-alt)]/50 border border-[var(--border)] rounded-2xl text-sm text-[var(--text-1)] font-medium focus:outline-none focus:border-[var(--accent)] focus:bg-[var(--surface)] focus:ring-4 focus:ring-[var(--accent)]/10 transition-all placeholder:text-[var(--text-3)]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-2)] mb-2 ml-1">Password</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-[var(--text-3)] group-focus-within:text-[var(--accent)] transition-colors" />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setError(""); }}
                        placeholder="Enter your password"
                        required
                        className="w-full pl-12 pr-12 py-4 bg-[var(--surface-alt)]/50 border border-[var(--border)] rounded-2xl text-sm text-[var(--text-1)] font-medium focus:outline-none focus:border-[var(--accent)] focus:bg-[var(--surface)] focus:ring-4 focus:ring-[var(--accent)]/10 transition-all placeholder:text-[var(--text-3)]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors bg-[var(--surface)] rounded-xl shadow-sm border border-[var(--border-soft)]"
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
          <Link href="/" className="text-sm font-semibold text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors">
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
const BOTTOM_NAV_KEY = "hh_admin_bottom_nav";
const DEFAULT_BOTTOM_NAV: AdminTab[] = ["overview", "orders", "staff", "payments", "chats"];

export default function MasterAdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState<AdminTab>(() => {
    if (typeof window === "undefined") return "overview";
    const stored = localStorage.getItem(ADMIN_TAB_KEY) as AdminTab | null;
    // Guard against ids that no longer exist (e.g. the retired "footer-settings"),
    // which would otherwise render a blank panel.
    return stored && TABS.some((t) => t.id === stored) ? stored : "overview";
  });

  const [bottomNav, setBottomNav] = useState<AdminTab[]>(() => {
    if (typeof window === "undefined") return DEFAULT_BOTTOM_NAV;
    try {
      const stored = localStorage.getItem(BOTTOM_NAV_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as AdminTab[];
        if (Array.isArray(parsed) && parsed.every(id => TABS.some(t => t.id === id))) {
          return parsed;
        }
      }
    } catch(e) {}
    return DEFAULT_BOTTOM_NAV;
  });

  const [customizeNavOpen, setCustomizeNavOpen] = useState(false);
  const [tempNav, setTempNav] = useState<AdminTab[]>([]);

  const openCustomizeNav = () => {
    setTempNav(bottomNav);
    setCustomizeNavOpen(true);
    setMobileMenuOpen(false);
  };
  
  const handleToggleTempNav = (id: AdminTab) => {
    if (tempNav.includes(id)) {
      setTempNav(tempNav.filter(x => x !== id));
    } else {
      if (tempNav.length >= 5) return;
      setTempNav([...tempNav, id]);
    }
  };

  const saveBottomNav = () => {
    setBottomNav(tempNav);
    localStorage.setItem(BOTTOM_NAV_KEY, JSON.stringify(tempNav));
    setCustomizeNavOpen(false);
  };

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [drawerUserId, setDrawerUserId] = useState<string | null>(null);
  const [productsPreselect, setProductsPreselect] = useState<BusinessLite | null>(null);
  const queryClient = useQueryClient();

  const handleSetTab = (t: AdminTab) => {
    setTab(t);
    localStorage.setItem(ADMIN_TAB_KEY, t);
    setMobileMenuOpen(false);
  };

  // Refresh the user/staff/live lists after an act-on-behalf change in the drawer.
  const refreshUserLists = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    queryClient.invalidateQueries({ queryKey: ["admin-staff"] });
    queryClient.invalidateQueries({ queryKey: ["admin-presence-live"] });
    queryClient.invalidateQueries({ queryKey: ["admin-inactive-users"] });
  };

  // Jump to the Products tab, optionally preselecting a business (from the
  // "Add product" shortcut on an owner in the user detail drawer).
  const openProducts = (business?: BusinessLite) => {
    setProductsPreselect(business ?? null);
    handleSetTab("products");
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
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--border)] border-t-[var(--accent)]" />
      </div>
    );
  }

  if (!authenticated) {
    return <AdminLoginGate onSuccess={() => setAuthenticated(true)} />;
  }

  const active = TABS.find((t) => t.id === tab);

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-[var(--text-1)] flex overflow-hidden">
      {/* ── Bright sidebar ── */}
      <aside className="hidden lg:flex flex-col w-72 bg-[var(--surface)] h-screen shrink-0 relative z-20 border-r border-[var(--border-soft)] shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <div className="p-8 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-[var(--accent)] rounded-2xl flex items-center justify-center shadow-lg shadow-[var(--accent)]/30">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[var(--text-1)] leading-tight">HimaVolt</h1>
              <span className="text-xs font-semibold text-[var(--text-3)]">Master Admin</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4 scrollbar-hide">
          <SidebarNav current={tab} onSelect={handleSetTab} />
        </div>

        <div className="p-6 space-y-2">
          <Link
            href="/"
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-[var(--surface-alt)] hover:bg-[var(--surface-alt)] text-[var(--text-3)] hover:text-[var(--text-1)] transition-all text-sm font-semibold"
          >
            <ArrowUpRight className="h-4 w-4" />
            View website
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-[var(--surface-alt)] hover:bg-red-50 text-[var(--text-3)] hover:text-red-600 transition-all text-sm font-semibold group"
          >
            <LogOut className="h-4 w-4 group-hover:scale-110 transition-transform" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 h-screen overflow-y-auto relative">
        {/* Mobile header */}
        <div className="lg:hidden sticky top-0 z-30 bg-[var(--surface)] border-b border-[var(--border-soft)] px-4 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-[var(--accent)] rounded-xl flex items-center justify-center">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-bold text-[var(--text-1)]">HimaVolt Admin</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 bg-[var(--surface-alt)] rounded-xl text-[var(--text-2)]"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 md:p-10 max-w-[1600px] mx-auto pb-32 lg:pb-10">
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
                  <h2 className="text-3xl font-bold tracking-tight text-[var(--text-1)]">{active?.label}</h2>
                  <p className="text-sm font-medium text-[var(--text-3)] mt-1">
                    {SUBTITLES[tab] ?? "Manage and monitor your operations"}
                  </p>
                </div>
              )}

              <div className="min-h-[70vh]">
                {tab === "overview" && <MasterOverview onNavigate={(t) => handleSetTab(t as AdminTab)} />}
                {tab === "orders" && <AllOrdersTab />}
                {tab === "products" && (
                  <AdminProductsTab
                    preselect={productsPreselect}
                  />
                )}
                {tab === "restaurants" && <AllRestaurantsTab />}
                {tab === "live" && <LiveUsersTab onOpenUser={setDrawerUserId} />}
                {tab === "users" && <AllUsersTab onOpenUser={setDrawerUserId} />}
                {tab === "staff" && <AllStaffTab onOpenUser={setDrawerUserId} />}
                {tab === "inactive-users" && <InactiveUsersTab />}
                {tab === "chats" && <AllChatsTab />}
                {tab === "payments" && <AllPaymentsTab />}
                {tab === "deliveries" && <AllDeliveriesTab />}
                {tab === "audit" && <AuditTab />}
                {tab === "bookings" && <AllBookingsTab />}
                { tab === "hardware" && <HardwareTab /> }
                { tab === "gateway-settings" && <GatewaySettingsTab /> }
                { tab === "business-info" && <BusinessInfoTab /> }
                { tab === "contact-submissions" && <AllContactsTab /> }
                { tab === "platform-staff" && <PlatformStaffTab /> }
                { tab === "platform-attendance" && <PlatformStaffAttendanceTab /> }
                { tab === "platform-roles" && <RolesTab /> }
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* ── User detail drawer (shared by Live, Users, Staff) ── */}
      <UserDetailDrawer
        userId={drawerUserId}
        open={!!drawerUserId}
        onClose={() => setDrawerUserId(null)}
        onChanged={refreshUserLists}
        onDeleted={() => {
          refreshUserLists();
          setDrawerUserId(null);
        }}
        onAddProduct={(business) => {
          setDrawerUserId(null);
          openProducts(business);
        }}
      />

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
              className="fixed inset-y-0 left-0 z-50 w-4/5 max-w-sm bg-[var(--surface)] shadow-2xl flex flex-col lg:hidden"
            >
              <div className="p-6 border-b border-[var(--border-soft)] flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 bg-[var(--accent)] rounded-xl flex items-center justify-center">
                    <Shield className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-lg font-bold text-[var(--text-1)]">Menu</span>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="text-[var(--text-3)] hover:text-[var(--text-1)]" aria-label="Close menu">
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto py-4 px-4">
                <SidebarNav current={tab} onSelect={handleSetTab} />
              </div>
              <div className="p-4 border-t border-[var(--border-soft)]">
                <button
                  onClick={openCustomizeNav}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-[var(--surface-alt)] hover:bg-emerald-50 text-[var(--text-3)] hover:text-emerald-600 transition-all text-sm font-semibold mb-2"
                >
                  <Settings className="h-4 w-4" />
                  Customize Nav
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-[var(--surface-alt)] hover:bg-red-50 text-[var(--text-3)] hover:text-red-600 transition-all text-sm font-semibold"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Mobile Bottom Navigation ── */}
      <nav className="lg:hidden fixed bottom-0 w-full bg-[var(--surface)] border-t border-[var(--border-soft)] z-30 pb-4 shadow-[0_-4px_24px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-around px-2 pt-2">
          {bottomNav.map(navId => {
            const t = TABS.find(x => x.id === navId);
            if (!t) return null;
            const Icon = t.icon;
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => handleSetTab(t.id)}
                className={`flex flex-col items-center justify-center p-2 min-w-[64px] rounded-xl transition-colors ${
                  isActive 
                    ? "text-[var(--accent)]" 
                    : "text-[var(--text-3)] hover:bg-[var(--surface-alt)] hover:text-[var(--text-1)]"
                }`}
              >
                <Icon className={`h-5 w-5 mb-1 ${isActive ? "drop-shadow-[0_2px_8px_var(--accent-hover)]" : ""}`} />
                <span className="text-[9px] font-bold tracking-wide truncate max-w-full px-1">{t.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── Customize Nav Modal ── */}
      <AnimatePresence>
        {customizeNavOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-0">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCustomizeNavOpen(false)}
              className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.5 }}
              className="relative w-full max-w-md bg-[var(--surface)] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden max-h-[85vh]"
            >
              <div className="p-6 border-b border-[var(--border-soft)] flex justify-between items-center sticky top-0 bg-[var(--surface)] z-10">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-[var(--text-1)]">Customize Nav</h3>
                    <p className="text-xs text-[var(--text-3)]">{tempNav.length} of 5 selected</p>
                  </div>
                </div>
                <button onClick={() => setCustomizeNavOpen(false)} className="p-2 text-[var(--text-3)] hover:text-[var(--text-1)] rounded-full hover:bg-[var(--surface-alt)]">
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto space-y-6 flex-1 pb-10">
                {CATEGORIES.map(category => {
                  const categoryTabs = TABS.filter(t => t.category === category);
                  if (!categoryTabs.length) return null;
                  
                  return (
                    <div key={category}>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-3)] mb-3">{category}</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {categoryTabs.map(t => {
                          const isSelected = tempNav.includes(t.id);
                          const isDisabled = !isSelected && tempNav.length >= 5;
                          const Icon = t.icon;
                          
                          return (
                            <button
                              key={t.id}
                              disabled={isDisabled}
                              onClick={() => handleToggleTempNav(t.id)}
                              className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                                isSelected 
                                  ? "border-[var(--accent)] bg-[var(--accent)]/5 shadow-sm" 
                                  : "border-[var(--border-soft)] hover:border-[var(--border)]"
                              } ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                            >
                              <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? "bg-[var(--accent)] text-white" : "bg-[var(--surface-alt)] text-[var(--text-2)]"}`}>
                                {isSelected ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                              </div>
                              <span className={`text-xs font-semibold truncate ${isSelected ? "text-[var(--text-1)]" : "text-[var(--text-2)]"}`}>{t.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="p-6 border-t border-[var(--border-soft)] bg-[var(--surface)] shrink-0">
                <button
                  onClick={saveBottomNav}
                  className="w-full py-4 rounded-2xl font-bold text-sm bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors shadow-lg shadow-[var(--accent)]/20 active:scale-[0.98]"
                >
                  Save Preferences
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
