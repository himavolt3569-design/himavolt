"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Crown,
  Shield,
  ChefHat,
  UserCheck,
  Users,
  Zap,
  ChevronDown,
  Loader2,
  Check,
  AlertTriangle,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
} from "lucide-react";
import { useRestaurant, type StaffMember } from "@/context/RestaurantContext";
import { apiFetch } from "@/lib/api-client";

type StaffRole = "SUPER_ADMIN" | "MANAGER" | "CHEF" | "WAITER" | "CASHIER";

const ROLE_INFO: Record<
  StaffRole,
  {
    label: string;
    desc: string;
    icon: typeof Crown;
    bg: string;
    text: string;
    border: string;
    ring: string;
  }
> = {
  SUPER_ADMIN: {
    label: "Super Admin",
    desc: "Full system access — all features unlocked",
    icon: Crown,
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-200",
    ring: "ring-purple-400",
  },
  MANAGER: {
    label: "Manager",
    desc: "Management, oversight, and reports",
    icon: Shield,
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    ring: "ring-blue-400",
  },
  CHEF: {
    label: "Chef",
    desc: "Kitchen display and order preparation",
    icon: ChefHat,
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-200",
    ring: "ring-orange-400",
  },
  WAITER: {
    label: "Waiter",
    desc: "Order taking and table service",
    icon: UserCheck,
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    ring: "ring-emerald-400",
  },
  CASHIER: {
    label: "Cashier",
    desc: "Billing, payments, and counter",
    icon: UserCheck,
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    ring: "ring-amber-400",
  },
};

const ALL_ROLES: StaffRole[] = [
  "SUPER_ADMIN",
  "MANAGER",
  "CHEF",
  "WAITER",
  "CASHIER",
];

/* Permission hierarchy — higher index = more access */
const ROLE_RANK: Record<StaffRole, number> = {
  CASHIER: 1,
  WAITER: 2,
  CHEF: 3,
  MANAGER: 4,
  SUPER_ADMIN: 5,
};

