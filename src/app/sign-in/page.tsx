"use client";

import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { rememberIntendedRole } from "@/lib/intended-role";
import { Mountain, Loader2, Mail, Lock, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
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

    const meRes = await fetch("/api/me");
    const meData = meRes.ok ? await meRes.json().catch(() => ({})) : {};
    const userRole: string | null = meData.role ?? null;

    if (userRole === "CUSTOMER") {
      router.push("/");
    } else {
      // OWNER, ADMIN, or unknown (API failure) → dashboard; let it handle role routing
      router.push("/dashboard");
    }
    router.refresh();
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
            Welcome back — sign in to continue.
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

        <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--text-1)] p-5 shadow-lg text-center relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
            <Mountain className="h-12 w-12 text-white" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-1">For business partners</p>
          <h3 className="text-white font-bold text-sm mb-4 leading-snug px-4">Manage your restaurant or join as a partner</h3>
          <button
            onClick={() => {
              rememberIntendedRole("OWNER");
              const supabase = getSupabaseBrowserClient();
              supabase.auth.signInWithOAuth({
                provider: "google",
                options: { redirectTo: `${window.location.origin}/auth/callback?role=OWNER` },
              });
            }}
            className="w-full rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 py-3 text-xs font-bold text-white transition-colors flex items-center justify-center gap-2"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue as a partner
          </button>
        </div>
      </div>
    </div>
  );
}
