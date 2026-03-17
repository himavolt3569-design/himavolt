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
      <div className="flex min-h-screen items-center justify-center bg-gray-50/50 p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-sm text-center"
        >
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-lg font-bold text-[#1F2A2A] mb-2">Check your email</h2>
          <p className="text-sm text-gray-500 mb-1">
            We&apos;ve sent a password reset link to
          </p>
          <p className="text-sm font-bold text-[#1F2A2A] mb-6">{email}</p>
          <p className="text-xs text-gray-400 mb-6">
            Didn&apos;t receive it? Check spam or{" "}
            <button
              onClick={() => setSent(false)}
              className="text-[#E23744] font-semibold hover:text-[#c92e3c]"
            >
              try again
            </button>
          </p>
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-[#E23744] hover:text-[#c92e3c]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Sign In
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50/50 p-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <Mountain className="h-8 w-8 text-[#E23744]" strokeWidth={2.5} />
            <span className="text-2xl font-extrabold tracking-tight text-[#1F2A2A]">
              Hima<span className="text-[#E23744]">Volt</span>
            </span>
          </Link>
          <p className="mt-3 text-base font-bold text-[#1F2A2A]">Forgot your password?</p>
          <p className="mt-1 text-sm text-gray-400">
            Enter your email and we&apos;ll send you a reset link
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#E23744]/30 focus:outline-none focus:ring-1 focus:ring-[#E23744]/30"
                placeholder="you@example.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#E23744] py-3 text-sm font-bold text-white transition-all hover:bg-[#c92e3c] active:scale-[0.98] disabled:opacity-50 shadow-sm shadow-[#E23744]/20"
            >
              {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Send Reset Link"}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-gray-500">
          Remember it?{" "}
          <Link href="/sign-in" className="font-bold text-[#E23744] hover:text-[#c92e3c]">
            Sign In
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
