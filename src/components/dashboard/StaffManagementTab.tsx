"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Plus,
  Search,
  UserPlus,
  UserCheck,
  UserX,
  Trash2,
  Shield,
  ChefHat,
  X,
  Check,
  Building2,
  Calendar,
  Clock,
  Users,
  Eye,
  EyeOff,
  Pencil,
  Loader2,
  KeyRound,
  ChevronDown,
  ArrowRight,
  Zap,
  ScanLine,
} from "lucide-react";
import {
  useRestaurant,
  type Restaurant,
  type StaffMember,
} from "@/context/RestaurantContext";
import { apiFetch, peekApiCache } from "@/lib/api-client";
import { SkeletonLine, SkeletonGrid } from "@/components/shared/Skeleton";
import { AnchoredMenu } from "@/components/shared/AnchoredMenu";
import ShiftsTab from "./ShiftsTab";
import StaffQrBadgeModal from "./StaffQrBadgeModal";

type StaffRole = "SUPER_ADMIN" | "MANAGER" | "CHEF" | "WAITER" | "CASHIER";

const ROLE_META: Record<
  StaffRole,
  {
    label: string;
    description: string;
    icon: typeof Shield;
    gradient: string;
    text: string;
    badge: string;
  }
> = {
  SUPER_ADMIN: {
    label: "Super Admin",
    description: "Full access — manage staff, menu, billing, tables, stock & settings, just like the owner.",
    icon: Shield,
    gradient: "from-purple-500 to-violet-600",
    text: "text-purple-700",
    badge: "bg-purple-50 text-purple-700 border-purple-200",
  },
  MANAGER: {
    label: "Manager",
    description: "Run daily operations — staff, menu, tables, stock, billing & reports. No owner-only settings.",
    icon: UserCheck,
    gradient: "from-blue-500 to-indigo-600",
    text: "text-blue-700",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
  },
  CASHIER: {
    label: "Cashier",
    description: "Billing & payments — take orders, collect bills, accept payments and run Fast Pay.",
    icon: UserCheck,
    gradient: "from-[var(--accent)] to-[var(--accent-hover)]",
    text: "text-[var(--accent-text)]",
    badge:
      "bg-[var(--accent-muted)] text-[var(--accent-text)] border-[var(--accent-border)]",
  },
  WAITER: {
    label: "Waiter",
    description: "Take table orders and send them to the kitchen. No billing or settings access.",
    icon: UserCheck,
    gradient: "from-[var(--accent)] to-[var(--accent-hover)]",
    text: "text-[var(--accent-text)]",
    badge:
      "bg-[var(--accent-muted)] text-[var(--accent-text)] border-[var(--accent-border)]",
  },
  CHEF: {
    label: "Chef",
    description: "Kitchen display — view incoming orders and update cooking/ready status. No billing.",
    icon: ChefHat,
    gradient: "from-[var(--accent)] to-[var(--accent-hover)]",
    text: "text-[var(--accent)]",
    badge:
      "bg-[var(--accent)] text-[var(--accent)] border-[var(--accent-border)]",
  },
};

const ALL_ROLES: StaffRole[] = [
  "SUPER_ADMIN",
  "MANAGER",
  "CHEF",
  "WAITER",
  "CASHIER",
];

interface AttendanceLog {
  id: string;
  date: string;
  checkIn: string;
  checkOut: string | null;
  status: string;
  staff: { role: string; user: { name: string } };
}

function Avatar({
  name,
  gradient,
  size = "md",
}: {
  name: string;
  gradient: string;
  size?: "sm" | "md" | "lg";
}) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const sz =
    size === "sm"
      ? "h-9 w-9 text-xs"
      : size === "lg"
        ? "h-14 w-14 text-lg"
        : "h-11 w-11 text-sm";
  return (
    <div
      className={`${sz} shrink-0 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center font-black text-white shadow-sm`}
    >
      {initials}
    </div>
  );
}

