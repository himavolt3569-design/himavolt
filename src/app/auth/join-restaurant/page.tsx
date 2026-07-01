"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Mountain, Loader2, ArrowLeft, Users, CheckCircle2, Hash } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function JoinRestaurantPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ status: string; restaurantName: string } | null>(null);

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.replace("/sign-in");
  }, [isLoaded, isSignedIn, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || loading) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/staff/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantCode: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't find that restaurant. Check the code and try again.");
        setLoading(false);
        return;
      }
      setResult(data);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--canvas-sub)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--canvas-sub)] p-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
        className="w-full max-w-sm"
      >
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2">
            <Mountain className="h-8 w-8 text-[var(--accent)]" strokeWidth={2.5} />
            <span className="text-2xl font-black tracking-tight text-[var(--text-1)]">
              Hima<span className="text-[var(--accent)]">Volt</span>
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--canvas)] p-6 shadow-xl shadow-black/[0.04]">
          <AnimatePresence mode="wait">
            {!result ? (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="mb-5 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => router.push("/auth/get-started")}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--canvas)] hover:bg-[var(--surface)] transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4 text-[var(--text-2)]" />
                  </button>
                  <div>
                    <h1 className="text-lg font-bold text-[var(--text-1)]">Join Existing Restaurant</h1>
                    <p className="text-[12px] text-[var(--text-3)]">Ask the owner for their restaurant code.</p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="rounded-xl border border-[var(--status-error-text)]/20 bg-[var(--status-error-bg)] px-4 py-3 text-sm text-[var(--status-error-text)]">
                      {error}
                    </div>
                  )}

                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-3)]">
                      Restaurant Code
                    </label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-3)]" />
                      <input
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        required
                        placeholder="HH-1A2B"
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] py-2.5 pl-10 pr-4 text-sm font-mono tracking-wider text-[var(--text-1)] placeholder:text-[var(--text-3)] placeholder:font-sans placeholder:tracking-normal focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)] transition-colors"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !code.trim()}
                    className="w-full rounded-xl bg-[var(--accent)] py-3 text-sm font-bold text-white shadow-md shadow-[var(--accent)]/20 hover:bg-[var(--accent-hover)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Request to Join"}
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-2"
              >
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent-muted)]">
                  {result.status === "already-member" ? (
                    <Users className="h-7 w-7 text-[var(--accent)]" />
                  ) : (
                    <CheckCircle2 className="h-7 w-7 text-[var(--accent)]" />
                  )}
                </div>
                <h2 className="text-lg font-bold text-[var(--text-1)] mb-1.5">
                  {result.status === "already-member" ? "You're already a member" : "Request sent"}
                </h2>
                <p className="text-sm text-[var(--text-3)] leading-snug">
                  {result.status === "already-member"
                    ? `You're already staff at "${result.restaurantName}".`
                    : `The owner of "${result.restaurantName}" will review and activate your account.`}
                </p>
                <Link
                  href="/"
                  className="mt-6 inline-block text-sm font-bold text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
                >
                  Continue to HimaVolt
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
