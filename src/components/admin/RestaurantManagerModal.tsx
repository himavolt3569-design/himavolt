"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Loader2,
  Save,
  Store,
  UtensilsCrossed,
  Grid3x3,
  UserCog,
  BedDouble,
  Plus,
  Trash2,
  Pencil,
  Check,
  KeyRound,
  ImagePlus,
  AlertTriangle,
  FolderTree,
} from "lucide-react";
import { formatPrice } from "@/lib/currency";

/**
 * The master-admin management console for a single business.
 *
 * Everything an owner can change about their own venue, support can change here
 * on their behalf: the business's identity (name, link, logo, cover, address,
 * money settings), its menu, its tables, its staff and — for stays — its rooms.
 * Every write goes through /api/admin/restaurants/[id]/… , which is guarded by
 * the admin JWT, scoped for platform staff, and audited.
 */

/* ── Types ─────────────────────────────────────────────────────────── */

interface Props {
  restaurantId: string;
  restaurantName: string;
  onClose: () => void;
  /** Called after a save that changes anything the caller's list displays. */
  onSaved?: () => void;
}

interface Owner {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
}

interface Profile {
  id: string;
  name: string;
  slug: string;
  restaurantCode: string | null;
  type: string;
  phone: string;
  countryCode: string;
  address: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  imageUrl: string | null;
  coverUrl: string | null;
  isActive: boolean;
  isOpen: boolean;
  currency: string;
  taxRate: number;
  taxEnabled: boolean;
  serviceChargeRate: number;
  serviceChargeEnabled: boolean;
  openingTime: string;
  closingTime: string;
  wifiName: string | null;
  wifiPassword: string | null;
  tableCount: number;
  roomCount: number;
  counterPayEnabled: boolean;
  directPayEnabled: boolean;
  prepaidEnabled: boolean;
  roomServiceEnabled: boolean;
  roomServiceCharge: number;
  owner: Owner;
  _count: {
    orders: number;
    staff: number;
    menuItems: number;
    categories: number;
    reviews: number;
    tables: number;
    rooms: number;
  };
}

interface Category {
  id: string;
  name: string;
  parentId: string | null;
  _count?: { items: number };
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  isAvailable: boolean;
  categoryId: string;
  category?: { id: string; name: string } | null;
}

interface TableRow {
  id: string;
  tableNo: number;
  label: string | null;
  capacity: number;
  isActive: boolean;
  isOccupied?: boolean;
}

interface StaffRow {
  id: string;
  role: string;
  staffType: string;
  isActive: boolean;
  user: { id: string; name: string | null; email: string | null; phone: string | null };
}

interface RoomRow {
  id: string;
  roomNumber: string;
  name: string | null;
  type: string;
  price: number;
  maxGuests: number;
  isAvailable: boolean;
}

type Section = "profile" | "menu" | "tables" | "staff" | "rooms";

const STAY_TYPES = new Set(["HOTEL", "RESORT", "GUEST_HOUSE"]);

const BUSINESS_TYPES = [
  "RESTAURANT", "FAST_FOOD", "CAFE", "BAR", "HOTEL", "RESORT",
  "BAKERY", "CLOUD_KITCHEN", "MO_MO_SHOP", "TANDOORI", "GUEST_HOUSE",
];

const STAFF_ROLES = ["SUPER_ADMIN", "MANAGER", "CHEF", "WAITER", "CASHIER"];
const ROOM_TYPES = ["STANDARD", "DELUXE", "SUITE", "FAMILY", "DORM"];

/* ── Small shared bits ─────────────────────────────────────────────── */