function RoleDropdown({
  current,
  staffId,
  restaurantId,
}: {
  current: StaffRole;
  staffId: string;
  restaurantId: string;
}) {
  const { updateStaffMember } = useRestaurant();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Optimistic — updateStaffMember patches the restaurant context directly,
  // so `current` (driven by that context) flips the instant you click.
  const handleChange = (role: StaffRole) => {
    setOpen(false);
    if (role === current) return;
    updateStaffMember(restaurantId, staffId, { role }).catch(() => {
      /* context already rolled back via its own reconcile */
    });
  };

  const meta = ROLE_META[current] ?? ROLE_META.WAITER;
  const Icon = meta.icon;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold transition-all hover:shadow-sm ${meta.badge}`}
      >
        <Icon className="h-3 w-3" />
        {meta.label}
        <ChevronDown
          className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnchoredMenu
        anchorRef={triggerRef}
        open={open}
        onClose={() => setOpen(false)}
        align="left"
        width={176}
        className="rounded-xl border border-[var(--border-soft)] bg-[var(--canvas)] shadow-xl overflow-hidden"
      >
        {ALL_ROLES.map((role) => {
          const rm = ROLE_META[role];
          const RI = rm.icon;
          const isActive = role === current;
          return (
            <button
              key={role}
              onClick={() => handleChange(role)}
              className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-xs font-semibold transition-colors ${
                isActive
                  ? "bg-[var(--canvas-sub)] text-[var(--text-1)]"
                  : "text-[var(--text-2)] hover:bg-[var(--canvas-sub)] hover:text-[var(--text-1)]"
              }`}
            >
              <RI className={`h-3.5 w-3.5 ${rm.text}`} />
              <span className="flex-1 text-left">{rm.label}</span>
              {isActive && <Check className="h-3 w-3 text-[var(--text-3)]" />}
            </button>
          );
        })}
      </AnchoredMenu>
    </div>
  );
}

