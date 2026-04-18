"use client";

import { Calendar } from "lucide-react";
import { presetRange, type PresetKey } from "./utils";

interface Props {
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
  disabled?: boolean;
}

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "last7", label: "Last 7 days" },
  { key: "last30", label: "Last 30 days" },
  { key: "thisMonth", label: "This month" },
  { key: "lifetime", label: "Lifetime" },
];

export default function DateRangePicker({ from, to, onChange, disabled }: Props) {
  const activePreset = PRESETS.find((p) => {
    const r = presetRange(p.key);
    return r.from === from && r.to === to;
  });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            disabled={disabled}
            onClick={() => onChange(presetRange(p.key))}
            className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors ${
              activePreset?.key === p.key
                ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                : "border-[var(--border)] bg-[var(--canvas)] text-[var(--text-2)] hover:border-[var(--accent-border)]"
            } disabled:opacity-50`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--canvas)] px-3 py-1.5">
        <Calendar className="h-3.5 w-3.5 text-[var(--text-3)]" />
        <input
          type="date"
          value={from}
          max={to}
          disabled={disabled}
          onChange={(e) => onChange({ from: e.target.value, to })}
          className="text-xs font-medium text-[var(--text-1)] outline-none bg-transparent"
        />
        <span className="text-[var(--text-3)] text-xs">to</span>
        <input
          type="date"
          value={to}
          min={from}
          disabled={disabled}
          onChange={(e) => onChange({ from, to: e.target.value })}
          className="text-xs font-medium text-[var(--text-1)] outline-none bg-transparent"
        />
      </div>
    </div>
  );
}
