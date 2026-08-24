"use client";

import { useRouter } from "next/navigation";
import { LogOut, ChefHat, Moon, Lock } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  restaurantName: string;
  staffName: string;
}

export default function POSInactiveScreen({ restaurantName, staffName }: Props) {
  const router = useRouter();

  async function logout() {
    try {
      await fetch("/api/staff-session", { method: "DELETE", credentials: "include" });
    } catch {
      // ignore
    }
    router.push("/staff-login");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--canvas-sub)] p-4 font-sans antialiased">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
        className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-xl"
      >
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-[var(--accent-muted)] border border-[var(--accent-border)]">
          <Moon className="h-10 w-10 text-[var(--accent)]" />
        </div>

        <h2 className="mb-3 text-3xl font-black tracking-tight text-[var(--text-1)]">
          Terminal Inactive
        </h2>
        <p className="mb-8 text-lg font-medium leading-relaxed text-[var(--text-2)]">
          Hi <span className="font-semibold text-[var(--text-1)]">{staffName}</span>, the
          owner of{" "}
          <span className="font-semibold text-[var(--accent)]">{restaurantName}</span> hasn&apos;t
          turned on the POS yet.
        </p>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--canvas)] p-5 text-left">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[var(--text-3)]">
            <Lock className="h-4 w-4" />
            Device Status
          </div>
          <div className="flex items-center gap-3">
            <div className="relative flex h-3 w-3 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-20"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500"></span>
            </div>
            <span className="font-semibold text-[var(--text-2)]">
              Awaiting Manager Activation
            </span>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <button
            onClick={() => router.push("/kitchen")}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-black transition-colors hover:bg-amber-400"
          >
            <ChefHat className="h-4 w-4" />
            Go to Kitchen Display
          </button>
          <button
            onClick={logout}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-white/80 transition-colors hover:bg-white/5"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </motion.div>
    </div>
  );
}
