"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { friendlyAuthError } from "@/lib/auth-errors";
import { Mountain, Loader2, Check, ArrowLeft, Lock, Eye, EyeOff, Mail, KeyRound } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

type Step = "email" | "reset" | "done";

const inputBase =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] py-2.5 text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)] transition-colors";
const labelClass = "mb-1.5 block text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-3)]";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // ── Step 1: request a reset CODE (not a magic link). Supabase emails the
  // recovery message; with `{{ .Token }}` in the "Reset Password" template it
  // carries a 6-digit code the user types below. No link is clicked, so nobody
  // is silently signed in — they must enter the code AND set a new password.
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);

    const supabase = getSupabaseBrowserClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim());

    if (resetError) {
      setError(friendlyAuthError(resetError.message));
      setLoading(false);
      return;
    }

    setNotice(`We sent a 6-digit code to ${email.trim()}. Enter it below to set a new password.`);
    setStep("reset");
    setLoading(false);
  };

  // ── Step 2: verify the code, then set a new password. `verifyOtp` with
  // type "recovery" consumes the emailed code; `updateUser` sets the password
  // — no current password required.
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!/^\d{6}$/.test(code.trim())) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const supabase = getSupabaseBrowserClient();

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "recovery",
    });
    if (verifyError) {
      setError(
        /expired|invalid/i.test(verifyError.message)
          ? "That code is invalid or expired. Request a new one."
          : verifyError.message,
      );
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    // Mirror the has-password flag server-side (same as the set-password flow),
    // so the account is treated as password-enabled from here on.
    await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hasPassword: true }),
    }).catch(() => {});

    setStep("done");
    setLoading(false);
    setTimeout(() => {
      // They're authenticated with the new password now — drop them in.
      router.push("/dashboard");
      router.refresh();
    }, 1600);
  };

  const resendCode = async () => {
    setError("");
    setNotice("");
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim());
    if (resetError) setError(friendlyAuthError(resetError.message));
    else setNotice(`New code sent to ${email.trim()}.`);
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--canvas-sub)] p-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
        className="w-full max-w-sm"
      >
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <Mountain className="h-8 w-8 text-[var(--accent)]" strokeWidth={2.5} />
            <span className="text-2xl font-black tracking-tight text-[var(--text-1)]">
              Hima<span className="text-[var(--accent)]">Volt</span>
            </span>
          </Link>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--canvas)] p-6 shadow-xl shadow-black/[0.04]">
          <AnimatePresence mode="wait">
            {step === "done" ? (
              <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-2 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-muted)]">
                  <Check className="h-8 w-8 text-[var(--accent)]" />
                </div>
                <h2 className="mb-2 text-lg font-bold text-[var(--text-1)]">Password updated!</h2>
                <p className="text-sm text-[var(--text-2)]">Taking you to your dashboard…</p>
              </motion.div>
            ) : step === "reset" ? (
              <motion.div key="reset" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
                <div className="mb-5 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => { setStep("email"); setError(""); setNotice(""); setCode(""); }}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--canvas)] transition-colors hover:bg-[var(--surface)]"
                  >
                    <ArrowLeft className="h-4 w-4 text-[var(--text-2)]" />
                  </button>
                  <div>
                    <h1 className="text-base font-bold text-[var(--text-1)]">Enter code &amp; new password</h1>
                    <p className="truncate text-[12px] text-[var(--text-3)]">{email}</p>
                  </div>
                </div>

                <form onSubmit={handleReset} className="space-y-4">
                  {notice && (
                    <div className="flex items-start gap-2 rounded-xl border border-[var(--accent-border)] bg-[var(--accent-muted)] px-4 py-3 text-sm text-[var(--accent-text)]">
                      <Check className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{notice}</span>
                    </div>
                  )}
                  {error && (
                    <div className="rounded-xl border border-[var(--status-error-text)]/20 bg-[var(--status-error-bg)] px-4 py-3 text-sm text-[var(--status-error-text)]">
                      {error}
                    </div>
                  )}

                  <div>
                    <label className={labelClass}>Verification Code</label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-3)]" />
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={8}
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
                        required
                        autoFocus
                        className={`${inputBase} pl-10 tracking-[0.4em] font-semibold`}
                        placeholder="Code"
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>New password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-3)]" />
                      <input
                        type={showPw ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={8}
                        className={`${inputBase} pl-10 pr-10`}
                        placeholder="Min 8 characters"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-3)] transition-colors hover:text-[var(--text-2)]"
                      >
                        {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Confirm new password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-3)]" />
                      <input
                        type={showPw ? "text" : "password"}
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        required
                        className={`${inputBase} pl-10 ${
                          confirm && confirm !== password ? "border-red-400 focus:border-red-400 focus:ring-red-100" : ""
                        }`}
                        placeholder="Repeat password"
                      />
                    </div>
                    {confirm && confirm !== password && (
                      <p className="mt-1 text-[11px] text-red-400">Passwords do not match</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !code || !password || !confirm}
                    className="w-full rounded-xl bg-[var(--accent)] py-3 text-sm font-bold text-white shadow-sm shadow-[var(--accent)]/20 transition-colors hover:bg-[var(--accent-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Reset Password"}
                  </button>

                  <p className="text-center text-xs text-[var(--text-3)]">
                    Didn&apos;t get it?{" "}
                    <button
                      type="button"
                      onClick={resendCode}
                      disabled={loading}
                      className="font-semibold text-[var(--accent)] transition-colors hover:text-[var(--accent-hover)] disabled:opacity-50"
                    >
                      Resend code
                    </button>
                  </p>
                </form>
              </motion.div>
            ) : (
              <motion.div key="email" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}>
                <div className="mb-6 text-center">
                  <h1 className="text-lg font-bold text-[var(--text-1)]">Forgot your password?</h1>
                  <p className="mt-1.5 text-sm text-[var(--text-2)] leading-snug">
                    Enter your email and we&apos;ll send you a 6-digit code to reset it.
                  </p>
                </div>

                <form onSubmit={handleSendCode} className="space-y-4">
                  {error && (
                    <div className="rounded-xl border border-[var(--status-error-text)]/20 bg-[var(--status-error-bg)] px-4 py-3 text-sm text-[var(--status-error-text)]">
                      {error}
                    </div>
                  )}

                  <div>
                    <label className={labelClass}>Email address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-3)]" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoFocus
                        className={`${inputBase} pl-10`}
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !email}
                    className="w-full rounded-xl bg-[var(--accent)] py-3 text-sm font-bold text-white shadow-sm shadow-[var(--accent)]/20 transition-colors hover:bg-[var(--accent-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Send Reset Code"}
                  </button>
                </form>

                <p className="mt-5 text-center text-sm text-[var(--text-3)]">
                  Remember it?{" "}
                  <Link href="/sign-in" className="font-bold text-[var(--accent)] transition-colors hover:text-[var(--accent-hover)]">
                    Sign In
                  </Link>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
