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
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRestaurant } from "@/context/RestaurantContext";
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
  ROOM_ENABLED_TYPES,
  HUB_FEATURE_IDS,
  FEATURE_ICONS,
  ALL_NAV,
} from "@/lib/dashboard-nav";
import { preloadTab } from "@/app/dashboard/[tab]/page";

function RestaurantSwitcher({
  onNavigate,
  onCreate,
}: {
  onNavigate?: () => void;
  onCreate?: () => void;
}) {
  const { restaurants, selectedRestaurant, selectRestaurant } = useRestaurant();
  const [open, setOpen] = useState(false);
  const [slugCopied, setSlugCopied] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const current = selectedRestaurant ?? restaurants[0];
  const otherRestaurants = restaurants.filter((r) => r.id !== current?.id);

  const copySlug = () => {
    if (!current?.slug) return;
    navigator.clipboard.writeText(`${window.location.origin}/pos/${current.slug}`);
    setSlugCopied(true);
    setTimeout(() => setSlugCopied(false), 2000);
  };

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

            {current?.slug && (
              <div className="px-3 py-2.5 border-b border-[var(--border-soft)]">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-3)] mb-2">
                  Customer POS Link
                </p>
                <button
                  onClick={copySlug}
                  className="flex w-full items-center gap-2.5 rounded-lg bg-[var(--canvas-sub)] px-3 py-2 hover:bg-[var(--accent-muted)] hover:text-[var(--accent-text)] transition-colors group"
                >
                  <code className="flex-1 text-left text-[11px] font-mono text-[var(--text-2)] group-hover:text-[var(--accent-text)] truncate">
                    /pos/{current.slug}
                  </code>
                  {slugCopied ? (
                    <Check className="h-3.5 w-3.5 text-[var(--accent)] shrink-0" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 text-[var(--text-3)] group-hover:text-[var(--accent)] shrink-0" />
                  )}
                </button>
              </div>
            )}

            {otherRestaurants.length > 0 && (
              <div className="px-3 py-2.5 border-b border-[var(--border-soft)]">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-3)] mb-2">
                  Switch to
                </p>
                <div className="space-y-1">
                  {otherRestaurants.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => handleSwitch(r.id)}
                      className="flex w-full items-center gap-3 rounded-lg p-2 hover:bg-[var(--canvas-sub)] transition-colors"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface)]">
                        <Store className="h-3.5 w-3.5 text-[var(--text-2)]" />
                      </div>
                      <div className="min-w-0 flex-1 text-left">
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
                  ))}
                </div>
              </div>
            )}

            <div className="p-2">
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
            </div>
          </motion.div>
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

function SlugCopyStrip() {
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
      className="mx-3 mb-3 flex items-center gap-2 rounded-lg border border-dashed border-[var(--accent-border)] bg-[var(--accent-muted)] px-3 py-2 text-left transition-colors hover:bg-[var(--surface)] group"
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

  const featureNavItems = useMemo(() => {
    if (!restaurantType) return [];
    const features = getFeatureTabsForType(restaurantType, {
      featuresEnabled,
      featuresDisabled,
    });
    const isHotelType = ROOM_ENABLED_TYPES.has(restaurantType);
    return features
      // Hotel Hub has a dedicated nav entry; the rest of the folded cluster is
      // never shown standalone for hotel-type venues.
      .filter((f) => f.id !== "hotel-hub")
      .filter((f) => !(isHotelType && HUB_FEATURE_IDS.has(f.id)))
      .map((f) => ({
        id: f.id as DashTab,
        label: f.label,
        icon: FEATURE_ICONS[f.id] ?? Sparkles,
      }));
  }, [restaurantType, featuresEnabled, featuresDisabled]);

  // Hotel Hub is shown when the venue's effective feature set includes it —
  // i.e. a hotel-type venue whose owner hasn't force-disabled it (or any venue
  // that force-enabled it via Owner Controls).
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
      <SlugCopyStrip />
      <POSLauncher
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
