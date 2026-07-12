"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw, Home } from "lucide-react";

export default function StaysError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Stays Error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent)]/10 text-[var(--accent)]">
        <svg
          className="h-8 w-8"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75"
          />
        </svg>
      </div>
      <h2 className="font-fraunces text-2xl font-bold text-[var(--text-1)] mb-2">
        This stay took a wrong turn
      </h2>
      <p className="text-sm text-[var(--text-2)] mb-7 max-w-sm">
        We hit a snag loading this page. Give it another try, or head back to
        browse all stays.
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[var(--accent-hover)] active:scale-95"
        >
          <RotateCcw className="h-4 w-4" />
          Try again
        </button>
        <Link
          href="/hotels"
          className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-sm font-semibold text-[var(--text-1)] transition-all hover:bg-[var(--surface-alt)] active:scale-95"
        >
          <Home className="h-4 w-4" />
          All stays
        </Link>
      </div>
    </div>
  );
}
