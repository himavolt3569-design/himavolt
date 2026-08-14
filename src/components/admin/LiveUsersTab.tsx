"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Store,
  Shield,
  UserCheck,
  User as UserIcon,
  MapPin,
  Compass,
  RefreshCw,
  Loader2,
  CircleDot,
  ChevronRight,
} from "lucide-react";

/* ── Types ─────────────────────────────────────────────────────────── */

type Scope = "CUSTOMER" | "OWNER" | "STAFF" | "ADMIN";

interface LiveEntry {
  key: string;
  scope: Scope;
  signedIn: boolean;
  lastSeenAt: number;
  secondsAgo: number;
  id?: string;
  userId?: string;
  name?: string;
  email?: string;
  phone?: string;
  imageUrl?: string;
  roleLabel?: string;
  restaurantId?: string;
  restaurantName?: string | null;
  city?: string;
  country?: string;
  path?: string;
}

interface Counts {
  total: number;
  signedInCustomers: number;
  anonymousCustomers: number;
  customers: number;
  owners: number;
  staff: number;
  admins: number;
  generatedAt: string;
  ttlSeconds: number;
}

interface LiveResponse {
  counts: Counts;
  entries: LiveEntry[];
}

const POLL_MS = 12_000;

/* ── Helpers ───────────────────────────────────────────────────────── */

