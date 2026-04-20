"use client";

import { Suspense, lazy, useMemo, useState } from "react";
import {
  BedDouble,
  CalendarCheck,
  ClipboardList,
  QrCode,
  CreditCard,
  UtensilsCrossed,
  Image as ImageIcon,
  Loader2,
  Building2,
  ChevronRight,
} from "lucide-react";
import { useRestaurant } from "@/context/RestaurantContext";

/* Lazy-load each sub-tab so the initial hub render stays lean */
const RoomManagementTab = lazy(() => import("./RoomManagementTab"));
const HotelBookingsTab = lazy(() => import("./HotelBookingsTab"));
const GuestCheckInTab = lazy(() => import("./GuestCheckInTab"));
const HotelQRTab = lazy(() => import("./HotelQRTab"));
const RoomQRTab = lazy(() => import("./RoomQRTab"));
const HeroSlidesManager = lazy(() => import("./HeroSlidesManager"));
const RoomServiceTab = lazy(() => import("./features/RoomServiceTab"));
const GuestBillingTab = lazy(() => import("./features/GuestBillingTab"));

type HubTabId =
  | "rooms"
  | "bookings"
  | "checkins"
  | "room-service"
  | "guest-billing"
  | "hotel-qr"
  | "room-qr"
  | "hero";

interface HubTabDef {
  id: HubTabId;
  label: string;
  desc: string;
  icon: typeof BedDouble;
  component: React.ComponentType;
}

const HUB_TABS: HubTabDef[] = [
  {
    id: "rooms",
    label: "Rooms",
    desc: "Add, edit and price your rooms",
    icon: BedDouble,
    component: RoomManagementTab,
  },
  {
    id: "bookings",
    label: "Bookings",
    desc: "Manage online pre-bookings",
    icon: CalendarCheck,
    component: HotelBookingsTab,
  },
  {
    id: "checkins",
    label: "Check-ins",
    desc: "Record arrivals and ID details",
    icon: ClipboardList,
    component: GuestCheckInTab,
  },
  {
    id: "room-service",
    label: "Room Service",
    desc: "Orders delivered to rooms",
    icon: UtensilsCrossed,
    component: RoomServiceTab,
  },
  {
    id: "guest-billing",
    label: "Guest Billing",
    desc: "Charges tied to a guest's stay",
    icon: CreditCard,
    component: GuestBillingTab,
  },
  {
    id: "hotel-qr",
    label: "Hotel QR",
    desc: "QR linking to your public booking page",
    icon: QrCode,
    component: HotelQRTab,
  },
  {
    id: "room-qr",
    label: "Room QR",
    desc: "Per-room QR for in-stay ordering",
    icon: QrCode,
    component: RoomQRTab,
  },
  {
    id: "hero",
    label: "Hero Slides",
    desc: "Banner photos for the public page",
    icon: ImageIcon,
    component: HeroSlidesManager,
  },
];

function SubTabPanel({ active }: { active: HubTabId }) {
  const tab = HUB_TABS.find((t) => t.id === active);
  if (!tab) return null;
  const Comp = tab.component;
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--accent)]" />
        </div>
      }
    >
      <Comp />
    </Suspense>
  );
}

export default function HotelHubTab() {
  const { selectedRestaurant } = useRestaurant();
  const [active, setActive] = useState<HubTabId>("rooms");

  const activeDef = useMemo(
    () => HUB_TABS.find((t) => t.id === active) ?? HUB_TABS[0],
    [active],
  );
  const ActiveIcon = activeDef.icon;

  const isHotelType =
    !!selectedRestaurant &&
    ["HOTEL", "RESORT", "GUEST_HOUSE"].includes(selectedRestaurant.type);

  if (!selectedRestaurant) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  if (!isHotelType) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface)]">
          <Building2 className="h-7 w-7 text-[var(--text-3)]" />
        </div>
        <div>
          <p className="text-[15px] font-semibold text-[var(--text-1)]">
            Hotel features are disabled
          </p>
          <p className="mt-1 text-[12px] text-[var(--text-2)] max-w-sm">
            This venue is set as {selectedRestaurant.type.replace("_", " ").toLowerCase()}. Switch the type to
            Hotel, Resort, or Guest House to manage rooms and bookings here.
          </p>
        </div>
      </div>
    );
  }

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
                Everything for {selectedRestaurant.name} — rooms, bookings, check-ins, room service, billing, and QR codes — in one place.
              </p>
            </div>
          </div>
          <a
            href={`/hotel/${selectedRestaurant.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-[var(--canvas)] ring-1 ring-[var(--accent-border)] px-3.5 py-2 text-[12px] font-semibold text-[var(--accent-text)] hover:bg-[var(--accent-muted)] transition-colors"
          >
            View public page
            <ChevronRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* Tab nav — chip strip on mobile, grid on desktop */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 lg:grid lg:grid-cols-4 xl:grid-cols-8 lg:overflow-visible">
        {HUB_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-2xl border px-4 py-2.5 text-[12px] font-semibold transition-all lg:flex-col lg:items-start lg:gap-1 lg:py-3 ${
                isActive
                  ? "border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--accent-text)] shadow-sm"
                  : "border-[var(--border-soft)] bg-[var(--canvas)] text-[var(--text-2)] hover:border-[var(--accent-border)] hover:text-[var(--text-1)]"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="lg:text-[13px] lg:font-bold">{tab.label}</span>
              <span className="hidden lg:block text-[10px] font-normal text-[var(--text-3)] leading-tight">
                {tab.desc}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active sub-heading */}
      <div className="flex items-center gap-2 px-1">
        <ActiveIcon className="h-4 w-4 text-[var(--accent)]" />
        <h2 className="text-[15px] font-bold text-[var(--text-1)]">{activeDef.label}</h2>
        <span className="hidden sm:inline text-[12px] text-[var(--text-3)]">· {activeDef.desc}</span>
      </div>

      {/* Active sub-tab panel */}
      <div className="rounded-2xl">
        <SubTabPanel active={active} />
      </div>
    </div>
  );
}
