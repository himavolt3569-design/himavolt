"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  User,
  Receipt,
  HelpCircle,
  Shield,
  LogOut,
  ChevronRight,
  Loader2,
  ShoppingBag,
  CalendarDays,
  Volume2,
  VolumeX,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api-client";

const SOUND_STORAGE_KEY = "hh_sound_enabled";

function getStoredSoundPref(): boolean {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem(SOUND_STORAGE_KEY);
  return stored !== "false";
}

interface QuickStats {
  totalOrders: number;
}

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export default function ProfilePage() {
  const { user, isSignedIn, isLoaded, signOut } = useAuth();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [stats, setStats] = useState<QuickStats>({ totalOrders: 0 });
  const [signingOut, setSigningOut] = useState(false);
  const [dbRole, setDbRole] = useState<string | null>(null);

  // Load sound preference from localStorage
  useEffect(() => {
    setSoundEnabled(getStoredSoundPref());
  }, []);

  // Fetch DB role
  useEffect(() => {
    if (!isSignedIn) return;
    apiFetch<{ role: string | null }>("/api/me")
      .then((data) => setDbRole(data.role))
      .catch(() => {});
  }, [isSignedIn]);

  // Fetch basic stats (total orders count)
  useEffect(() => {
    if (!isSignedIn) return;
    apiFetch<{ id: string }[]>("/api/orders?limit=100")
      .then((orders) => {
        setStats({ totalOrders: orders.length });
      })
      .catch(() => {
        /* ignore */
      });
  }, [isSignedIn]);

  const toggleSound = () => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    localStorage.setItem(SOUND_STORAGE_KEY, String(newValue));
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } catch {
      setSigningOut(false);
    }
  };

  // Not loaded yet
  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50/50">
        <Loader2 className="h-8 w-8 animate-spin text-saffron-flame" />
      </div>
    );
  }

  // Not signed in
  if (!isSignedIn || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50/50 p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-sm"
        >
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-saffron-flame/10 mb-5">
            <User className="h-10 w-10 text-saffron-flame" />
          </div>
          <h2 className="text-xl font-bold text-gompa-slate mb-2">
            Sign in to your account
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Sign in to view your profile, manage preferences, and see order
            history.
          </p>
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-2 rounded-xl bg-saffron-flame px-6 py-3 text-sm font-bold text-white hover:bg-saffron-flame/90 transition-colors"
          >
            Sign In
          </Link>
        </motion.div>
      </div>
    );
  }

  const displayName =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email?.split("@")[0] ??
    "User";
  const avatarUrl = user.user_metadata?.avatar_url ?? null;
  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString([], {
        month: "long",
        year: "numeric",
      })
    : "N/A";

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="mx-auto max-w-2xl px-4">
          <div className="flex h-14 items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-saffron-flame/10">
              <User className="h-5 w-5 text-saffron-flame" />
            </div>
            <h1 className="text-base font-bold text-gompa-slate">Profile</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-5 pb-20 space-y-5">
        {/* Profile Header Card */}
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.3 }}
          className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 shrink-0 rounded-full overflow-hidden ring-2 ring-saffron-flame/20 ring-offset-2">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={displayName}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-saffron-flame/10">
                  <User className="h-8 w-8 text-saffron-flame" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-gompa-slate truncate">
                {displayName}
              </h2>
              <p className="text-sm text-gray-500 truncate">
                {user.email || ""}
              </p>
              {dbRole && (
                <span className={`mt-1.5 inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                  dbRole === "OWNER"
                    ? "bg-amber-100 text-amber-700"
                    : dbRole === "ADMIN"
                    ? "bg-purple-100 text-purple-700"
                    : "bg-[#E23744]/10 text-[#E23744]"
                }`}>
                  {dbRole === "OWNER" ? "Restaurant Owner" : dbRole === "ADMIN" ? "Admin" : "Food Lover"}
                </span>
              )}
            </div>
          </div>
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          {...fadeUp}
          transition={{ delay: 0.05, duration: 0.3 }}
          className="grid grid-cols-2 gap-3"
        >
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-saffron-flame/10">
                <ShoppingBag className="h-4 w-4 text-saffron-flame" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-gompa-slate">
              {stats.totalOrders}
            </p>
            <p className="text-xs text-gray-400 font-medium mt-0.5">
              Total Orders
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-everest-pine/10">
                <CalendarDays className="h-4 w-4 text-everest-pine" />
              </div>
            </div>
            <p className="text-sm font-extrabold text-gompa-slate">
              {memberSince}
            </p>
            <p className="text-xs text-gray-400 font-medium mt-0.5">
              Member Since
            </p>
          </div>
        </motion.div>

        {/* Settings Section */}
        <motion.div
          {...fadeUp}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm"
        >
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Settings
            </h3>
          </div>

          {/* Sound Notifications Toggle */}
          <button
            onClick={toggleSound}
            className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors"
          >
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                soundEnabled
                  ? "bg-saffron-flame/10"
                  : "bg-gray-100"
              }`}
            >
              {soundEnabled ? (
                <Volume2 className="h-4 w-4 text-saffron-flame" />
              ) : (
                <VolumeX className="h-4 w-4 text-gray-400" />
              )}
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-gompa-slate">
                Sound Notifications
              </p>
              <p className="text-[11px] text-gray-400">
                {soundEnabled
                  ? "Play sounds for order updates"
                  : "Notifications are muted"}
              </p>
            </div>
            <div
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                soundEnabled ? "bg-saffron-flame" : "bg-gray-200"
              }`}
            >
              <motion.div
                animate={{ x: soundEnabled ? 20 : 2 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="h-5 w-5 rounded-full bg-white shadow-sm"
              />
            </div>
          </button>
        </motion.div>

        {/* Links Section */}
        <motion.div
          {...fadeUp}
          transition={{ delay: 0.15, duration: 0.3 }}
          className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm"
        >
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Links
            </h3>
          </div>

          {/* Order History */}
          <Link
            href="/orders"
            className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors border-b border-gray-50"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-saffron-flame/10">
              <Receipt className="h-4 w-4 text-saffron-flame" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gompa-slate">
                Order History
              </p>
              <p className="text-[11px] text-gray-400">
                View all your past orders
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-300" />
          </Link>

          {/* Help & Support */}
          <Link
            href="/contact"
            className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors border-b border-gray-50"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50">
              <HelpCircle className="h-4 w-4 text-blue-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gompa-slate">
                Help & Support
              </p>
              <p className="text-[11px] text-gray-400">
                Get help with your account or orders
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-300" />
          </Link>

          {/* Legal */}
          <Link
            href="/legal"
            className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100">
              <Shield className="h-4 w-4 text-gray-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gompa-slate">
                Legal
              </p>
              <p className="text-[11px] text-gray-400">
                Privacy policy & terms of service
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-300" />
          </Link>
        </motion.div>

        {/* Sign Out */}
        <motion.div
          {...fadeUp}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white py-4 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors shadow-sm disabled:opacity-50"
          >
            {signingOut ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
            {signingOut ? "Signing out..." : "Sign Out"}
          </button>
        </motion.div>

        {/* App version */}
        <motion.p
          {...fadeUp}
          transition={{ delay: 0.25, duration: 0.3 }}
          className="text-center text-[11px] text-gray-300 py-2"
        >
          HimaVolt v1.0
        </motion.p>
      </div>
    </div>
  );
}