function formatAgo(seconds: number): string {
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

function prettyPath(path?: string): string {
  if (!path || path === "/") return "Home";
  return path.length > 40 ? `${path.slice(0, 39)}…` : path;
}

/** The User.id we can open a detail drawer for, if any. */
function openableUserId(e: LiveEntry): string | undefined {
  if (e.scope === "ADMIN") return undefined; // env master admin, no User row
  if (e.scope === "STAFF") return e.userId;
  return e.id; // signed-in customer/owner: presence id is the userId
}

function initials(name?: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}

/* ── Person card ───────────────────────────────────────────────────── */

function PersonCard({
  entry,
  onOpen,
}: {
  entry: LiveEntry;
  onOpen?: (userId: string) => void;
}) {
  const userId = openableUserId(entry);
  const clickable = !!userId && !!onOpen;
  const isFresh = entry.secondsAgo < 90;
  const displayName =
    entry.name || (entry.signedIn ? "Signed-in user" : "Guest visitor");

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      type="button"
      disabled={!clickable}
      onClick={() => clickable && onOpen!(userId!)}
      className={`flex w-full items-center gap-3 rounded-2xl border bg-[var(--surface)] p-3.5 text-left transition-all ${
        clickable
          ? "border-[var(--border-soft)] hover:border-[var(--border)] hover:shadow-md cursor-pointer"
          : "border-[var(--border-soft)] cursor-default"
      }`}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <div className="h-11 w-11 overflow-hidden rounded-full border border-[var(--border-soft)] bg-[var(--surface-alt)]">
          {entry.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={entry.imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs font-bold uppercase text-[var(--text-3)]">
              {entry.name ? initials(entry.name) : <UserIcon className="h-5 w-5" />}
            </div>
          )}
        </div>
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[var(--surface)] ${
            isFresh ? "bg-emerald-500" : "bg-amber-400"
          }`}
          title={isFresh ? "Active now" : "Idle"}
        />
      </div>

      {/* Identity */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-bold text-[var(--text-1)]">{displayName}</p>
          {entry.roleLabel && (
            <span className="shrink-0 rounded-full bg-[var(--surface-alt)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--text-3)]">
              {entry.roleLabel}
            </span>
          )}
        </div>
        {entry.email && (
          <p className="truncate text-xs font-medium text-[var(--text-3)]">{entry.email}</p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] font-medium text-[var(--text-3)]">
          {entry.restaurantName && (
            <span className="inline-flex items-center gap-1">
              <Store className="h-3 w-3" /> {entry.restaurantName}
            </span>
          )}
          {entry.city && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {entry.city}
              {entry.country ? `, ${entry.country}` : ""}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Compass className="h-3 w-3" /> {prettyPath(entry.path)}
          </span>
        </div>
      </div>

      {/* Last seen */}
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="text-[11px] font-semibold text-[var(--text-3)] tabular-nums">
          {formatAgo(entry.secondsAgo)}
        </span>
        {clickable && <ChevronRight className="h-4 w-4 text-[var(--text-3)]" />}
      </div>
    </motion.button>
  );
}

/* ── Section ───────────────────────────────────────────────────────── */

function Section({
  title,
  subtitle,
  icon: Icon,
  tint,
  entries,
  onOpen,
}: {
  title: string;
  subtitle?: string;
  icon: typeof Users;
  tint: string;
  entries: LiveEntry[];
  onOpen?: (userId: string) => void;
}) {
  return (
    <div className="rounded-[2rem] border border-[var(--border-soft)] bg-[var(--surface)] p-5 shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
      <div className="mb-4 flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${tint}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold text-[var(--text-1)]">{title}</h3>
          {subtitle && <p className="text-xs font-medium text-[var(--text-3)]">{subtitle}</p>}
        </div>
        <span className="rounded-full bg-[var(--surface-alt)] px-3 py-1 text-sm font-bold text-[var(--text-1)] tabular-nums">
          {entries.length}
        </span>
      </div>

      {entries.length === 0 ? (
        <p className="py-6 text-center text-sm font-medium text-[var(--text-3)]">
          Nobody here right now
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {entries.map((e) => (
              <PersonCard key={e.key} entry={e} onOpen={onOpen} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

/* ── Main ──────────────────────────────────────────────────────────── */

export default function LiveUsersTab({
  onOpenUser,
}: {
  onOpenUser?: (userId: string) => void;
}) {
  const query = useQuery({
    queryKey: ["admin-presence-live"],
    queryFn: async (): Promise<LiveResponse> => {
      const res = await fetch("/api/admin/presence/live", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load live presence");
      return res.json();
    },
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: true,
  });

  const entries = query.data?.entries ?? [];
  const counts = query.data?.counts;

  const groups = useMemo(() => {
    const customers = entries.filter((e) => e.scope === "CUSTOMER");
    return {
      signedCustomers: customers.filter((e) => e.signedIn),
      guests: customers.filter((e) => !e.signedIn),
      owners: entries.filter((e) => e.scope === "OWNER"),
      staff: entries.filter((e) => e.scope === "STAFF"),
      admins: entries.filter((e) => e.scope === "ADMIN"),
    };
  }, [entries]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 rounded-[2rem] border border-[var(--border-soft)] bg-gradient-to-br from-[var(--accent)] to-orange-400 p-6 text-white shadow-lg shadow-[var(--accent)]/20 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
            <CircleDot className="h-7 w-7" />
          </div>
          <div>
            <p className="text-3xl font-bold tabular-nums leading-none">
              {counts?.total ?? 0}
            </p>
            <p className="mt-1 text-sm font-medium text-white/80">people online right now</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden gap-4 text-right sm:flex">
            <div>
              <p className="text-lg font-bold tabular-nums">{counts?.customers ?? 0}</p>
              <p className="text-[11px] font-medium text-white/70">Customers</p>
            </div>
            <div>
              <p className="text-lg font-bold tabular-nums">{counts?.owners ?? 0}</p>
              <p className="text-[11px] font-medium text-white/70">Owners</p>
            </div>
            <div>
              <p className="text-lg font-bold tabular-nums">{counts?.staff ?? 0}</p>
              <p className="text-[11px] font-medium text-white/70">Staff</p>
            </div>
          </div>
          <button
            onClick={() => query.refetch()}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 transition-colors hover:bg-white/25"
            aria-label="Refresh"
          >
            {query.isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {query.isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-7 w-7 animate-spin text-[var(--text-3)]" />
        </div>
      ) : query.isError ? (
        <div className="rounded-[2rem] border border-[var(--border-soft)] bg-[var(--surface)] py-16 text-center">
          <p className="text-sm font-semibold text-[var(--text-2)]">Could not load live presence</p>
          <button
            onClick={() => query.refetch()}
            className="mt-3 rounded-2xl bg-[var(--accent)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--accent-hover)]"
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          <p className="text-xs font-medium text-[var(--text-3)]">
            Auto-refreshing every {POLL_MS / 1000}s. A green dot means active in the
            last 90 seconds. Location is an approximate city from the visitor&apos;s
            connection.
          </p>

          <Section
            title="Customers"
            subtitle={`${groups.signedCustomers.length} signed in · ${groups.guests.length} guests`}
            icon={UserCheck}
            tint="bg-blue-50 text-blue-600"
            entries={[...groups.signedCustomers, ...groups.guests]}
            onOpen={onOpenUser}
          />
          <Section
            title="Owners"
            subtitle="Restaurant and hotel owners on the site"
            icon={Store}
            tint="bg-purple-50 text-purple-600"
            entries={groups.owners}
            onOpen={onOpenUser}
          />
          <Section
            title="Staff"
            subtitle="Team members with an active POS session"
            icon={Users}
            tint="bg-emerald-50 text-emerald-600"
            entries={groups.staff}
            onOpen={onOpenUser}
          />
          <Section
            title="Admins"
            subtitle="Master-admin sessions"
            icon={Shield}
            tint="bg-rose-50 text-rose-600"
            entries={groups.admins}
            onOpen={onOpenUser}
          />
        </>
      )}
    </div>
  );
}
