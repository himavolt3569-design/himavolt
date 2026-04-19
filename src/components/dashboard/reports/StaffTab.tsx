"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, ArrowDown, ArrowUp, Users } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { formatPrice } from "@/lib/currency";
import { useRestaurant } from "@/context/RestaurantContext";
import DateRangePicker from "./DateRangePicker";
import { presetRange } from "./utils";

interface StaffRow {
  staffId: string;
  name: string;
  orderCount: number;
  revenue: number;
}

interface OverviewPayload {
  topStaff: StaffRow[];
}

type SortKey = "revenue" | "orderCount" | "avgValue";

interface Props {
  onOpenStaff: (staffId: string) => void;
}

export default function StaffTab({ onOpenStaff }: Props) {
  const { selectedRestaurant } = useRestaurant();
  const cur = selectedRestaurant?.currency ?? "NPR";
  const [range, setRange] = useState(() => presetRange("last30"));
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("revenue");
  const [sortDesc, setSortDesc] = useState(true);

  const load = useCallback(async () => {
    if (!selectedRestaurant) return;
    setLoading(true);
    try {
      const res = (await apiFetch(
        `/api/restaurants/${selectedRestaurant.id}/reports/overview?from=${range.from}&to=${range.to}&granularity=day`,
      )) as OverviewPayload;
      setRows(res.topStaff ?? []);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, [selectedRestaurant, range]);

  useEffect(() => {
    load();
  }, [load]);

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const av =
        sortKey === "revenue"
          ? a.revenue
          : sortKey === "orderCount"
            ? a.orderCount
            : a.orderCount > 0
              ? a.revenue / a.orderCount
              : 0;
      const bv =
        sortKey === "revenue"
          ? b.revenue
          : sortKey === "orderCount"
            ? b.orderCount
            : b.orderCount > 0
              ? b.revenue / b.orderCount
              : 0;
      return sortDesc ? bv - av : av - bv;
    });
    return copy;
  }, [rows, sortKey, sortDesc]);

  const maxRevenue = Math.max(1, ...rows.map((r) => r.revenue));

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDesc(!sortDesc);
    } else {
      setSortKey(key);
      setSortDesc(true);
    }
  }

  return (
    <div className="space-y-5">
      <DateRangePicker
        from={range.from}
        to={range.to}
        onChange={setRange}
        disabled={loading}
      />

      {loading && rows.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--accent)]" />
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-[var(--text-3)]">
          <Users className="h-6 w-6" />
          <p className="text-xs font-semibold">
            No staff-attributed orders in this range.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--canvas)]/70 overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-soft)] text-[10px] font-bold uppercase tracking-wider text-[var(--text-3)]">
            <span className="w-6">#</span>
            <span className="flex-1">Staff</span>
            <SortBtn
              label="Orders"
              active={sortKey === "orderCount"}
              desc={sortDesc}
              onClick={() => toggleSort("orderCount")}
              className="w-20 text-right"
            />
            <SortBtn
              label="Avg"
              active={sortKey === "avgValue"}
              desc={sortDesc}
              onClick={() => toggleSort("avgValue")}
              className="w-24 text-right"
            />
            <SortBtn
              label="Revenue"
              active={sortKey === "revenue"}
              desc={sortDesc}
              onClick={() => toggleSort("revenue")}
              className="w-32 text-right"
            />
          </div>

          <ul className="divide-y divide-[var(--border-soft)]">
            {sorted.map((r, i) => {
              const avg = r.orderCount > 0 ? r.revenue / r.orderCount : 0;
              const pct = (r.revenue / maxRevenue) * 100;
              return (
                <li key={r.staffId}>
                  <button
                    type="button"
                    onClick={() => onOpenStaff(r.staffId)}
                    className="relative flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[var(--canvas-sub)] transition"
                  >
                    <span
                      aria-hidden
                      className="absolute inset-y-0 left-0 bg-[var(--accent)]/5"
                      style={{ width: `${pct}%` }}
                    />
                    <span className="relative w-6 text-[11px] font-bold text-[var(--text-3)]">
                      {i + 1}
                    </span>
                    <span className="relative flex-1 min-w-0">
                      <span className="block text-sm font-semibold text-[var(--text-1)] truncate">
                        {r.name}
                      </span>
                    </span>
                    <span className="relative w-20 text-right text-xs text-[var(--text-2)]">
                      {r.orderCount}
                    </span>
                    <span className="relative w-24 text-right text-xs text-[var(--text-2)]">
                      {formatPrice(avg, cur)}
                    </span>
                    <span className="relative w-32 text-right text-sm font-bold text-[var(--text-1)]">
                      {formatPrice(r.revenue, cur)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function SortBtn({
  label,
  active,
  desc,
  onClick,
  className,
}: {
  label: string;
  active: boolean;
  desc: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-end gap-1 hover:text-[var(--text-1)] ${
        active ? "text-[var(--text-1)]" : ""
      } ${className ?? ""}`}
    >
      {label}
      {active &&
        (desc ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />)}
    </button>
  );
}
