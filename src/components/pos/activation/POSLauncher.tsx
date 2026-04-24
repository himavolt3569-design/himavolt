"use client";

import { useRouter } from "next/navigation";
import { Zap, ArrowUpRight, Sparkles } from "lucide-react";
import type { Restaurant } from "@/context/RestaurantContext";

interface Props {
  restaurant: Restaurant | null;
  onRequestActivate: () => void;
  compact?: boolean;
}

export default function POSLauncher({
  restaurant,
  onRequestActivate,
  compact,
}: Props) {
  const router = useRouter();

  if (!restaurant) return null;

  const isActive = !!restaurant.posEnabled;

  if (compact) {
    return (
      <button
        onClick={() =>
          isActive ? router.push("/pos/staff") : onRequestActivate()
        }
        title={isActive ? "Open POS terminal" : "Activate POS"}
        className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
          isActive
            ? "bg-[var(--accent)] text-white shadow-sm shadow-[var(--accent)]/30 hover:bg-[var(--accent-hover)]"
            : "border border-dashed border-[var(--accent-border)] bg-[var(--accent-muted)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white"
        }`}
      >
        <Zap className="h-4 w-4" />
      </button>
    );
  }

  if (isActive) {
    return (
      <div className="mx-3 mb-3">
        <button
          onClick={() => router.push("/pos/staff")}
          className="group flex w-full items-center gap-3 overflow-hidden rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] p-3 text-left text-white shadow-sm shadow-[var(--accent)]/20 transition-all hover:shadow-md hover:shadow-[var(--accent)]/30 active:scale-[0.98]"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/25">
            <Zap className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold leading-tight">Open POS</p>
            <p className="truncate text-[10px] text-white/75">
              {restaurant.posTerminalName ?? "Terminal"} &middot; Ready
            </p>
          </div>
          <ArrowUpRight className="h-4 w-4 shrink-0 opacity-80 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="mx-3 mb-3">
      <button
        onClick={onRequestActivate}
        className="group flex w-full items-center gap-3 overflow-hidden rounded-xl border border-dashed border-[var(--accent-border)] bg-[var(--accent-muted)] p-3 text-left transition-all hover:border-solid hover:bg-[var(--accent)]/15 hover:shadow-sm"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--canvas)] ring-1 ring-[var(--accent-border)]">
          <Sparkles className="h-4 w-4 text-[var(--accent)]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-[var(--accent-text)] leading-tight">
            Set up POS
          </p>
          <p className="truncate text-[10px] text-[var(--accent-text)]/80">
            Take orders &amp; bill in seconds
          </p>
        </div>
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-50" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent)]" />
        </span>
      </button>
    </div>
  );
}
