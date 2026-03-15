"use client";

import { Clock } from "lucide-react";
import { useCountdown, formatCountdown } from "@/hooks/useCountdown";

interface OfferCountdownProps {
  expiresAt: string | null | undefined;
  className?: string;
  /** Compact mode for small cards */
  compact?: boolean;
}

export default function OfferCountdown({
  expiresAt,
  className = "",
  compact = false,
}: OfferCountdownProps) {
  const remaining = useCountdown(expiresAt);

  if (!expiresAt || remaining <= 0) return null;

  const isUrgent = remaining < 30 * 60 * 1000; // < 30 min

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white shadow ${
          isUrgent
            ? "bg-gradient-to-r from-red-500 to-red-600"
            : "bg-gradient-to-r from-orange-500 to-amber-500"
        } ${className}`}
      >
        <Clock className="h-2.5 w-2.5" />
        {formatCountdown(remaining)}
      </span>
    );
  }

  return (
    <div
      className={`absolute top-2 left-2 z-10 flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-white shadow-lg backdrop-blur-sm ${
        isUrgent
          ? "bg-red-500/90"
          : "bg-gradient-to-r from-orange-500/90 to-amber-500/90"
      } ${className}`}
    >
      <Clock className="h-3 w-3" />
      {formatCountdown(remaining)}
    </div>
  );
}