function StaffCard({
  member,
  restaurant,
  removeStaff,
  toggleStaffActive,
}: {
  member: StaffMember;
  restaurant: Restaurant;
  removeStaff: (rid: string, sid: string) => void;
  toggleStaffActive: (rid: string, sid: string) => void;
}) {
  const roleKey = member.role as StaffRole;
  const meta = ROLE_META[roleKey] ?? ROLE_META.WAITER;

  const [pinVisible, setPinVisible] = useState(false);
  const [editingPin, setEditingPin] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [savingPin, setSavingPin] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const { fetchRestaurants, updateStaffMember } = useRestaurant();

  const handleSavePin = async () => {
    if (!/^\d{4}$/.test(newPin)) return;
    setSavingPin(true);
    try {
      await apiFetch(`/api/restaurants/${restaurant.id}/staff/${member.id}`, {
        method: "PATCH",
        body: { pin: newPin },
      });
      await fetchRestaurants();
      setEditingPin(false);
      setNewPin("");
    } finally {
      setSavingPin(false);
    }
  };

  // Optimistic — updateStaffMember patches the restaurant context directly,
  // so the Shift-Based/Full-Time toggle flips the instant you click it.
  const handleSetStaffType = (newType: "FULL_TIME" | "SHIFT_BASED") => {
    if (newType === member.staffType) return;
    updateStaffMember(restaurant.id, member.id, { staffType: newType }).catch(() => {
      /* context already rolled back via its own reconcile */
    });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group relative rounded-2xl bg-[var(--canvas)] border border-[var(--border-soft)] shadow-[0_2px_16px_-4px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
    >
      <div
        className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${meta.gradient}`}
      />

      <div className="p-5">
        {/* Top row: avatar + info + status */}
        <div className="flex items-start gap-3">
          <Avatar name={member.user.name} gradient={meta.gradient} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-[var(--text-1)] text-[15px] leading-tight truncate">
                {member.user.name}
              </h4>
              {!member.isActive && (
                <span className="rounded-md bg-[var(--surface)] px-2 py-0.5 text-[10px] font-bold text-[var(--text-2)]">
                  Inactive
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--text-3)] mt-0.5 truncate">
              {member.user.email}
            </p>
            {member.user.phone && (
              <p className="text-xs text-[var(--text-3)] truncate">
                {member.user.phone}
              </p>
            )}
          </div>

          <button
            onClick={() => toggleStaffActive(restaurant.id, member.id)}
            title={member.isActive ? "Deactivate" : "Activate"}
            className={`shrink-0 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-all ${
              member.isActive
                ? "bg-[var(--accent-muted)] text-[var(--accent-text)] hover:bg-[var(--accent-muted)] border border-[var(--accent-border)]"
                : "bg-[var(--surface)] text-[var(--text-2)] hover:bg-[var(--surface-alt)] border border-[var(--border)]"
            }`}
          >
            {member.isActive ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                Active
              </>
            ) : (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--text-3)]" />
                Off
              </>
            )}
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <span className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider">
            Role:
          </span>
          <RoleDropdown
            current={roleKey}
            staffId={member.id}
            restaurantId={restaurant.id}
          />
        </div>

        {/* Staff type classification — Owner-only */}
        <div className="mt-2.5 flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider">
            Type:
          </span>
          <div className="flex items-center gap-1 rounded-lg bg-[var(--surface)] p-0.5">
            <button
              onClick={() => handleSetStaffType("SHIFT_BASED")}
              title="Shift-Based: operates within defined time windows"
              className={`rounded-md px-2.5 py-1 text-[10px] font-bold transition-all ${
                (member.staffType ?? "SHIFT_BASED") === "SHIFT_BASED"
                  ? "bg-[var(--canvas)] text-[var(--accent-text)] shadow-sm"
                  : "text-[var(--text-3)] hover:text-[var(--text-2)]"
              }`}
            >
              Shift-Based
            </button>
            <button
              onClick={() => handleSetStaffType("FULL_TIME")}
              title="Full-Time: always active, attributed by who processed the order"
              className={`rounded-md px-2.5 py-1 text-[10px] font-bold transition-all ${
                member.staffType === "FULL_TIME"
                  ? "bg-[var(--canvas)] text-indigo-700 shadow-sm"
                  : "text-[var(--text-3)] hover:text-[var(--text-2)]"
              }`}
            >
              Full-Time
            </button>
          </div>
        </div>

        <div className="mt-3 border-t border-[var(--border-soft)]" />

        <div className="mt-3 flex items-center gap-2">
          <KeyRound className="h-3.5 w-3.5 text-[var(--text-3)] shrink-0" />
          {editingPin ? (
            <div className="flex items-center gap-2 flex-1">
              <input
                type="text"
                value={newPin}
                onChange={(e) =>
                  setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
                placeholder="New 4-digit PIN"
                autoFocus
                className="w-28 rounded-lg border border-[var(--accent-border)] bg-[var(--accent-muted)] px-2.5 py-1 font-mono text-sm font-bold text-[var(--text-1)] outline-none focus:ring-2 focus:ring-[var(--accent-border)] tracking-widest"
              />
              <button
                onClick={handleSavePin}
                disabled={!/^\d{4}$/.test(newPin) || savingPin}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent-muted)] text-[var(--accent-text)] hover:bg-[var(--accent-muted)] disabled:opacity-40 transition-all"
              >
                {savingPin ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                onClick={() => {
                  setEditingPin(false);
                  setNewPin("");
                }}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--surface)] text-[var(--text-2)] hover:bg-[var(--surface-alt)] transition-all"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-1">
              <span className="font-mono text-sm font-bold text-[var(--text-2)] bg-[var(--canvas-sub)] rounded-lg px-2.5 py-1 tracking-widest border border-[var(--border-soft)]">
                ••••
              </span>
              <button
                onClick={() => {
                  setEditingPin(true);
                  setNewPin("");
                }}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold text-[var(--text-3)] hover:text-[var(--accent-text)] hover:bg-[var(--accent-muted)] transition-all"
                title="Change PIN"
              >
                <Pencil className="h-3 w-3" />
                Edit
              </button>
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <button
            onClick={() => setQrModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-[var(--text-3)] hover:text-[var(--accent-text)] hover:bg-[var(--accent-muted)] transition-all"
            title="Personal login QR badge"
          >
            <ScanLine className="h-3 w-3" />
            QR Badge
          </button>
          <button
            onClick={() => removeStaff(restaurant.id, member.id)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold text-red-400 hover:text-red-600 hover:bg-red-50 transition-all"
          >
            <Trash2 className="h-3 w-3" />
            Remove
          </button>
        </div>
      </div>

      <StaffQrBadgeModal
        open={qrModalOpen}
        onOpenChange={setQrModalOpen}
        staffId={member.id}
        staffName={member.user.name}
        restaurantId={restaurant.id}
        qrToken={member.qrToken}
      />
    </motion.div>
  );
}

function StaffDirectoryView({
  restaurant,
  removeStaff,
  toggleStaffActive,
}: {
  restaurant: Restaurant;
  removeStaff: (rid: string, sid: string) => void;
  toggleStaffActive: (rid: string, sid: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<StaffRole | "all">("all");

  const filtered = restaurant.staff.filter((s: StaffMember) => {
    const q = search.toLowerCase();
    const matchesSearch =
      s.user.name.toLowerCase().includes(q) ||
      s.user.email.toLowerCase().includes(q);
    const matchesRole = filterRole === "all" || s.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const stats = [
    {
      label: "Total",
      value: restaurant.staff.length,
      color: "text-[var(--text-1)]",
      bg: "bg-[var(--canvas-sub)]",
    },
    {
      label: "Active",
      value: restaurant.staff.filter((s: StaffMember) => s.isActive).length,
      color: "text-[var(--accent-text)]",
      bg: "bg-[var(--accent-muted)]",
    },
    {
      label: "Inactive",
      value: restaurant.staff.filter((s: StaffMember) => !s.isActive).length,
      color: "text-[var(--accent-text)]",
      bg: "bg-[var(--accent-muted)]",
    },
    {
      label: "Roles",
      value: new Set(restaurant.staff.map((s: StaffMember) => s.role)).size,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className={`rounded-2xl ${s.bg} border border-white p-4 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)]`}
          >
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-[11px] font-semibold text-[var(--text-2)] mt-0.5">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-3)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] py-2.5 pl-10 pr-4 text-sm font-medium text-[var(--text-1)] placeholder-gray-400 outline-none transition-all focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 shadow-sm"
          />
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {(["all", ...ALL_ROLES] as const).map((r) => {
            const isActive = filterRole === r;
            const meta = r !== "all" ? ROLE_META[r] : null;
            return (
              <button
                key={r}
                onClick={() => setFilterRole(r)}
                className={`rounded-lg px-3 py-2 text-xs font-bold transition-all shadow-sm ${
                  isActive
                    ? meta
                      ? `bg-gradient-to-r ${meta.gradient} text-white shadow-md`
                      : "bg-[var(--text-1)] text-white"
                    : "bg-[var(--canvas)] border border-[var(--border)] text-[var(--text-2)] hover:border-[var(--border)] hover:text-[var(--text-2)]"
                }`}
              >
                {r === "all" ? "All Roles" : ROLE_META[r].label}
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center py-20 text-center"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--surface)] mb-4">
            <UserX className="h-7 w-7 text-[var(--text-3)]" />
          </div>
          <p className="font-bold text-[var(--text-2)]">
            {search || filterRole !== "all"
              ? "No matching staff found"
              : "No staff members yet"}
          </p>
          <p className="text-sm text-[var(--text-3)] mt-1">
            {search || filterRole !== "all"
              ? "Try a different search or filter"
              : "Add your first team member to get started"}
          </p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((member: StaffMember) => (
              <StaffCard
                key={member.id}
                member={member}
                restaurant={restaurant}
                removeStaff={removeStaff}
                toggleStaffActive={toggleStaffActive}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function AttendanceLogsView({ restaurantId }: { restaurantId: string }) {
  // Query cache paints instantly on tab revisit instead of showing
  // "Loading attendance…" every time.
  const logsQuery = useQuery({
    queryKey: ["attendance-logs", restaurantId],
    queryFn: () => apiFetch<AttendanceLog[]>(`/api/restaurants/${restaurantId}/attendance`),
    enabled: !!restaurantId,
    // Seed from the hover/idle-warmed GET cache so the Attendance view paints
    // instantly instead of flashing "Loading attendance…"; revalidates after.
    initialData: () =>
      restaurantId ? peekApiCache<AttendanceLog[]>(`/api/restaurants/${restaurantId}/attendance`) : undefined,
    initialDataUpdatedAt: 0,
  });
  const logs = logsQuery.data ?? [];
  const loading = logsQuery.isLoading;
  const [dateFilter, setDateFilter] = useState<string>("");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-[var(--text-3)]">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm font-medium">Loading attendance…</span>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--surface)] mb-4">
          <Calendar className="h-7 w-7 text-[var(--text-3)]" />
        </div>
        <p className="font-bold text-[var(--text-2)]">No attendance records</p>
        <p className="text-sm text-[var(--text-3)] mt-1">
          Staff punch-in records will appear here
        </p>
      </div>
    );
  }

  function calcMins(checkIn: string, checkOut: string | null): number {
    if (!checkOut) return 0;
    return Math.round(
      (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 60000,
    );
  }

  function formatDur(mins: number): string {
    if (mins <= 0) return "—";
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  }

  /* Filter by selected date */
  const filtered = dateFilter
    ? logs.filter(
        (l) => new Date(l.date).toISOString().slice(0, 10) === dateFilter,
      )
    : logs;

  /* Group by date */
  const grouped: Record<string, AttendanceLog[]> = {};
  filtered.forEach((log) => {
    const key = new Date(log.date).toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(log);
  });

  const presentCount = filtered.filter((l) => !l.checkOut).length;
  const completedCount = filtered.filter((l) => !!l.checkOut).length;

  return (
    <div className="space-y-5">
      {/* Filter + summary bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--canvas)] px-3 py-2">
            <Calendar className="h-3.5 w-3.5 text-[var(--text-3)]" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="text-sm font-medium text-[var(--text-1)] outline-none bg-transparent"
            />
          </div>
          {dateFilter && (
            <button
              onClick={() => setDateFilter("")}
              className="text-[11px] font-bold text-[var(--text-3)] hover:text-[var(--text-2)] underline underline-offset-2 transition-colors"
            >
              Clear filter
            </button>
          )}
        </div>
        {filtered.length > 0 && (
          <div className="flex items-center gap-3">
            {presentCount > 0 && (
              <span className="flex items-center gap-1.5 rounded-lg bg-[var(--accent-muted)] border border-[var(--accent-border)] px-2.5 py-1 text-[11px] font-bold text-[var(--accent-text)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                {presentCount} on shift
              </span>
            )}
            {completedCount > 0 && (
              <span className="flex items-center gap-1.5 rounded-lg bg-[var(--accent-muted)] border border-[var(--accent-border)] px-2.5 py-1 text-[11px] font-bold text-[var(--accent-text)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                {completedCount} completed
              </span>
            )}
          </div>
        )}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-2xl bg-[var(--canvas)] border border-[var(--border-soft)] px-4 py-10 text-center">
          <Calendar className="mx-auto h-8 w-8 text-[var(--text-3)] mb-2" />
          <p className="text-sm font-bold text-[var(--text-3)]">
            No records for this date
          </p>
        </div>
      )}

      {Object.entries(grouped).map(([dateLabel, dayLogs]) => {
        const totalMins = dayLogs.reduce(
          (sum, l) => sum + calcMins(l.checkIn, l.checkOut),
          0,
        );
        const activeCount = dayLogs.filter((l) => !l.checkOut).length;

        return (
          <div key={dateLabel}>
            {/* Date header */}
            <div className="flex items-center gap-3 mb-3">
              <div className="h-px flex-1 bg-[var(--surface)]" />
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-2)]">
                  {dateLabel}
                </span>
                <span className="text-[10px] font-semibold text-[var(--text-3)] bg-[var(--surface)] px-2 py-0.5 rounded-full">
                  {dayLogs.length} staff
                </span>
                {activeCount > 0 && (
                  <span className="text-[10px] font-bold text-[var(--accent-text)] bg-[var(--accent-muted)] px-2 py-0.5 rounded-full border border-[var(--accent-border)]">
                    {activeCount} active
                  </span>
                )}
              </div>
              <div className="h-px flex-1 bg-[var(--surface)]" />
            </div>

            <div className="rounded-2xl bg-[var(--canvas)] border border-[var(--border-soft)] shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] overflow-hidden">
              {dayLogs.map((log, idx) => {
                const mins = calcMins(log.checkIn, log.checkOut);
                const roleKey = log.staff.role as StaffRole;
                const meta = ROLE_META[roleKey] ?? ROLE_META.WAITER;
                const isLate = log.status !== "PRESENT";

                return (
                  <div
                    key={log.id}
                    className={`flex items-center gap-4 px-5 py-3.5 ${
                      idx < dayLogs.length - 1
                        ? "border-b border-[var(--border-soft)]"
                        : ""
                    } hover:bg-[var(--surface)]/50 transition-colors`}
                  >
                    <Avatar
                      name={log.staff.user.name}
                      gradient={meta.gradient}
                      size="sm"
                    />

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[var(--text-1)] truncate">
                        {log.staff.user.name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${meta.badge}`}
                        >
                          {meta.label}
                        </span>
                        {isLate && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[var(--accent)] border border-[var(--accent-border)] text-[var(--accent)]">
                            {log.status}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Times + duration */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1.5 rounded-lg bg-[var(--canvas-sub)] border border-[var(--border-soft)] px-2.5 py-1.5">
                        <Clock className="h-3 w-3 text-[var(--text-3)]" />
                        <span className="text-[12px] font-bold text-[var(--text-2)]">
                          {new Date(log.checkIn).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <ArrowRight className="h-3 w-3 text-[var(--text-3)]" />
                        {log.checkOut ? (
                          <span className="text-[12px] font-bold text-[var(--text-2)]">
                            {new Date(log.checkOut).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-[var(--accent-text)]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                            On shift
                          </span>
                        )}
                      </div>
                      {mins > 0 && (
                        <span className="rounded-lg bg-[var(--accent-muted)] border border-[var(--accent-border)] px-2 py-1 text-[10px] font-bold text-[var(--accent-text)] shrink-0">
                          {formatDur(mins)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Day total */}
            <div className="mt-1.5 flex items-center justify-end gap-2 px-1">
              {totalMins > 0 && (
                <span className="text-[10px] font-semibold text-[var(--text-3)]">
                  Team total: {formatDur(totalMins)}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AddStaffModal({
  open,
  onClose,
  restaurantId,
  existingStaff,
}: {
  open: boolean;
  onClose: () => void;
  restaurantId: string;
  existingStaff: StaffMember[];
}) {
  const { addStaff } = useRestaurant();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<StaffRole>("WAITER");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Instant client-side guard: flag a duplicate before the server round-trip so
  // the owner gets immediate feedback instead of a 409 after pressing "Add".
  const trimmedEmail = email.trim().toLowerCase();
  const duplicate = existingStaff.find(
    (s) => s.isActive && s.user.email.toLowerCase() === trimmedEmail,
  );
  const [successData, setSuccessData] = useState<{
    pin: string;
    code: string;
    name: string;
  } | null>(null);

  const reset = useCallback(() => {
    setName("");
    setEmail("");
    setPhone("");
    setRole("WAITER");
    setSuccessData(null);
    setErrorMsg("");
  }, []);

  const handleSave = async () => {
    if (!name.trim() || !email.trim() || saving) return;
    if (duplicate) {
      setErrorMsg("This staff member is already active at this restaurant");
      return;
    }
    setSaving(true);
    setErrorMsg("");
    try {
      const result = await addStaff(restaurantId, {
        name: name.trim(),
        email: email.trim(),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        role,
      });
      if (result?._generatedPin) {
        setSuccessData({
          pin: result._generatedPin,
          code: result._restaurantCode ?? "Pending Sync",
          name: name.trim(),
        });
      } else {
        reset();
        onClose();
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to add staff");
    } finally {
      setSaving(false);
    }
  };

  const isValid = name.trim() && email.trim() && !duplicate;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[3px]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{
              type: "spring",
              damping: 28,
              stiffness: 340,
              mass: 0.7,
            }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl bg-[var(--canvas)] p-6 shadow-2xl sm:p-8 max-h-[90dvh]"
          >
            <button
              onClick={() => {
                reset();
                onClose();
              }}
              className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-3)] hover:bg-[var(--canvas-sub)] hover:text-[var(--text-2)] transition-all"
            >
              <X className="h-4 w-4" />
            </button>

            {successData ? (
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-muted)]">
                    <Check className="h-5 w-5 text-[var(--accent-hover)]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-[var(--text-1)]">
                      Staff Added!
                    </h3>
                    <p className="text-sm text-[var(--text-2)]">
                      Share these credentials with {successData.name}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl bg-[var(--canvas-sub)] border border-[var(--border-soft)] p-5 space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-[var(--border-soft)]">
                    <span className="text-xs font-bold text-[var(--text-2)] uppercase tracking-wider">
                      Restaurant Code
                    </span>
                    <span className="font-mono text-base font-black text-[var(--text-1)] bg-[var(--canvas)] px-3 py-1 rounded-lg border border-[var(--border)] tracking-widest">
                      {successData.code}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-bold text-[var(--text-2)] uppercase tracking-wider">
                      Login PIN
                    </span>
                    <span className="font-mono text-2xl font-black text-[var(--accent)] bg-[var(--accent-muted)] px-4 py-1.5 rounded-xl border border-[var(--accent-border)] tracking-[0.3em]">
                      {successData.pin}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    reset();
                    onClose();
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--text-1)] px-6 py-3 text-sm font-bold text-[var(--canvas)] hover:opacity-90 active:scale-[0.97] transition-all"
                >
                  <Check className="h-4 w-4" />
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h3 className="text-xl font-extrabold text-[var(--text-1)]">
                    Add Staff Member
                  </h3>
                  <p className="text-sm text-[var(--text-2)] mt-0.5">
                    A PIN will be auto-generated for login
                  </p>
                </div>

                <div className="space-y-4">
                  {[
                    {
                      label: "Full Name",
                      key: "name",
                      value: name,
                      setter: setName,
                      placeholder: "e.g. Ram Shrestha",
                      required: true,
                    },
                    {
                      label: "Email",
                      key: "email",
                      value: email,
                      setter: setEmail,
                      placeholder: "staff@restaurant.com",
                      required: true,
                      type: "email",
                    },
                    {
                      label: "Phone",
                      key: "phone",
                      value: phone,
                      setter: (v: string) => setPhone(v.replace(/\D/g, "")),
                      placeholder: "98XXXXXXXX",
                      required: false,
                    },
                  ].map((f) => (
                    <div key={f.key}>
                      <label className="block text-sm font-bold text-[var(--text-1)] mb-1.5">
                        {f.label}
                        {f.required && (
                          <span className="text-[var(--accent)] ml-0.5">*</span>
                        )}
                      </label>
                      <input
                        type={f.type ?? "text"}
                        value={f.value}
                        onChange={(e) => f.setter(e.target.value)}
                        placeholder={f.placeholder}
                        className={`w-full rounded-xl border bg-[var(--canvas)] px-4 py-3 text-sm font-medium text-[var(--text-1)] placeholder-gray-400 outline-none transition-all focus:ring-2 ${
                          f.key === "email" && duplicate
                            ? "border-red-300 focus:border-red-400 focus:ring-red-200/40"
                            : "border-[var(--border)] focus:border-[var(--accent)] focus:ring-[var(--accent)]/15"
                        }`}
                      />
                      {f.key === "email" && duplicate && (
                        <p className="mt-1.5 text-[12px] font-semibold text-red-600">
                          {duplicate.user.name} is already active here — pick a
                          different email.
                        </p>
                      )}
                    </div>
                  ))}

                  <div>
                    <label className="block text-sm font-bold text-[var(--text-1)] mb-2">
                      Role <span className="text-[var(--accent)]">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {ALL_ROLES.map((r) => {
                        const meta = ROLE_META[r];
                        const Icon = meta.icon;
                        const selected = role === r;
                        return (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setRole(r)}
                            className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold transition-all ${
                              selected
                                ? `bg-gradient-to-r ${meta.gradient} text-white border-transparent shadow-md`
                                : "border-[var(--border)] bg-[var(--canvas)] text-[var(--text-2)] hover:border-[var(--border)] hover:text-[var(--text-2)]"
                            }`}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            {meta.label}
                          </button>
                        );
                      })}
                    </div>
                    {/* Explain what the chosen role can actually do. */}
                    {(() => {
                      const RoleIcon = ROLE_META[role].icon;
                      return (
                        <p className="mt-2 flex items-start gap-2 rounded-xl bg-[var(--canvas-sub)] px-3 py-2.5 text-[12px] leading-snug text-[var(--text-2)] ring-1 ring-[var(--border-soft)]">
                          <RoleIcon className="h-3.5 w-3.5 shrink-0 mt-0.5 text-[var(--accent)]" />
                          <span>
                            <strong className="font-bold text-[var(--text-1)]">
                              {ROLE_META[role].label}:
                            </strong>{" "}
                            {ROLE_META[role].description}
                          </span>
                        </p>
                      );
                    })()}
                  </div>
                </div>

                {errorMsg && (
                  <div className="mt-4 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm font-medium text-red-600">
                    {errorMsg}
                  </div>
                )}

                <div className="mt-5 flex items-center justify-end gap-3">
                  <button
                    onClick={() => {
                      reset();
                      onClose();
                    }}
                    className="rounded-xl px-5 py-2.5 text-sm font-bold text-[var(--text-2)] hover:text-[var(--text-2)] hover:bg-[var(--canvas-sub)] transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!isValid || saving}
                    className={`flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold transition-all active:scale-[0.97] ${
                      isValid && !saving
                        ? "bg-[var(--text-1)] text-[var(--canvas)] shadow-lg shadow-[var(--text-1)]/20 hover:opacity-90"
                        : "bg-[var(--border)] text-[var(--text-3)] cursor-not-allowed"
                    }`}
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserPlus className="h-4 w-4" />
                    )}
                    {saving ? "Adding…" : "Add Staff"}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default function StaffManagementTab() {
  const {
    selectedRestaurant,
    restaurants,
    addStaff,
    removeStaff,
    toggleStaffActive,
  } = useRestaurant();
  const restaurant = selectedRestaurant ?? restaurants[0];
  const [activeTab, setActiveTab] = useState<
    "directory" | "attendance" | "shifts"
  >("directory");
  const [showModal, setShowModal] = useState(false);

  if (!restaurant) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto pb-12">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <SkeletonLine width="w-56" height="h-7" />
            <SkeletonLine width="w-48" height="h-3" />
          </div>
          <SkeletonLine width="w-28" height="h-10" className="rounded-xl" />
        </div>
        <SkeletonLine width="w-64" height="h-10" className="rounded-xl" />
        <SkeletonGrid rows={2} cols={3} cardClass="h-40 rounded-2xl" />
      </div>
    );
  }

  const tabs = [
    { id: "directory" as const, label: "Team Directory", icon: Users },
    { id: "attendance" as const, label: "Attendance", icon: Calendar },
    { id: "shifts" as const, label: "Shifts", icon: Clock },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl font-extrabold tracking-tight text-[var(--text-1)]">
              Staff Management
            </h2>
            {restaurant.restaurantCode && (
              <div className="flex items-center gap-1.5 rounded-lg bg-[var(--accent-muted)] border border-[var(--accent-border)] px-3 py-1 shadow-sm">
                <Building2 className="h-3.5 w-3.5 text-[var(--accent-text)]" />
                <span className="text-xs font-bold text-[var(--text-1)]">
                  Code:{" "}
                  <span className="font-mono tracking-widest">
                    {restaurant.restaurantCode}
                  </span>
                </span>
              </div>
            )}
          </div>
          <p className="mt-1 text-sm text-[var(--text-2)]">
            Team for{" "}
            <span className="font-bold text-[var(--text-1)]">
              {restaurant.name}
            </span>
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_0_rgba(245,158,11,0.35)] hover:shadow-[0_6px_20px_rgba(245,158,11,0.25)] hover:-translate-y-0.5 active:scale-[0.97] transition-all"
        >
          <UserPlus className="h-4 w-4" strokeWidth={2.5} />
          Add Staff
        </button>
      </div>

      {/* ── Tab bar ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 rounded-xl bg-[var(--surface)] p-1 w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all ${
              activeTab === id
                ? "bg-[var(--canvas)] text-[var(--text-1)] shadow-sm"
                : "text-[var(--text-2)] hover:text-[var(--text-2)]"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Content ─────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
        >
          {activeTab === "directory" ? (
            <StaffDirectoryView
              restaurant={restaurant}
              removeStaff={removeStaff}
              toggleStaffActive={toggleStaffActive}
            />
          ) : activeTab === "attendance" ? (
            <AttendanceLogsView restaurantId={restaurant.id} />
          ) : (
            <ShiftsTab />
          )}
        </motion.div>
      </AnimatePresence>

      {/* ── Add Staff Modal ──────────────────────────────────────── */}
      <AddStaffModal
        open={showModal}
        onClose={() => setShowModal(false)}
        restaurantId={restaurant.id}
        existingStaff={restaurant.staff}
      />
    </div>
  );
}
