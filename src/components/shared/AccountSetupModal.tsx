"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Eye, EyeOff, Check, Phone, ShieldCheck, Loader2, User as UserIcon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

/* Routes where the overlay must never appear — operator surfaces and the
   dedicated auth flow (which handles its own password step). */
const EXCLUDED_PREFIXES = ["/auth", "/admin", "/pos", "/kitchen", "/counter", "/staff-login", "/rider"];

const DEFER_KEY = "hh_account_setup_deferred_until";
const DEFER_MS = 24 * 60 * 60 * 1000; // 24h

const REQUIREMENTS = [
  { key: "length", label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { key: "upper", label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { key: "number", label: "One number", test: (p: string) => /\d/.test(p) },
];

interface Me {
  hasPassword: boolean | null;
  name: string | null;
  phone: string | null;
}

/**
 * A deferrable overlay shown to signed-in accounts that have no password yet
 * (they signed in with Google/OAuth). Lets them set a password — so they can
 * also sign in with email + password — and add a phone number, without ever
 * blocking them mid-task ("Remind me later" hides it for a day).
 */
export default function AccountSetupModal() {
  const { isLoaded, isSignedIn } = useAuth();
  const pathname = usePathname();

  // Render nothing on the server and the first client paint so this component
  // never contributes to the hydrated DOM (avoids any hydration mismatch); all
  // real work happens after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [me, setMe] = useState<Me | null>(null);
  const [checked, setChecked] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const excluded = EXCLUDED_PREFIXES.some((p) => pathname?.startsWith(p));

  const deferred = useCallback((): boolean => {
    try {
      const until = Number(localStorage.getItem(DEFER_KEY) || 0);
      return Date.now() < until;
    } catch {
      return false;
    }
  }, []);

  // Load the account once we know the user is signed in and we're not on an
  // excluded route or within a deferral window.
  useEffect(() => {
    if (!isLoaded || !isSignedIn || excluded || checked || deferred()) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as Me;
        if (cancelled) return;
        setMe(data);
        setPhone(data.phone ?? "+977 ");
        setName(data.name ?? "");
      } catch {
        /* ignore — try again next mount */
      } finally {
        if (!cancelled) setChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, excluded, checked, deferred]);

  const requirementsMet = REQUIREMENTS.every((r) => r.test(password));
  const passwordsMatch = password.length > 0 && password === confirm;
  const needsName = !me?.name || me.name.trim().length < 2;

  const open =
    mounted &&
    !dismissed &&
    !excluded &&
    isSignedIn &&
    !!me &&
    me.hasPassword === false &&
    !deferred();

  const remindLater = () => {
    try {
      localStorage.setItem(DEFER_KEY, String(Date.now() + DEFER_MS));
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!requirementsMet) return setError("Your password does not meet the requirements below.");
    if (!passwordsMatch) return setError("Passwords do not match.");
    if (needsName && name.trim().length < 2) return setError("Please enter your name.");

    setSaving(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        return;
      }

      const phoneTrimmed = phone.trim();
      const looksLikePhone = /\d/.test(phoneTrimmed) && phoneTrimmed.replace(/[^\d]/g, "").length >= 7;
      const body: Record<string, unknown> = { hasPassword: true };
      if (looksLikePhone) body.phone = phoneTrimmed;
      if (needsName && name.trim().length >= 2) body.name = name.trim();

      await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).catch(() => { });

      setSuccess(true);
      setTimeout(() => setDismissed(true), 1400);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="account-setup-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-900/50 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
            className="w-full max-w-md overflow-hidden rounded-3xl border border-[var(--border-soft)] bg-[var(--surface)] shadow-2xl"
          >
            {success ? (
              <div className="flex flex-col items-center px-8 py-14 text-center">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent)] text-white">
                  <Check className="h-8 w-8" />
                </div>
                <h2 className="text-xl font-bold text-[var(--text-1)]">You are all set</h2>
                <p className="mt-1 text-sm text-[var(--text-3)]">
                  You can now sign in with your email and password too.
                </p>
              </div>
            ) : (
              <form onSubmit={save}>
                <div className="border-b border-[var(--border-soft)] px-6 pb-5 pt-6">
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent)]/10 text-[var(--accent)]">
                    <Lock className="h-5 w-5" />
                  </div>
                  <h2 className="text-lg font-bold text-[var(--text-1)]">Secure your account</h2>
                  <p className="mt-1 text-[13px] leading-snug text-[var(--text-3)]">
                    You signed in with Google. Set a password so you can also log in with your
                    email, and add your phone number so businesses can reach you.
                  </p>
                </div>

                <div className="space-y-4 px-6 py-5">
                  {error && (
                    <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">
                      {error}
                    </div>
                  )}

                  {needsName && (
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[var(--text-3)]">
                        Your name
                      </label>
                      <div className="relative">
                        <UserIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-3)]" />
                        <input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Full name"
                          className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] py-2.5 pl-10 pr-3 text-sm text-[var(--text-1)] focus:border-[var(--accent)] focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[var(--text-3)]">
                      New password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-3)]" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Create a password"
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] py-2.5 pl-10 pr-10 text-sm text-[var(--text-1)] focus:border-[var(--accent)] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((p) => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-3)] hover:text-[var(--text-2)]"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[var(--text-3)]">
                      Confirm password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-3)]" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        placeholder="Re-enter your password"
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] py-2.5 pl-10 pr-3 text-sm text-[var(--text-1)] focus:border-[var(--accent)] focus:outline-none"
                      />
                    </div>
                    {confirm.length > 0 && !passwordsMatch && (
                      <p className="mt-1 text-[11px] text-rose-500">Passwords do not match</p>
                    )}
                  </div>

                  <ul className="grid grid-cols-1 gap-1.5 rounded-xl bg-[var(--canvas-sub)] p-3 ring-1 ring-[var(--border)]/60 sm:grid-cols-3">
                    {REQUIREMENTS.map((r) => {
                      const met = r.test(password);
                      return (
                        <li key={r.key} className="flex items-center gap-1.5 text-[11px]">
                          <span
                            className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full ${met ? "bg-[var(--accent)] text-white" : "bg-[var(--surface-alt)] text-transparent"
                              }`}
                          >
                            <Check className="h-2 w-2" />
                          </span>
                          <span className={met ? "text-[var(--text-1)]" : "text-[var(--text-3)]"}>{r.label}</span>
                        </li>
                      );
                    })}
                  </ul>

                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[var(--text-3)]">
                      Phone number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-3)]" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+977 98XXXXXXXX"
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] py-2.5 pl-10 pr-3 text-sm text-[var(--text-1)] focus:border-[var(--accent)] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 border-t border-[var(--border-soft)] px-6 py-4">
                  <button
                    type="submit"
                    disabled={saving || !requirementsMet || !passwordsMatch}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] py-3 text-sm font-bold text-white shadow-md shadow-[var(--accent)]/20 hover:bg-[var(--accent-hover)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                    Save and secure
                  </button>
                  <button
                    type="button"
                    onClick={remindLater}
                    className="w-full rounded-xl py-2 text-sm font-semibold text-[var(--text-3)] hover:text-[var(--text-1)]"
                  >
                    Remind me later
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
