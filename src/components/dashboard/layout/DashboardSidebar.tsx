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
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRestaurant } from "@/context/RestaurantContext";
import POSLauncher from "@/components/pos/activation/POSLauncher";
import {
  getTypeLabel,
  getFeatureTabsForType,
} from "@/lib/restaurant-types";
import {
  DashTab,
  NAV_MAIN,
  NAV_MANAGE,
  NAV_MORE,
  HOTEL_HUB_NAV_ITEM,
  ROOM_ENABLED_TYPES,
  HUB_FEATURE_IDS,
  FEATURE_ICONS,
  ALL_NAV,
} from "@/lib/dashboard-nav";

function RestaurantSwitcher({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
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

            <div className="flex items-center p-2 gap-2">
              <Link
                href="/manage-restaurants"
                onClick={() => {
                  setOpen(false);
                  onNavigate?.();
                }}
                className="flex-1 text-center text-[12px] font-semibold text-[var(--accent-text)] hover:text-[var(--accent)] transition-colors py-2 rounded-lg hover:bg-[var(--accent-muted)]"
              >
                Manage All
              </Link>
              <button
                onClick={() => {
                  setOpen(false);
                  onNavigate?.();
                  router.push("/manage-restaurants");
                }}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-[var(--accent)] py-2 text-[12px] font-bold text-white hover:bg-[var(--accent-hover)] transition-colors active:scale-[0.97]"
              >
                <Plus className="h-3 w-3" />
                New
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavSection({
  label,
  items,
  active,
  newOrderCount,
  onClose,
  defaultOpen = true,
}: {
  label: string;
  items: typeof NAV_MAIN;
  active: string;
  newOrderCount: number;
  onClose?: () => void;
  defaultOpen?: boolean;
}) {
  const hasActive = items.some((i) => i.id === active || (active === "" && i.id === "overview"));
  const [open, setOpen] = useState(defaultOpen || hasActive);

  return (
    <div className="mb-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 mb-1 py-1 rounded-lg hover:bg-[var(--canvas-sub)] transition-colors group"
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-2)] group-hover:text-[var(--text-2)]">
          {label}
        </p>
        <ChevronDown className={`h-3 w-3 text-[var(--text-3)] transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-0.5">
              {items.map((item) => {
                const Icon = item.icon;
                const isActive = active === item.id || (active === "" && item.id === "overview");
                const href = item.id === "overview" ? "/dashboard" : `/dashboard/${item.id}`;

                return (
                  <Link
                    key={item.id}
                    href={href}
                    onClick={() => onClose?.()}
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
              })}
            </div>
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

export default function DashboardSidebar({
  newOrderCount,
  onClose,
  isCollapsed,
  onToggleCollapse,
  onRequestPOSActivate,
}: {
  newOrderCount: number;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onRequestPOSActivate: () => void;
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
      .filter((f) => !(isHotelType && HUB_FEATURE_IDS.has(f.id)))
      .map((f) => ({
        id: f.id as DashTab,
        label: f.label,
        icon: FEATURE_ICONS[f.id] ?? Sparkles,
      }));
  }, [restaurantType, featuresEnabled, featuresDisabled]);

  const manageNavItems = useMemo(() => {
    const showHotel = restaurantType ? ROOM_ENABLED_TYPES.has(restaurantType) : false;
    if (!showHotel) return NAV_MANAGE;
    const insertAt = Math.max(0, NAV_MANAGE.length - 1);
    return [
      ...NAV_MANAGE.slice(0, insertAt),
      HOTEL_HUB_NAV_ITEM,
      ...NAV_MANAGE.slice(insertAt),
    ];
  }, [restaurantType]);

  const typeLabel = restaurantType ? getTypeLabel(restaurantType) : "";

  if (isCollapsed) {
    return (
      <aside className="flex h-full w-full flex-col items-center bg-[var(--canvas)]/60 backdrop-blur-3xl border-r border-[var(--border)]/50 shadow-[4px_0_24px_rgba(0,0,0,0.02)] py-4 gap-2">
        <Link href="/" className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)] shadow-sm mb-2">
          <Mountain className="h-4 w-4 text-white" strokeWidth={2.5} />
        </Link>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
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
            .filter((item) =>
              item.id !== "hotel-hub" ||
              (restaurantType ? ROOM_ENABLED_TYPES.has(restaurantType) : false),
            )
            .map((item) => {
              const Icon = item.icon;
              const isActive = active === item.id || (active === "dashboard" && item.id === "overview");
              const href = item.id === "overview" ? "/dashboard" : `/dashboard/${item.id}`;

              return (
                <Link
                  key={item.id}
                  href={href}
                  title={item.label}
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
    <aside className="flex h-full w-full flex-col bg-[var(--canvas)]/60 backdrop-blur-3xl border-r border-[var(--border)]/50 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
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
              className="rounded-lg p-1.5 hover:bg-[var(--surface)] transition-colors hidden lg:flex text-[var(--text-3)] hover:text-[var(--text-2)]"
              title="Collapse sidebar"
            >
              <ChevronDown className="h-4 w-4 -rotate-90" />
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 hover:bg-[var(--surface)] transition-colors lg:hidden text-[var(--text-2)]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <RestaurantSwitcher onNavigate={onClose} />
      <SlugCopyStrip />
      <POSLauncher
        restaurant={selectedRestaurant}
        onRequestActivate={() => {
          onRequestPOSActivate();
          onClose?.();
        }}
      />

      <nav className="flex-1 overflow-y-auto px-3 pb-2 scrollbar-slim">
        <NavSection
          label="Main"
          items={NAV_MAIN}
          active={active}
          newOrderCount={newOrderCount}
          onClose={onClose}
          defaultOpen={true}
        />

        {featureNavItems.length > 0 && (
          <NavSection
            label={`${typeLabel} Features`}
            items={featureNavItems}
            active={active}
            newOrderCount={newOrderCount}
            onClose={onClose}
            defaultOpen={false}
          />
        )}

        <NavSection
          label="Manage"
          items={manageNavItems}
          active={active}
          newOrderCount={newOrderCount}
          onClose={onClose}
          defaultOpen={false}
        />
        <NavSection
          label="More"
          items={NAV_MORE}
          active={active}
          newOrderCount={newOrderCount}
          onClose={onClose}
          defaultOpen={false}
        />
      </nav>

      <div className="pb-4" />
    </aside>
  );
}
