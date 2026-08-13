"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mountain,
  X,
  ChevronDown,
  ChevronRight,
  Store,
  Plus,
  MapPin,
  Check,
  Copy,
  Sparkles,
  BedDouble,
  UtensilsCrossed,
  Trash2,
  TriangleAlert,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRestaurant, type Restaurant } from "@/context/RestaurantContext";
import { useToast } from "@/context/ToastContext";
import POSLauncher from "@/components/pos/activation/POSLauncher";
import {
  getTypeLabel,
  getFeatureTabsForType,
  isFeatureAvailable,
  type FeatureTabId,
} from "@/lib/restaurant-types";
import {
  DashTab,
  NAV_MAIN,
  NAV_CATALOG,
  NAV_PEOPLE,
  NAV_MORE,
  HOTEL_HUB_NAV_ITEM,
  HUB_FEATURE_IDS,
  FEATURE_ICONS,
  ALL_NAV,
} from "@/lib/dashboard-nav";
import { preloadTab } from "@/app/dashboard/[tab]/page";

// Irreversible restaurant deletion — requires typing the exact name to confirm
// and spells out everything that will be permanently removed.
function DeleteRestaurantModal({
  restaurant,
  onClose,
  onDeleted,
}: {
  restaurant: Restaurant;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const { deleteRestaurant } = useRestaurant();
  const { showToast } = useToast();
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const canDelete = confirmText.trim() === restaurant.name.trim() && !deleting;

  const losses = [
    { label: "Menu items", value: restaurant._count?.menuItems ?? 0 },
    { label: "Tables & QR codes", value: restaurant.tableCount ?? 0 },
    { label: "Staff members", value: restaurant.staff?.length ?? 0 },
    { label: "Orders & billing history", value: restaurant._count?.orders ?? 0 },
  ];

  const handleDelete = async () => {
    if (!canDelete) return;
    setDeleting(true);
    try {
      await deleteRestaurant(restaurant.id);
      showToast(`"${restaurant.name}" deleted`, "success");
      onDeleted();
    } catch {
      showToast("Could not delete restaurant. Please try again.", "error");
      setDeleting(false);
    }
  };

  // Rendered through a portal to <body>: the sidebar is inside a
  // transformed (framer-motion) ancestor, and `position: fixed` resolves
  // against the nearest transformed ancestor — which was squashing this modal
  // into the narrow sidebar column. The portal escapes that so it centers on
  // the whole viewport.
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-[var(--canvas)] p-6 shadow-2xl ring-1 ring-[var(--border)]"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
            <TriangleAlert className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-[var(--text-1)]">Delete restaurant?</h3>
            <p className="mt-1 text-[13px] text-[var(--text-3)] leading-snug">
              This permanently deletes <span className="font-semibold text-[var(--text-1)]">{restaurant.name}</span> and everything in it. This cannot be undone.
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[var(--text-3)] hover:bg-[var(--surface)] hover:text-[var(--text-2)] transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] p-4">
          <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-3)]">
            You will lose
          </p>
          <ul className="space-y-1.5">
            {losses.map((l) => (
              <li key={l.label} className="flex items-center justify-between text-[13px]">
                <span className="text-[var(--text-2)]">{l.label}</span>
                <span className="font-bold text-[var(--text-1)] tabular-nums">{l.value}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4">
          <label className="mb-1.5 block text-[12px] font-medium text-[var(--text-2)]">
            Type <span className="font-bold text-[var(--text-1)]">{restaurant.name}</span> to confirm
          </label>
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            autoFocus
            placeholder={restaurant.name}
            onKeyDown={(e) => { if (e.key === "Enter" && canDelete) handleDelete(); }}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] px-3.5 py-2.5 text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-500/20 transition-all"
          />
        </div>

        <div className="mt-5 flex gap-2.5">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-[var(--border)] py-2.5 text-[13px] font-bold text-[var(--text-2)] hover:bg-[var(--canvas-sub)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={!canDelete}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 py-2.5 text-[13px] font-bold text-white hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Delete forever
          </button>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}

function RestaurantSwitcher({
  onNavigate,
  onCreate,
}: {
  onNavigate?: () => void;
  onCreate?: () => void;
}) {
  const { restaurants, selectedRestaurant, selectRestaurant } = useRestaurant();
  const [open, setOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Restaurant | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const current = selectedRestaurant ?? restaurants[0];
  const otherRestaurants = restaurants.filter((r) => r.id !== current?.id);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  if (!current) return null;

  const handleSwitch = (id: string) => {
    selectRestaurant(id);
    setOpen(false);
  };

  return (
    <div className="relative mx-3 mb-4" ref={panelRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 rounded-xl bg-[var(--accent-muted)] p-3 transition-colors hover:bg-[var(--surface)] ring-1 ring-[var(--accent-border)] cursor-pointer"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--surface)]">
          <Store className="h-4 w-4 text-[var(--accent)]" />
        </div>
        <div className="min-w-0 flex-1 text-left">
          <p className="truncate text-[13px] font-semibold text-[var(--text-1)]">
            {current.name}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
            <p className="text-[10px] text-[var(--text-3)]">Active</p>
          </div>
        </div>
        <ChevronDown
          className={`h-3.5 w-3.5 text-[var(--text-3)] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl bg-[var(--canvas)] ring-1 ring-[var(--border)] overflow-hidden shadow-xl"
          >
            <div className="p-3 border-b border-[var(--border-soft)]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--surface)]">
                  <Store className="h-4.5 w-4.5 text-[var(--accent)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold text-[var(--text-1)]">
                    {current.name}
                  </p>
                  <span className="text-[10px] text-[var(--text-3)]">
                    {getTypeLabel(current.type)}
                  </span>
                </div>
                <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
              </div>
            </div>

            {otherRestaurants.length > 0 && (
              <div className="px-3 py-2.5 border-b border-[var(--border-soft)]">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-3)] mb-2">
                  Switch to
                </p>
                <div className="space-y-1">
                  {otherRestaurants.map((r) => (
                    <div
                      key={r.id}
                      className="group/row flex items-center gap-1 rounded-lg pr-1 hover:bg-[var(--canvas-sub)] transition-colors"
                    >
                      <button
                        onClick={() => handleSwitch(r.id)}
                        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-2 text-left"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface)]">
                          <Store className="h-3.5 w-3.5 text-[var(--text-2)]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12px] font-semibold text-[var(--text-2)]">
                            {r.name}
                          </p>
                          {r.address && (
                            <span className="flex items-center gap-0.5 text-[10px] text-[var(--text-3)] truncate">
                              <MapPin className="h-2.5 w-2.5 shrink-0" />
                              {r.address}
                            </span>
                          )}
                        </div>
                      </button>
                      <button
                        onClick={() => { setOpen(false); setDeleteTarget(r); }}
                        title={`Delete ${r.name}`}
                        aria-label={`Delete ${r.name}`}
                        className="shrink-0 rounded-lg p-1.5 text-[var(--text-3)] opacity-0 group-hover/row:opacity-100 hover:bg-red-500/10 hover:text-red-500 transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-2 space-y-1.5">
              <button
                onClick={() => {
                  setOpen(false);
                  onNavigate?.();
                  onCreate?.();
                }}
                className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-[var(--accent)] py-2 text-[12px] font-bold text-white hover:bg-[var(--accent-hover)] transition-colors active:scale-[0.97]"
              >
                <Plus className="h-3 w-3" />
                New Restaurant
              </button>
              <button
                onClick={() => { setOpen(false); setDeleteTarget(current); }}
                className="w-full flex items-center justify-center gap-1.5 rounded-lg py-2 text-[12px] font-semibold text-[var(--text-3)] hover:bg-red-500/10 hover:text-red-500 transition-colors"
              >
                <Trash2 className="h-3 w-3" />
                Delete this restaurant
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteTarget && (
          <DeleteRestaurantModal
            restaurant={deleteTarget}
            onClose={() => setDeleteTarget(null)}
            onDeleted={() => setDeleteTarget(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Flat sidebar item — Restrox-style simple list (no collapsible group headers).
function NavItem({
  item,
  active,
  newOrderCount,
  onClose,
}: {
  item: (typeof NAV_MAIN)[number];
  active: string;
  newOrderCount: number;
  onClose?: () => void;
}) {
  const Icon = item.icon;
  const isActive =
    active === item.id ||
    ((active === "" || active === "dashboard") && item.id === "overview");
  const href = item.id === "overview" ? "/dashboard" : `/dashboard/${item.id}`;

  return (
    <Link
      href={href}
      prefetch={false}
      onClick={() => onClose?.()}
      onMouseEnter={() => preloadTab(item.id)}
      onFocus={() => preloadTab(item.id)}
      className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-colors cursor-pointer ${
        isActive
          ? "bg-[var(--accent-muted)] text-[var(--accent-text)] border-l-2 border-[var(--accent)]"
          : "text-[var(--text-2)] hover:bg-[var(--surface)] hover:text-[var(--text-1)]"
      }`}
    >
      <Icon
        className={`h-4 w-4 shrink-0 transition-colors ${isActive ? "text-[var(--accent)]" : "text-[var(--text-3)] group-hover:text-[var(--accent)]"}`}
      />
      <span className="flex-1 text-left tracking-wide">{item.label}</span>

      {item.badge === "live" && newOrderCount > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-md bg-[var(--accent-muted)] px-1.5 text-[10px] font-bold text-[var(--accent-text)] ring-1 ring-[var(--accent-border)]">
          {newOrderCount}
        </span>
      )}
      {item.badge === "live" && newOrderCount === 0 && (
        <span className="relative flex h-2 w-2">
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent)]" />
        </span>
      )}
    </Link>
  );
}

// A plain uppercase divider label for flat sections (Catalog / Team / More).
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pt-4 pb-1 text-[10px] font-bold uppercase tracking-widest text-[var(--text-3)]">
      {children}
    </p>
  );
}

