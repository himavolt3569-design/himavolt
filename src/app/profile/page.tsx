"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Camera,
  Trash2,
  AlertTriangle,
  Mail,
  Phone,
  Edit2,
  X,
  Check,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
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
  const { user, isSignedIn, isLoaded, signOut, userRole } = useAuth();
  const { showToast } = useToast();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [stats, setStats] = useState<QuickStats>({ totalOrders: 0 });
  const [signingOut, setSigningOut] = useState(false);
  
  // Profile editing state
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Avatar state
  const [avatarUploading, setAvatarUploading] = useState(false);
  
  // Deletion state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Load sound preference from localStorage
  useEffect(() => {
    setSoundEnabled(getStoredSoundPref());
  }, []);

  // Sync initial values
  useEffect(() => {
    if (user) {
      setName(user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.name ?? "");
      setPhone(user.phone ?? "");
    }
  }, [user]);

  useEffect(() => {
    if (!isSignedIn) return;
    apiFetch<{ count: number }>("/api/me/orders/count")
      .then((data) => {
        setStats({ totalOrders: data.count ?? 0 });
      })
      .catch(() => {});
  }, [isSignedIn]);

  const toggleSound = () => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    localStorage.setItem(SOUND_STORAGE_KEY, String(newValue));
  };

  const handleUpdateProfile = async () => {
    setIsUpdating(true);
    try {
      await apiFetch("/api/me", {
        method: "PATCH",
        body: JSON.stringify({ name, phone }),
      });
      showToast("Profile updated", "success");
      setIsEditing(false);
      // We'd ideally refresh the auth context user here, but for now we'll assume it works
    } catch (err: any) {
      showToast(err.message || "Failed to update profile", "error");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarUploading(true);
    try {
      // 1. Get signed upload URL
      const { signedUrl, publicUrl } = await apiFetch<{ signedUrl: string, publicUrl: string }>("/api/upload", {
        method: "POST",
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          folder: "avatars"
        }),
      });

      // 2. Upload to Supabase directly
      const uploadRes = await fetch(signedUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      if (!uploadRes.ok) throw new Error("Upload failed");

      // 3. Update DB
      await apiFetch("/api/me", {
        method: "PATCH",
        body: JSON.stringify({ imageUrl: publicUrl }),
      });

      showToast("Avatar updated", "success");
      // Refresh to see change (auth context doesn't auto-sync DB imageUrl yet)
      window.location.reload();
    } catch (err: any) {
      showToast(err.message || "Failed to upload avatar", "error");
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") return;
    
    setIsDeleting(true);
    try {
      await apiFetch("/api/me", { method: "DELETE" });
      await signOut();
      showToast("Account deleted successfully", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to delete account", "error");
      setIsDeleting(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } catch {
      setSigningOut(false);
    }
  };

  if (!isLoaded) return null;

  if (!isSignedIn || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--canvas-sub)] p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-sm"
        >
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[var(--accent-muted)] mb-5">
            <User className="h-10 w-10 text-[var(--accent)]" />
          </div>
          <h2 className="text-xl font-bold text-[var(--text-1)] mb-2">
            Sign in to your account
          </h2>
          <p className="text-sm text-[var(--text-2)] mb-6">
            Sign in to view your profile, manage preferences, and see order
            history.
          </p>
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-bold text-white hover:bg-[var(--accent)]/90 transition-colors"
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
    user.name ??
    user.email?.split("@")[0] ??
    "User";
  const avatarUrl =
    user.imageUrl ||
    user.user_metadata?.avatar_url ||
    user.user_metadata?.picture ||
    null;
  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString([], {
        month: "long",
        year: "numeric",
      })
    : "N/A";

  return (
    <div className="min-h-screen bg-[var(--canvas-sub)]">
      <header className="sticky top-0 z-40 bg-[var(--canvas)] border-b border-[var(--border-soft)] shadow-sm">
        <div className="mx-auto max-w-2xl px-4">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-muted)]">
                <User className="h-5 w-5 text-[var(--accent)]" />
              </div>
              <h1 className="text-base font-bold text-[var(--text-1)]">
                Profile
              </h1>
            </div>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 rounded-lg hover:bg-[var(--surface)] text-[var(--text-2)] transition-colors"
              >
                <Edit2 className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(false)}
                className="p-2 rounded-lg hover:bg-[var(--surface)] text-[var(--text-2)] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-5 pb-24 space-y-6">
        {/* User Card */}
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.3 }}
          className="rounded-[2.5rem] border border-[var(--border)] bg-[var(--canvas)] p-8 shadow-sm relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <User className="h-32 w-32" />
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="relative group mb-6">
              <div className="h-28 w-28 rounded-full overflow-hidden ring-4 ring-[var(--accent-border)] ring-offset-4 bg-[var(--surface)] relative">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={displayName}
                    fill
                    className="object-cover"
                    sizes="112px"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[var(--accent-muted)] text-[var(--accent)]">
                    <User className="h-12 w-12" />
                  </div>
                )}
                {avatarUploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <Loader2 className="h-8 w-8 text-white animate-spin" />
                  </div>
                )}
              </div>

              <label className="absolute bottom-0 right-0 h-9 w-9 rounded-full bg-[var(--accent)] border-4 border-[var(--canvas)] flex items-center justify-center cursor-pointer shadow-lg hover:scale-110 active:scale-95 transition-all text-white">
                <Camera className="h-4 w-4" />
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  disabled={avatarUploading}
                />
              </label>
            </div>

            <div className="space-y-1">
              {isEditing ? (
                <div className="space-y-3 max-w-xs mx-auto">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your Name"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] px-4 py-2 text-center text-lg font-bold outline-none focus:border-[var(--accent)]"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleUpdateProfile}
                      disabled={isUpdating}
                      className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-[var(--accent)] py-2 text-xs font-bold text-white shadow-md"
                    >
                      {isUpdating ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Check className="h-3 w-3" />
                      )}
                      Save
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="flex-1 rounded-lg border border-[var(--border)] py-2 text-xs font-bold text-[var(--text-2)]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-black text-[var(--text-1)] tracking-tight">
                    {displayName}
                  </h2>
                  <div className="flex items-center justify-center gap-2 text-sm text-[var(--text-3)] font-medium">
                    <Mail className="h-3.5 w-3.5" />
                    {user.email}
                  </div>
                </>
              )}

              <div className="pt-3 flex items-center justify-center gap-3">
                {userRole && (
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${
                      userRole === "OWNER"
                        ? "bg-slate-900 text-white"
                        : userRole === "ADMIN"
                          ? "bg-purple-600 text-white"
                          : "bg-[var(--accent)] text-white"
                    }`}
                  >
                    {userRole === "OWNER"
                      ? "Restaurant Owner"
                      : userRole === "ADMIN"
                        ? "Admin"
                        : "Food Lover"}
                  </span>
                )}
                {user.phone && !isEditing && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider">
                    <Phone className="h-3 w-3" /> {user.phone}
                  </span>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          {...fadeUp}
          transition={{ delay: 0.05, duration: 0.3 }}
          className="grid grid-cols-2 gap-4"
        >
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--canvas)] p-6 shadow-sm group hover:border-[var(--accent-border)] transition-colors">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--accent-muted)] mb-4 transition-transform group-hover:scale-110">
              <ShoppingBag className="h-5 w-5 text-[var(--accent)]" />
            </div>
            <p className="text-3xl font-black text-[var(--text-1)] tracking-tighter">
              {stats.totalOrders}
            </p>
            <p className="text-[10px] text-[var(--text-3)] font-black uppercase tracking-[0.1em] mt-1">
              Total Orders
            </p>
          </div>
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--canvas)] p-6 shadow-sm group hover:border-slate-400 transition-colors">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 mb-4 transition-transform group-hover:scale-110">
              <CalendarDays className="h-5 w-5 text-slate-500" />
            </div>
            <p className="text-xl font-black text-[var(--text-1)] tracking-tighter py-1.5">
              {memberSince}
            </p>
            <p className="text-[10px] text-[var(--text-3)] font-black uppercase tracking-[0.1em] mt-1">
              Member Since
            </p>
          </div>
        </motion.div>

        {/* Menu Sections */}
        <div className="space-y-6">
          <motion.div
            {...fadeUp}
            transition={{ delay: 0.1, duration: 0.3 }}
            className="rounded-3xl border border-[var(--border)] bg-[var(--canvas)] overflow-hidden shadow-sm"
          >
            <div className="px-6 py-4 border-b border-[var(--border-soft)] bg-[var(--canvas-sub)]/30">
              <h3 className="text-[10px] font-black text-[var(--text-3)] uppercase tracking-[0.2em]">
                System Preferences
              </h3>
            </div>

            <button
              onClick={toggleSound}
              className="w-full flex items-center gap-4 px-6 py-5 hover:bg-[var(--canvas-sub)] transition-colors border-b border-[var(--border-soft)]"
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                  soundEnabled
                    ? "bg-[var(--accent-muted)]"
                    : "bg-[var(--surface)]"
                }`}
              >
                {soundEnabled ? (
                  <Volume2 className="h-5 w-5 text-[var(--accent)]" />
                ) : (
                  <VolumeX className="h-5 w-5 text-[var(--text-3)]" />
                )}
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-bold text-[var(--text-1)]">
                  Audio Notifications
                </p>
                <p className="text-[11px] text-[var(--text-3)] font-medium">
                  {soundEnabled
                    ? "Enable sound alerts for live updates"
                    : "Mute all in-app sounds"}
                </p>
              </div>
              <div
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  soundEnabled
                    ? "bg-[var(--accent)]"
                    : "bg-[var(--surface-alt)]"
                }`}
              >
                <motion.div
                  animate={{ x: soundEnabled ? 22 : 3 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="h-5 w-5 rounded-full bg-white shadow-sm"
                />
              </div>
            </button>

            <Link
              href="/legal"
              className="flex items-center gap-4 px-6 py-5 hover:bg-[var(--canvas-sub)] transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50">
                <Shield className="h-5 w-5 text-blue-500" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-bold text-[var(--text-1)]">
                  Privacy & Data
                </p>
                <p className="text-[11px] text-[var(--text-3)] font-medium">
                  Manage your data and privacy settings
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-[var(--text-3)]" />
            </Link>
          </motion.div>

          <motion.div
            {...fadeUp}
            transition={{ delay: 0.15, duration: 0.3 }}
            className="rounded-3xl border border-[var(--border)] bg-[var(--canvas)] overflow-hidden shadow-sm"
          >
            <div className="px-6 py-4 border-b border-[var(--border-soft)] bg-[var(--canvas-sub)]/30">
              <h3 className="text-[10px] font-black text-[var(--text-3)] uppercase tracking-[0.2em]">
                Quick Links
              </h3>
            </div>

            <Link
              href="/orders"
              className="flex items-center gap-4 px-6 py-5 hover:bg-[var(--canvas-sub)] transition-colors border-b border-[var(--border-soft)]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50">
                <Receipt className="h-5 w-5 text-orange-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-[var(--text-1)]">
                  Order History
                </p>
                <p className="text-[11px] text-[var(--text-3)] font-medium">
                  View and re-order from past meals
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-[var(--text-3)]" />
            </Link>

            <Link
              href="/contact"
              className="flex items-center gap-4 px-6 py-5 hover:bg-[var(--canvas-sub)] transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-50">
                <HelpCircle className="h-5 w-5 text-purple-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-[var(--text-1)]">
                  Support Hub
                </p>
                <p className="text-[11px] text-[var(--text-3)] font-medium">
                  Get help from our concierge team
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-[var(--text-3)]" />
            </Link>
          </motion.div>

          <motion.div
            {...fadeUp}
            transition={{ delay: 0.2, duration: 0.3 }}
            className="space-y-3"
          >
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="w-full flex items-center justify-center gap-3 rounded-2xl border border-[var(--border)] bg-white py-4 text-sm font-black text-slate-900 uppercase tracking-widest hover:bg-slate-50 active:scale-[0.98] transition-all shadow-sm disabled:opacity-50"
            >
              {signingOut ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              Sign Out
            </button>

            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full flex items-center justify-center gap-3 rounded-2xl border border-red-100 bg-red-50 py-4 text-sm font-black text-red-600 uppercase tracking-widest hover:bg-red-100 active:scale-[0.98] transition-all shadow-sm"
            >
              <Trash2 className="h-4 w-4" />
              Delete Account
            </button>
          </motion.div>
        </div>

        <motion.p
          {...fadeUp}
          transition={{ delay: 0.25, duration: 0.3 }}
          className="text-center text-[10px] font-black text-[var(--text-3)] uppercase tracking-[0.3em] py-4"
        >
          HimaVolt • v1.0.4
        </motion.p>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isDeleting && setShowDeleteConfirm(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm rounded-[2.5rem] bg-white p-8 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-6 opacity-5">
                <AlertTriangle className="h-24 w-24 text-red-600" />
              </div>

              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                <AlertTriangle className="h-7 w-7" />
              </div>

              <h2 className="text-xl font-black text-slate-900 tracking-tight mb-2">
                Irreversible Action
              </h2>
              <p className="text-sm text-slate-500 mb-6 font-medium leading-relaxed">
                Deleting your account is permanent. You will lose all your data,
                rewards, and order history.
                <span className="block mt-2 font-black text-red-600">
                  Note: You will NOT be able to recreate an account with this
                  email/ID again.
                </span>
              </p>

              <div className="mb-6">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                  Type &quot;DELETE&quot; to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type here..."
                  className="w-full rounded-xl border border-red-100 bg-red-50/30 px-4 py-3 text-sm font-bold text-red-600 placeholder:text-red-200 focus:border-red-300 outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="rounded-2xl border border-slate-200 py-3 text-sm font-black text-slate-600 uppercase tracking-widest hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== "DELETE" || isDeleting}
                  className="rounded-2xl bg-red-600 py-3 text-sm font-black text-white uppercase tracking-widest shadow-lg shadow-red-200 hover:bg-red-700 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  ) : (
                    "Delete"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
