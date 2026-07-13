"use client";

import { Suspense, lazy, useState, useEffect, useMemo } from "react";
import {
  BedDouble,
  CalendarCheck,
  ClipboardList,
  Settings,
  Building2,
  ChevronRight,
  Coffee,
  Camera,
  Loader2,
} from "lucide-react";
import { useRestaurant } from "@/context/RestaurantContext";
import { useToast } from "@/context/ToastContext";
import { formatPrice } from "@/lib/currency";
import { isFeatureAvailable } from "@/lib/restaurant-types";
import { STAFF_MANAGER_ROLES, STAFF_BILLING_ROLES } from "@/lib/staff-roles";

const RoomManagementTab = lazy(() => import("./RoomManagementTab"));
const HotelBookingsTab = lazy(() => import("./HotelBookingsTab"));
const GuestCheckInTab = lazy(() => import("./GuestCheckInTab"));
const HotelQRTab = lazy(() => import("./HotelQRTab"));
const HeroSlidesManager = lazy(() => import("./HeroSlidesManager"));

type HubTab = "rooms" | "bookings" | "guests" | "media" | "service" | "setup";

/**
 * Each sub-tab is gated by a permission scope (mirrors the server RBAC):
 *  - "manage"    → owner + manager (rooms catalogue & hotel config / QR setup)
 *  - "frontdesk" → owner + billing roles (bookings, check-in, advance payments)
 */
type TabScope = "manage" | "frontdesk";

const TABS: {
  id: HubTab;
  label: string;
  desc: string;
  icon: typeof BedDouble;
  scope: TabScope;
}[] = [
  {
    id: "rooms",
    label: "Rooms",
    desc: "Manage rooms & per-room QR codes",
    icon: BedDouble,
    scope: "manage",
  },
  {
    id: "bookings",
    label: "Bookings",
    desc: "Reservations, check-in & advance payments",
    icon: CalendarCheck,
    scope: "frontdesk",
  },
  {
    id: "guests",
    label: "Guests",
    desc: "Walk-in check-in, ID scan & guest records",
    icon: ClipboardList,
    scope: "frontdesk",
  },
  {
    id: "media",
    label: "Media Library",
    desc: "Manage main property photos",
    icon: Camera,
    scope: "manage",
  },
  {
    id: "service",
    label: "Room Service",
    desc: "Paid in-room service add-on",
    icon: Coffee,
    scope: "manage",
  },
  {
    id: "setup",
    label: "Setup",
    desc: "Hotel QR card & booking config",
    icon: Settings,
    scope: "manage",
  },
];

/**
 * Owner/manager config for the optional paid Room Service add-on. Guests can
 * opt into it at booking time; the flat charge is added to the booking total.
 */
