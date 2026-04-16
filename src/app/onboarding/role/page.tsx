"use client";

import { useState } from "react";
import {
  Mountain,
  Loader2,
  UtensilsCrossed,
  Building2,
  Check,
  ShoppingBag,
  BarChart3,
  Users,
  ClipboardList,
  Heart,
} from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Role = "CUSTOMER" | "OWNER";

const CUSTOMER_FEATURES = [
  { icon: UtensilsCrossed, text: "Browse restaurant menus" },
  { icon: ShoppingBag, text: "Order & track delivery" },
  { icon: Heart, text: "Save your favourites" },
];

const OWNER_FEATURES = [
  { icon: ClipboardList, text: "Live order management" },
  { icon: BarChart3, text: "Analytics & reports" },
  { icon: Users, text: "Staff & inventory control" },
];

export default function OnboardingRolePage() {
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleContinue = async () => {
    if (!role) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Something went wrong");
      }

      if (role === "OWNER") {
        router.push("/onboarding");
      } else {
        router.push("/");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--canvas-sub)] p-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
        className="w-full max-w-lg"
      >
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <Mountain className="h-8 w-8 text-[var(--accent)]" strokeWidth={2.5} />
            <span className="text-2xl font-extrabold tracking-tight text-[var(--text-1)]">
              Hima<span className="text-[var(--accent)]">Volt</span>
            </span>
          </Link>
          <p className="mt-3 text-lg font-bold text-[var(--text-1)]">
            Welcome! How will you use HimaVolt?
          </p>
          <p className="mt-1 text-sm text-[var(--text-3)]">
            Pick your account type — you can always reach out to change it later
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-6">
          <button
            onClick={() => setRole("CUSTOMER")}
            className={`relative rounded-2xl border-2 p-5 text-left transition-all duration-200 ${
              role === "CUSTOMER"
                ? "border-[var(--accent)] bg-[var(--accent)]/5 shadow-lg shadow-[var(--accent)]/10"
                : "border-[var(--border)] bg-[var(--canvas)] hover:border-[var(--border)] hover:shadow-sm"
            }`}
          >
            {role === "CUSTOMER" && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent)]"
              >
                <Check className="h-3.5 w-3.5 text-white" />
              </motion.div>
            )}
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent)]/10">
              <UtensilsCrossed className="h-6 w-6 text-[var(--accent)]" />
            </div>
            <h3 className="text-base font-bold text-[var(--text-1)] mb-1">
              Food Lover
            </h3>
            <p className="text-xs text-[var(--text-2)] mb-4 leading-relaxed">
              Discover restaurants &amp; order your favourite meals
            </p>
            <ul className="space-y-2">
              {CUSTOMER_FEATURES.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-2 text-xs text-[var(--text-2)]">
                  <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
                  {text}
                </li>
              ))}
            </ul>
          </button>

          <button
            onClick={() => setRole("OWNER")}
            className={`relative rounded-2xl border-2 p-5 text-left transition-all duration-200 ${
              role === "OWNER"
                ? "border-[#3e1e0c] bg-[var(--text-1)] shadow-lg shadow-[var(--text-1)]/20"
                : "border-[var(--border)] bg-[var(--canvas)] hover:border-[var(--border)] hover:shadow-sm"
            }`}
          >
            {role === "OWNER" ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent)]"
              >
                <Check className="h-3.5 w-3.5 text-[var(--text-1)]" />
              </motion.div>
            ) : (
              <span className="absolute right-4 top-4 rounded-full bg-[var(--accent-muted)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--accent-text)]">
                Business
              </span>
            )}
            <div
              className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${
                role === "OWNER" ? "bg-[var(--canvas)]/80" : "bg-[var(--surface)]"
              }`}
            >
              <Building2
                className={`h-6 w-6 ${
                  role === "OWNER" ? "text-[var(--accent)]" : "text-[var(--text-2)]"
                }`}
              />
            </div>
            <h3
              className={`text-base font-bold mb-1 ${
                role === "OWNER" ? "text-white" : "text-[var(--text-1)]"
              }`}
            >
              Restaurant Owner
            </h3>
            <p
              className={`text-xs mb-4 leading-relaxed ${
                role === "OWNER" ? "text-white/60" : "text-[var(--text-2)]"
              }`}
            >
              Manage your restaurant, staff &amp; grow your business
            </p>
            <ul className="space-y-2">
              {OWNER_FEATURES.map(({ icon: Icon, text }) => (
                <li
                  key={text}
                  className={`flex items-center gap-2 text-xs ${
                    role === "OWNER" ? "text-white/70" : "text-[var(--text-2)]"
                  }`}
                >
                  <Icon
                    className={`h-3.5 w-3.5 shrink-0 ${
                      role === "OWNER" ? "text-[var(--accent)]" : "text-[var(--text-2)]"
                    }`}
                  />
                  {text}
                </li>
              ))}
            </ul>
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          onClick={handleContinue}
          disabled={!role || loading}
          className="w-full rounded-xl bg-[var(--accent)] py-3 text-sm font-bold text-white transition-all hover:bg-[var(--accent-hover)] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-[var(--accent)]/20"
        >
          {loading ? (
            <Loader2 className="mx-auto h-4 w-4 animate-spin" />
          ) : (
            "Continue"
          )}
        </button>
      </motion.div>
    </div>
  );
}
