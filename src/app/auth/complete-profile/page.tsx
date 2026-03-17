"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { AuthResponse } from "@supabase/supabase-js";
import {
  Mountain,
  Loader2,
  Check,
  AtSign,
  Lock,
  ChevronDown,
  UtensilsCrossed,
  Building2,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function CompleteProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role")?.toUpperCase() as "OWNER" | "CUSTOMER" | null;

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const [wantPassword, setWantPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sessionReady, setSessionReady] = useState(false);

  const debouncedUsername = useDebounce(username, 400);
  const checkedRef = useRef("");

  // Load session data
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getSession().then((result: Awaited<ReturnType<typeof supabase.auth.getSession>>) => {
      const session = result.data.session;
      if (!session) {
        router.replace("/sign-in");
        return;
      }
      setDisplayName(
        session.user.user_metadata?.full_name ??
        session.user.user_metadata?.name ??
        session.user.email?.split("@")[0] ?? ""
      );
      setEmail(session.user.email ?? "");
      setSessionReady(true);
    });
  }, [router]);

  // Username uniqueness check
  useEffect(() => {
    const u = debouncedUsername;
    if (!u || checkedRef.current === u) return;

    if (!/^[a-z0-9_]{3,20}$/.test(u)) {
      setUsernameStatus(u.length < 3 ? "idle" : "invalid");
      return;
    }

    checkedRef.current = u;
    setUsernameStatus("checking");
    fetch(`/api/me/username-check?username=${encodeURIComponent(u)}`)
      .then((r) => r.json())
      .then(({ available }) => setUsernameStatus(available ? "available" : "taken"))
      .catch(() => setUsernameStatus("idle"));
  }, [debouncedUsername]);

  const handleUsernameChange = (val: string) => {
    const cleaned = val.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20);
    setUsername(cleaned);
    setUsernameStatus("idle");
    checkedRef.current = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameStatus !== "available") return;
    setError("");
    setLoading(true);

    const supabase = getSupabaseBrowserClient();

    // Set password if requested
    if (wantPassword && password) {
      const { error: pwErr } = await supabase.auth.updateUser({ password });
      if (pwErr) {
        setError(pwErr.message);
        setLoading(false);
        return;
      }
    }

    // Save username (and role if needed) via API
    const res = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, ...(roleParam ? { role: roleParam } : {}) }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to save profile");
      setLoading(false);
      return;
    }

    const { role } = await res.json();
    router.push(role === "OWNER" ? "/onboarding" : "/");
  };

  if (!sessionReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50/50">
        <Loader2 className="h-8 w-8 animate-spin text-[#E23744]" />
      </div>
    );
  }

  const isOwner = roleParam === "OWNER";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50/50 p-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="mb-6 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <Mountain className="h-8 w-8 text-[#E23744]" strokeWidth={2.5} />
            <span className="text-2xl font-extrabold tracking-tight text-[#1F2A2A]">
              Hima<span className="text-[#E23744]">Volt</span>
            </span>
          </Link>
          <p className="mt-2 text-sm font-semibold text-gray-500">
            One last step — set up your profile
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {/* Role strip */}
          <div className={`px-5 py-3 ${isOwner ? "bg-[#1F2A2A]" : "bg-[#E23744]/5"}`}>
            <div className="flex items-center gap-2">
              {isOwner ? (
                <>
                  <Building2 className="h-4 w-4 text-amber-400" />
                  <span className="text-xs font-bold text-white/80">Restaurant Owner account</span>
                </>
              ) : (
                <>
                  <UtensilsCrossed className="h-4 w-4 text-[#E23744]" />
                  <span className="text-xs font-bold text-[#E23744]">Food Lover account</span>
                </>
              )}
            </div>
          </div>

          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
              )}

              {/* Name — read-only from Google */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Full Name</label>
                <input
                  type="text"
                  value={displayName}
                  readOnly
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-500 cursor-not-allowed"
                />
              </div>

              {/* Email — read-only */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={email}
                  readOnly
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-500 cursor-not-allowed"
                />
              </div>

              {/* Username */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Username <span className="text-[#E23744]">*</span>
                </label>
                <div className="relative">
                  <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    required
                    placeholder="your_username"
                    className={`w-full rounded-xl border px-4 py-2.5 pl-9 text-sm focus:outline-none focus:ring-1 transition-colors ${
                      usernameStatus === "available"
                        ? "border-green-400 focus:border-green-400 focus:ring-green-200"
                        : usernameStatus === "taken" || usernameStatus === "invalid"
                        ? "border-red-400 focus:border-red-400 focus:ring-red-200"
                        : "border-gray-200 focus:border-[#E23744]/30 focus:ring-[#E23744]/30"
                    }`}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {usernameStatus === "checking" && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
                    {usernameStatus === "available" && <Check className="h-4 w-4 text-green-500" />}
                  </div>
                </div>
                <p className={`mt-1 text-[11px] ${
                  usernameStatus === "available" ? "text-green-600"
                  : usernameStatus === "taken" ? "text-red-500"
                  : usernameStatus === "invalid" ? "text-red-500"
                  : "text-gray-400"
                }`}>
                  {usernameStatus === "available" && "Username is available!"}
                  {usernameStatus === "taken" && "Username is already taken"}
                  {usernameStatus === "invalid" && "3–20 lowercase letters, numbers, or underscores"}
                  {(usernameStatus === "idle" || usernameStatus === "checking") && "3–20 chars: a–z, 0–9, underscores"}
                </p>
              </div>

              {/* Password toggle */}
              <button
                type="button"
                onClick={() => setWantPassword((v) => !v)}
                className="flex w-full items-center justify-between rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-gray-400" />
                  <span>Want to sign in with a password too?</span>
                </div>
                <motion.div animate={{ rotate: wantPassword ? 180 : 0 }} transition={{ duration: 0.18 }}>
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </motion.div>
              </button>

              <AnimatePresence>
                {wantPassword && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required={wantPassword}
                      minLength={8}
                      placeholder="Min 8 characters"
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#E23744]/30 focus:outline-none focus:ring-1 focus:ring-[#E23744]/30"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={loading || usernameStatus !== "available"}
                className="w-full rounded-xl bg-[#E23744] py-3 text-sm font-bold text-white transition-all hover:bg-[#c92e3c] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-[#E23744]/20"
              >
                {loading ? (
                  <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                ) : (
                  "Save & Continue"
                )}
              </button>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
