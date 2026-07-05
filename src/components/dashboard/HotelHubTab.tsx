"use client";

import { useState, useEffect, useMemo } from "react";
import {
  BedDouble,
  CalendarCheck,
  ClipboardList,
  Settings,
  Building2,
  Coffee,
  ExternalLink,
  Image as ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRestaurant } from "@/context/RestaurantContext";
import { useToast } from "@/context/ToastContext";
import { formatPrice } from "@/lib/currency";
import { STAFF_MANAGER_ROLES, STAFF_BILLING_ROLES } from "@/lib/staff-roles";
import { apiFetch } from "@/lib/api-client";
import { ScrollableRow } from "@/components/shared/ScrollableRow";

// Direct imports — no lazy/Suspense blank; the hub is itself deferred from the
// dashboard shell so co-bundling sub-tabs only grows that single lazy chunk.
import RoomManagementTab from "./RoomManagementTab";
import HotelBookingsTab from "./HotelBookingsTab";
import GuestCheckInTab from "./GuestCheckInTab";
import HotelQRTab from "./HotelQRTab";
import HotelPhotosTab from "./HotelPhotosTab";

// ── types ─────────────────────────────────────────────────────────────────────

type HubTab = "rooms" | "bookings" | "guests" | "service" | "photos" | "setup";
type TabScope = "manage" | "frontdesk";

interface BookingKPI {
  id: string;
  checkIn: string;
  checkOut: string;
  status: string;
  totalPrice: number;
  guestName: string;
  room?: { name: string | null; roomNumber: string };
}

interface RoomKPI {
  id: string;
  isAvailable: boolean;
  price: number;
}

interface HotelStats {
  totalRooms: number;
  availableRooms: number;
  occupiedRooms: number;
  occupancyPct: number;
  activeGuests: number;
  pendingBookings: number;
  todayArrivals: number;
  todayDepartures: number;
}

const EMPTY_STATS: HotelStats = {
  totalRooms: 0,
  availableRooms: 0,
  occupiedRooms: 0,
  occupancyPct: 0,
  activeGuests: 0,
  pendingBookings: 0,
  todayArrivals: 0,
  todayDepartures: 0,
};

// ── useHotelStats ─────────────────────────────────────────────────────────────

