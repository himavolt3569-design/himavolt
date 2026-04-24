"use client";

import { useRouter } from "next/navigation";
import { LockKeyhole, LogOut, ChefHat } from "lucide-react";
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
    <div className="dark flex min-h-screen items-center justify-center bg-[#0a0a0a] p-6 text-white">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-md rounded-3xl border border-white/10 bg-gradient-to-b from-[#141414] to-[#0d0d0d] p-8 text-center shadow-2xl"
      >
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/10 ring-2 ring-amber-500/30">
          <LockKeyhole className="h-9 w-9 text-amber-400" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight">POS is not active</h1>
        <p className="mt-2 text-sm leading-relaxed text-white/60">
          Hi <span className="font-semibold text-white/90">{staffName}</span> — the
          owner of{" "}
          <span className="font-semibold text-amber-300">{restaurantName}</span> hasn&apos;t
          turned on the POS yet.
        </p>

        <div className="mt-8 rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-left">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
            What happens next
          </p>
          <p className="mt-2 text-sm leading-relaxed text-white/70">
            Ask the owner to sign in to the dashboard and press{" "}
            <span className="font-semibold text-amber-300">Activate POS</span>. Once
            activated, refresh this page to access the POS terminal.
          </p>
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
