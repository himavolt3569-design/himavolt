"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { Mountain, Loader2, Check, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState<"loading" | "ready" | "done" | "invalid">("loading");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) {
      setStatus("invalid");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    supabase.auth.exchangeCodeForSession(code).then(
      (result: Awaited<ReturnType<typeof supabase.auth.exchangeCodeForSession>>) => {
      if (result.error) {
        setStatus("invalid");
      } else {
        setStatus("ready");
      }
    });
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setError("");
    setLoading(true);

    const supabase = getSupabaseBrowserClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setStatus("done");
    setTimeout(() => router.push("/sign-in"), 2500);
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50/50">
        <Loader2 className="h-8 w-8 animate-spin text-[#eaa94d]" />
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50/50 p-6">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <span className="text-2xl">🔗</span>
          </div>
          <h2 className="text-lg font-bold text-[#3e1e0c] mb-2">Link expired or invalid</h2>
          <p className="text-sm text-gray-500 mb-6">
            This reset link has expired or already been used. Request a new one.
          </p>
          <Link
            href="/auth/forgot-password"
            className="inline-block rounded-xl bg-[#eaa94d] px-6 py-3 text-sm font-bold text-white hover:bg-[#d67620] transition-colors"
          >
            Request new link
          </Link>
        </div>
      </div>
    );
  }

  if (status === "done") {
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
          <h2 className="text-lg font-bold text-[#3e1e0c] mb-2">Password updated!</h2>
          <p className="text-sm text-gray-500">Redirecting you to sign in…</p>
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
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <Mountain className="h-8 w-8 text-[#eaa94d]" strokeWidth={2.5} />
            <span className="text-2xl font-extrabold tracking-tight text-[#3e1e0c]">
              Hima<span className="text-[#eaa94d]">Volt</span>
            </span>
          </Link>
          <p className="mt-3 text-base font-bold text-[#3e1e0c]">Set a new password</p>
          <p className="mt-1 text-sm text-gray-400">Choose something strong and memorable</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">New Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoFocus
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 pr-10 text-sm focus:border-[#eaa94d]/30 focus:outline-none focus:ring-1 focus:ring-[#eaa94d]/30"
                  placeholder="Min 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Confirm Password</label>
              <input
                type={showPw ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className={`w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-1 transition-colors ${
                  confirm && confirm !== password
                    ? "border-red-400 focus:border-red-400 focus:ring-red-200"
                    : confirm && confirm === password
                    ? "border-green-400 focus:border-green-400 focus:ring-green-200"
                    : "border-gray-200 focus:border-[#eaa94d]/30 focus:ring-[#eaa94d]/30"
                }`}
                placeholder="Repeat password"
              />
              {confirm && confirm !== password && (
                <p className="mt-1 text-[11px] text-red-500">Passwords do not match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !password || !confirm}
              className="w-full rounded-xl bg-[#eaa94d] py-3 text-sm font-bold text-white transition-all hover:bg-[#d67620] active:scale-[0.98] disabled:opacity-50 shadow-sm shadow-[#eaa94d]/20"
            >
              {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Update Password"}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gray-50/50">
        <Loader2 className="h-8 w-8 animate-spin text-[#eaa94d]" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
