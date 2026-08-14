"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Crown,
  Shield,
  ChefHat,
  UserCheck,
  ChevronDown,
  Check,
  Users,
  Zap,
  Loader2,
  AlertTriangle,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
} from "lucide-react";
import { useRestaurant, type StaffMember } from "@/context/RestaurantContext";
import { apiFetch, peekApiCache } from "@/lib/api-client";
import {
  TYPE_FEATURE_TABS,
  type FeatureTabDef,
  type FeatureTabId,
} from "@/lib/restaurant-types";

const FEATURE_CATALOG: FeatureTabDef[] = (() => {
  const map = new Map<string, FeatureTabDef>();
  Object.values(TYPE_FEATURE_TABS).forEach((list) =>
    list.forEach((f) => {
      if (!map.has(f.id)) map.set(f.id, f);
    }),
  );
  return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
})();

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
    desc: "Full system access: all features unlocked",
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
    bg: "bg-[var(--accent)]",
    text: "text-[var(--accent)]",
    border: "border-[var(--accent-border)]",
    ring: "ring-orange-400",
  },
  WAITER: {
    label: "Waiter",
    desc: "Order taking and table service",
    icon: UserCheck,
    bg: "bg-[var(--accent-muted)]",
    text: "text-[var(--accent-text)]",
    border: "border-[var(--accent-border)]",
    ring: "ring-[var(--accent)]",
  },
  CASHIER: {
    label: "Cashier",
    desc: "Billing, payments, and counter",
    icon: UserCheck,
    bg: "bg-[var(--accent-muted)]",
    text: "text-[var(--accent-text)]",
    border: "border-[var(--accent-border)]",
    ring: "ring-[var(--accent)]",
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
    <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--canvas)] shadow-[0_2px_12px_-2px_rgba(0,0,0,0.04)] overflow-hidden">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-3 p-4 text-left hover:bg-[var(--surface)]/60 transition-colors"
      >
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${info.bg}`}
        >
          <Icon className={`h-5 w-5 ${info.text}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-[var(--text-1)] text-sm truncate">
              {member.user.name}
            </span>
            {saved ? (
              <span className="flex items-center gap-1 rounded-md bg-[var(--accent-muted)] border border-[var(--accent-border)] px-2 py-0.5 text-[10px] font-bold text-[var(--accent-text)]">
                <Check className="h-2.5 w-2.5" />
                Updated
              </span>
            ) : (
              <RoleBadge role={currentRole} small />
            )}
            {!member.isActive && (
              <span className="rounded-md bg-[var(--surface)] px-2 py-0.5 text-[10px] font-bold text-[var(--text-2)]">
                Inactive
              </span>
            )}
          </div>
          <p className="text-[11px] text-[var(--text-3)] mt-0.5 truncate">
            {member.user.email}
          </p>
        </div>

        <ChevronDown
          className={`h-4 w-4 text-[var(--text-3)] transition-transform duration-200 shrink-0 ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-[var(--border-soft)]">
              <p className="text-[11px] font-bold text-[var(--text-3)] uppercase tracking-wider mb-3">
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
                          : "border-[var(--border-soft)] bg-[var(--canvas-sub)] hover:bg-[var(--surface)]/60 hover:border-[var(--border)]"
                      } ${saving && !isLoading ? "opacity-40" : ""}`}
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isActive ? "bg-[var(--canvas)] shadow-sm" : ri.bg}`}
                      >
                        {isLoading ? (
                          <Loader2 className={`h-3.5 w-3.5 animate-spin ${ri.text}`} />
                        ) : (
                          <RIcon className={`h-3.5 w-3.5 ${ri.text}`} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-bold ${isActive ? ri.text : "text-[var(--text-2)]"}`}
                        >
                          {ri.label}
                          {ROLE_RANK[role] === ROLE_RANK.SUPER_ADMIN && (
                            <span className="ml-1.5 text-[10px] font-semibold text-purple-400">
                              Full Access
                            </span>
                          )}
                        </p>
                        <p className="text-[10px] text-[var(--text-3)] truncate">
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
    <div className="rounded-2xl border border-[var(--border-soft)] overflow-hidden bg-[var(--canvas)] shadow-[0_2px_12px_-2px_rgba(0,0,0,0.03)]">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3.5 bg-[var(--canvas-sub)] hover:bg-[var(--surface)]/80 transition-colors"
      >
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${info.bg}`}
        >
          <Icon className={`h-4 w-4 ${info.text}`} />
        </div>
        <div className="flex-1 text-left">
          <span className="text-sm font-bold text-[var(--text-1)]">{info.label}</span>
          <span className="ml-2 text-[11px] font-semibold text-[var(--text-3)]">
            {members.length} staff
          </span>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-[var(--text-3)] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
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
            className="px-4 py-6 text-center text-[12px] text-[var(--text-3)]"
          >
            No staff in this category
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

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
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-[var(--canvas)] p-6 shadow-2xl"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-muted)] mb-4">
              <AlertTriangle className="h-6 w-6 text-[var(--accent)]" />
            </div>
            <h3 className="text-lg font-extrabold text-[var(--text-1)] mb-1">
              Enable Full Access for All Staff?
            </h3>
            <p className="text-sm text-[var(--text-2)] mb-5">
              This will set every staff member&apos;s role to{" "}
              <strong className="text-purple-700">Super Admin</strong>, granting
              them complete system access. You can reassign roles individually
              at any time.
            </p>
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-bold text-[var(--text-2)] hover:bg-[var(--canvas-sub)] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-bold text-white hover:bg-[var(--accent)] transition-all disabled:opacity-60"
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

function WorkflowSettingsSection({
  restaurantId,
}: {
  restaurantId: string;
}) {
  const capPath = `/api/restaurants/${restaurantId}/capabilities`;
  type WorkflowFlags = {
    mergeBillingOrders: boolean;
    autoAcceptOrders: boolean;
  };
  const seed = peekApiCache<{ capability?: Partial<WorkflowFlags> }>(capPath);
  const [flags, setFlags] = useState<WorkflowFlags>({
    mergeBillingOrders: seed?.capability?.mergeBillingOrders ?? false,
    autoAcceptOrders: seed?.capability?.autoAcceptOrders ?? false,
  });
  const [loading, setLoading] = useState(!seed);
  const [saving, setSaving] = useState<keyof WorkflowFlags | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!peekApiCache(capPath)) setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<{ capability: Partial<WorkflowFlags> }>(capPath);
        if (cancelled) return;
        setFlags({
          mergeBillingOrders: data.capability.mergeBillingOrders ?? false,
          autoAcceptOrders: data.capability.autoAcceptOrders ?? false,
        });
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [restaurantId, capPath]);

  const toggleFlag = async (key: keyof WorkflowFlags) => {
    if (loading || saving) return;
    const next = !flags[key];
    setFlags((f) => ({ ...f, [key]: next }));
    setSaving(key);
    setError(null);
    try {
      await apiFetch(capPath, { method: "PATCH", body: { [key]: next } });
    } catch (e) {
      setFlags((f) => ({ ...f, [key]: !next })); // revert
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--canvas)] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-[var(--border-soft)] px-5 py-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-muted)]">
            <RefreshCw className="h-5 w-5 text-[var(--accent)]" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-[var(--text-1)]">Workflow Settings</p>
            <p className="text-xs text-[var(--text-2)] mt-0.5">
              Customize how the system works for your staff operations.
            </p>
          </div>
        </div>
      </div>
      {error && (
        <div className="border-b border-[var(--border-soft)] bg-red-50 px-5 py-2 text-xs font-semibold text-red-700">
          {error}
        </div>
      )}
      {loading ? (
        <div className="flex items-center justify-center py-8 text-[var(--text-3)]">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <ul className="divide-y divide-[var(--border-soft)]">
          {(
            [
              {
                key: "mergeBillingOrders" as const,
                // The dashboard deliberately does NOT honour this flag — the
                // merge was tried there and reverted. Only /counter and
                // /kitchen read it, so the description must not promise more.
                label: "Merge Orders & Billing (counter & kitchen)",
                desc: "On the counter and kitchen screens only, Billing stops being its own tab and moves inside Orders. The dashboard is left alone on purpose: Billing keeps its own page for split bills, payment proof and reports, and every order there already has its own Print bill button. Staff screens that are already open pick this up after a refresh.",
              },
              {
                key: "autoAcceptOrders" as const,
                label: "Auto-accept incoming orders",
                desc: "Accepts every cash or pay-at-counter order the instant it arrives, so nothing can sit unnoticed in Pending. Staff no longer see it before the kitchen does — leave this off if you regularly run out of items. Online payments still wait for the payment to clear.",
              },
            ]
          ).map(({ key, label, desc }) => (
            <li
              key={key}
              className="flex items-center gap-4 px-5 py-4 hover:bg-[var(--canvas-sub)] transition-colors cursor-pointer"
              onClick={() => toggleFlag(key)}
            >
              <div className="min-w-0 flex-1">
                <span className="text-[13px] font-bold text-[var(--text-1)] block truncate">
                  {label}
                </span>
                <p className="text-[11.5px] font-medium text-[var(--text-3)] mt-0.5 max-w-[90%] leading-snug">
                  {desc}
                </p>
              </div>
              <div className="flex items-center justify-end w-12 shrink-0">
                {saving === key ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[var(--accent)]" />
                ) : (
                  <button
                    type="button"
                    role="switch"
                    aria-checked={flags[key]}
                    aria-label={label}
                    className={`relative inline-flex h-6 w-10 shrink-0 items-center rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      flags[key] ? "bg-[var(--text-1)]" : "bg-[var(--border)]"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-[18px] w-[18px] transform rounded-full bg-[var(--canvas)] shadow ring-0 transition duration-200 ease-in-out ${
                        flags[key] ? "translate-x-[18px]" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FeatureOverridesSection({
  restaurantId,
  restaurantType,
  onSaved,
}: {
  restaurantId: string;
  restaurantType: string;
  onSaved: () => void;
}) {
  const typeDefaultIds = useMemo(
    () => new Set((TYPE_FEATURE_TABS[restaurantType] ?? []).map((f) => f.id)),
    [restaurantType],
  );

  // Seed from the warm GET cache so re-opening the panel paints instantly.
  const featuresPath = `/api/restaurants/${restaurantId}/features`;
  const buildStates = useCallback((data?: {
    restaurant?: { featuresEnabled?: string[]; featuresDisabled?: string[] };
  }): Record<string, boolean> => {
    const enabled = data?.restaurant?.featuresEnabled ?? [];
    const disabled = data?.restaurant?.featuresDisabled ?? [];
    const next: Record<string, boolean> = {};
    FEATURE_CATALOG.forEach((f) => {
      if (disabled.includes(f.id)) next[f.id] = false;
      else if (enabled.includes(f.id)) next[f.id] = true;
      else next[f.id] = typeDefaultIds.has(f.id);
    });
    return next;
  }, [typeDefaultIds]);
  const featuresSeed = peekApiCache<{ restaurant: { featuresEnabled: string[]; featuresDisabled: string[] } }>(featuresPath);
  const [states, setStates] = useState<Record<string, boolean>>(() => featuresSeed ? buildStates(featuresSeed) : {});
  const [loading, setLoading] = useState(() => !featuresSeed);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!peekApiCache(`/api/restaurants/${restaurantId}/features`)) setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<{
          restaurant: {
            featuresEnabled: string[];
            featuresDisabled: string[];
          };
        }>(`/api/restaurants/${restaurantId}/features`);
        if (cancelled) return;
        setStates(buildStates(data));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [restaurantId, buildStates]);

  const toggleState = (id: string) => {
    setStates((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const overrideCount = Object.entries(states).filter(([k, v]) => v !== typeDefaultIds.has(k as FeatureTabId)).length;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const featuresEnabled = Object.entries(states)
        .filter(([k, v]) => v === true && !typeDefaultIds.has(k as FeatureTabId))
        .map(([k]) => k);
      const featuresDisabled = Object.entries(states)
        .filter(([k, v]) => v === false && typeDefaultIds.has(k as FeatureTabId))
        .map(([k]) => k);

      await apiFetch(`/api/restaurants/${restaurantId}/features`, {
        method: "PUT",
        body: { featuresEnabled, featuresDisabled },
      });
      setSavedAt(Date.now());
      setTimeout(() => setSavedAt(null), 1800);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--canvas)] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-[var(--border-soft)] px-5 py-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-muted)]">
            <Zap className="h-5 w-5 text-[var(--accent)]" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-[var(--text-1)]">Feature Toggles</p>
            <p className="text-xs text-[var(--text-2)] mt-0.5">
              Enable or disable features for this restaurant. Default follows the{" "}
              <strong className="text-[var(--text-1)]">
                {restaurantType.replace(/_/g, " ").toLowerCase()}
              </strong>{" "}
              type.
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={loading || saving}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-[var(--accent)] px-3.5 py-2 text-xs font-bold text-white hover:bg-[var(--accent-hover)] transition-all disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : savedAt ? (
            <Check className="h-3.5 w-3.5" />
          ) : null}
          {saving ? "Saving..." : savedAt ? "Saved" : overrideCount > 0 ? `Save (${overrideCount})` : "Save"}
        </button>
      </div>

      {error && (
        <div className="border-b border-[var(--border-soft)] bg-red-50 px-5 py-2 text-xs font-semibold text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12 text-[var(--text-3)]">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <ul className="divide-y divide-[var(--border-soft)]">
          {FEATURE_CATALOG.map((f) => {
            const state = states[f.id] ?? typeDefaultIds.has(f.id);
            const isDefaultOn = typeDefaultIds.has(f.id);
            return (
              <li
                key={f.id}
                className="flex items-center gap-4 px-5 py-4 hover:bg-[var(--canvas-sub)] transition-colors cursor-pointer"
                onClick={() => toggleState(f.id)}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-bold text-[var(--text-1)] truncate">
                      {f.label}
                    </span>
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                        isDefaultOn
                          ? "bg-[var(--surface)] text-[var(--text-3)]"
                          : "bg-[var(--surface)] text-[var(--text-3)]"
                      }`}
                    >
                      {isDefaultOn ? "type default: on" : "type default: off"}
                    </span>
                  </div>
                  <p className="text-[11.5px] font-medium text-[var(--text-3)] truncate mt-0.5">
                    {f.desc}
                  </p>
                </div>

                <div className="flex items-center justify-end w-12 shrink-0">
                  <button
                    type="button"
                    className={`relative inline-flex h-6 w-10 shrink-0 items-center rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      state ? "bg-[var(--text-1)]" : "bg-[var(--border)]"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-[18px] w-[18px] transform rounded-full bg-[var(--canvas)] shadow ring-0 transition duration-200 ease-in-out ${
                        state ? "translate-x-[18px]" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

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
      <div className="flex items-center justify-center py-24 text-[var(--text-3)] text-sm">
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] shadow-sm">
              <Crown className="h-4.5 w-4.5 text-white" />
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[var(--text-1)]">
              Owner Control Panel
            </h2>
          </div>
          <p className="text-sm text-[var(--text-2)] sm:ml-11">
            Manage staff roles and feature access for{" "}
            <strong className="text-[var(--text-1)]">{restaurant.name}</strong>
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="flex shrink-0 items-center gap-1.5 self-start rounded-xl border border-[var(--border)] bg-[var(--canvas)] px-3 py-2 text-[12px] font-bold text-[var(--text-2)] hover:bg-[var(--canvas-sub)] transition-all shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* ── Owner-only notice ────────────────────────────────────── */}
      <div className="flex items-start gap-3 rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-4">
        <Crown className="h-4.5 w-4.5 text-[var(--text-2)] shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-[var(--text-1)]">
            Owner-only section
          </p>
          <p className="text-xs text-[var(--text-2)] mt-0.5">
            Changes made here take effect immediately. Staff members will use
            their new permissions on next login.
          </p>
        </div>
      </div>

      {/* ── Global Enable All toggle ─────────────────────────────── */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--canvas)] shadow-sm overflow-hidden">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-purple-50">
              <Zap className="h-5 w-5 text-purple-600" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-[var(--text-1)]">
                Enable all features for all staff
              </p>
              <p className="text-xs text-[var(--text-2)] mt-0.5">
                Grants every staff member{" "}
                <span className="font-semibold text-purple-700">Super Admin</span>{" "}
                access, full system permissions
              </p>
            </div>
          </div>
          <button
            onClick={() =>
              allSuperAdmin ? null : setShowEnableAllDialog(true)
            }
            className={`flex w-full shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all active:scale-[0.97] sm:w-auto ${
              allSuperAdmin
                ? "bg-[var(--surface)] text-[var(--text-3)] border border-[var(--border)] cursor-default"
                : "bg-[var(--text-1)] text-[var(--canvas)] shadow-sm hover:opacity-90"
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

        {staff.length > 0 && (
          <div className="grid grid-cols-3 divide-x divide-[var(--border)] border-t border-[var(--border-soft)]">
            {[
              {
                label: "Total Staff",
                value: staff.length,
                color: "text-[var(--text-1)]",
              },
              {
                label: "Full Access",
                value: staff.filter((s) => s.role === "SUPER_ADMIN").length,
                color: "text-purple-600",
              },
              {
                label: "Active",
                value: staff.filter((s) => s.isActive).length,
                color: "text-[var(--accent-text)]",
              },
            ].map((stat) => (
              <div key={stat.label} className="py-3 px-4 text-center">
                <p className={`text-xl font-black ${stat.color}`}>
                  {stat.value}
                </p>
                <p className="text-[10px] font-semibold text-[var(--text-3)] mt-0.5">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Workflow Settings ─────────────────────────────────────── */}
      <WorkflowSettingsSection restaurantId={restaurant.id} />

      {/* ── Feature toggles section ──────────────────────────────── */}
      {restaurant.type && (
        <FeatureOverridesSection
          restaurantId={restaurant.id}
          restaurantType={restaurant.type}
          onSaved={refresh}
        />
      )}

      {/* ── Manage Roles section ─────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-4 w-4 text-[var(--text-3)]" />
          <h3 className="text-sm font-bold text-[var(--text-2)] uppercase tracking-wider">
            Staff by Role
          </h3>
        </div>

        {staff.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center rounded-2xl border border-dashed border-[var(--border)]">
            <Users className="h-10 w-10 text-[var(--text-3)] mb-3" />
            <p className="font-bold text-[var(--text-2)]">No staff members yet</p>
            <p className="text-sm text-[var(--text-3)] mt-1">
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
      <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--canvas)] p-5 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.03)]">
        <h3 className="text-sm font-bold text-[var(--text-2)] mb-3">
          Role Permissions Overview
        </h3>
        <div className="space-y-2">
          {ALL_ROLES.map((role) => {
            const info = ROLE_INFO[role];
            const Icon = info.icon;
            return (
              <div
                key={role}
                className={`flex flex-col gap-2 rounded-xl border px-3 py-2.5 sm:flex-row sm:items-center sm:gap-3 ${info.bg} ${info.border}`}
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Icon className={`h-4 w-4 ${info.text} shrink-0`} />
                  <div className="min-w-0">
                    <span className={`block text-sm font-bold ${info.text}`}>
                      {info.label}
                    </span>
                    <span className="block text-[11px] text-[var(--text-2)]">
                      {info.desc}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 sm:justify-end">
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
                      <span className="rounded-md bg-[var(--accent)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--accent)]">
                        Kitchen
                      </span>
                      <span className="rounded-md bg-[var(--accent)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--accent)]">
                        Orders
                      </span>
                    </>
                  )}
                  {role === "WAITER" && (
                    <>
                      <span className="rounded-md bg-[var(--accent-muted)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--accent-text)]">
                        Orders
                      </span>
                      <span className="rounded-md bg-[var(--accent-muted)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--accent-text)]">
                        Tables
                      </span>
                    </>
                  )}
                  {role === "CASHIER" && (
                    <>
                      <span className="rounded-md bg-[var(--accent-muted)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--accent-text)]">
                        Billing
                      </span>
                      <span className="rounded-md bg-[var(--accent-muted)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--accent-text)]">
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
