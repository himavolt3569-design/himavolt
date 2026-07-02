"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Mountain, Loader2, Store, Users, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

type Choice = "CREATE" | "JOIN";

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function GetStartedPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useAuth();

  const [username, setUsername] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [choice, setChoice] = useState<Choice | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace("/sign-in");
      return;
    }
    if (!isSignedIn) return;

    let cancelled = false;
    (async () => {
      try {
        const [meRes, restaurantsRes] = await Promise.all([
          fetch("/api/me", { cache: "no-store" }),
          fetch("/api/restaurants", { cache: "no-store" }),
        ]);
        if (cancelled) return;

        if (restaurantsRes.ok) {
          const restaurants = await restaurantsRes.json();
          if (Array.isArray(restaurants) && restaurants.length > 0) {
            router.replace("/dashboard");
            return;
          }
        }

        if (meRes.ok) {
          const me = await meRes.json();
          setUsername(me.username ?? null);
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, router]);

  const handleContinue = async () => {
    if (!choice || submitting) return;
    setSubmitting(true);
    setError("");

    try {
      if (choice === "CREATE") {
        await fetch("/api/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "OWNER" }),
        });
        router.push("/dashboard");
      } else {
        router.push("/auth/join-restaurant");
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  if (!isLoaded || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--canvas-sub)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ??
    (user?.user_metadata?.name as string | undefined) ??
    user?.email?.split("@")[0] ??
    "there";

  const avatarUrl =
    (user?.user_metadata?.avatar_url as string | undefined) ??
    (user?.user_metadata?.picture as string | undefined) ??
    null;

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
          <h1 className="text-lg font-bold text-[var(--text-1)]">Get Started</h1>
          <p className="mt-1 text-[13px] text-[var(--text-3)] leading-snug">
            Tell us how you&apos;ll be using HimaVolt.
          </p>

          <div className="mt-5 mb-2">
            <p className={"mb-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-3)]"}>
              Your Profile
            </p>
            <div className="flex items-center gap-3 rounded-xl bg-[var(--canvas-sub)] px-3.5 py-2.5 ring-1 ring-[var(--border)]/70">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
              ) : (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-muted)] text-xs font-bold text-[var(--accent-text)]">
                  {initialsOf(displayName)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-[var(--text-1)]">{displayName}</p>
                {username && <p className="truncate text-[11px] text-[var(--text-3)]">@{username}</p>}
              </div>
            </div>
          </div>

          <div className="mt-5">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-3)]">
              I want to <span className="text-[var(--accent)]">*</span>
            </p>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setChoice("CREATE")}
                className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all ${
                  choice === "CREATE"
                    ? "border-[var(--accent)] bg-[var(--accent-muted)] ring-1 ring-[var(--accent)]"
                    : "border-[var(--border)] bg-[var(--canvas)] hover:bg-[var(--canvas-sub)]"
                }`}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--surface)] text-[var(--accent)]">
                  <Store className="h-4.5 w-4.5" />
                </div>
                <span className="flex-1 text-[13px] font-semibold text-[var(--text-1)]">
                  Create New Restaurant
                </span>
                <span
                  className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border-2 ${
                    choice === "CREATE" ? "border-[var(--accent)]" : "border-[var(--border)]"
                  }`}
                >
                  {choice === "CREATE" && <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setChoice("JOIN")}
                className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all ${
                  choice === "JOIN"
                    ? "border-[var(--accent)] bg-[var(--accent-muted)] ring-1 ring-[var(--accent)]"
                    : "border-[var(--border)] bg-[var(--canvas)] hover:bg-[var(--canvas-sub)]"
                }`}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--surface)] text-[var(--text-1)]">
                  <Users className="h-4.5 w-4.5" />
                </div>
                <span className="flex-1 text-[13px] font-semibold text-[var(--text-1)]">
                  Join Existing Restaurant
                </span>
                <span
                  className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border-2 ${
                    choice === "JOIN" ? "border-[var(--accent)]" : "border-[var(--border)]"
                  }`}
                >
                  {choice === "JOIN" && <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />}
                </span>
              </button>
            </div>
          </div>

          {error && <p className="mt-3 text-[12px] text-red-500">{error}</p>}

          <button
            type="button"
            onClick={handleContinue}
            disabled={!choice || submitting}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] py-3 text-sm font-bold text-white shadow-md shadow-[var(--accent)]/20 hover:bg-[var(--accent-hover)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Continue
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