function RoleBadge({ role, small }: { role: StaffRole; small?: boolean }) {
  const info = ROLE_INFO[role];
  const Icon = info.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-bold ${info.bg} ${info.text} ${info.border} ${small ? "text-[10px]" : "text-xs"}`}
    >
      <Icon className={small ? "h-2.5 w-2.5" : "h-3 w-3"} />
      {info.label}
    </span>
  );
}

/* ── Staff Card with role assignment ─────────────────────────────── */
function StaffRoleCard({
  member,
  restaurantId,
  onUpdated,
}: {
  member: StaffMember;
  restaurantId: string;
  onUpdated: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState<StaffRole | null>(null);
  const [saved, setSaved] = useState<StaffRole | null>(null);

  const currentRole = member.role as StaffRole;
  const info = ROLE_INFO[currentRole] ?? ROLE_INFO.WAITER;
  const Icon = info.icon;

  const handleAssign = async (newRole: StaffRole) => {
    if (newRole === currentRole || saving) return;
    setSaving(newRole);
    try {
      await apiFetch(`/api/restaurants/${restaurantId}/staff/${member.id}`, {
        method: "PATCH",
        body: { role: newRole },
      });
      setSaved(newRole);
      setTimeout(() => setSaved(null), 1800);
      onUpdated();
      setExpanded(false);
    } catch {
      // keep expanded on error
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-[0_2px_12px_-2px_rgba(0,0,0,0.04)] overflow-hidden">
      {/* Card header */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-3 p-4 text-left hover:bg-gray-50/60 transition-colors"
      >
        {/* Avatar */}
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${info.bg}`}
        >
          <Icon className={`h-5 w-5 ${info.text}`} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-gray-900 text-sm truncate">
              {member.user.name}
            </span>
            {saved ? (
              <span className="flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                <Check className="h-2.5 w-2.5" />
                Updated
              </span>
            ) : (
              <RoleBadge role={currentRole} small />
            )}
            {!member.isActive && (
              <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500">
                Inactive
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-400 mt-0.5 truncate">
            {member.user.email}
          </p>
        </div>

        <ChevronDown
          className={`h-4 w-4 text-gray-400 transition-transform duration-200 shrink-0 ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {/* Expanded role picker */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-gray-50">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">
                Assign Role
              </p>
              <div className="grid grid-cols-1 gap-2">
                {ALL_ROLES.map((role) => {
                  const ri = ROLE_INFO[role];
                  const RIcon = ri.icon;
                  const isActive = role === currentRole;
                  const isLoading = saving === role;
                  return (
                    <button
                      key={role}
                      onClick={() => handleAssign(role)}
                      disabled={!!saving}
                      className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all ${
                        isActive
                          ? `${ri.bg} ${ri.border} ring-1 ${ri.ring}`
                          : "border-gray-100 bg-gray-50/50 hover:bg-gray-100/60 hover:border-gray-200"
                      } ${saving && !isLoading ? "opacity-40" : ""}`}
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isActive ? "bg-white shadow-sm" : ri.bg}`}
                      >
                        {isLoading ? (
                          <Loader2 className={`h-3.5 w-3.5 animate-spin ${ri.text}`} />
                        ) : (
                          <RIcon className={`h-3.5 w-3.5 ${ri.text}`} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-bold ${isActive ? ri.text : "text-gray-700"}`}
                        >
                          {ri.label}
                          {ROLE_RANK[role] === ROLE_RANK.SUPER_ADMIN && (
                            <span className="ml-1.5 text-[10px] font-semibold text-purple-400">
                              Full Access
                            </span>
                          )}
                        </p>
                        <p className="text-[10px] text-gray-400 truncate">
                          {ri.desc}
                        </p>
                      </div>
                      {isActive && (
                        <Check className={`h-4 w-4 shrink-0 ${ri.text}`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Role Group Section ──────────────────────────────────────────── */
function RoleGroup({
  role,
  members,
  restaurantId,
  onUpdated,
}: {
  role: StaffRole;
  members: StaffMember[];
  restaurantId: string;
  onUpdated: () => void;
}) {
  const [open, setOpen] = useState(true);
  const info = ROLE_INFO[role];
  const Icon = info.icon;

  return (
    <div className="rounded-2xl border border-gray-100 overflow-hidden bg-white shadow-[0_2px_12px_-2px_rgba(0,0,0,0.03)]">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3.5 bg-gray-50/40 hover:bg-gray-50/80 transition-colors"
      >
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${info.bg}`}
        >
          <Icon className={`h-4 w-4 ${info.text}`} />
        </div>
        <div className="flex-1 text-left">
          <span className="text-sm font-bold text-gray-800">{info.label}</span>
          <span className="ml-2 text-[11px] font-semibold text-gray-400">
            {members.length} staff
          </span>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && members.length > 0 && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-3 space-y-2">
              {members.map((m) => (
                <StaffRoleCard
                  key={m.id}
                  member={m}
                  restaurantId={restaurantId}
                  onUpdated={onUpdated}
                />
              ))}
            </div>
          </motion.div>
        )}
        {open && members.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-4 py-6 text-center text-[12px] text-gray-400"
          >
            No staff in this category
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Enable All Confirm Dialog ───────────────────────────────────── */
function EnableAllDialog({
  open,
  onConfirm,
  onCancel,
  loading,
}: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[3px]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", damping: 28, stiffness: 340, mass: 0.7 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-6 shadow-2xl"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 mb-4">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
            </div>
            <h3 className="text-lg font-extrabold text-gray-900 mb-1">
              Enable Full Access for All Staff?
            </h3>
            <p className="text-sm text-gray-500 mb-5">
              This will set every staff member&apos;s role to{" "}
              <strong className="text-purple-700">Super Admin</strong>, granting
              them complete system access. You can reassign roles individually
              at any time.
            </p>
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-400 transition-all disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                {loading ? "Enabling…" : "Enable All"}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ── Main Component ──────────────────────────────────────────────── */
export default function OwnerControlPanel() {
  const { selectedRestaurant, restaurants, fetchRestaurants } = useRestaurant();
  const restaurant = selectedRestaurant ?? restaurants[0];

  const [showEnableAllDialog, setShowEnableAllDialog] = useState(false);
  const [enableAllLoading, setEnableAllLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRestaurants();
    setRefreshing(false);
  }, [fetchRestaurants]);

  const handleEnableAll = async () => {
    if (!restaurant) return;
    setEnableAllLoading(true);
    try {
      const nonAdmin = restaurant.staff.filter((s) => s.role !== "SUPER_ADMIN");
      await Promise.all(
        nonAdmin.map((s) =>
          apiFetch(`/api/restaurants/${restaurant.id}/staff/${s.id}`, {
            method: "PATCH",
            body: { role: "SUPER_ADMIN" },
          })
        )
      );
      await fetchRestaurants();
      setShowEnableAllDialog(false);
    } catch {
      // stay open
    } finally {
      setEnableAllLoading(false);
    }
  };

  if (!restaurant) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400 text-sm">
        No restaurant selected.
      </div>
    );
  }

  const staff = restaurant.staff ?? [];
  const allSuperAdmin =
    staff.length > 0 && staff.every((s) => s.role === "SUPER_ADMIN");

  /* Group staff by current role */
  const staffByRole = ALL_ROLES.reduce<Record<StaffRole, StaffMember[]>>(
    (acc, role) => {
      acc[role] = staff.filter((s) => s.role === role);
      return acc;
    },
    { SUPER_ADMIN: [], MANAGER: [], CHEF: [], WAITER: [], CASHIER: [] }
  );

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm">
              <Crown className="h-4.5 w-4.5 text-white" />
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight text-gray-900">
              Owner Control Panel
            </h2>
          </div>
          <p className="text-sm text-gray-500 ml-11">
            Manage staff roles and feature access for{" "}
            <strong className="text-gray-800">{restaurant.name}</strong>
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-[12px] font-bold text-gray-500 hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* ── Owner-only notice ────────────────────────────────────── */}
      <div className="flex items-start gap-3 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100/60 p-4">
        <Crown className="h-4.5 w-4.5 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-amber-900">
            Owner-only section
          </p>
          <p className="text-xs text-amber-700 mt-0.5">
            Changes made here take effect immediately. Staff members will use
            their new permissions on next login.
          </p>
        </div>
      </div>

      {/* ── Global Enable All toggle ─────────────────────────────── */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="flex items-center gap-4 p-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100">
            <Zap className="h-5 w-5 text-purple-600" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-gray-900">
              Enable all features for all staff
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Grants every staff member{" "}
              <span className="font-semibold text-purple-700">Super Admin</span>{" "}
              access — full system permissions
            </p>
          </div>
          <button
            onClick={() =>
              allSuperAdmin ? null : setShowEnableAllDialog(true)
            }
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all active:scale-[0.97] ${
              allSuperAdmin
                ? "bg-purple-50 text-purple-600 border border-purple-100 cursor-default"
                : "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-[0_4px_14px_0_rgba(245,158,11,0.3)] hover:shadow-[0_6px_20px_rgba(245,158,11,0.2)] hover:-translate-y-0.5"
            }`}
          >
            {allSuperAdmin ? (
              <>
                <ToggleRight className="h-4 w-4" />
                All Enabled
              </>
            ) : (
              <>
                <ToggleLeft className="h-4 w-4" />
                Enable All
              </>
            )}
          </button>
        </div>

        {/* Stats row */}
        {staff.length > 0 && (
          <div className="grid grid-cols-3 divide-x divide-gray-100 border-t border-gray-100">
            {[
              {
                label: "Total Staff",
                value: staff.length,
                color: "text-gray-800",
              },
              {
                label: "Full Access",
                value: staff.filter((s) => s.role === "SUPER_ADMIN").length,
                color: "text-purple-600",
              },
              {
                label: "Active",
                value: staff.filter((s) => s.isActive).length,
                color: "text-emerald-600",
              },
            ].map((stat) => (
              <div key={stat.label} className="py-3 px-4 text-center">
                <p className={`text-xl font-black ${stat.color}`}>
                  {stat.value}
                </p>
                <p className="text-[10px] font-semibold text-gray-400 mt-0.5">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Manage Roles section ─────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-4 w-4 text-gray-400" />
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
            Staff by Role
          </h3>
        </div>

        {staff.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center rounded-2xl border border-dashed border-gray-200">
            <Users className="h-10 w-10 text-gray-300 mb-3" />
            <p className="font-bold text-gray-500">No staff members yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Add staff from the Staff Management tab
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {ALL_ROLES.map((role) => (
              <RoleGroup
                key={role}
                role={role}
                members={staffByRole[role]}
                restaurantId={restaurant.id}
                onUpdated={refresh}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Feature permissions legend ───────────────────────────── */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.03)]">
        <h3 className="text-sm font-bold text-gray-700 mb-3">
          Role Permissions Overview
        </h3>
        <div className="space-y-2">
          {ALL_ROLES.map((role) => {
            const info = ROLE_INFO[role];
            const Icon = info.icon;
            return (
              <div
                key={role}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${info.bg} ${info.border}`}
              >
                <Icon className={`h-4 w-4 ${info.text} shrink-0`} />
                <div className="flex-1 min-w-0">
                  <span className={`text-sm font-bold ${info.text}`}>
                    {info.label}
                  </span>
                  <span className="text-[11px] text-gray-500 ml-2">
                    {info.desc}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 justify-end">
                  {role === "SUPER_ADMIN" && (
                    <span className="rounded-md bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                      All Features
                    </span>
                  )}
                  {role === "MANAGER" && (
                    <>
                      <span className="rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
                        Reports
                      </span>
                      <span className="rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
                        Staff
                      </span>
                      <span className="rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
                        Menu
                      </span>
                    </>
                  )}
                  {role === "CHEF" && (
                    <>
                      <span className="rounded-md bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-700">
                        Kitchen
                      </span>
                      <span className="rounded-md bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-700">
                        Orders
                      </span>
                    </>
                  )}
                  {role === "WAITER" && (
                    <>
                      <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                        Orders
                      </span>
                      <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                        Tables
                      </span>
                    </>
                  )}
                  {role === "CASHIER" && (
                    <>
                      <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                        Billing
                      </span>
                      <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                        Payments
                      </span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Enable All Confirm Dialog ─────────────────────────────── */}
      <EnableAllDialog
        open={showEnableAllDialog}
        onConfirm={handleEnableAll}
        onCancel={() => setShowEnableAllDialog(false)}
        loading={enableAllLoading}
      />
    </div>
  );
}