function RoomServicePanel() {
  const { selectedRestaurant, updateRestaurant } = useRestaurant();
  const { showToast } = useToast();
  const r = selectedRestaurant;
  const [enabled, setEnabled] = useState(r?.roomServiceEnabled ?? false);
  const [charge, setCharge] = useState(String(r?.roomServiceCharge ?? 0));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEnabled(r?.roomServiceEnabled ?? false);
    setCharge(String(r?.roomServiceCharge ?? 0));
  }, [r?.id, r?.roomServiceEnabled, r?.roomServiceCharge]);

  if (!r) return null;
  const cur = r.currency ?? "NPR";

  const save = async () => {
    setSaving(true);
    try {
      const parsedCharge = Number(charge);
      await updateRestaurant(r.id, {
        roomServiceEnabled: enabled,
        roomServiceCharge: Number.isFinite(parsedCharge) ? Math.max(0, parsedCharge) : 0,
      });
      showToast("Room service settings saved", "success");
    } catch {
      showToast("Failed to save room service settings", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl space-y-5">
      <label className="flex items-center justify-between gap-4 rounded-2xl bg-[var(--canvas)] ring-1 ring-[var(--border)] px-4 py-3.5">
        <span className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-muted)] text-[var(--accent)]">
            <Coffee className="h-4 w-4" />
          </span>
          <span>
            <span className="block text-[13px] font-semibold text-[var(--text-1)]">
              Offer Room Service
            </span>
            <span className="block text-[11px] text-[var(--text-3)]">
              Guests can add it when booking a room
            </span>
          </span>
        </span>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="h-5 w-5 accent-[var(--accent)]"
        />
      </label>

      <div className={enabled ? "" : "opacity-50 pointer-events-none"}>
        <label className="block text-[13px] font-semibold text-[var(--text-2)] mb-1.5">
          Room service charge ({cur})
        </label>
        <input
          type="number"
          min={0}
          value={charge}
          onChange={(e) => setCharge(e.target.value)}
          placeholder="0"
          className="w-full rounded-xl bg-[var(--canvas-sub)] px-3.5 py-3 text-sm text-[var(--text-1)] outline-none ring-1 ring-[var(--border)] focus:ring-[var(--accent)]"
        />
        <p className="mt-1.5 text-[11px] text-[var(--text-3)]">
          Flat amount added to a booking total when the guest opts in
          {Number(charge) > 0 ? ` — ${formatPrice(Number(charge), cur)}` : ""}.
        </p>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="rounded-xl bg-[var(--accent)] px-5 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}

/**
 * Resolve the current actor's hotel permissions. Owners are Supabase-authed and
 * have no staff_session (so /api/staff-session 401s) → full access. Staff get
 * scopes from their live DB role.
 */
function useHotelHubAccess() {
  const [access, setAccess] = useState<{ manage: boolean; frontdesk: boolean } | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Safety net: if /api/staff-session hangs (e.g. pool saturation), don't
    // strand the user on a permanent blank — default to owner access after 4s.
    // The sub-panel APIs still enforce real RBAC server-side.
    const timeout = setTimeout(() => {
      if (!cancelled) setAccess((a) => a ?? { manage: true, frontdesk: true });
    }, 4000);
    (async () => {
      try {
        const res = await fetch("/api/staff-session");
        if (cancelled) return;
        if (!res.ok) {
          // Not a staff session → owner (or page is owner-only): full access.
          setAccess({ manage: true, frontdesk: true });
          return;
        }
        const data = await res.json();
        const role = String(data?.role ?? "");
        setAccess({
          manage: (STAFF_MANAGER_ROLES as readonly string[]).includes(role),
          frontdesk: (STAFF_BILLING_ROLES as readonly string[]).includes(role),
        });
      } catch {
        if (!cancelled) setAccess({ manage: true, frontdesk: true });
      } finally {
        clearTimeout(timeout);
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, []);

  return access;
}

export default function HotelHubTab() {
  const { selectedRestaurant } = useRestaurant();
  const access = useHotelHubAccess();

  const visibleTabs = useMemo(
    () =>
      access
        ? TABS.filter((t) => (t.scope === "manage" ? access.manage : access.frontdesk))
        : [],
    [access],
  );

  const [active, setActive] = useState<HubTab>("rooms");

  // Clamp the selection to what this actor may see — derived during render so
  // we never call setState from an effect just to keep the tab valid.
  const effectiveActive =
    visibleTabs.find((t) => t.id === active)?.id ?? visibleTabs[0]?.id;

  if (!selectedRestaurant) return null;

  const hubEnabled = isFeatureAvailable(selectedRestaurant.type, "hotel-hub", {
    featuresEnabled: selectedRestaurant.featuresEnabled,
    featuresDisabled: selectedRestaurant.featuresDisabled,
  });

  if (!hubEnabled) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface)]">
          <Building2 className="h-7 w-7 text-[var(--text-3)]" />
        </div>
        <div>
          <p className="text-[15px] font-semibold text-[var(--text-1)]">Hotel Hub is turned off</p>
          <p className="mt-1 text-[12px] text-[var(--text-2)] max-w-sm">
            Turn on Hotel Hub in Settings → Owner Controls to manage rooms, bookings, guest check-in, QR codes &amp; room service — or set the venue type to Hotel, Resort or Guest House, which have it on by default.
          </p>
        </div>
      </div>
    );
  }

  // Still resolving the actor's role — paint nothing rather than a spinner.
  if (!access) return null;

  // A staff member with neither manage nor front-desk scope (e.g. a waiter/chef).
  if (visibleTabs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface)]">
          <Building2 className="h-7 w-7 text-[var(--text-3)]" />
        </div>
        <div>
          <p className="text-[15px] font-semibold text-[var(--text-1)]">No access to Hotel Hub</p>
          <p className="mt-1 text-[12px] text-[var(--text-2)] max-w-sm">
            Your role doesn&apos;t include hotel management. Ask an owner or manager for access.
          </p>
        </div>
      </div>
    );
  }

  const activeTab = visibleTabs.find((t) => t.id === effectiveActive) ?? visibleTabs[0];
  const ActiveIcon = activeTab.icon;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-3xl bg-gradient-to-br from-[var(--accent-muted)] to-[var(--canvas)] ring-1 ring-[var(--accent-border)] p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent)] text-white shadow-md">
              <Building2 className="h-6 w-6" strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <h1 className="text-[20px] sm:text-[22px] font-black tracking-tight text-[var(--text-1)]">
                Hotel Hub
              </h1>
              <p className="mt-0.5 text-[12px] text-[var(--text-2)] max-w-lg">
                {selectedRestaurant.name} — rooms, bookings, guest records & QR codes, all in one place.
              </p>
            </div>
          </div>
          <a
            href={`/hotel/${selectedRestaurant.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-[var(--canvas)] ring-1 ring-[var(--accent-border)] px-3.5 py-2 text-[12px] font-semibold text-[var(--accent-text)] hover:bg-[var(--accent-muted)] transition-colors"
          >
            Public page
            <ChevronRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* Tab grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {visibleTabs.map(({ id, label, desc, icon: Icon }) => {
          const isActive = effectiveActive === id;
          return (
            <button
              key={id}
              onClick={() => setActive(id)}
              className={`flex flex-col items-start gap-1.5 rounded-2xl border p-4 text-left transition-all ${
                isActive
                  ? "border-[var(--accent)] bg-[var(--accent-muted)] shadow-sm"
                  : "border-[var(--border-soft)] bg-[var(--canvas)] hover:border-[var(--accent-border)] hover:bg-[var(--canvas-sub)]"
              }`}
            >
              <Icon
                className={`h-4 w-4 ${isActive ? "text-[var(--accent-text)]" : "text-[var(--text-3)]"}`}
              />
              <span
                className={`text-[13px] font-bold leading-none ${
                  isActive ? "text-[var(--accent-text)]" : "text-[var(--text-1)]"
                }`}
              >
                {label}
              </span>
              <span
                className={`text-[10px] leading-tight ${
                  isActive ? "text-[var(--accent-text)]/70" : "text-[var(--text-3)]"
                }`}
              >
                {desc}
              </span>
            </button>
          );
        })}
      </div>

      {/* Sub-heading */}
      <div className="flex items-center gap-2 px-0.5">
        <ActiveIcon className="h-4 w-4 text-[var(--accent)]" />
        <h2 className="text-[14px] font-bold text-[var(--text-1)]">{activeTab.label}</h2>
        <span className="hidden sm:inline text-[12px] text-[var(--text-3)]">· {activeTab.desc}</span>
      </div>

      {/* Panel */}
      <Suspense fallback={<div className="h-40 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[var(--text-3)]" /></div>}>
        {effectiveActive === "rooms" && <RoomManagementTab />}
        {effectiveActive === "bookings" && <HotelBookingsTab />}
        {effectiveActive === "guests" && <GuestCheckInTab />}
        {effectiveActive === "media" && <div className="-mx-2 sm:-mx-6 -mt-2"><HeroSlidesManager /></div>}
        {effectiveActive === "service" && <RoomServicePanel />}
        {effectiveActive === "setup" && <HotelQRTab />}
      </Suspense>
    </div>
  );
}
