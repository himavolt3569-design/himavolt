"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
} from "lucide-react";
import {
  useRestaurant,
  type Restaurant,
  type StaffMember,
} from "@/context/RestaurantContext";
import { apiFetch } from "@/lib/api-client";

type StaffRole = "SUPER_ADMIN" | "MANAGER" | "CHEF" | "WAITER" | "CASHIER";

const ROLE_META: Record<
  StaffRole,
  { label: string; icon: typeof Shield; gradient: string; text: string; badge: string }
> = {
  SUPER_ADMIN: {
    label: "Super Admin",
    icon: Shield,
    gradient: "from-purple-500 to-violet-600",
    text: "text-purple-700",
    badge: "bg-purple-50 text-purple-700 border-purple-200",
  },
  MANAGER: {
    label: "Manager",
    icon: UserCheck,
    gradient: "from-blue-500 to-indigo-600",
    text: "text-blue-700",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
  },
  CHEF: {
    label: "Chef",
    icon: ChefHat,
    gradient: "from-orange-400 to-amber-500",
    text: "text-orange-700",
    badge: "bg-orange-50 text-orange-700 border-orange-200",
  },
  WAITER: {
    label: "Waiter",
    icon: UserCheck,
    gradient: "from-emerald-400 to-teal-500",
    text: "text-emerald-700",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  CASHIER: {
    label: "Cashier",
    icon: UserCheck,
    gradient: "from-amber-400 to-orange-500",
    text: "text-amber-700",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
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
  staff: { role: string; user: { name: string } };
}

/* ── Initials avatar ──────────────────────────────────────────────── */
function Avatar({ name, gradient, size = "md" }: { name: string; gradient: string; size?: "sm" | "md" | "lg" }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const sz = size === "sm" ? "h-9 w-9 text-xs" : size === "lg" ? "h-14 w-14 text-lg" : "h-11 w-11 text-sm";
  return (
    <div className={`${sz} shrink-0 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center font-black text-white shadow-sm`}>
      {initials}
    </div>
  );
}

/* ── Role change dropdown ─────────────────────────────────────────── */
function RoleDropdown({
  current,
  staffId,
  restaurantId,
  onUpdated,
}: {
  current: StaffRole;
  staffId: string;
  restaurantId: string;
  onUpdated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState<StaffRole | null>(null);

  const handleChange = async (role: StaffRole) => {
    if (role === current) { setOpen(false); return; }
    setSaving(role);
    try {
      await apiFetch(`/api/restaurants/${restaurantId}/staff/${staffId}`, {
        method: "PATCH",
        body: { role },
      });
      onUpdated();
    } catch { /* keep open */ }
    finally { setSaving(null); setOpen(false); }
  };

  const meta = ROLE_META[current] ?? ROLE_META.WAITER;
  const Icon = meta.icon;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold transition-all hover:shadow-sm ${meta.badge}`}
      >
        <Icon className="h-3 w-3" />
        {meta.label}
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.12 }}
              className="absolute left-0 top-full mt-1.5 z-20 w-44 rounded-xl border border-gray-100 bg-white shadow-xl overflow-hidden"
            >
              {ALL_ROLES.map((role) => {
                const rm = ROLE_META[role];
                const RI = rm.icon;
                const isActive = role === current;
                return (
                  <button
                    key={role}
                    onClick={() => handleChange(role)}
                    disabled={!!saving}
                    className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-xs font-semibold transition-colors ${
                      isActive ? "bg-gray-50 text-gray-900" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    {saving === role ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />
                    ) : (
                      <RI className={`h-3.5 w-3.5 ${rm.text}`} />
                    )}
                    <span className="flex-1 text-left">{rm.label}</span>
                    {isActive && <Check className="h-3 w-3 text-gray-400" />}
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Staff Card ───────────────────────────────────────────────────── */
function StaffCard({
  member,
  restaurant,
  removeStaff,
  toggleStaffActive,
  onRoleUpdated,
}: {
  member: StaffMember;
  restaurant: Restaurant;
  removeStaff: (rid: string, sid: string) => void;
  toggleStaffActive: (rid: string, sid: string) => void;
  onRoleUpdated: () => void;
}) {
  const roleKey = member.role as StaffRole;
  const meta = ROLE_META[roleKey] ?? ROLE_META.WAITER;

  const [pinVisible, setPinVisible] = useState(false);
  const [editingPin, setEditingPin] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [savingPin, setSavingPin] = useState(false);
  const { fetchRestaurants } = useRestaurant();

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

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group relative rounded-2xl bg-white border border-gray-100 shadow-[0_2px_16px_-4px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
    >
      {/* Role color strip */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${meta.gradient}`} />

      <div className="p-5">
        {/* Top row: avatar + info + status */}
        <div className="flex items-start gap-3">
          <Avatar name={member.user.name} gradient={meta.gradient} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-gray-900 text-[15px] leading-tight truncate">
                {member.user.name}
              </h4>
              {!member.isActive && (
                <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500">
                  Inactive
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5 truncate">
              {member.user.email}
            </p>
            {member.user.phone && (
              <p className="text-xs text-gray-400 truncate">{member.user.phone}</p>
            )}
          </div>

          {/* Active toggle */}
          <button
            onClick={() => toggleStaffActive(restaurant.id, member.id)}
            title={member.isActive ? "Deactivate" : "Activate"}
            className={`shrink-0 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-all ${
              member.isActive
                ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-200"
            }`}
          >
            {member.isActive ? (
              <><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />Active</>
            ) : (
              <><span className="h-1.5 w-1.5 rounded-full bg-gray-400" />Off</>
            )}
          </button>
        </div>

        {/* Role picker */}
        <div className="mt-3 flex items-center gap-2">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Role:</span>
          <RoleDropdown
            current={roleKey}
            staffId={member.id}
            restaurantId={restaurant.id}
            onUpdated={onRoleUpdated}
          />
        </div>

        {/* Divider */}
        <div className="mt-3 border-t border-gray-50" />

        {/* PIN row */}
        <div className="mt-3 flex items-center gap-2">
          <KeyRound className="h-3.5 w-3.5 text-gray-300 shrink-0" />
          {editingPin ? (
            <div className="flex items-center gap-2 flex-1">
              <input
                type="text"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="New 4-digit PIN"
                autoFocus
                className="w-28 rounded-lg border border-amber-300 bg-amber-50/50 px-2.5 py-1 font-mono text-sm font-bold text-[#3e1e0c] outline-none focus:ring-2 focus:ring-amber-200 tracking-widest"
              />
              <button
                onClick={handleSavePin}
                disabled={!/^\d{4}$/.test(newPin) || savingPin}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 disabled:opacity-40 transition-all"
              >
                {savingPin ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={() => { setEditingPin(false); setNewPin(""); }}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition-all"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-1">
              <span className="font-mono text-sm font-bold text-gray-700 bg-gray-50 rounded-lg px-2.5 py-1 tracking-widest border border-gray-100">
                {pinVisible ? member.pin : "••••"}
              </span>
              <button
                onClick={() => setPinVisible((v) => !v)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
              >
                {pinVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={() => { setEditingPin(true); setNewPin(member.pin); }}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-all"
                title="Change PIN"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Delete */}
        <div className="mt-3 flex justify-end">
          <button
            onClick={() => removeStaff(restaurant.id, member.id)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold text-red-400 hover:text-red-600 hover:bg-red-50 transition-all"
          >
            <Trash2 className="h-3 w-3" />
            Remove
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Staff Directory ──────────────────────────────────────────────── */
function StaffDirectoryView({
  restaurant,
  removeStaff,
  toggleStaffActive,
}: {
  restaurant: Restaurant;
  removeStaff: (rid: string, sid: string) => void;
  toggleStaffActive: (rid: string, sid: string) => void;
}) {
  const { fetchRestaurants } = useRestaurant();
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
      color: "text-gray-900",
      bg: "bg-gray-50",
    },
    {
      label: "Active",
      value: restaurant.staff.filter((s: StaffMember) => s.isActive).length,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Inactive",
      value: restaurant.staff.filter((s: StaffMember) => !s.isActive).length,
      color: "text-amber-600",
      bg: "bg-amber-50",
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
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className={`rounded-2xl ${s.bg} border border-white p-4 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)]`}
          >
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-[11px] font-semibold text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm font-medium text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 shadow-sm"
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
                      : "bg-gray-900 text-white"
                    : "bg-white border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700"
                }`}
              >
                {r === "all" ? "All Roles" : ROLE_META[r].label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Staff grid */}
      {filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center py-20 text-center"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 mb-4">
            <UserX className="h-7 w-7 text-gray-400" />
          </div>
          <p className="font-bold text-gray-600">
            {search || filterRole !== "all" ? "No matching staff found" : "No staff members yet"}
          </p>
          <p className="text-sm text-gray-400 mt-1">
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
                onRoleUpdated={fetchRestaurants}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

/* ── Attendance Logs ──────────────────────────────────────────────── */
function AttendanceLogsView({ restaurantId }: { restaurantId: string }) {
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = useCallback(async () => {
    try {
      const data = await apiFetch<AttendanceLog[]>(
        `/api/restaurants/${restaurantId}/attendance`,
      );
      setLogs(data ?? []);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-gray-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm font-medium">Loading attendance…</span>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 mb-4">
          <Calendar className="h-7 w-7 text-gray-400" />
        </div>
        <p className="font-bold text-gray-600">No attendance records</p>
        <p className="text-sm text-gray-400 mt-1">
          Staff punch-in records will appear here
        </p>
      </div>
    );
  }

  /* Group by date */
  const grouped: Record<string, AttendanceLog[]> = {};
  logs.forEach((log) => {
    const key = new Date(log.date).toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(log);
  });

  function duration(checkIn: string, checkOut: string | null) {
    if (!checkOut) return null;
    const mins = Math.round(
      (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 60000,
    );
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  }

  return (
    <div className="space-y-5">
      {Object.entries(grouped).map(([dateLabel, dayLogs]) => (
        <div key={dateLabel}>
          <div className="flex items-center gap-2 mb-2.5">
            <div className="h-px flex-1 bg-gray-100" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-2">
              {dateLabel}
            </span>
            <div className="h-px flex-1 bg-gray-100" />
          </div>

          <div className="rounded-2xl bg-white border border-gray-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] overflow-hidden">
            {dayLogs.map((log, idx) => {
              const dur = duration(log.checkIn, log.checkOut);
              const roleKey = log.staff.role as StaffRole;
              const meta = ROLE_META[roleKey] ?? ROLE_META.WAITER;
              return (
                <div
                  key={log.id}
                  className={`flex items-center gap-4 px-5 py-4 ${idx < dayLogs.length - 1 ? "border-b border-gray-50" : ""} hover:bg-gray-50/50 transition-colors`}
                >
                  <Avatar name={log.staff.user.name} gradient={meta.gradient} size="sm" />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">
                      {log.staff.user.name}
                    </p>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${meta.badge}`}>
                      {meta.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-sm font-bold text-gray-700">
                    <Clock className="h-3.5 w-3.5 text-gray-400" />
                    {new Date(log.checkIn).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>

                  <ArrowRight className="h-3.5 w-3.5 text-gray-300" />

                  {log.checkOut ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-700">
                        {new Date(log.checkOut).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {dur && (
                        <span className="rounded-lg bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                          {dur}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="flex items-center gap-1.5 rounded-lg bg-amber-50 border border-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                      On shift
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Add Staff Modal ──────────────────────────────────────────────── */
function AddStaffModal({
  open,
  onClose,
  restaurantId,
}: {
  open: boolean;
  onClose: () => void;
  restaurantId: string;
}) {
  const { addStaff } = useRestaurant();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<StaffRole>("WAITER");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
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
    setSaving(true);
    setErrorMsg("");
    try {
      const result = await addStaff(restaurantId, {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        role,
        pin: "auto",
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

  const isValid = name.trim() && email.trim();

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
            transition={{ type: "spring", damping: 28, stiffness: 340, mass: 0.7 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8 max-h-[90dvh]"
          >
            {/* Close */}
            <button
              onClick={() => { reset(); onClose(); }}
              className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-all"
            >
              <X className="h-4 w-4" />
            </button>

            {successData ? (
              /* ── Success screen ─────────────────── */
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                    <Check className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-gray-900">Staff Added!</h3>
                    <p className="text-sm text-gray-500">
                      Share these credentials with {successData.name}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl bg-gray-50 border border-gray-100 p-5 space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Restaurant Code
                    </span>
                    <span className="font-mono text-base font-black text-[#3e1e0c] bg-white px-3 py-1 rounded-lg border border-gray-200 tracking-widest">
                      {successData.code}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Login PIN
                    </span>
                    <span className="font-mono text-2xl font-black text-amber-500 bg-amber-50 px-4 py-1.5 rounded-xl border border-amber-100 tracking-[0.3em]">
                      {successData.pin}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => { reset(); onClose(); }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#3e1e0c] px-6 py-3 text-sm font-bold text-white hover:bg-[#2d1508] active:scale-[0.97] transition-all"
                >
                  <Check className="h-4 w-4" />
                  Done
                </button>
              </div>
            ) : (
              /* ── Form ───────────────────────────── */
              <>
                <div className="mb-6">
                  <h3 className="text-xl font-extrabold text-[#3e1e0c]">Add Staff Member</h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    A PIN will be auto-generated for login
                  </p>
                </div>

                <div className="space-y-4">
                  {[
                    { label: "Full Name", key: "name", value: name, setter: setName, placeholder: "e.g. Ram Shrestha", required: true },
                    { label: "Email", key: "email", value: email, setter: setEmail, placeholder: "staff@restaurant.com", required: true, type: "email" },
                    { label: "Phone", key: "phone", value: phone, setter: (v: string) => setPhone(v.replace(/\D/g, "")), placeholder: "98XXXXXXXX", required: false },
                  ].map((f) => (
                    <div key={f.key}>
                      <label className="block text-sm font-bold text-gray-800 mb-1.5">
                        {f.label}
                        {f.required && <span className="text-amber-500 ml-0.5">*</span>}
                      </label>
                      <input
                        type={f.type ?? "text"}
                        value={f.value}
                        onChange={(e) => f.setter(e.target.value)}
                        placeholder={f.placeholder}
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-amber-400 focus:ring-2 focus:ring-amber-400/15"
                      />
                    </div>
                  ))}

                  <div>
                    <label className="block text-sm font-bold text-gray-800 mb-2">
                      Role <span className="text-amber-500">*</span>
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
                                : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700"
                            }`}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            {meta.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {errorMsg && (
                  <div className="mt-4 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm font-medium text-red-600">
                    {errorMsg}
                  </div>
                )}

                <div className="mt-5 flex items-center justify-end gap-3">
                  <button
                    onClick={() => { reset(); onClose(); }}
                    className="rounded-xl px-5 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!isValid || saving}
                    className={`flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-white transition-all active:scale-[0.97] ${
                      isValid && !saving
                        ? "bg-[#3e1e0c] shadow-lg shadow-[#3e1e0c]/20 hover:bg-[#2d1508]"
                        : "bg-gray-300 cursor-not-allowed"
                    }`}
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
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

/* ── Main Component ───────────────────────────────────────────────── */
export default function StaffManagementTab() {
  const { selectedRestaurant, restaurants, addStaff, removeStaff, toggleStaffActive } =
    useRestaurant();
  const restaurant = selectedRestaurant ?? restaurants[0];
  const [activeTab, setActiveTab] = useState<"directory" | "attendance">("directory");
  const [showModal, setShowModal] = useState(false);

  if (!restaurant) return null;

  const tabs = [
    { id: "directory" as const, label: "Team Directory", icon: Users },
    { id: "attendance" as const, label: "Attendance", icon: Calendar },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl font-extrabold tracking-tight text-gray-900">
              Staff Management
            </h2>
            {restaurant.restaurantCode && (
              <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-1 shadow-sm">
                <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-xs font-bold text-emerald-800">
                  Code:{" "}
                  <span className="font-mono tracking-widest">
                    {restaurant.restaurantCode}
                  </span>
                </span>
              </div>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Team for{" "}
            <span className="font-bold text-gray-800">{restaurant.name}</span>
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_0_rgba(245,158,11,0.35)] hover:shadow-[0_6px_20px_rgba(245,158,11,0.25)] hover:-translate-y-0.5 active:scale-[0.97] transition-all"
        >
          <UserPlus className="h-4 w-4" strokeWidth={2.5} />
          Add Staff
        </button>
      </div>

      {/* ── Tab bar ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 rounded-xl bg-gray-100/70 p-1 w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all ${
              activeTab === id
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
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
          ) : (
            <AttendanceLogsView restaurantId={restaurant.id} />
          )}
        </motion.div>
      </AnimatePresence>

      {/* ── Add Staff Modal ──────────────────────────────────────── */}
      <AddStaffModal
        open={showModal}
        onClose={() => setShowModal(false)}
        restaurantId={restaurant.id}
      />
    </div>
  );
}
