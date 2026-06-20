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

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getSession().then((result: Awaited<ReturnType<typeof supabase.auth.getSession>>) => {
      const session = result.data.session;
      if (!session) { router.replace("/sign-in"); return; }
      setDisplayName(
        session.user.user_metadata?.full_name ??
        session.user.user_metadata?.name ??
        session.user.email?.split("@")[0] ?? ""
      );
      setEmail(session.user.email ?? "");
      setSessionReady(true);
    });
  }, [router]);

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

    if (wantPassword && password) {
      const { error: pwErr } = await supabase.auth.updateUser({ password });
      if (pwErr) { setError(pwErr.message); setLoading(false); return; }
    }

    const patchBody: Record<string, string> = { username };
    if (roleParam) patchBody.role = roleParam;
    const res = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patchBody),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to save profile");
      setLoading(false);
      return;
    }

    await res.json();
    // Owners and customers both land on the dashboard; an owner with no
    // restaurant yet gets the create-restaurant modal opened inline there.
    router.push("/dashboard");
  };

  if (!sessionReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--canvas-sub)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  const isOwner = roleParam === "OWNER";
  const inputClass = "w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] px-4 py-2.5 text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)] transition-colors";
  const labelClass = "mb-1.5 block text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-3)]";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--canvas-sub)] p-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
        className="w-full max-w-sm"
      >
        <div className="mb-6 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <Mountain className="h-8 w-8 text-[var(--accent)]" strokeWidth={2.5} />
            <span className="text-2xl font-black tracking-tight text-[var(--text-1)]">
              Hima<span className="text-[var(--accent)]">Volt</span>
            </span>
          </Link>
          <p className="mt-2 text-sm text-[var(--text-2)]">
            One last step. Set up your profile.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--canvas)] shadow-sm">
          <div className={`px-5 py-3 ${isOwner ? "bg-[var(--text-1)]" : "bg-[var(--accent-muted)] border-b border-[var(--accent-border)]"}`}>
            <div className="flex items-center gap-2">
              {isOwner ? (
                <>
                  <Building2 className="h-4 w-4 text-[var(--accent)]" />
                  <span className="text-xs font-bold text-white/80">Restaurant Owner account</span>
                </>
              ) : (
                <>
                  <UtensilsCrossed className="h-4 w-4 text-[var(--accent)]" />
                  <span className="text-xs font-bold text-[var(--accent-text)]">Food Lover account</span>
                </>
              )}
            </div>
          </div>

          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-xl border border-[var(--status-error-text)]/20 bg-[var(--status-error-bg)] px-4 py-3 text-sm text-[var(--status-error-text)]">{error}</div>
              )}

              <div>
                <label className={labelClass}>Full Name</label>
                <input
                  type="text"
                  value={displayName}
                  readOnly
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--text-3)] cursor-not-allowed"
                />
              </div>

              <div>
                <label className={labelClass}>Email</label>
                <input
                  type="email"
                  value={email}
                  readOnly
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--text-3)] cursor-not-allowed"
                />
              </div>

              <div>
                <label className={labelClass}>
                  Username <span className="text-[var(--accent)]">*</span>
                </label>
                <div className="relative">
                  <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-3)]" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    required
                    placeholder="your_username"
                    className={`w-full rounded-xl border px-4 py-2.5 pl-9 text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] bg-[var(--canvas)] focus:outline-none focus:ring-2 transition-colors ${
                      usernameStatus === "available"
                        ? "border-[var(--accent)] focus:border-[var(--accent)] focus:ring-[var(--accent-border)]"
                        : usernameStatus === "taken" || usernameStatus === "invalid"
                        ? "border-red-400 focus:border-red-400 focus:ring-red-100"
                        : "border-[var(--border)] focus:border-[var(--accent)] focus:ring-[var(--accent-border)]"
                    }`}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {usernameStatus === "checking" && <Loader2 className="h-4 w-4 animate-spin text-[var(--text-3)]" />}
                    {usernameStatus === "available" && <Check className="h-4 w-4 text-[var(--accent)]" />}
                  </div>
                </div>
                <p className={`mt-1 text-[11px] ${
                  usernameStatus === "available" ? "text-[var(--accent)]"
                  : usernameStatus === "taken" || usernameStatus === "invalid" ? "text-red-400"
                  : "text-[var(--text-3)]"
                }`}>
                  {usernameStatus === "available" && "Username is available!"}
                  {usernameStatus === "taken" && "Username is already taken"}
                  {usernameStatus === "invalid" && "3-20 lowercase letters, numbers, or underscores"}
                  {(usernameStatus === "idle" || usernameStatus === "checking") && "3-20 chars: a-z, 0-9, underscores"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setWantPassword((v) => !v)}
                className="flex w-full items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--canvas)] px-4 py-2.5 text-sm text-[var(--text-2)] hover:bg-[var(--surface)] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-[var(--text-3)]" />
                  <span>Want to sign in with a password too?</span>
                </div>
                <motion.div animate={{ rotate: wantPassword ? 180 : 0 }} transition={{ duration: 0.18 }}>
                  <ChevronDown className="h-4 w-4 text-[var(--text-3)]" />
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
                    <label className={labelClass}>Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required={wantPassword}
                      minLength={8}
                      placeholder="Min 8 characters"
                      className={inputClass}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={loading || usernameStatus !== "available"}
                className="w-full rounded-xl bg-[var(--accent)] py-3 text-sm font-bold text-white hover:bg-[var(--accent-hover)] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-[var(--accent)]/20 transition-colors"
              >
                {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Save & Continue"}
              </button>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
