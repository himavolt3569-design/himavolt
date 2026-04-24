"use client";

import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { Mountain, Loader2, Mail, Lock, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = getSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    if (!rememberMe) {
      try {
        const keys = Object.keys(localStorage);
        for (const k of keys) {
          if (k.startsWith("sb-") && k.endsWith("-auth-token")) {
            const val = localStorage.getItem(k);
            if (val) {
              sessionStorage.setItem(k, val);
              localStorage.removeItem(k);
            }
          }
        }
      } catch {}
    }

    const meRes = await fetch("/api/me");
    const meData = await meRes.json().catch(() => ({}));
    const userRole = meData.role ?? "CUSTOMER";

    if (userRole === "OWNER" || userRole === "ADMIN") {
      router.push("/dashboard");
    } else {
      router.push("/");
    }
    router.refresh();
  };

  const handleGoogleSignIn = async () => {
    document.cookie = `intended_role=OWNER; path=/; max-age=600; SameSite=Lax`;
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?role=OWNER`,
      },
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--canvas-sub)] p-6">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-[var(--accent)]/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-[var(--accent-hover)]/8 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <Mountain
              className="h-8 w-8 text-[var(--accent)]"
              strokeWidth={2.5}
            />
            <span className="text-2xl font-black tracking-tight text-[var(--text-1)]">
              Hima<span className="text-[var(--accent)]">Volt</span>
            </span>
          </Link>
          <p className="mt-2 text-sm text-[var(--text-2)]">
            Welcome back. Sign in to continue.
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--canvas)] p-6 shadow-xl shadow-black/[0.04]">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl border border-[var(--status-error-text)]/20 bg-[var(--status-error-bg)] px-4 py-3 text-sm text-[var(--status-error-text)]">
                {error}
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-3)]">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-3)]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] py-2.5 pl-10 pr-4 text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)] transition-colors"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-3)]">
                  Password
                </label>
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
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] py-2.5 pl-10 pr-10 text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)] transition-colors"
                  placeholder="Your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setRememberMe((v) => !v)}
                className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border transition-all ${
                  rememberMe
                    ? "border-[var(--accent)] bg-[var(--accent)]"
                    : "border-[var(--border)] bg-[var(--canvas)]"
                }`}
              >
                {rememberMe && (
                  <svg
                    className="h-3 w-3 text-white"
                    viewBox="0 0 12 12"
                    fill="none"
                  >
                    <path
                      d="M2.5 6L5 8.5L9.5 3.5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
              <span
                onClick={() => setRememberMe((v) => !v)}
                className="text-xs font-medium text-[var(--text-2)] cursor-pointer select-none"
              >
                Remember me
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[var(--accent)] py-3 text-sm font-bold text-white shadow-md shadow-[var(--accent)]/20 hover:bg-[var(--accent-hover)] active:scale-[0.98] disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <Loader2 className="mx-auto h-4 w-4 animate-spin" />
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] px-4 py-3 text-center">
            <p className="text-xs text-[var(--text-3)] mb-2">
              Restaurant Owner?
            </p>
            <button
              onClick={handleGoogleSignIn}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--canvas)] py-2.5 text-sm font-semibold text-[var(--text-1)] hover:bg-[var(--surface)] transition-colors"
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Sign in with Google
              </span>
            </button>
          </div>
        </div>

        <p className="mt-5 text-center text-sm text-[var(--text-3)]">
          Don&apos;t have an account?{" "}
          <Link
            href="/sign-up"
            className="font-bold text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
          >
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}
