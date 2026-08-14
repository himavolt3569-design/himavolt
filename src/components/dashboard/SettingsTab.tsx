"use client";

import { useState, useRef } from "react";
import {
  Wallet,
  CreditCard,
  Receipt,
  Printer,
  Bell,
  Crown,
  UserCog,
  Camera,
  Clock,
  Truck,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";
import PaymentQRTab from "./PaymentQRTab";
import PaymentSettingsTab from "./PaymentSettingsTab";
import TaxChargesTab from "./TaxChargesTab";
import PrintingSettingsTab from "./PrintingSettingsTab";
import OwnerControlPanel from "./OwnerControlPanel";
import BrandingTab from "./settings/BrandingTab";
import OperatingHoursTab from "./settings/OperatingHoursTab";
import DeliverySettingsTab from "./settings/DeliverySettingsTab";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { apiFetch } from "@/lib/api-client";
import { uploadFile } from "@/lib/upload";

type SectionId =
  | "profile"
  | "branding"
  | "hours"
  | "delivery"
  | "payment-qr"
  | "payment-settings"
  | "tax-charges"
  | "printing"
  | "notifications"
  | "owner-control";

const SECTIONS: {
  id: SectionId;
  label: string;
  desc: string;
  icon: typeof Wallet;
}[] = [
  { id: "profile", label: "Profile", desc: "Your account & avatar", icon: UserCog },
  { id: "branding", label: "Photos & Branding", desc: "Logo and cover image", icon: ImageIcon },
  // Hours comes before Delivery deliberately: delivery cannot be switched on
  // until hours exist, so the order of the list is the order of the work.
  { id: "hours", label: "Hours & Location", desc: "Opening days, times & your pin", icon: Clock },
  { id: "delivery", label: "Delivery & Pickup", desc: "Range, charges & cash on delivery", icon: Truck },
  { id: "payment-qr", label: "Payment QR", desc: "Static QR for direct payments", icon: Wallet },
  { id: "payment-settings", label: "Payment Settings", desc: "Methods & gateways", icon: CreditCard },
  { id: "tax-charges", label: "Tax & Charges", desc: "Tax rate & service charge", icon: Receipt },
  { id: "printing", label: "Printing & Receipts", desc: "Receipt layout & widths", icon: Printer },
  { id: "notifications", label: "Notifications", desc: "Push & order alerts", icon: Bell },
  { id: "owner-control", label: "Owner Controls", desc: "Feature toggles & access", icon: Crown },
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
              {granted ? "Enabled on this device" : denied ? "Blocked, enable in browser settings" : "Not enabled yet"}
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

/** Full inline profile editor — name, phone & avatar, no separate page. */
function ProfileSection() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const meta = (user?.user_metadata ?? {}) as Record<string, string | undefined>;
  const [name, setName] = useState(meta.full_name ?? meta.name ?? "");
  const [phone, setPhone] = useState(meta.phone ?? "");
  const [avatar, setAvatar] = useState(meta.avatar_url ?? meta.imageUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const email = user?.email ?? "";

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await apiFetch("/api/me", { method: "PATCH", body: { name: name.trim(), phone: phone.trim() } });
      showToast("Profile updated", "success");
    } catch {
      showToast("Could not update profile", "error");
    } finally {
      setSaving(false);
    }
  };

  const onAvatar = async (file: File | null) => {
    if (!file || uploading) return;
    setUploading(true);
    try {
      const url = await uploadFile(file, "avatars");
      await apiFetch("/api/me", { method: "PATCH", body: { imageUrl: url } });
      setAvatar(url);
      showToast("Avatar updated", "success");
    } catch {
      showToast("Avatar upload failed", "error");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="max-w-lg space-y-5">
      <div>
        <h3 className="text-[15px] font-bold text-[var(--text-1)]">Profile</h3>
        <p className="mt-0.5 text-[12px] text-[var(--text-3)]">Your account details and avatar.</p>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl ring-1 ring-[var(--border)] bg-[var(--accent-muted)] flex items-center justify-center group"
          title="Change avatar"
        >
          {avatar ? (
            <img src={avatar} alt="Avatar" className="h-full w-full object-cover" />
          ) : (
            <UserCog className="h-6 w-6 text-[var(--accent)]" />
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Camera className="h-4 w-4 text-white" />}
          </span>
        </button>
        <div className="min-w-0">
          <p className="text-[14px] font-bold text-[var(--text-1)] truncate">{name || "Your name"}</p>
          {email && <p className="text-[12px] text-[var(--text-3)] truncate">{email}</p>}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onAvatar(e.target.files?.[0] ?? null)} />
      </div>

      <div>
        <label className="block text-[13px] font-semibold text-[var(--text-2)] mb-1.5">Full name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="w-full rounded-xl bg-[var(--canvas-sub)] px-3.5 py-3 text-sm text-[var(--text-1)] outline-none ring-1 ring-[var(--border)] focus:ring-[var(--accent)]"
        />
      </div>
      <div>
        <label className="block text-[13px] font-semibold text-[var(--text-2)] mb-1.5">Phone</label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="98XXXXXXXX"
          className="w-full rounded-xl bg-[var(--canvas-sub)] px-3.5 py-3 text-sm text-[var(--text-1)] outline-none ring-1 ring-[var(--border)] focus:ring-[var(--accent)]"
        />
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

export default function SettingsTab() {
  const [active, setActive] = useState<SectionId>("profile");

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-[20px] sm:text-[22px] font-black tracking-tight text-[var(--text-1)]">
          Settings
        </h1>
        <p className="mt-0.5 text-[12px] text-[var(--text-2)]">
          Hours, delivery, payments, tax, printing, notifications and owner
          controls, all in one place.
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
          {active === "branding" && <BrandingTab />}
          {active === "hours" && <OperatingHoursTab />}
          {active === "delivery" && <DeliverySettingsTab />}
          {active === "payment-qr" && <PaymentQRTab />}
          {active === "payment-settings" && <PaymentSettingsTab />}
          {active === "tax-charges" && <TaxChargesTab />}
          {active === "printing" && <PrintingSettingsTab />}
          {active === "notifications" && <NotificationsSection />}
          {active === "owner-control" && <OwnerControlPanel />}
        </div>
      </div>
    </div>
  );
}