function useHotelStats(restaurantId: string | null): HotelStats {
  const [stats, setStats] = useState<HotelStats>(EMPTY_STATS);

  useEffect(() => {
    if (!restaurantId) return;
    let cancelled = false;

    (async () => {
      try {
        // Fetch rooms first (likely already in cache from TAB_DATA hover-warm)
        const rooms = await apiFetch<RoomKPI[]>(`/api/restaurants/${restaurantId}/rooms`);
        if (cancelled) return;

        const totalRooms = rooms.length;
        const availableRooms = rooms.filter((r) => r.isAvailable).length;
        const occupiedRooms = totalRooms - availableRooms;
        const occupancyPct =
          totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
        setStats((s) => ({ ...s, totalRooms, availableRooms, occupiedRooms, occupancyPct }));

        // Then bookings — sequential so pool=1 isn't stressed
        const bData = await apiFetch<{ bookings?: BookingKPI[] }>(
          `/api/restaurants/${restaurantId}/bookings?limit=100`,
        );
        if (cancelled) return;

        const bookings = bData.bookings ?? [];
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(todayStart.getTime() + 86_400_000);

        setStats((s) => ({
          ...s,
          activeGuests: bookings.filter((b) => b.status === "CHECKED_IN").length,
          pendingBookings: bookings.filter((b) => b.status === "PENDING").length,
          todayArrivals: bookings.filter((b) => {
            const d = new Date(b.checkIn);
            return d >= todayStart && d < todayEnd;
          }).length,
          todayDepartures: bookings.filter((b) => {
            const d = new Date(b.checkOut);
            return d >= todayStart && d < todayEnd;
          }).length,
        }));
      } catch {
        // stats are supplemental — degrade silently
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [restaurantId]);

  return stats;
}

// ── useHotelHubAccess ─────────────────────────────────────────────────────────

function useHotelHubAccess() {
  const [access, setAccess] = useState<{ manage: boolean; frontdesk: boolean } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timeout = setTimeout(() => {
      if (!cancelled) setAccess((a) => a ?? { manage: true, frontdesk: true });
    }, 4000);

    (async () => {
      try {
        const res = await fetch("/api/staff-session");
        if (cancelled) return;
        if (!res.ok) {
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

// ── RoomServicePanel ──────────────────────────────────────────────────────────

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
      const parsed = Number(charge);
      await updateRestaurant(r.id, {
        roomServiceEnabled: enabled,
        roomServiceCharge: Number.isFinite(parsed) ? Math.max(0, parsed) : 0,
      });
      showToast("Room service settings saved", "success");
    } catch {
      showToast("Failed to save room service settings", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pt-1 max-w-lg">
      <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--canvas)] overflow-hidden">
        {/* Card header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border-soft)] bg-[var(--canvas-sub)]">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-muted)]">
            <Coffee className="h-4.5 w-4.5 text-[var(--accent-text)]" />
          </div>
          <div>
            <p className="text-[14px] font-bold text-[var(--text-1)]">In-Room Service</p>
            <p className="text-[11px] text-[var(--text-3)]">Paid add-on shown at guest checkout</p>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Toggle row */}
          <label className="flex items-center justify-between gap-4 cursor-pointer select-none">
            <div>
              <p className="text-[13px] font-semibold text-[var(--text-1)]">Offer room service</p>
              <p className="text-[11px] text-[var(--text-3)] mt-0.5">
                Guests can add it when booking a room online
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              onClick={() => setEnabled((e) => !e)}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200",
                enabled ? "bg-[var(--accent)]" : "bg-[var(--border)]",
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200",
                  enabled ? "translate-x-5" : "translate-x-0",
                )}
              />
            </button>
          </label>

          {/* Charge input */}
          <div className={cn("space-y-2", !enabled && "opacity-40 pointer-events-none")}>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-[var(--text-3)]">
              Service charge ({cur})
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[12px] font-bold text-[var(--text-3)] select-none">
                {cur}
              </span>
              <input
                type="number"
                min={0}
                value={charge}
                onChange={(e) => setCharge(e.target.value)}
                placeholder="0"
                className="w-full rounded-xl bg-[var(--canvas-sub)] pl-12 pr-4 py-3 text-[15px] font-bold text-[var(--text-1)] outline-none ring-1 ring-[var(--border)] focus:ring-[var(--accent)] transition-all"
              />
            </div>
            {enabled && Number(charge) > 0 && (
              <p className="text-[11px] font-semibold text-[var(--accent-text)]">
                Guests pay an extra {cur} {Number(charge).toLocaleString()} when they opt in
              </p>
            )}
          </div>

          <button
            onClick={save}
            disabled={saving}
            className="w-full rounded-xl bg-[var(--accent)] py-3 text-[13px] font-bold text-white transition-all hover:bg-[var(--accent-hover)] active:scale-[0.98] disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

      <p className="mt-3 text-[11px] text-[var(--text-3)] leading-relaxed px-1">
        Room service is shown as an optional add-on at the end of the guest booking flow.
        The charge is added to the reservation total.
      </p>
    </div>
  );
}

// ── TABS ──────────────────────────────────────────────────────────────────────

const TABS: {
  id: HubTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  scope: TabScope;
  badge?: "pendingBookings" | "activeGuests";
}[] = [
  { id: "rooms",    label: "Rooms",        icon: BedDouble,    scope: "manage" },
  { id: "bookings", label: "Reservations", icon: CalendarCheck, scope: "frontdesk", badge: "pendingBookings" },
  { id: "guests",   label: "Front Desk",   icon: ClipboardList, scope: "frontdesk", badge: "activeGuests" },
  { id: "service",  label: "Room Service", icon: Coffee,        scope: "manage" },
  { id: "photos",   label: "Photos",       icon: ImageIcon,     scope: "manage" },
  { id: "setup",    label: "Setup",        icon: Settings,      scope: "manage" },
];

// ── HotelHubTab ───────────────────────────────────────────────────────────────

export default function HotelHubTab() {
  const { selectedRestaurant } = useRestaurant();
  const access = useHotelHubAccess();
  const stats = useHotelStats(selectedRestaurant?.id ?? null);
  const [active, setActive] = useState<HubTab>("rooms");

  const visibleTabs = useMemo(
    () =>
      access
        ? TABS.filter((t) => (t.scope === "manage" ? access.manage : access.frontdesk))
        : [],
    [access],
  );

  const effectiveActive: HubTab =
    (visibleTabs.find((t) => t.id === active)?.id ?? visibleTabs[0]?.id ?? "rooms") as HubTab;

  if (!selectedRestaurant) return null;

  const isHotelType = ["HOTEL", "RESORT", "GUEST_HOUSE"].includes(selectedRestaurant.type);

  if (!isHotelType) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[var(--surface)]">
          <Building2 className="h-8 w-8 text-[var(--text-3)]" />
        </div>
        <p className="text-[15px] font-bold text-[var(--text-1)]">Hotel features are disabled</p>
        <p className="text-[12px] text-[var(--text-3)] max-w-xs">
          Switch your venue type to Hotel, Resort, or Guest House in Settings.
        </p>
      </div>
    );
  }

  if (!access) return null;

  if (visibleTabs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[var(--surface)]">
          <Building2 className="h-8 w-8 text-[var(--text-3)]" />
        </div>
        <p className="text-[15px] font-bold text-[var(--text-1)]">No access to Hotel Hub</p>
        <p className="text-[12px] text-[var(--text-3)] max-w-xs">
          Ask an owner or manager to grant you hotel access.
        </p>
      </div>
    );
  }

  const occ = stats.occupancyPct;

  return (
    <div className="pb-10">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent)] shadow-md shadow-[var(--accent)]/30">
            <Building2 className="h-5 w-5 text-white" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <h1 className="text-[17px] font-black text-[var(--text-1)] leading-none">Hotel Hub</h1>
            <p className="text-[11px] text-[var(--text-3)] mt-0.5 truncate">{selectedRestaurant.name}</p>
          </div>
        </div>
        <a
          href={`/hotel/${selectedRestaurant.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 flex items-center gap-1.5 rounded-xl bg-[var(--canvas-sub)] ring-1 ring-[var(--border)] px-3 py-2 text-[12px] font-semibold text-[var(--text-2)] hover:bg-[var(--accent-muted)] hover:text-[var(--accent-text)] hover:ring-[var(--accent-border)] transition-all whitespace-nowrap"
        >
          Guest View
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* ── Stats grid — OYO/Booking.com style KPI cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">

        {/* Occupancy — with live progress bar */}
        <div className="col-span-2 sm:col-span-1 rounded-2xl bg-[var(--canvas)] ring-1 ring-[var(--border)] p-4 flex flex-col gap-1.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-3)]">Occupancy</p>
          <p className={cn(
            "text-[32px] font-black leading-none",
            occ >= 80 ? "text-amber-600" : occ >= 50 ? "text-[var(--accent-text)]" : "text-green-600",
          )}>
            {occ}<span className="text-xl">%</span>
          </p>
          <div className="h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700 ease-out",
                occ >= 80 ? "bg-amber-500" : occ >= 50 ? "bg-[var(--accent)]" : "bg-green-500",
              )}
              style={{ width: `${Math.min(occ, 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-[var(--text-3)] font-medium">
            {stats.occupiedRooms} / {stats.totalRooms} rooms
          </p>
        </div>

        {/* Available */}
        <div className="rounded-2xl bg-green-50 ring-1 ring-green-200 p-4 flex flex-col gap-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-green-700">Available</p>
          <p className="text-[32px] font-black leading-none text-green-700">{stats.availableRooms}</p>
          <p className="text-[10px] text-green-600 font-medium">rooms free now</p>
        </div>

        {/* Today's arrivals */}
        <div className="rounded-2xl bg-[var(--status-info-bg)] ring-1 ring-[var(--status-info-border)] p-4 flex flex-col gap-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--status-info-text)]">Arrivals</p>
          <p className="text-[32px] font-black leading-none text-[var(--status-info-text)]">{stats.todayArrivals}</p>
          <p className="text-[10px] text-[var(--status-info-text)] opacity-70 font-medium">checking in today</p>
        </div>

        {/* Pending bookings */}
        <div className={cn(
          "rounded-2xl ring-1 p-4 flex flex-col gap-1",
          stats.pendingBookings > 0
            ? "bg-[var(--accent-muted)] ring-[var(--accent-border)]"
            : "bg-[var(--canvas)] ring-[var(--border)]",
        )}>
          <p className={cn(
            "text-[10px] font-bold uppercase tracking-widest",
            stats.pendingBookings > 0 ? "text-[var(--accent-text)]" : "text-[var(--text-3)]",
          )}>
            Pending
          </p>
          <p className={cn(
            "text-[32px] font-black leading-none",
            stats.pendingBookings > 0 ? "text-[var(--accent-text)]" : "text-[var(--text-1)]",
          )}>
            {stats.pendingBookings}
          </p>
          <p className={cn(
            "text-[10px] font-medium",
            stats.pendingBookings > 0 ? "text-[var(--accent-text)] opacity-70" : "text-[var(--text-3)]",
          )}>
            {stats.pendingBookings === 1 ? "booking needs" : "bookings need"} action
          </p>
        </div>
      </div>

      {/* ── Tab pills — Swiggy/OYO style with count badges ── */}
      <ScrollableRow className="-mx-1 px-1 pb-1 mb-5" innerClassName="flex items-center gap-1.5" edgeColor="var(--canvas-sub)">
        {visibleTabs.map(({ id, label, icon: Icon, badge }) => {
          const isActive = effectiveActive === id;
          const count = badge ? stats[badge] : 0;
          return (
            <button
              key={id}
              onClick={() => setActive(id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold whitespace-nowrap transition-all shrink-0 select-none",
                isActive
                  ? "bg-[var(--accent)] text-white shadow-md shadow-[var(--accent)]/25"
                  : "bg-[var(--canvas-sub)] ring-1 ring-[var(--border)] text-[var(--text-2)] hover:text-[var(--text-1)] hover:ring-[var(--accent-border)] hover:bg-[var(--canvas)]",
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {label}
              {count > 0 && (
                <span className={cn(
                  "inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full px-1 text-[10px] font-black tabular-nums",
                  isActive
                    ? "bg-white/25 text-white"
                    : "bg-[var(--accent)] text-white",
                )}>
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </button>
          );
        })}
      </ScrollableRow>

      {/* ── Tab panels — ALL mounted; inactive hidden via CSS only.
           This gives true-instant switching: no unmount, no refetch,
           state is fully preserved when you return to a tab. ── */}
      <div className={effectiveActive === "rooms"    ? "" : "hidden"}>
        <RoomManagementTab />
      </div>
      <div className={effectiveActive === "bookings" ? "" : "hidden"}>
        <HotelBookingsTab />
      </div>
      <div className={effectiveActive === "guests"   ? "" : "hidden"}>
        <GuestCheckInTab />
      </div>
      <div className={effectiveActive === "service"  ? "" : "hidden"}>
        <RoomServicePanel />
      </div>
      <div className={effectiveActive === "photos"   ? "" : "hidden"}>
        <HotelPhotosTab />
      </div>
      <div className={effectiveActive === "setup"    ? "" : "hidden"}>
        <HotelQRTab />
      </div>
    </div>
  );
}
