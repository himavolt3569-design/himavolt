"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Dashboard Error]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--canvas-sub)] px-6 text-center">
      <div className="rounded-2xl bg-[var(--canvas)] p-10 ring-1 ring-[var(--border)] shadow-sm max-w-md w-full">
        <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-xl bg-red-50 text-red-500 mb-5">
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-[var(--text-1)] mb-2">
          Dashboard Error
        </h2>
        <p className="text-sm text-[var(--text-2)] mb-6">
          Something went wrong loading the dashboard. Please try again.
        </p>
        <button
          onClick={reset}
          className="rounded-xl bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[var(--accent)] active:scale-95"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
