"use client";

import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { Mountain, Loader2, Check, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = getSupabaseBrowserClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  };

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--canvas-sub)] p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-sm text-center"
        >
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-muted)]">
            <Check className="h-8 w-8 text-[var(--accent)]" />
          </div>
          <h2 className="text-lg font-bold text-[var(--text-1)] mb-2">Check your email</h2>
          <p className="text-sm text-[var(--text-2)] mb-1">
            We&apos;ve sent a password reset link to
          </p>
          <p className="text-sm font-bold text-[var(--text-1)] mb-6">{email}</p>
          <p className="text-xs text-[var(--text-3)] mb-6">
            Didn&apos;t receive it? Check spam or{" "}
            <button
              onClick={() => setSent(false)}
              className="text-[var(--accent)] font-semibold hover:text-[var(--accent-hover)] transition-colors"
            >
              try again
            </button>
          </p>
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Sign In
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--canvas-sub)] p-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
        className="w-full max-w-sm"
      >
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <Mountain className="h-8 w-8 text-[var(--accent)]" strokeWidth={2.5} />
            <span className="text-2xl font-black tracking-tight text-[var(--text-1)]">
              Hima<span className="text-[var(--accent)]">Volt</span>
            </span>
          </Link>
          <p className="mt-3 text-base font-bold text-[var(--text-1)]">Forgot your password?</p>
          <p className="mt-1 text-sm text-[var(--text-2)]">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--canvas)] p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl border border-[var(--status-error-text)]/20 bg-[var(--status-error-bg)] px-4 py-3 text-sm text-[var(--status-error-text)]">{error}</div>
            )}

            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-3)]">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] px-4 py-2.5 text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)] transition-colors"
                placeholder="you@example.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[var(--accent)] py-3 text-sm font-bold text-white hover:bg-[var(--accent-hover)] active:scale-[0.98] disabled:opacity-50 shadow-sm shadow-[var(--accent)]/20 transition-colors"
            >
              {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Send Reset Link"}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-[var(--text-3)]">
          Remember it?{" "}
          <Link href="/sign-in" className="font-bold text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors">
            Sign In
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
