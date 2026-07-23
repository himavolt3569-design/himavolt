"use client";

import { Download } from "lucide-react";
import { usePwaInstall } from "@/context/PwaInstallContext";

/**
 * Sticky top nudge that replaces the old location bar. Renders nothing unless
 * the browser has offered a native install prompt and the app isn't already
 * installed (same gate as InstallAppButton) — so it's silent on iOS Safari
 * and once installed.
 */
export default function InstallAppBar() {
  const { canInstall, promptInstall } = usePwaInstall();
  if (!canInstall) return null;

  return (
    <div className="sticky top-[var(--nav-height,56px)] z-40 bg-gradient-to-r from-[var(--accent)] to-orange-500 border-b border-[var(--border-soft)]">
      <div className="mx-auto max-w-7xl px-4 md:px-8 lg:px-12 py-2.5 flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-3">
        <button
          onClick={() => promptInstall()}
          className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-[13px] font-black tracking-wide text-brand-700 shadow-lg ring-2 ring-white/70 hover:scale-105 active:scale-95 transition-transform duration-200"
        >
          <Download className="h-4 w-4" />
          INSTALL APP
        </button>
        <span className="text-[10.5px] font-medium text-white/80 text-center">
          Just saves this webpage to your home screen - no app store, no real download.
        </span>
      </div>
    </div>
  );
}