// Collapsible sidebar group with a header + chevron. Used to split the dynamic
// feature tabs into clearly separated Hotel vs Restaurant dropdowns. Open state
// persists per group in localStorage so the owner's preference sticks.
function NavGroup({
  label,
  icon: Icon,
  items,
  active,
  newOrderCount,
  onClose,
  storageKey,
}: {
  label: string;
  icon: LucideIcon;
  items: { id: DashTab; label: string; icon: LucideIcon; badge?: string }[];
  active: string;
  newOrderCount: number;
  onClose?: () => void;
  storageKey: string;
}) {
  const lsKey = `himavolt:navgroup:${storageKey}`;
  // SSR-safe lazy init: the dashboard sidebar only paints after client-side auth
  // resolves, so reading the persisted open state here avoids both a flash and a
  // setState-in-effect.
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      const saved = window.localStorage.getItem(lsKey);
      return saved == null ? true : saved === "1";
    } catch {
      return true;
    }
  });

  const toggle = () => {
    setOpen((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(lsKey, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  // Keep an active group open even if the owner collapsed it, so the highlighted
  // tab is never hidden.
  const hasActive = items.some((i) => i.id === active);
  const expanded = open || hasActive;

  if (items.length === 0) return null;

  return (
    <div className="pt-2">
      <button
        onClick={toggle}
        className="group flex w-full items-center gap-2 rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors"
      >
        <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--text-3)] group-hover:text-[var(--accent)] transition-colors" />
        <span className="flex-1 text-left">{label}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-200 ${expanded ? "" : "-rotate-90"}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden space-y-0.5"
          >
            {items.map((item) => (
              <NavItem
                key={item.id}
                item={item}
                active={active}
                newOrderCount={newOrderCount}
                onClose={onClose}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SlugCopyStrip({ bare = false }: { bare?: boolean }) {
  const { selectedRestaurant } = useRestaurant();
  const [copied, setCopied] = useState(false);
  const slug = selectedRestaurant?.slug;
  if (!slug) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(`${window.location.origin}/pos/${slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      title="Copy customer POS link"
      className={
        bare
          ? "flex w-full items-center gap-2 rounded-lg bg-[var(--canvas)] ring-1 ring-[var(--border)] px-3 py-2 text-left transition-colors hover:bg-[var(--surface)] group"
          : "mx-3 mb-3 flex items-center gap-2 rounded-lg border border-dashed border-[var(--accent-border)] bg-[var(--accent-muted)] px-3 py-2 text-left transition-colors hover:bg-[var(--surface)] group"
      }
    >
      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--accent)] mb-0.5">POS Link</p>
        <p className="text-[11px] font-mono text-[var(--accent-text)] truncate">/pos/{slug}</p>
      </div>
      {copied ? (
        <Check className="h-3.5 w-3.5 text-[var(--accent)] shrink-0" />
      ) : (
        <Copy className="h-3.5 w-3.5 text-[var(--text-3)] group-hover:text-[var(--accent)] shrink-0 transition-colors" />
      )}
    </button>
  );
}

// One "POS" card grouping the launcher (Set up / Open POS) with the copyable
// customer POS link — previously two separate loose strips in the sidebar.
const POS_HIDDEN_KEY = "himavolt:posSectionHidden";

function PosSection({
  restaurant,
  onRequestActivate,
}: {
  restaurant: Restaurant | null;
  onRequestActivate: () => void;
}) {
  // Owners who've finished POS setup found the "Set up POS" + POS-link card
  // noisy, so it collapses to a slim "POS" bar — persisted so it stays hidden,
  // and one tap brings it back.
  const [hidden, setHidden] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(POS_HIDDEN_KEY) === "1";
    } catch {
      return false;
    }
  });

  const toggle = () =>
    setHidden((h) => {
      const next = !h;
      try {
        localStorage.setItem(POS_HIDDEN_KEY, next ? "1" : "0");
      } catch {}
      return next;
    });

  if (!restaurant) return null;
  return (
    <div className="mx-3 mb-3 rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)]/50 p-2 space-y-2">
      <button
        onClick={toggle}
        title={hidden ? "Show POS setup" : "Hide POS setup"}
        className="group flex w-full items-center justify-between px-1 pt-0.5"
      >
        <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-3)] group-hover:text-[var(--text-2)]">
          POS
        </span>
        {hidden ? (
          <ChevronRight className="h-3.5 w-3.5 text-[var(--text-3)] transition-colors group-hover:text-[var(--text-1)]" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-[var(--text-3)] transition-colors group-hover:text-[var(--text-1)]" />
        )}
      </button>
      {!hidden && (
        <>
          <POSLauncher restaurant={restaurant} onRequestActivate={onRequestActivate} bare />
          <SlugCopyStrip bare />
        </>
      )}
    </div>
  );
}

// Feature ids that belong under the "Hotel" group in the sidebar. Everything
// else in the dynamic feature set is treated as a restaurant feature.
const HOTEL_FEATURE_IDS = new Set<FeatureTabId>([
  ...HUB_FEATURE_IDS,
  "room-service",
  "guest-billing",
]);

export default function DashboardSidebar({
  newOrderCount,
  onClose,
  isCollapsed,
  onToggleCollapse,
  onRequestPOSActivate,
  onRequestCreateRestaurant,
}: {
  newOrderCount: number;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onRequestPOSActivate: () => void;
  onRequestCreateRestaurant?: () => void;
}) {
  const pathname = usePathname();
  const { selectedRestaurant } = useRestaurant();
  const active = pathname.split("/").pop() || ""; // Simple path detection for active state

  const restaurantType = selectedRestaurant?.type;
  const featuresEnabled = selectedRestaurant?.featuresEnabled;
  const featuresDisabled = selectedRestaurant?.featuresDisabled;

  // Hotel Hub is shown when the venue's effective feature set includes it —
  // i.e. a hotel-type venue whose owner hasn't force-disabled it, OR any venue
  // that force-enabled it via Owner Controls. Enabling Hotel Hub turns on the
  // whole hotel cluster at once.
  const showHotelHub = useMemo(
    () =>
      restaurantType
        ? isFeatureAvailable(restaurantType, "hotel-hub", {
            featuresEnabled,
            featuresDisabled,
          })
        : false,
    [restaurantType, featuresEnabled, featuresDisabled],
  );

  const featureNavItems = useMemo(() => {
    if (!restaurantType) return [];
    const features = getFeatureTabsForType(restaurantType, {
      featuresEnabled,
      featuresDisabled,
    });
    return features
      // Hotel Hub has a dedicated nav entry; whenever the Hub is enabled the rest
      // of the folded cluster lives INSIDE it, never as standalone nav items.
      .filter((f) => f.id !== "hotel-hub")
      .filter((f) => !(showHotelHub && HUB_FEATURE_IDS.has(f.id)))
      .map((f) => ({
        id: f.id as DashTab,
        label: f.label,
        icon: FEATURE_ICONS[f.id] ?? Sparkles,
      }));
  }, [restaurantType, featuresEnabled, featuresDisabled, showHotelHub]);

  // Split the dynamic feature tabs into Hotel vs Restaurant buckets so each gets
  // its own collapsible dropdown. The Hotel group also picks up the dedicated
  // Hotel Hub entry when the venue has it enabled.
  const hotelGroupItems = useMemo(() => {
    const items = featureNavItems.filter((f) =>
      HOTEL_FEATURE_IDS.has(f.id as FeatureTabId),
    );
    return showHotelHub
      ? [{ ...HOTEL_HUB_NAV_ITEM, id: HOTEL_HUB_NAV_ITEM.id as DashTab }, ...items]
      : items;
  }, [featureNavItems, showHotelHub]);

  const restaurantGroupItems = useMemo(
    () =>
      featureNavItems.filter(
        (f) => !HOTEL_FEATURE_IDS.has(f.id as FeatureTabId),
      ),
    [featureNavItems],
  );

  if (isCollapsed) {
    return (
      <aside className="flex h-full w-full flex-col items-center bg-[var(--canvas)]/60 backdrop-blur-3xl border-r border-[var(--border)]/50 shadow-[4px_0_24px_rgba(0,0,0,0.02)] py-4 gap-2 font-poppins">
        <Link href="/" className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)] shadow-sm mb-2">
          <Mountain className="h-4 w-4 text-white" strokeWidth={2.5} />
        </Link>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            aria-label="Expand sidebar"
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[var(--surface)] transition-colors text-[var(--text-2)]"
            title="Expand sidebar"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
        <POSLauncher
          restaurant={selectedRestaurant}
          onRequestActivate={onRequestPOSActivate}
          compact
        />
        <div className="flex-1 flex flex-col items-center gap-1 mt-2 overflow-y-auto w-full px-2 scrollbar-slim">
          {ALL_NAV
            .filter((item) => item.id !== "hotel-hub" || showHotelHub)
            .map((item) => {
              const Icon = item.icon;
              const isActive = active === item.id || (active === "dashboard" && item.id === "overview");
              const href = item.id === "overview" ? "/dashboard" : `/dashboard/${item.id}`;

              return (
                <Link
                  key={item.id}
                  href={href}
                  title={item.label}
                  prefetch={false}
                  onMouseEnter={() => preloadTab(item.id)}
                  onFocus={() => preloadTab(item.id)}
                  className={`relative flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                    isActive
                      ? "bg-[var(--accent-muted)] text-[var(--accent)] border border-[var(--accent-border)]"
                      : "text-[var(--text-3)] hover:bg-[var(--surface)] hover:text-[var(--text-2)]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {"badge" in item && item.badge === "live" && newOrderCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[var(--accent)] text-[7px] font-bold text-white">
                      {newOrderCount}
                    </span>
                  )}
                </Link>
              );
            })}
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex h-full w-full flex-col bg-[var(--canvas)]/60 backdrop-blur-3xl border-r border-[var(--border)]/50 shadow-[4px_0_24px_rgba(0,0,0,0.02)] font-poppins">
      <div className="flex items-center justify-between px-5 pt-6 pb-5">
        <Link href="/" className="group flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)] shadow-sm">
            <Mountain className="h-4 w-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-[17px] font-bold tracking-tight text-[var(--text-1)]">
            Hima<span className="text-[var(--accent)]">Volt</span>
          </span>
        </Link>
        <div className="flex items-center gap-1">
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              aria-label="Collapse sidebar"
              className="rounded-lg p-1.5 hover:bg-[var(--surface)] transition-colors hidden lg:flex text-[var(--text-3)] hover:text-[var(--text-2)]"
              title="Collapse sidebar"
            >
              <ChevronDown className="h-4 w-4 -rotate-90" />
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              aria-label="Close menu"
              className="rounded-lg p-1.5 hover:bg-[var(--surface)] transition-colors lg:hidden text-[var(--text-2)]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <RestaurantSwitcher onNavigate={onClose} onCreate={onRequestCreateRestaurant} />
      <PosSection
        restaurant={selectedRestaurant}
        onRequestActivate={() => {
          onRequestPOSActivate();
          onClose?.();
        }}
      />

      <nav className="flex-1 overflow-y-auto px-3 pb-2 scrollbar-slim space-y-0.5">
        {/* Core operations — always visible, flat. */}
        {NAV_MAIN.map((item) => (
          <NavItem
            key={item.id}
            item={item}
            active={active}
            newOrderCount={newOrderCount}
            onClose={onClose}
          />
        ))}

        {/* Hotel features — collapsible group. */}
        <NavGroup
          label="Hotel"
          icon={BedDouble}
          items={hotelGroupItems}
          active={active}
          newOrderCount={newOrderCount}
          onClose={onClose}
          storageKey="hotel"
        />

        {/* Restaurant features — collapsible group. */}
        <NavGroup
          label="Restaurant"
          icon={UtensilsCrossed}
          items={restaurantGroupItems}
          active={active}
          newOrderCount={newOrderCount}
          onClose={onClose}
          storageKey="restaurant"
        />

        {/* Catalog / Team / More — flat sections with labels. */}
        <SectionLabel>Catalog</SectionLabel>
        {NAV_CATALOG.map((item) => (
          <NavItem
            key={item.id}
            item={item}
            active={active}
            newOrderCount={newOrderCount}
            onClose={onClose}
          />
        ))}

        <SectionLabel>Team</SectionLabel>
        {NAV_PEOPLE.map((item) => (
          <NavItem
            key={item.id}
            item={item}
            active={active}
            newOrderCount={newOrderCount}
            onClose={onClose}
          />
        ))}

        <SectionLabel>More</SectionLabel>
        {NAV_MORE.map((item) => (
          <NavItem
            key={item.id}
            item={item}
            active={active}
            newOrderCount={newOrderCount}
            onClose={onClose}
          />
        ))}
      </nav>

      <div className="pb-4" />
    </aside>
  );
}
