"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Wallet,
  CreditCard,
  Receipt,
  Printer,
  Bell,
  Crown,
  ImageIcon,
  Images,
  UserCog,
  ChevronRight,
} from "lucide-react";
import PaymentQRTab from "./PaymentQRTab";
import PaymentSettingsTab from "./PaymentSettingsTab";
import TaxChargesTab from "./TaxChargesTab";
import PrintingSettingsTab from "./PrintingSettingsTab";
import OwnerControlPanel from "./OwnerControlPanel";
import HeroSlidesManager from "./HeroSlidesManager";
import MediaTab from "./MediaTab";
import { useNotifications } from "@/hooks/useNotifications";

type SectionId =
  | "profile"
  | "payment-qr"
  | "payment-settings"
  | "tax-charges"
  | "printing"
  | "notifications"
  | "owner-control"
  | "website"
  | "media";

const SECTIONS: {
  id: SectionId;
  label: string;
  desc: string;
  icon: typeof Wallet;
}[] = [
  { id: "profile", label: "Profile", desc: "Your account & avatar", icon: UserCog },
  { id: "payment-qr", label: "Payment QR", desc: "Static QR for direct payments", icon: Wallet },
  { id: "payment-settings", label: "Payment Settings", desc: "Methods & gateways", icon: CreditCard },
  { id: "tax-charges", label: "Tax & Charges", desc: "Tax rate & service charge", icon: Receipt },
  { id: "printing", label: "Printing & Receipts", desc: "Receipt layout & widths", icon: Printer },
  { id: "notifications", label: "Notifications", desc: "Push & order alerts", icon: Bell },
  { id: "owner-control", label: "Owner Controls", desc: "Feature toggles & access", icon: Crown },
  { id: "website", label: "Website", desc: "Hero slides & landing", icon: ImageIcon },
  { id: "media", label: "Media Library", desc: "Photos & videos", icon: Images },
];

function NotificationsSection() {
  const { permission, requestPermission } = useNotifications();
  const granted = permission === "granted";
  const denied = permission === "denied";
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-[15px] font-bold text-[var(--text-1)]">Notifications</h3>
        <p className="mt-0.5 text-[12px] text-[var(--text-3)]">
          Get a push notification on this device when a new order or alert comes in.
        </p>
      </div>
      <div className="flex items-center justify-between rounded-2xl bg-[var(--canvas-sub)] ring-1 ring-[var(--border)] px-4 py-3.5">
        <span className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-muted)] text-[var(--accent)]">
            <Bell className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-[13px] font-semibold text-[var(--text-1)]">
              Push notifications
            </span>
            <span className="block text-[11px] text-[var(--text-3)]">
              {granted ? "Enabled on this device" : denied ? "Blocked — enable in browser settings" : "Not enabled yet"}
            </span>
          </span>
        </span>
        {granted ? (
          <span className="rounded-full bg-[var(--accent-muted)] px-3 py-1 text-[11px] font-bold text-[var(--accent-text)]">
            Active
          </span>
        ) : (
          <button
            onClick={() => requestPermission()}
            disabled={denied}
            className="rounded-lg bg-[var(--accent)] px-3.5 py-2 text-[12px] font-bold text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            Enable
          </button>
        )}
      </div>
    </div>
  );
}

function ProfileSection() {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-[15px] font-bold text-[var(--text-1)]">Profile</h3>
        <p className="mt-0.5 text-[12px] text-[var(--text-3)]">
          Edit your name, phone, avatar and account preferences.
        </p>
      </div>
      <Link
        href="/profile"
        className="flex items-center justify-between rounded-2xl bg-[var(--canvas-sub)] ring-1 ring-[var(--border)] px-4 py-3.5 transition-colors hover:bg-[var(--accent-muted)]"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-muted)] text-[var(--accent)]">
            <UserCog className="h-4 w-4" />
          </span>
          <span className="text-[13px] font-semibold text-[var(--text-1)]">
            Open profile editor
          </span>
        </span>
        <ChevronRight className="h-4 w-4 text-[var(--text-3)]" />
      </Link>
    </div>
  );
}

export default function SettingsTab() {
  const [active, setActive] = useState<SectionId>("payment-qr");

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-[20px] sm:text-[22px] font-black tracking-tight text-[var(--text-1)]">
          Settings
        </h1>
        <p className="mt-0.5 text-[12px] text-[var(--text-2)]">
          Payments, tax, printing, notifications and owner controls — all in one place.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-5">
        {/* Section rail */}
        <nav className="lg:w-60 shrink-0">
          <div className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible pb-1 scrollbar-slim">
            {SECTIONS.map(({ id, label, desc, icon: Icon }) => {
              const isActive = active === id;
              return (
                <button
                  key={id}
                  onClick={() => setActive(id)}
                  className={`flex shrink-0 lg:w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                    isActive
                      ? "bg-[var(--accent-muted)] text-[var(--accent-text)] ring-1 ring-[var(--accent-border)]"
                      : "text-[var(--text-2)] hover:bg-[var(--surface)]"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 ${isActive ? "text-[var(--accent)]" : "text-[var(--text-3)]"}`}
                  />
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold leading-tight">{label}</span>
                    <span className="hidden lg:block text-[10px] text-[var(--text-3)] leading-tight">
                      {desc}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Active panel */}
        <div className="flex-1 min-w-0 rounded-2xl bg-[var(--canvas)] ring-1 ring-[var(--border)]/60 p-4 sm:p-5">
          {active === "profile" && <ProfileSection />}
          {active === "payment-qr" && <PaymentQRTab />}
          {active === "payment-settings" && <PaymentSettingsTab />}
          {active === "tax-charges" && <TaxChargesTab />}
          {active === "printing" && <PrintingSettingsTab />}
          {active === "notifications" && <NotificationsSection />}
          {active === "owner-control" && <OwnerControlPanel />}
          {active === "website" && <HeroSlidesManager />}
          {active === "media" && <MediaTab />}
        </div>
      </div>
    </div>
  );
}
