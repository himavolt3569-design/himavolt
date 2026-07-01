"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { rememberIntendedRole } from "@/lib/intended-role";
import { Mountain, Loader2, Mail, Lock, Eye, EyeOff, Check, ArrowLeft, UtensilsCrossed, Store } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

type Step = "email" | "password" | "check-email" | "choose-intent";

const inputClass =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] py-2.5 pl-10 pr-4 text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)] transition-colors";

const labelClass = "mb-1.5 block text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-3)]";

export default function SignInPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmailContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/account-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      if (data.hasPassword) {
        setStep("password");
        setLoading(false);
        return;
      }

      const supabase = getSupabaseBrowserClient();
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (otpError) {
        setError(otpError.message);
        setLoading(false);
        return;
      }
      setStep("check-email");
      setLoading(false);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = getSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    const meRes = await fetch("/api/me", { cache: "no-store" });
    const meData = meRes.ok ? await meRes.json().catch(() => ({})) : {};

    if (meData.hasPassword === false) {
      router.push("/auth/set-password");
    } else if (meData.role === "OWNER" || meData.role === "ADMIN") {
      router.push("/dashboard");
    } else {
      router.push("/");
    }
    router.refresh();
  };

  const handleGoogle = async (role?: "CUSTOMER" | "OWNER") => {
    if (role) rememberIntendedRole(role);
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  const handleGoogleClick = () => {
    // Always ask, every time — never assume based on how they arrived here.
    setStep("choose-intent");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--canvas-sub)] p-6">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-[var(--accent)]/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-[var(--accent-hover)]/8 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
        className="relative w-full max-w-sm"
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
            {step === "check-email" ? (
              <motion.div
                key="check-email"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-2"
              >
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent-muted)]">
                  <Check className="h-7 w-7 text-[var(--accent)]" />
                </div>
                <h2 className="text-lg font-bold text-[var(--text-1)] mb-2">Check your email</h2>
                <p className="text-sm text-[var(--text-2)]">
                  We&apos;ve sent a sign-in link to <strong className="text-[var(--text-1)]">{email}</strong>. Click
                  it to continue.
                </p>
                <button
                  type="button"
                  onClick={() => setStep("email")}
                  className="mt-6 inline-block text-sm font-bold text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
                >
                  Use a different email
                </button>
              </motion.div>
            ) : step === "choose-intent" ? (
              <motion.div key="choose-intent" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
                <div className="mb-5 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setStep("email")}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--canvas)] hover:bg-[var(--surface)] transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4 text-[var(--text-2)]" />
                  </button>
                  <div>
                    <h1 className="text-base font-bold text-[var(--text-1)]">Who are you?</h1>
                    <p className="text-[12px] text-[var(--text-3)]">Pick one to continue.</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5">
                  <button
                    onClick={() => handleGoogle("OWNER")}
                    className="group flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--canvas)] p-4 text-left hover:border-[var(--text-1)] hover:bg-[var(--surface-alt)] transition-all"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-alt)] text-[var(--text-1)] group-hover:bg-[var(--canvas)] transition-colors">
                      <Store className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-semibold text-[var(--text-1)]">I own a restaurant or hotel</span>
                  </button>

                  <button
                    onClick={() => {
                      // Customers never use Google — send them back to finish
                      // signing in with email + a confirmation code instead.
                      rememberIntendedRole("CUSTOMER");
                      setStep("email");
                    }}
                    className="group flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--canvas)] p-4 text-left hover:border-[var(--accent)] hover:bg-[var(--accent-muted)] transition-all"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-muted)] text-[var(--accent)] group-hover:bg-[var(--canvas)] transition-colors">
                      <UtensilsCrossed className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-semibold text-[var(--text-1)]">I&apos;m ordering food</span>
                  </button>
                </div>
              </motion.div>
            ) : step === "password" ? (
              <motion.div key="password" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
                <div className="mb-5 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => { setStep("email"); setError(""); setPassword(""); }}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--canvas)] hover:bg-[var(--surface)] transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4 text-[var(--text-2)]" />
                  </button>
                  <div>
                    <h1 className="text-base font-bold text-[var(--text-1)]">Welcome back</h1>
                    <p className="text-[12px] text-[var(--text-3)] truncate">{email}</p>
                  </div>
                </div>

                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  {error && (
                    <div className="rounded-xl border border-[var(--status-error-text)]/20 bg-[var(--status-error-bg)] px-4 py-3 text-sm text-[var(--status-error-text)]">
                      {error}
                    </div>
                  )}
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className={labelClass}>Password</label>
                      <Link
                        href="/auth/forgot-password"
                        className="text-xs font-semibold text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-3)]" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoFocus
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] py-2.5 pl-10 pr-10 text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)] transition-colors"
                        placeholder="Your password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((p) => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-[var(--accent)] py-3 text-sm font-bold text-white shadow-md shadow-[var(--accent)]/20 hover:bg-[var(--accent-hover)] active:scale-[0.98] disabled:opacity-50 transition-colors"
                  >
                    {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Sign In"}
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div key="email" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}>
                <div className="mb-6 text-center">
                  <h1 className="text-lg font-bold text-[var(--text-1)]">Welcome 👋</h1>
                  <p className="mt-1.5 text-sm text-[var(--text-2)] leading-snug">
                    Login or Sign up to manage your restaurant and cafe digitally.
                  </p>
                </div>

                <form onSubmit={handleEmailContinue} className="space-y-4">
                  {error && (
                    <div className="rounded-xl border border-[var(--status-error-text)]/20 bg-[var(--status-error-bg)] px-4 py-3 text-sm text-[var(--status-error-text)]">
                      {error}
                    </div>
                  )}

                  <div>
                    <label className={labelClass}>Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-3)]" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoFocus
                        className={inputClass}
                        placeholder="Enter email address"
                      />
                    </div>
                  </div>

                  <p className="text-[11px] leading-snug text-[var(--text-3)]">
                    By continuing, you agree to our{" "}
                    <Link href="/legal/privacy" className="font-semibold text-[var(--text-2)] hover:text-[var(--accent)]">
                      Privacy Policy
                    </Link>{" "}
                    &amp;{" "}
                    <Link href="/legal/terms" className="font-semibold text-[var(--text-2)] hover:text-[var(--accent)]">
                      Terms and Conditions
                    </Link>
                    .
                  </p>

                  <button
                    type="submit"
                    disabled={loading || !email}
                    className="w-full rounded-xl bg-[var(--accent)] py-3 text-sm font-bold text-white shadow-md shadow-[var(--accent)]/20 hover:bg-[var(--accent-hover)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Continue"}
                  </button>
                </form>

                <div className="relative my-5">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[var(--border)]" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-[var(--canvas)] px-3 text-[var(--text-3)]">or</span>
                  </div>
                </div>

                <button
                  onClick={handleGoogleClick}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] py-3 text-sm font-semibold text-[var(--text-1)] hover:bg-[var(--surface)] transition-colors"
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continue with Google
                  </span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