const inputCls =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-1)] outline-none focus:border-[var(--accent)]";
const labelCls =
  "mb-1 block text-[10px] font-bold uppercase tracking-widest text-[var(--text-3)]";

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-[var(--text-3)]">{hint}</p>}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition-colors ${
        checked
          ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--text-1)]"
          : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-3)]"
      }`}
    >
      <span>{label}</span>
      <span
        className={`h-4 w-7 shrink-0 rounded-full p-0.5 transition-colors ${
          checked ? "bg-[var(--accent)]" : "bg-[var(--border)]"
        }`}
      >
        <span
          className={`block h-3 w-3 rounded-full bg-white transition-transform ${
            checked ? "translate-x-3" : ""
          }`}
        />
      </span>
    </button>
  );
}

/** Image upload via the existing /api/upload signer, which accepts the admin JWT. */
function ImageField({
  value,
  onChange,
  folder,
  aspect = "square",
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  folder: string;
  aspect?: "square" | "wide";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const box = aspect === "wide" ? "h-24 w-44" : "h-24 w-24";

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const signRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          folder,
        }),
      });
      const signData = await signRes.json().catch(() => ({}));
      if (!signRes.ok) {
        setError(signData.error ?? "Upload failed.");
        return;
      }
      const putRes = await fetch(signData.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) {
        setError("Upload failed. Please try again.");
        return;
      }
      onChange(signData.publicUrl);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      {value ? (
        <div
          className={`relative ${box} overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-alt)]`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"
            aria-label="Remove image"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={`flex ${box} flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-alt)] text-[var(--text-3)] hover:border-[var(--accent)]`}
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <ImagePlus className="h-5 w-5" />
          )}
          <span className="text-[10px] font-semibold">
            {uploading ? "Uploading" : "Upload"}
          </span>
        </button>
      )}
      {error && <p className="mt-1 text-[11px] text-rose-600">{error}</p>}
    </div>
  );
}

function SectionHeading({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-[var(--text-3)]">
        {title}
      </h3>
      {action}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-dashed border-[var(--border)] px-4 py-8 text-center text-xs text-[var(--text-3)]">
      {text}
    </p>
  );
}

/* ── The console ───────────────────────────────────────────────────── */

export default function RestaurantManagerModal({
  restaurantId,
  restaurantName,
  onClose,
  onSaved,
}: Props) {
  const [section, setSection] = useState<Section>("profile");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [draft, setDraft] = useState<Partial<Profile>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<TableRow[]>([]);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [listLoading, setListLoading] = useState(false);

  const base = `/api/admin/restaurants/${restaurantId}`;

  /** Escape closes, as every other overlay in the admin panel does. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  /** Read an error message out of a failed response, falling back to status. */
  const failure = async (res: Response, fallback: string) => {
    const data = await res.json().catch(() => ({}));
    return data.error ?? fallback;
  };

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice((n) => (n === msg ? null : n)), 4000);
  };

  /* Profile is loaded once on open — every section shows its header. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${base}`, { cache: "no-store" });
        if (!res.ok) throw new Error(await failure(res, "Could not load this business"));
        const data: Profile = await res.json();
        if (cancelled) return;
        setProfile(data);
        setDraft({});
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [restaurantId, base]);

  /* Each list is fetched the first time its section is opened. */
  const loadSection = useCallback(
    async (target: Section) => {
      if (target === "profile") return;
      setListLoading(true);
      setError(null);
      try {
        if (target === "menu") {
          const [catRes, itemRes] = await Promise.all([
            fetch(`${base}/categories`, { cache: "no-store" }),
            fetch(`${base}/menu`, { cache: "no-store" }),
          ]);
          if (!catRes.ok) throw new Error(await failure(catRes, "Could not load categories"));
          if (!itemRes.ok) throw new Error(await failure(itemRes, "Could not load the menu"));
          setCategories(await catRes.json());
          setItems(await itemRes.json());
        } else if (target === "tables") {
          const res = await fetch(`${base}/tables`, { cache: "no-store" });
          if (!res.ok) throw new Error(await failure(res, "Could not load tables"));
          const data = await res.json();
          setTables(data.tables ?? []);
        } else if (target === "staff") {
          const res = await fetch(`${base}/staff`, { cache: "no-store" });
          if (!res.ok) throw new Error(await failure(res, "Could not load staff"));
          const data = await res.json();
          setStaff(data.staff ?? []);
        } else if (target === "rooms") {
          const res = await fetch(`${base}/rooms`, { cache: "no-store" });
          if (!res.ok) throw new Error(await failure(res, "Could not load rooms"));
          setRooms(await res.json());
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load");
      } finally {
        setListLoading(false);
      }
    },
    [base],
  );

  const openSection = (target: Section) => {
    setSection(target);
    setError(null);
    loadSection(target);
  };

  /* ── Profile save ────────────────────────────────────────────────── */

  const set = <K extends keyof Profile>(key: K, value: Profile[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
  };

  const current = <K extends keyof Profile>(key: K): Profile[K] | undefined =>
    (draft[key] !== undefined ? draft[key] : profile?.[key]) as Profile[K] | undefined;

  const dirty = Object.keys(draft).length > 0;

  const saveProfile = async () => {
    if (!dirty) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${base}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) throw new Error(await failure(res, "Could not save"));
      const updated = await res.json();
      setProfile((p) => (p ? { ...p, ...updated } : p));
      setDraft({});
      flash("Saved.");
      onSaved?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const currency = profile?.currency ?? "NPR";
  const isStay = STAY_TYPES.has(String(current("type") ?? profile?.type ?? ""));

  const SECTIONS: { id: Section; label: string; icon: typeof Store }[] = [
    { id: "profile", label: "Business", icon: Store },
    { id: "menu", label: "Menu", icon: UtensilsCrossed },
    { id: "tables", label: "Tables", icon: Grid3x3 },
    { id: "staff", label: "Staff", icon: UserCog },
    ...(isStay ? [{ id: "rooms" as Section, label: "Rooms", icon: BedDouble }] : []),
  ];

  /**
   * This modal is rendered from inside the admin page's tab wrapper, which is a
   * `motion.div` that animates `y`. Framer Motion leaves a `transform` on that
   * element even at rest, and a transformed ancestor becomes the containing
   * block for `position: fixed` — so `fixed inset-0` covered only the content
   * column (leaving the sidebar undimmed) and was clipped by the scrolled
   * container. Portalling to `document.body` puts the overlay back on the
   * viewport. Same pattern as `DashboardSidebar` and `AnchoredMenu`.
   */
  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-2 backdrop-blur-sm sm:p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 12 }}
          onClick={(e) => e.stopPropagation()}
          // `text-[var(--text-1)]` is load-bearing: the portal escapes the admin
          // layout wrapper that sets the panel's base text colour inline.
          className="flex h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-[var(--canvas)] text-[var(--text-1)] shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-5 py-3.5">
            <div className="min-w-0">
              <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--text-1)]">
                <Store className="h-4 w-4 text-[var(--accent)]" />
                Manage business
              </h2>
              <p className="truncate text-xs text-[var(--text-3)]">
                {profile?.name ?? restaurantName}
                {profile && ` · /menu/${profile.slug}`}
                {profile?.restaurantCode && ` · code ${profile.restaurantCode}`}
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-[var(--text-3)] hover:bg-[var(--surface-alt)]"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Section tabs */}
          <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-[var(--border)] px-3 py-2">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              const active = section === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => openSection(s.id)}
                  className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors ${
                    active
                      ? "bg-[var(--text-1)] text-[var(--canvas)]"
                      : "text-[var(--text-3)] hover:bg-[var(--surface-alt)]"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {s.label}
                </button>
              );
            })}
          </div>

          {/* Messages */}
          {(error || notice) && (
            <div className="shrink-0 px-5 pt-3">
              {error && (
                <p className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {error}
                </p>
              )}
              {notice && (
                <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                  <Check className="h-3.5 w-3.5 shrink-0" />
                  {notice}
                </p>
              )}
            </div>
          )}

          {/* Body */}
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            {loading ? (
              <div className="flex h-full items-center justify-center text-[var(--text-3)]">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : !profile ? (
              <Empty text="This business could not be loaded." />
            ) : section === "profile" ? (
              <ProfileSection
                profile={profile}
                current={current}
                set={set}
                isStay={isStay}
              />
            ) : listLoading ? (
              <div className="flex h-40 items-center justify-center text-[var(--text-3)]">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : section === "menu" ? (
              <MenuSection
                base={base}
                currency={currency}
                categories={categories}
                items={items}
                setCategories={setCategories}
                setItems={setItems}
                onError={setError}
                onFlash={flash}
                failure={failure}
              />
            ) : section === "tables" ? (
              <TablesSection
                base={base}
                tables={tables}
                setTables={setTables}
                onError={setError}
                onFlash={flash}
                failure={failure}
              />
            ) : section === "staff" ? (
              <StaffSection
                base={base}
                staff={staff}
                setStaff={setStaff}
                restaurantCode={profile.restaurantCode}
                onError={setError}
                onFlash={flash}
                failure={failure}
              />
            ) : (
              <RoomsSection
                base={base}
                currency={currency}
                rooms={rooms}
                setRooms={setRooms}
                onError={setError}
                onFlash={flash}
                failure={failure}
              />
            )}
          </div>

          {/* Footer — only the profile form has a batched save */}
          {section === "profile" && profile && (
            <div className="flex shrink-0 items-center justify-between gap-4 border-t border-[var(--border)] px-5 py-3">
              <p className="text-[11px] text-[var(--text-3)]">
                {dirty
                  ? `${Object.keys(draft).length} unsaved change${Object.keys(draft).length > 1 ? "s" : ""}`
                  : "No unsaved changes"}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setDraft({})}
                  disabled={!dirty || saving}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-[var(--text-3)] hover:bg-[var(--surface-alt)] disabled:opacity-40"
                >
                  Discard
                </button>
                <button
                  onClick={saveProfile}
                  disabled={!dirty || saving}
                  className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2 text-xs font-bold text-white disabled:opacity-40"
                >
                  {saving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  Save changes
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}

/* ── Profile ───────────────────────────────────────────────────────── */

function ProfileSection({
  profile,
  current,
  set,
  isStay,
}: {
  profile: Profile;
  current: <K extends keyof Profile>(key: K) => Profile[K] | undefined;
  set: <K extends keyof Profile>(key: K, value: Profile[K]) => void;
  isStay: boolean;
}) {
  const str = (k: keyof Profile) => String(current(k) ?? "");
  const num = (k: keyof Profile) => {
    const v = current(k);
    return v === null || v === undefined ? "" : String(v);
  };

  return (
    <div className="space-y-8">
      {/* Snapshot */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {[
          ["Orders", profile._count.orders],
          ["Dishes", profile._count.menuItems],
          ["Categories", profile._count.categories],
          ["Tables", profile._count.tables],
          ["Staff", profile._count.staff],
          ["Rooms", profile._count.rooms],
          ["Reviews", profile._count.reviews],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5"
          >
            <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-3)]">
              {label}
            </p>
            <p className="text-lg font-black text-[var(--text-1)]">{value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <SectionHeading title="Identity" />
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Business name">
            <input
              className={inputCls}
              value={str("name")}
              onChange={(e) => set("name", e.target.value)}
            />
          </Field>
          <Field
            label="Public link (slug)"
            hint="Changing this breaks every existing QR code and shared link."
          >
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-xs text-[var(--text-3)]">/menu/</span>
              <input
                className={inputCls}
                value={str("slug")}
                onChange={(e) => set("slug", e.target.value)}
              />
            </div>
          </Field>
          <Field label="Type">
            <select
              className={inputCls}
              value={str("type")}
              onChange={(e) => set("type", e.target.value)}
            >
              {BUSINESS_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Currency">
            <select
              className={inputCls}
              value={str("currency")}
              onChange={(e) => set("currency", e.target.value)}
            >
              {["NPR", "INR", "USD"].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Country code">
            <input
              className={inputCls}
              value={str("countryCode")}
              onChange={(e) => set("countryCode", e.target.value)}
            />
          </Field>
          <Field label="Phone">
            <input
              className={inputCls}
              value={str("phone")}
              onChange={(e) => set("phone", e.target.value)}
            />
          </Field>
        </div>
        <p className="text-[11px] text-[var(--text-3)]">
          Owner account: <span className="font-semibold">{profile.owner.name ?? "—"}</span>{" "}
          · {profile.owner.email ?? "no email"}
        </p>
      </div>

      <div className="space-y-4">
        <SectionHeading title="Branding" />
        <div className="flex flex-wrap gap-8">
          <Field label="Logo">
            <ImageField
              value={current("imageUrl") ?? null}
              onChange={(url) => set("imageUrl", url)}
              folder="restaurants"
            />
          </Field>
          <Field label="Cover photo">
            <ImageField
              value={current("coverUrl") ?? null}
              onChange={(url) => set("coverUrl", url)}
              folder="restaurants"
              aspect="wide"
            />
          </Field>
        </div>
      </div>

      <div className="space-y-4">
        <SectionHeading title="Location" />
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Address">
            <input
              className={inputCls}
              value={str("address")}
              onChange={(e) => set("address", e.target.value)}
            />
          </Field>
          <Field label="City">
            <input
              className={inputCls}
              value={str("city")}
              onChange={(e) => set("city", e.target.value)}
            />
          </Field>
          <Field label="Latitude" hint="Drives proximity search and delivery pricing.">
            <input
              className={inputCls}
              value={num("latitude")}
              onChange={(e) =>
                set("latitude", e.target.value === "" ? null : Number(e.target.value))
              }
            />
          </Field>
          <Field label="Longitude">
            <input
              className={inputCls}
              value={num("longitude")}
              onChange={(e) =>
                set("longitude", e.target.value === "" ? null : Number(e.target.value))
              }
            />
          </Field>
        </div>
      </div>

      <div className="space-y-4">
        <SectionHeading title="Hours & WiFi" />
        <div className="grid gap-4 md:grid-cols-4">
          <Field label="Opens">
            <input
              type="time"
              className={inputCls}
              value={str("openingTime")}
              onChange={(e) => set("openingTime", e.target.value)}
            />
          </Field>
          <Field label="Closes">
            <input
              type="time"
              className={inputCls}
              value={str("closingTime")}
              onChange={(e) => set("closingTime", e.target.value)}
            />
          </Field>
          <Field label="WiFi network">
            <input
              className={inputCls}
              value={str("wifiName")}
              onChange={(e) => set("wifiName", e.target.value)}
            />
          </Field>
          <Field label="WiFi password">
            <input
              className={inputCls}
              value={str("wifiPassword")}
              onChange={(e) => set("wifiPassword", e.target.value)}
            />
          </Field>
        </div>
      </div>

      <div className="space-y-4">
        <SectionHeading title="Money" />
        <div className="grid gap-4 md:grid-cols-4">
          <Field label="Tax rate (%)">
            <input
              className={inputCls}
              value={num("taxRate")}
              onChange={(e) => set("taxRate", Number(e.target.value))}
            />
          </Field>
          <Field label="Service charge (%)">
            <input
              className={inputCls}
              value={num("serviceChargeRate")}
              onChange={(e) => set("serviceChargeRate", Number(e.target.value))}
            />
          </Field>
          {isStay && (
            <Field label="Room service charge">
              <input
                className={inputCls}
                value={num("roomServiceCharge")}
                onChange={(e) => set("roomServiceCharge", Number(e.target.value))}
              />
            </Field>
          )}
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Toggle
            label="Tax enabled"
            checked={!!current("taxEnabled")}
            onChange={(v) => set("taxEnabled", v)}
          />
          <Toggle
            label="Service charge"
            checked={!!current("serviceChargeEnabled")}
            onChange={(v) => set("serviceChargeEnabled", v)}
          />
          <Toggle
            label="Counter pay"
            checked={!!current("counterPayEnabled")}
            onChange={(v) => set("counterPayEnabled", v)}
          />
          <Toggle
            label="Direct pay"
            checked={!!current("directPayEnabled")}
            onChange={(v) => set("directPayEnabled", v)}
          />
          <Toggle
            label="Prepaid mode"
            checked={!!current("prepaidEnabled")}
            onChange={(v) => set("prepaidEnabled", v)}
          />
          {isStay && (
            <Toggle
              label="Room service"
              checked={!!current("roomServiceEnabled")}
              onChange={(v) => set("roomServiceEnabled", v)}
            />
          )}
        </div>
      </div>

      <div className="space-y-4">
        <SectionHeading title="Availability" />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Toggle
            label="Listed on the platform"
            checked={!!current("isActive")}
            onChange={(v) => set("isActive", v)}
          />
          <Toggle
            label="Open for orders now"
            checked={!!current("isOpen")}
            onChange={(v) => set("isOpen", v)}
          />
        </div>
      </div>
    </div>
  );
}

/* ── Menu ──────────────────────────────────────────────────────────── */

type Failure = (res: Response, fallback: string) => Promise<string>;

function MenuSection({
  base,
  currency,
  categories,
  items,
  setCategories,
  setItems,
  onError,
  onFlash,
  failure,
}: {
  base: string;
  currency: string;
  categories: Category[];
  items: MenuItem[];
  setCategories: (fn: (c: Category[]) => Category[]) => void;
  setItems: (fn: (i: MenuItem[]) => MenuItem[]) => void;
  onError: (e: string | null) => void;
  onFlash: (m: string) => void;
  failure: Failure;
}) {
  const [newCategory, setNewCategory] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<MenuItem>>({});
  const [adding, setAdding] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", price: "", categoryId: "", imageUrl: "" });

  const addCategory = async () => {
    const name = newCategory.trim();
    if (!name) return;
    setBusy("category");
    onError(null);
    try {
      const res = await fetch(`${base}/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error(await failure(res, "Could not add the category"));
      const created = await res.json();
      setCategories((c) => [...c, created]);
      setNewCategory("");
      onFlash(`Added category "${name}".`);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Could not add the category");
    } finally {
      setBusy(null);
    }
  };

  const renameCategory = async (category: Category) => {
    const name = window.prompt("Rename category", category.name)?.trim();
    if (!name || name === category.name) return;
    setBusy(category.id);
    onError(null);
    try {
      const res = await fetch(`${base}/categories`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId: category.id, name }),
      });
      if (!res.ok) throw new Error(await failure(res, "Could not rename"));
      setCategories((c) => c.map((x) => (x.id === category.id ? { ...x, name } : x)));
      onFlash("Category renamed.");
    } catch (e) {
      onError(e instanceof Error ? e.message : "Could not rename");
    } finally {
      setBusy(null);
    }
  };

  /**
   * Two-step, matching the API: the first call reports what the delete would
   * take with it (dishes, sub-categories) so the confirmation names real
   * numbers instead of a generic "are you sure".
   */
  const deleteCategory = async (category: Category) => {
    setBusy(category.id);
    onError(null);
    try {
      const preview = await fetch(`${base}/categories`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId: category.id }),
      });
      if (!preview.ok) throw new Error(await failure(preview, "Could not delete"));
      const { willDelete } = await preview.json();
      const ok = window.confirm(
        `Delete "${category.name}"?\n\nThis also deletes ${willDelete.items} dish(es) and ${willDelete.subcategories} sub-categor(ies). This cannot be undone.`,
      );
      if (!ok) return;

      const res = await fetch(`${base}/categories?confirm=true`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId: category.id }),
      });
      if (!res.ok) throw new Error(await failure(res, "Could not delete"));
      setCategories((c) => c.filter((x) => x.id !== category.id));
      setItems((i) => i.filter((x) => x.categoryId !== category.id));
      onFlash(`Deleted "${category.name}".`);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Could not delete");
    } finally {
      setBusy(null);
    }
  };

  const saveItem = async (item: MenuItem) => {
    setBusy(item.id);
    onError(null);
    try {
      const payload: Record<string, unknown> = {};
      if (editDraft.name !== undefined) payload.name = editDraft.name;
      if (editDraft.price !== undefined) payload.price = Number(editDraft.price);
      if (editDraft.categoryId !== undefined) payload.categoryId = editDraft.categoryId;
      if (editDraft.imageUrl !== undefined) payload.imageUrl = editDraft.imageUrl;

      const res = await fetch(`${base}/menu/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await failure(res, "Could not save the dish"));
      const updated = await res.json();
      setItems((list) => list.map((x) => (x.id === item.id ? { ...x, ...updated } : x)));
      setEditing(null);
      setEditDraft({});
      onFlash("Dish updated.");
    } catch (e) {
      onError(e instanceof Error ? e.message : "Could not save the dish");
    } finally {
      setBusy(null);
    }
  };

  const toggleAvailable = async (item: MenuItem) => {
    setBusy(item.id);
    onError(null);
    try {
      const res = await fetch(`${base}/menu/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable: !item.isAvailable }),
      });
      if (!res.ok) throw new Error(await failure(res, "Could not update"));
      setItems((list) =>
        list.map((x) => (x.id === item.id ? { ...x, isAvailable: !item.isAvailable } : x)),
      );
    } catch (e) {
      onError(e instanceof Error ? e.message : "Could not update");
    } finally {
      setBusy(null);
    }
  };

  const deleteItem = async (item: MenuItem) => {
    if (!window.confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    setBusy(item.id);
    onError(null);
    try {
      const res = await fetch(`${base}/menu/${item.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await failure(res, "Could not delete the dish"));
      setItems((list) => list.filter((x) => x.id !== item.id));
      onFlash(`Deleted "${item.name}".`);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Could not delete the dish");
    } finally {
      setBusy(null);
    }
  };

  const addItem = async () => {
    const price = Number(newItem.price);
    if (!newItem.name.trim() || !newItem.categoryId || !Number.isFinite(price) || price <= 0) {
      onError("A dish needs a name, a category and a price above zero.");
      return;
    }
    setBusy("new-item");
    onError(null);
    try {
      const res = await fetch(`${base}/menu`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newItem.name.trim(),
          price,
          categoryId: newItem.categoryId,
          imageUrl: newItem.imageUrl || undefined,
        }),
      });
      if (!res.ok) throw new Error(await failure(res, "Could not add the dish"));
      const created = await res.json();
      setItems((list) => [...list, created]);
      setNewItem({ name: "", price: "", categoryId: "", imageUrl: "" });
      setAdding(false);
      onFlash(`Added "${created.name}".`);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Could not add the dish");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Categories */}
      <div className="space-y-3">
        <SectionHeading title={`Categories (${categories.length})`} />
        <div className="flex gap-2">
          <input
            className={inputCls}
            placeholder="New category name"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCategory()}
          />
          <button
            onClick={addCategory}
            disabled={busy === "category" || !newCategory.trim()}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-xs font-bold text-white disabled:opacity-40"
          >
            {busy === "category" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            Add
          </button>
        </div>
        {categories.length === 0 ? (
          <Empty text="No categories yet. Add one before adding dishes." />
        ) : (
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs"
              >
                <FolderTree className="h-3.5 w-3.5 text-[var(--text-3)]" />
                <span className="font-semibold text-[var(--text-1)]">{c.name}</span>
                <span className="text-[var(--text-3)]">{c._count?.items ?? 0}</span>
                <button
                  onClick={() => renameCategory(c)}
                  disabled={busy === c.id}
                  className="rounded-md p-1 text-[var(--text-3)] hover:bg-[var(--surface-alt)]"
                  aria-label={`Rename ${c.name}`}
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <button
                  onClick={() => deleteCategory(c)}
                  disabled={busy === c.id}
                  className="rounded-md p-1 text-rose-500 hover:bg-rose-50"
                  aria-label={`Delete ${c.name}`}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dishes */}
      <div className="space-y-3">
        <SectionHeading
          title={`Dishes (${items.length})`}
          action={
            <button
              onClick={() => setAdding((a) => !a)}
              disabled={categories.length === 0}
              className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-3.5 py-2 text-xs font-bold text-white disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" />
              Add dish
            </button>
          }
        />

        {adding && (
          <div className="grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 md:grid-cols-[auto_1fr_1fr_1fr_auto] md:items-end">
            <Field label="Photo">
              <ImageField
                value={newItem.imageUrl || null}
                onChange={(url) => setNewItem((n) => ({ ...n, imageUrl: url ?? "" }))}
                folder="menu-items"
              />
            </Field>
            <Field label="Name">
              <input
                className={inputCls}
                value={newItem.name}
                onChange={(e) => setNewItem((n) => ({ ...n, name: e.target.value }))}
              />
            </Field>
            <Field label={`Price (${currency})`}>
              <input
                className={inputCls}
                value={newItem.price}
                onChange={(e) => setNewItem((n) => ({ ...n, price: e.target.value }))}
              />
            </Field>
            <Field label="Category">
              <select
                className={inputCls}
                value={newItem.categoryId}
                onChange={(e) => setNewItem((n) => ({ ...n, categoryId: e.target.value }))}
              >
                <option value="">Choose…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <button
              onClick={addItem}
              disabled={busy === "new-item"}
              className="flex h-[38px] items-center gap-2 rounded-xl bg-[var(--text-1)] px-4 text-xs font-bold text-[var(--canvas)] disabled:opacity-40"
            >
              {busy === "new-item" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              Create
            </button>
          </div>
        )}

        {items.length === 0 ? (
          <Empty text="This business has no dishes yet." />
        ) : (
          <div className="space-y-2">
            {items.map((item) => {
              const isEditing = editing === item.id;
              return (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5"
                >
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-[var(--surface-alt)]">
                    {item.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>

                  {isEditing ? (
                    <>
                      <input
                        className={`${inputCls} min-w-[140px] flex-1`}
                        value={editDraft.name ?? item.name}
                        onChange={(e) =>
                          setEditDraft((d) => ({ ...d, name: e.target.value }))
                        }
                      />
                      <input
                        className={`${inputCls} w-28`}
                        value={editDraft.price ?? item.price}
                        onChange={(e) =>
                          setEditDraft((d) => ({ ...d, price: Number(e.target.value) }))
                        }
                      />
                      <select
                        className={`${inputCls} w-40`}
                        value={editDraft.categoryId ?? item.categoryId}
                        onChange={(e) =>
                          setEditDraft((d) => ({ ...d, categoryId: e.target.value }))
                        }
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => saveItem(item)}
                        disabled={busy === item.id}
                        className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-2 text-[11px] font-bold text-white disabled:opacity-40"
                      >
                        {busy === item.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Check className="h-3 w-3" />
                        )}
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditing(null);
                          setEditDraft({});
                        }}
                        className="rounded-lg px-3 py-2 text-[11px] font-bold text-[var(--text-3)]"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-[var(--text-1)]">
                          {item.name}
                        </p>
                        <p className="text-[11px] text-[var(--text-3)]">
                          {item.category?.name ??
                            categories.find((c) => c.id === item.categoryId)?.name ??
                            "Uncategorised"}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-black text-[var(--text-1)]">
                        {formatPrice(item.price, currency)}
                      </span>
                      <button
                        onClick={() => toggleAvailable(item)}
                        disabled={busy === item.id}
                        className={`shrink-0 rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${
                          item.isAvailable
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-[var(--surface-alt)] text-[var(--text-3)]"
                        }`}
                      >
                        {item.isAvailable ? "Available" : "Hidden"}
                      </button>
                      <button
                        onClick={() => {
                          setEditing(item.id);
                          setEditDraft({});
                        }}
                        className="shrink-0 rounded-lg p-2 text-[var(--text-3)] hover:bg-[var(--surface-alt)]"
                        aria-label={`Edit ${item.name}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => deleteItem(item)}
                        disabled={busy === item.id}
                        className="shrink-0 rounded-lg p-2 text-rose-500 hover:bg-rose-50"
                        aria-label={`Delete ${item.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Tables ────────────────────────────────────────────────────────── */

function TablesSection({
  base,
  tables,
  setTables,
  onError,
  onFlash,
  failure,
}: {
  base: string;
  tables: TableRow[];
  setTables: (fn: (t: TableRow[]) => TableRow[]) => void;
  onError: (e: string | null) => void;
  onFlash: (m: string) => void;
  failure: Failure;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [form, setForm] = useState({ label: "", capacity: "4", count: "1" });

  const addTables = async () => {
    setBusy("new");
    onError(null);
    try {
      const res = await fetch(`${base}/tables`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: form.label.trim() || undefined,
          capacity: Number(form.capacity) || 4,
          count: Number(form.count) || 1,
        }),
      });
      if (!res.ok) throw new Error(await failure(res, "Could not add tables"));
      const data = await res.json();
      setTables((t) => [...t, ...(data.tables ?? [])]);
      setForm({ label: "", capacity: "4", count: "1" });
      onFlash(`Added ${data.tables?.length ?? 1} table(s).`);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Could not add tables");
    } finally {
      setBusy(null);
    }
  };

  const patch = async (table: TableRow, body: Record<string, unknown>) => {
    setBusy(table.id);
    onError(null);
    try {
      const res = await fetch(`${base}/tables/${table.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await failure(res, "Could not update the table"));
      const data = await res.json();
      setTables((list) => list.map((t) => (t.id === table.id ? { ...t, ...data.table } : t)));
    } catch (e) {
      onError(e instanceof Error ? e.message : "Could not update the table");
    } finally {
      setBusy(null);
    }
  };

  const remove = async (table: TableRow) => {
    if (!window.confirm(`Delete table ${table.label ?? table.tableNo}?`)) return;
    setBusy(table.id);
    onError(null);
    try {
      const res = await fetch(`${base}/tables/${table.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await failure(res, "Could not delete the table"));
      setTables((list) => list.filter((t) => t.id !== table.id));
      onFlash("Table deleted.");
    } catch (e) {
      onError(e instanceof Error ? e.message : "Could not delete the table");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeading title={`Tables (${tables.length})`} />

      <div className="grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 md:grid-cols-[2fr_1fr_1fr_auto] md:items-end">
        <Field label="Label" hint="Optional. Numbered automatically when creating several.">
          <input
            className={inputCls}
            placeholder="e.g. Terrace"
            value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
          />
        </Field>
        <Field label="Seats">
          <input
            className={inputCls}
            value={form.capacity}
            onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
          />
        </Field>
        <Field label="How many">
          <input
            className={inputCls}
            value={form.count}
            onChange={(e) => setForm((f) => ({ ...f, count: e.target.value }))}
          />
        </Field>
        <button
          onClick={addTables}
          disabled={busy === "new"}
          className="flex h-[38px] items-center gap-2 rounded-xl bg-[var(--accent)] px-4 text-xs font-bold text-white disabled:opacity-40"
        >
          {busy === "new" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          Add
        </button>
      </div>

      {tables.length === 0 ? (
        <Empty text="No tables yet." />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {tables.map((t) => (
            <div
              key={t.id}
              className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black text-[var(--text-1)]">
                  Table {t.tableNo}
                </span>
                <div className="flex items-center gap-1">
                  {t.isOccupied && (
                    <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[9px] font-black uppercase text-amber-600">
                      Occupied
                    </span>
                  )}
                  <button
                    onClick={() => patch(t, { isActive: !t.isActive })}
                    disabled={busy === t.id}
                    className={`rounded-md px-2 py-0.5 text-[9px] font-black uppercase ${
                      t.isActive
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-[var(--surface-alt)] text-[var(--text-3)]"
                    }`}
                  >
                    {t.isActive ? "Active" : "Off"}
                  </button>
                  <button
                    onClick={() => remove(t)}
                    disabled={busy === t.id}
                    className="rounded-md p-1 text-rose-500 hover:bg-rose-50"
                    aria-label={`Delete table ${t.tableNo}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  className={`${inputCls} py-1.5 text-xs`}
                  defaultValue={t.label ?? ""}
                  placeholder="Label"
                  onBlur={(e) => {
                    if (e.target.value !== (t.label ?? "")) patch(t, { label: e.target.value });
                  }}
                />
                <input
                  className={`${inputCls} w-20 py-1.5 text-xs`}
                  defaultValue={t.capacity}
                  onBlur={(e) => {
                    const capacity = Number(e.target.value);
                    if (capacity && capacity !== t.capacity) patch(t, { capacity });
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Staff ─────────────────────────────────────────────────────────── */

function StaffSection({
  base,
  staff,
  setStaff,
  restaurantCode,
  onError,
  onFlash,
  failure,
}: {
  base: string;
  staff: StaffRow[];
  setStaff: (fn: (s: StaffRow[]) => StaffRow[]) => void;
  restaurantCode: string | null;
  onError: (e: string | null) => void;
  onFlash: (m: string) => void;
  failure: Failure;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", role: "WAITER" });
  /** A generated PIN is shown exactly once — the server never returns it again. */
  const [issued, setIssued] = useState<{ name: string; pin: string; code: string } | null>(null);

  const add = async () => {
    setBusy("new");
    onError(null);
    try {
      const res = await fetch(`${base}/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          role: form.role,
        }),
      });
      if (!res.ok) throw new Error(await failure(res, "Could not add the staff member"));
      // Keep the PIN out of the list state — it lives only in `issued`, which
      // the operator dismisses once they have written it down.
      const { _generatedPin, _restaurantCode, ...created } = await res.json();
      setStaff((list) => [created, ...list.filter((s) => s.id !== created.id)]);
      setIssued({
        name: created.user?.name ?? form.name,
        pin: _generatedPin,
        code: _restaurantCode ?? restaurantCode ?? "",
      });
      setForm({ name: "", email: "", phone: "", role: "WAITER" });
      setAdding(false);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Could not add the staff member");
    } finally {
      setBusy(null);
    }
  };

  const patch = async (member: StaffRow, body: Record<string, unknown>) => {
    setBusy(member.id);
    onError(null);
    try {
      const res = await fetch(`${base}/staff/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await failure(res, "Could not update"));
      const { _generatedPin, ...updated } = await res.json();
      setStaff((list) => list.map((s) => (s.id === member.id ? { ...s, ...updated } : s)));
      if (_generatedPin) {
        setIssued({
          name: updated.user?.name ?? "Staff member",
          pin: _generatedPin,
          code: restaurantCode ?? "",
        });
      } else {
        onFlash("Staff updated.");
      }
    } catch (e) {
      onError(e instanceof Error ? e.message : "Could not update");
    } finally {
      setBusy(null);
    }
  };

  const remove = async (member: StaffRow) => {
    if (!window.confirm(`Remove ${member.user?.name ?? "this staff member"}?`)) return;
    setBusy(member.id);
    onError(null);
    try {
      const res = await fetch(`${base}/staff/${member.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await failure(res, "Could not remove"));
      setStaff((list) => list.filter((s) => s.id !== member.id));
      onFlash("Staff member removed.");
    } catch (e) {
      onError(e instanceof Error ? e.message : "Could not remove");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeading
        title={`Staff (${staff.length})`}
        action={
          <button
            onClick={() => setAdding((a) => !a)}
            className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-3.5 py-2 text-xs font-bold text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            Add staff
          </button>
        }
      />

      {issued && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
          <p className="text-xs font-black uppercase tracking-widest text-amber-700">
            Login details for {issued.name}
          </p>
          <p className="mt-2 text-sm text-amber-900">
            Restaurant code <span className="font-black">{issued.code || "—"}</span> · PIN{" "}
            <span className="font-black tracking-[0.3em]">{issued.pin}</span>
          </p>
          <p className="mt-1 text-[11px] text-amber-700">
            Write this down now — the PIN is stored hashed and cannot be shown again.
          </p>
          <button
            onClick={() => setIssued(null)}
            className="mt-3 rounded-lg bg-amber-600 px-3 py-1.5 text-[11px] font-bold text-white"
          >
            Got it
          </button>
        </div>
      )}

      {adding && (
        <div className="grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 md:grid-cols-[1fr_1fr_1fr_1fr_auto] md:items-end">
          <Field label="Name">
            <input
              className={inputCls}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </Field>
          <Field label="Email">
            <input
              className={inputCls}
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </Field>
          <Field label="Phone">
            <input
              className={inputCls}
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </Field>
          <Field label="Role">
            <select
              className={inputCls}
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            >
              {STAFF_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </Field>
          <button
            onClick={add}
            disabled={busy === "new"}
            className="flex h-[38px] items-center gap-2 rounded-xl bg-[var(--text-1)] px-4 text-xs font-bold text-[var(--canvas)] disabled:opacity-40"
          >
            {busy === "new" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            Create
          </button>
        </div>
      )}

      {staff.length === 0 ? (
        <Empty text="No staff at this business yet." />
      ) : (
        <div className="space-y-2">
          {staff.map((s) => (
            <div
              key={s.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-[var(--text-1)]">
                  {s.user?.name ?? "Unnamed"}
                </p>
                <p className="truncate text-[11px] text-[var(--text-3)]">
                  {s.user?.email ?? "no email"}
                  {s.user?.phone ? ` · ${s.user.phone}` : ""}
                </p>
              </div>
              <select
                className={`${inputCls} w-36 py-1.5 text-xs`}
                value={s.role}
                onChange={(e) => patch(s, { role: e.target.value })}
                disabled={busy === s.id}
              >
                {STAFF_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
              <select
                className={`${inputCls} w-32 py-1.5 text-xs`}
                value={s.staffType}
                onChange={(e) => patch(s, { staffType: e.target.value })}
                disabled={busy === s.id}
              >
                <option value="FULL_TIME">Full time</option>
                <option value="SHIFT_BASED">Shift based</option>
              </select>
              <button
                onClick={() => patch(s, { isActive: !s.isActive })}
                disabled={busy === s.id}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${
                  s.isActive
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-[var(--surface-alt)] text-[var(--text-3)]"
                }`}
              >
                {s.isActive ? "Active" : "Suspended"}
              </button>
              <button
                onClick={() => patch(s, { resetPin: true })}
                disabled={busy === s.id}
                className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[var(--surface-alt)] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[var(--text-3)] hover:text-[var(--text-1)]"
              >
                <KeyRound className="h-3 w-3" />
                New PIN
              </button>
              <button
                onClick={() => remove(s)}
                disabled={busy === s.id}
                className="shrink-0 rounded-lg p-2 text-rose-500 hover:bg-rose-50"
                aria-label="Remove staff member"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Rooms ─────────────────────────────────────────────────────────── */

function RoomsSection({
  base,
  currency,
  rooms,
  setRooms,
  onError,
  onFlash,
  failure,
}: {
  base: string;
  currency: string;
  rooms: RoomRow[];
  setRooms: (fn: (r: RoomRow[]) => RoomRow[]) => void;
  onError: (e: string | null) => void;
  onFlash: (m: string) => void;
  failure: Failure;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    roomNumber: "",
    name: "",
    type: "STANDARD",
    price: "",
    maxGuests: "2",
  });

  const add = async () => {
    setBusy("new");
    onError(null);
    try {
      const res = await fetch(`${base}/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomNumber: form.roomNumber.trim(),
          name: form.name.trim() || undefined,
          type: form.type,
          price: Number(form.price) || 0,
          maxGuests: Number(form.maxGuests) || 2,
        }),
      });
      if (!res.ok) throw new Error(await failure(res, "Could not add the room"));
      const created = await res.json();
      setRooms((list) => [...list, created]);
      setForm({ roomNumber: "", name: "", type: "STANDARD", price: "", maxGuests: "2" });
      setAdding(false);
      onFlash(`Added room ${created.roomNumber}.`);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Could not add the room");
    } finally {
      setBusy(null);
    }
  };

  const patch = async (room: RoomRow, body: Record<string, unknown>) => {
    setBusy(room.id);
    onError(null);
    try {
      const res = await fetch(`${base}/rooms/${room.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await failure(res, "Could not update the room"));
      const updated = await res.json();
      setRooms((list) => list.map((r) => (r.id === room.id ? { ...r, ...updated } : r)));
    } catch (e) {
      onError(e instanceof Error ? e.message : "Could not update the room");
    } finally {
      setBusy(null);
    }
  };

  const remove = async (room: RoomRow) => {
    if (!window.confirm(`Remove room ${room.roomNumber}?`)) return;
    setBusy(room.id);
    onError(null);
    try {
      const res = await fetch(`${base}/rooms/${room.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await failure(res, "Could not remove the room"));
      setRooms((list) => list.filter((r) => r.id !== room.id));
      onFlash("Room removed.");
    } catch (e) {
      onError(e instanceof Error ? e.message : "Could not remove the room");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeading
        title={`Rooms (${rooms.length})`}
        action={
          <button
            onClick={() => setAdding((a) => !a)}
            className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-3.5 py-2 text-xs font-bold text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            Add room
          </button>
        }
      />

      {adding && (
        <div className="grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 md:grid-cols-[1fr_1.5fr_1fr_1fr_1fr_auto] md:items-end">
          <Field label="Number">
            <input
              className={inputCls}
              value={form.roomNumber}
              onChange={(e) => setForm((f) => ({ ...f, roomNumber: e.target.value }))}
            />
          </Field>
          <Field label="Name">
            <input
              className={inputCls}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </Field>
          <Field label="Type">
            <select
              className={inputCls}
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            >
              {ROOM_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <Field label={`Price (${currency})`}>
            <input
              className={inputCls}
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            />
          </Field>
          <Field label="Max guests">
            <input
              className={inputCls}
              value={form.maxGuests}
              onChange={(e) => setForm((f) => ({ ...f, maxGuests: e.target.value }))}
            />
          </Field>
          <button
            onClick={add}
            disabled={busy === "new"}
            className="flex h-[38px] items-center gap-2 rounded-xl bg-[var(--text-1)] px-4 text-xs font-bold text-[var(--canvas)] disabled:opacity-40"
          >
            {busy === "new" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            Create
          </button>
        </div>
      )}

      {rooms.length === 0 ? (
        <Empty text="No rooms yet." />
      ) : (
        <div className="space-y-2">
          {rooms.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5"
            >
              <input
                className={`${inputCls} w-24 py-1.5 text-xs`}
                defaultValue={r.roomNumber}
                onBlur={(e) => {
                  if (e.target.value.trim() && e.target.value !== r.roomNumber) {
                    patch(r, { roomNumber: e.target.value });
                  }
                }}
              />
              <input
                className={`${inputCls} min-w-[140px] flex-1 py-1.5 text-xs`}
                defaultValue={r.name ?? ""}
                placeholder="Room name"
                onBlur={(e) => {
                  if (e.target.value !== (r.name ?? "")) patch(r, { name: e.target.value });
                }}
              />
              <select
                className={`${inputCls} w-32 py-1.5 text-xs`}
                value={r.type}
                onChange={(e) => patch(r, { type: e.target.value })}
                disabled={busy === r.id}
              >
                {ROOM_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <input
                className={`${inputCls} w-28 py-1.5 text-xs`}
                defaultValue={r.price}
                onBlur={(e) => {
                  const price = Number(e.target.value);
                  if (Number.isFinite(price) && price !== r.price) patch(r, { price });
                }}
              />
              <input
                className={`${inputCls} w-20 py-1.5 text-xs`}
                defaultValue={r.maxGuests}
                onBlur={(e) => {
                  const maxGuests = Number(e.target.value);
                  if (maxGuests && maxGuests !== r.maxGuests) patch(r, { maxGuests });
                }}
              />
              <button
                onClick={() => patch(r, { isAvailable: !r.isAvailable })}
                disabled={busy === r.id}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${
                  r.isAvailable
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-[var(--surface-alt)] text-[var(--text-3)]"
                }`}
              >
                {r.isAvailable ? "Bookable" : "Blocked"}
              </button>
              <button
                onClick={() => remove(r)}
                disabled={busy === r.id}
                className="shrink-0 rounded-lg p-2 text-rose-500 hover:bg-rose-50"
                aria-label={`Remove room ${r.roomNumber}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
