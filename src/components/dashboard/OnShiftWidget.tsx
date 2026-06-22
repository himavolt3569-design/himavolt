"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Clock,
  UserCheck,
  UserX,
  Loader2,
  RefreshCw,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { apiFetch, peekApiCache } from "@/lib/api-client";

interface StaffShape {
  id: string;
  role: string;
  staffType: string;
  name: string;
  email: string;
}

interface ShiftShape {
  id: string;
  label: string | null;
  startTime: string;
  endTime: string;
  actualEndTime: string | null;
  startsAt: string;
  endsAt: string;
  effectiveEndsAt: string;
  staff: StaffShape;
}

interface LiveResponse {
  now: string;
  onShift: ShiftShape[];
  upcoming: ShiftShape[];
  alwaysOn: StaffShape[];
  offToday: StaffShape[];
}

interface Props {
  restaurantId: string | undefined;
  onOpenShifts?: () => void;
}

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  MANAGER: "Manager",
  CHEF: "Chef",
  WAITER: "Waiter",
  CASHIER: "Cashier",
};

export default function OnShiftWidget({ restaurantId, onOpenShifts }: Props) {
  // Seed from the warm GET cache so the overview widget paints instantly.
  const shiftsNowPath = restaurantId ? `/api/restaurants/${restaurantId}/shifts/now` : "";
  const [data, setData] = useState<LiveResponse | null>(() => peekApiCache<LiveResponse>(shiftsNowPath) ?? null);
  const [loading, setLoading] = useState(() => !peekApiCache(shiftsNowPath));
  const [refreshing, setRefreshing] = useState(false);
  const [endingId, setEndingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const load = useCallback(
    async (initial = false) => {
      if (!restaurantId) return;
      const path = `/api/restaurants/${restaurantId}/shifts/now`;
      // Poll (initial=false) bypasses cache via the short TTL expiring; an
      // initial open paints from cache when warm.
      if (initial) {
        if (!peekApiCache(path)) setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);
      try {
        const json = await apiFetch<LiveResponse>(path, {
          cacheTtl: initial ? 30_000 : 0,
        });
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [restaurantId],
  );

  useEffect(() => {
    load(true);
    const id = setInterval(() => load(false), 60_000);
    return () => clearInterval(id);
  }, [load]);

  // Rerender for live relative-time once per minute
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  async function endShiftNow(shiftId: string) {
    if (!restaurantId) return;
    setEndingId(shiftId);
    try {
      await fetch(
        `/api/restaurants/${restaurantId}/shifts/${shiftId}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actualEndTime: new Date().toISOString(),
          }),
        },
      );
      await load(false);
    } catch {
      // ignore — next refresh will retry state
    } finally {
      setEndingId(null);
    }
  }

  const totalOnShift = data?.onShift.length ?? 0;
  const alwaysOnCount = data?.alwaysOn.length ?? 0;

  if (!restaurantId) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl bg-[var(--canvas)]/90 ring-1 ring-[var(--border)] p-5 shadow-sm"
      // tick is referenced so "X min ago" recomputes
      data-tick={tick}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-[14px] font-bold text-[var(--text-1)]">
            <UserCheck className="h-4 w-4 text-[var(--accent)]" />
            On shift right now
          </h3>
          <p className="mt-0.5 text-[11px] text-[var(--text-3)]">
            {totalOnShift} shift-based + {alwaysOnCount} full-time/management
          </p>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => load(false)}
            disabled={refreshing}
            title="Refresh"
            className="rounded-lg p-1.5 text-[var(--text-3)] transition-colors hover:bg-[var(--canvas-sub)] disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
            />
          </button>
          {onOpenShifts && (
            <button
              onClick={onOpenShifts}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-[var(--accent-text)] transition-colors hover:bg-[var(--accent-muted)]"
            >
              Manage
              <ChevronRight className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="flex h-20 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--text-3)]" />
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </div>
      )}

      {!loading && !error && data && (
        <div className="space-y-4">
          {/* Currently on shift */}
          {data.onShift.length === 0 && data.alwaysOn.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--canvas-sub)] p-5 text-center">
              <Users className="mx-auto h-6 w-6 text-[var(--text-3)]" />
              <p className="mt-2 text-sm font-semibold text-[var(--text-2)]">
                No one is on shift right now.
              </p>
              {onOpenShifts && (
                <button
                  onClick={onOpenShifts}
                  className="mt-3 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[var(--accent-hover)]"
                >
                  Schedule a shift
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {data.onShift.map((s) => (
                <OnShiftRow
                  key={s.id}
                  shift={s}
                  ending={endingId === s.id}
                  onEnd={() => endShiftNow(s.id)}
                />
              ))}

              {data.alwaysOn.map((s) => (
                <AlwaysOnRow key={s.id} staff={s} />
              ))}
            </div>
          )}

          {/* Upcoming */}
          {data.upcoming.length > 0 && (
            <UpcomingBlock shifts={data.upcoming} />
          )}

          {/* Off today */}
          <AnimatePresence>
            {data.offToday.length > 0 && (
              <OffTodayBlock staff={data.offToday} />
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

function OnShiftRow({
  shift,
  ending,
  onEnd,
}: {
  shift: ShiftShape;
  ending: boolean;
  onEnd: () => void;
}) {
  const since = relativeSince(shift.startsAt);
  const until = relativeUntil(shift.effectiveEndsAt);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--accent-border)] bg-[var(--accent-muted)] p-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent)] text-white shadow-sm shadow-[var(--accent)]/30">
        <span className="text-xs font-bold">{initials(shift.staff.name)}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-[var(--accent-text)]">
          {shift.staff.name}
        </p>
        <p className="truncate text-[11px] text-[var(--accent-text)]/75">
          {ROLE_LABEL[shift.staff.role] ?? shift.staff.role} ·{" "}
          {shift.startTime}–{shift.endTime}
          {shift.label ? ` · ${shift.label}` : ""}
        </p>
        <p className="mt-1 flex items-center gap-1 text-[10px] text-[var(--accent-text)]/65">
          <Clock className="h-3 w-3" />
          On shift for {since} · ends in {until}
        </p>
      </div>
      <button
        onClick={onEnd}
        disabled={ending}
        className="flex shrink-0 items-center gap-1 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60 dark:bg-red-950/40"
        title="End this shift now (sets actualEndTime)"
      >
        {ending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <LogOut className="h-3 w-3" />
        )}
        End shift
      </button>
    </div>
  );
}

function AlwaysOnRow({ staff }: { staff: StaffShape }) {
  const tag =
    staff.staffType === "FULL_TIME"
      ? "Full-time"
      : `${ROLE_LABEL[staff.role] ?? staff.role} (management)`;
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] p-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--surface)] text-[var(--text-2)]">
        <span className="text-xs font-bold">{initials(staff.name)}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[var(--text-1)]">
          {staff.name}
        </p>
        <p className="text-[11px] text-[var(--text-3)]">
          {ROLE_LABEL[staff.role] ?? staff.role} · {tag} · always on
        </p>
      </div>
    </div>
  );
}

function UpcomingBlock({ shifts }: { shifts: ShiftShape[] }) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-3)]">
        Coming up
      </p>
      <div className="space-y-1.5">
        {shifts.map((s) => {
          const countdown = relativeUntil(s.startsAt);
          return (
            <div
              key={s.id}
              className="flex items-center gap-3 rounded-lg bg-[var(--canvas-sub)] px-3 py-2"
            >
              <Clock className="h-3.5 w-3.5 shrink-0 text-[var(--text-3)]" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-[var(--text-2)]">
                  {s.staff.name}
                </p>
                <p className="truncate text-[10px] text-[var(--text-3)]">
                  {ROLE_LABEL[s.staff.role] ?? s.staff.role} · {s.startTime}–
                  {s.endTime}
                </p>
              </div>
              <span className="shrink-0 rounded-md bg-[var(--surface)] px-2 py-0.5 text-[10px] font-bold text-[var(--text-2)]">
                in {countdown}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OffTodayBlock({ staff }: { staff: StaffShape[] }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] p-3"
    >
      <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-3)]">
        <UserX className="h-3 w-3" />
        No shift today ({staff.length})
      </p>
      <div className="flex flex-wrap gap-1.5">
        {staff.map((s) => (
          <span
            key={s.id}
            className="rounded-md bg-[var(--surface)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-2)]"
            title={ROLE_LABEL[s.role] ?? s.role}
          >
            {s.name}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return (
    (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? parts[0]?.[1] ?? "")
  ).toUpperCase();
}

/** Returns a short "Xh Ym" / "Xm" string comparing `from` to now. */
function relativeSince(fromIso: string): string {
  const diff = Math.max(0, Date.now() - new Date(fromIso).getTime());
  return formatDuration(diff);
}

/** Returns "Xh Ym" or "Xm" until `untilIso`. Clamps at 0. */
function relativeUntil(untilIso: string): string {
  const diff = Math.max(0, new Date(untilIso).getTime() - Date.now());
  return formatDuration(diff);
}

function formatDuration(ms: number): string {
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "< 1 min";
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (remMins === 0) return `${hours}h`;
  return `${hours}h ${remMins}m`;
}
