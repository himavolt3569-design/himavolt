"use client";

import Link from "next/link";
import { PlayCircle } from "lucide-react";

/**
 * "Watch video" entry point for the dashboard chrome.
 *
 * Sits beside the clock and the Live badge, on every dashboard page, because
 * the moment an owner needs a walkthrough is the moment they are stuck inside a
 * screen — not when they are back on the marketing site.
 *
 * Collapses to an icon under `sm` so it never competes with the notification
 * bell and profile control on a phone.
 */
export default function WatchDemoButton({
  className = "",
}: {
  className?: string;
}) {
  return (
    <Link
      href="/demo"
      aria-label="Watch video walkthroughs"
      title="Watch video walkthroughs"
      className={`group inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-muted)] px-2 py-1 text-[11px] font-semibold text-[var(--accent-text)] ring-1 ring-[var(--accent-border)] transition-all hover:bg-[var(--accent)] hover:text-white hover:ring-[var(--accent)] active:scale-[0.96] sm:px-2.5 ${className}`}
    >
      <PlayCircle className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:scale-110" />
      <span className="hidden whitespace-nowrap sm:inline">Watch video</span>
    </Link>
  );
}
