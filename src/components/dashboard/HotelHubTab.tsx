"use client";

import { Suspense, lazy, useState, useEffect, useMemo } from "react";
import {
  BedDouble,
  CalendarCheck,
  ClipboardList,
  Settings,
  Loader2,
  Building2,
  ChevronRight,
} from "lucide-react";
import { useRestaurant } from "@/context/RestaurantContext";
import { SkeletonGrid, SkeletonTable } from "@/components/shared/Skeleton";
import { STAFF_MANAGER_ROLES, STAFF_BILLING_ROLES } from "@/lib/staff-roles";

const RoomManagementTab = lazy(() => import("./RoomManagementTab"));
const HotelBookingsTab = lazy(() => import("./HotelBookingsTab"));
const GuestCheckInTab = lazy(() => import("./GuestCheckInTab"));
const HotelQRTab = lazy(() => import("./HotelQRTab"));

type HubTab = "rooms" | "bookings" | "guests" | "setup";

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
    id: "setup",
    label: "Setup",
    desc: "Hotel QR card & booking config",
    icon: Settings,
    scope: "manage",
  },
];

function TabFallback({ tab }: { tab: HubTab }) {
  if (tab === "rooms") return <SkeletonGrid rows={2} cols={3} cardClass="h-44 rounded-2xl" />;
  return <SkeletonTable rows={5} />;
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
      }
    })();
    return () => {
      cancelled = true;
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

  if (!selectedRestaurant) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  const isHotelType = ["HOTEL", "RESORT", "GUEST_HOUSE"].includes(selectedRestaurant.type);

  if (!isHotelType) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface)]">
          <Building2 className="h-7 w-7 text-[var(--text-3)]" />
        </div>
        <div>
          <p className="text-[15px] font-semibold text-[var(--text-1)]">Hotel features are disabled</p>
          <p className="mt-1 text-[12px] text-[var(--text-2)] max-w-sm">
            Switch venue type to Hotel, Resort, or Guest House to manage rooms and bookings here.
          </p>
        </div>
      </div>
    );
  }

  // Still resolving the actor's role.
  if (!access) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

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
      <Suspense fallback={<TabFallback tab={effectiveActive} />}>
        {effectiveActive === "rooms" && <RoomManagementTab />}
        {effectiveActive === "bookings" && <HotelBookingsTab />}
        {effectiveActive === "guests" && <GuestCheckInTab />}
        {effectiveActive === "setup" && <HotelQRTab />}
      </Suspense>
    </div>
  );
}
