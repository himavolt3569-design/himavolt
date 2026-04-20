"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  ClipboardList,
  UtensilsCrossed,
  QrCode,
  BarChart3,
  Mountain,
  X,
  Menu,
  ExternalLink,
  TrendingUp,
  Users,
  ShoppingBag,
  Star,
  Bell,
  Search,
  Clock,
  Store,
  UsersRound,
  ChevronDown,
  Settings,
  Plus,
  MapPin,
  MessageCircle,
  Receipt,
  Camera,
  Sparkles,
  Activity,
  ChevronRight,
  Wallet,
  Package,
  Tag,
  Image as ImageIcon,
  AlertTriangle,
  Eye,
  Zap,
  Layers,
  Timer,
  PackageCheck,
  BedDouble,
  LayoutGrid,
  PartyPopper,
  CreditCard,
  ChefHat,
  CalendarClock,
  Cake,
  Monitor,
  Truck,
  Building2,
  PackageSearch,
  Wine,
  Music,
  Award,
  Wifi,
  Leaf,
  Sun,
  CalendarCheck,
  ListOrdered,
  DoorOpen,
  User,
  Crown,
  Copy,
  Check,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import dynamic from "next/dynamic";
import CustomerDashboard from "@/app/dashboard/CustomerDashboard";
import LiveOrdersTab from "@/components/dashboard/LiveOrdersTab";
import NotificationBell from "@/components/dashboard/NotificationBell";
import ThemeToggle from "@/components/shared/ThemeToggle";
import GlobalChatButton from "@/components/chat/GlobalChatButton";
import { useLiveOrders } from "@/context/LiveOrdersContext";
import { useRestaurant } from "@/context/RestaurantContext";
import {
  getTypeLabel,
  getFeatureTabsForType,
  type FeatureTabId,
} from "@/lib/restaurant-types";
import { formatPrice } from "@/lib/currency";

/* ── Lazy-loaded tabs (split per activeTab) ───────────────────────── */
const TabLoader = () => (
  <div className="flex h-40 items-center justify-center text-xs text-[var(--text-3)]">
    Loading…
  </div>
);
const lazyTab = <T,>(loader: () => Promise<{ default: React.ComponentType<T> }>) =>
  dynamic(loader, { loading: TabLoader, ssr: false });

const QRCodesTab = lazyTab(() => import("@/components/dashboard/QRCodesTab"));
const MenuManagementTab = lazyTab(() => import("@/components/dashboard/MenuManagementTab"));
const ReportsTab = lazyTab(() => import("@/components/dashboard/ReportsTab"));
const StaffManagementTab = lazyTab(() => import("@/components/dashboard/StaffManagementTab"));
const ShiftsTab = lazyTab(() => import("@/components/dashboard/ShiftsTab"));
const ChatTab = lazyTab(() => import("@/components/dashboard/ChatTab"));
const BillingTab = lazyTab(() => import("@/components/billing/BillingTab"));
const StoryManager = lazyTab(() => import("@/components/stories/StoryManager"));
const PaymentQRTab = lazyTab(() => import("@/components/dashboard/PaymentQRTab"));
const PaymentSettingsTab = lazyTab(() => import("@/components/dashboard/PaymentSettingsTab"));
const TaxChargesTab = lazyTab(() => import("@/components/dashboard/TaxChargesTab"));
const StockTab = lazyTab(() => import("@/components/dashboard/StockTab"));
const OffersTab = lazyTab(() => import("@/components/dashboard/OffersTab"));
const HeroSlidesManager = lazyTab(() => import("@/components/dashboard/HeroSlidesManager"));
const QuickCounterTab = lazyTab(() => import("@/components/dashboard/features/QuickCounterTab"));
const ComboMealsTab = lazyTab(() => import("@/components/dashboard/features/ComboMealsTab"));
const RushHourTab = lazyTab(() => import("@/components/dashboard/features/RushHourTab"));
const TakeawayTab = lazyTab(() => import("@/components/dashboard/features/TakeawayTab"));
const RoomServiceTab = lazyTab(() => import("@/components/dashboard/features/RoomServiceTab"));
const MultiOutletTab = lazyTab(() => import("@/components/dashboard/features/MultiOutletTab"));
const EventCateringTab = lazyTab(() => import("@/components/dashboard/features/EventCateringTab"));
const GuestBillingTab = lazyTab(() => import("@/components/dashboard/features/GuestBillingTab"));
const BuffetManagerTab = lazyTab(() => import("@/components/dashboard/features/BuffetManagerTab"));
const PreOrdersTab = lazyTab(() => import("@/components/dashboard/features/PreOrdersTab"));
const CustomCakesTab = lazyTab(() => import("@/components/dashboard/features/CustomCakesTab"));
const DailySpecialsTab = lazyTab(() => import("@/components/dashboard/features/DailySpecialsTab"));
const DisplayCounterTab = lazyTab(() => import("@/components/dashboard/features/DisplayCounterTab"));
const DeliveryOpsTab = lazyTab(() => import("@/components/dashboard/features/DeliveryOpsTab"));
const MultiBrandTab = lazyTab(() => import("@/components/dashboard/features/MultiBrandTab"));
const DeliveryZonesTab = lazyTab(() => import("@/components/dashboard/features/DeliveryZonesTab"));
const PackageTrackingTab = lazyTab(() => import("@/components/dashboard/features/PackageTrackingTab"));
const HappyHoursTab = lazyTab(() => import("@/components/dashboard/features/HappyHoursTab"));
const TabManagementTab = lazyTab(() => import("@/components/dashboard/features/TabManagementTab"));
const CocktailMenuTab = lazyTab(() => import("@/components/dashboard/features/CocktailMenuTab"));
const LiveEventsTab = lazyTab(() => import("@/components/dashboard/features/LiveEventsTab"));
const LoyaltyRewardsTab = lazyTab(() => import("@/components/dashboard/features/LoyaltyRewardsTab"));
const WifiSeatingTab = lazyTab(() => import("@/components/dashboard/features/WifiSeatingTab"));
const SeasonalMenuTab = lazyTab(() => import("@/components/dashboard/features/SeasonalMenuTab"));
const BrunchModeTab = lazyTab(() => import("@/components/dashboard/features/BrunchModeTab"));
const TableReservationsTab = lazyTab(() => import("@/components/dashboard/features/TableReservationsTab"));
const WaitlistTab = lazyTab(() => import("@/components/dashboard/features/WaitlistTab"));
const PrivateDiningTab = lazyTab(() => import("@/components/dashboard/features/PrivateDiningTab"));
const WifiSettingsTab = lazyTab(() => import("@/components/dashboard/features/WifiSettingsTab"));
const DrinksTab = lazyTab(() => import("@/components/dashboard/DrinksTab"));
const GuestCheckInTab = lazyTab(() => import("@/components/dashboard/GuestCheckInTab"));
const MediaTab = lazyTab(() => import("@/components/dashboard/MediaTab"));
const ManualBillingTab = lazyTab(() => import("@/components/dashboard/ManualBillingTab"));
const TablesTab = lazyTab(() => import("@/components/dashboard/TablesTab"));
const CouponManagementTab = lazyTab(() => import("@/components/dashboard/CouponManagementTab"));
const RoomManagementTab = lazyTab(() => import("@/components/dashboard/RoomManagementTab"));
const HotelBookingsTab = lazyTab(() => import("@/components/dashboard/HotelBookingsTab"));
const HotelQRTab = lazyTab(() => import("@/components/dashboard/HotelQRTab"));
const RoomQRTab = lazyTab(() => import("@/components/dashboard/RoomQRTab"));
const OwnerControlPanel = lazyTab(() => import("@/components/dashboard/OwnerControlPanel"));

type DashTab =
  | "overview"
  | "orders"
  | "menu"
  | "drinks"
  | "qr"
  | "reports"
  | "staff"
  | "chat"
  | "billing"
  | "stories"
  | "payment-qr"
  | "payment-settings"
  | "tax-charges"
  | "stock"
  | "offers"
  | "hero-slides"
  | "media"
  | "manual-billing"
  | "coupons"
  | "rooms"
  | "tables"
  | "owner-control"
  | "shifts"
  | FeatureTabId;

const NAV_MAIN: {
  id: DashTab;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: string;
}[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "orders", label: "Live Orders", icon: ClipboardList, badge: "live" },
  { id: "billing", label: "Billing", icon: Receipt },
  { id: "manual-billing" as DashTab, label: "Fast Billing", icon: Receipt },
  { id: "tables" as DashTab, label: "Tables", icon: LayoutGrid },
  { id: "offers" as DashTab, label: "Offers", icon: Tag },
  { id: "chat", label: "Chats", icon: MessageCircle },
];

const ROOMS_NAV_ITEM: (typeof NAV_MAIN)[number] = {
  id: "rooms" as DashTab,
  label: "Rooms",
  icon: BedDouble,
};

const ROOM_ENABLED_TYPES = new Set(["HOTEL", "RESORT", "GUEST_HOUSE"]);

const NAV_MANAGE: typeof NAV_MAIN = [
  { id: "menu", label: "Menu", icon: UtensilsCrossed },
  { id: "staff", label: "Staff", icon: UsersRound },
  { id: "shifts" as DashTab, label: "Shifts", icon: Clock },
  { id: "stock" as DashTab, label: "Stock", icon: Package },
  { id: "qr", label: "QR Codes", icon: QrCode },
  { id: "tax-charges" as DashTab, label: "Tax & Charges", icon: Receipt },
  { id: "payment-settings", label: "Payment Settings", icon: Settings },
  { id: "payment-qr", label: "Payment QR", icon: Wallet },
  { id: "coupons" as DashTab, label: "Coupons", icon: Tag },
  { id: "drinks" as DashTab, label: "Drinks", icon: Package },
  { id: "hero-slides" as DashTab, label: "Hero Slides", icon: ImageIcon },
  { id: "owner-control" as DashTab, label: "Owner Control", icon: Crown },
];

const NAV_MORE: typeof NAV_MAIN = [
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "media" as DashTab, label: "Media Library", icon: ImageIcon },
  { id: "stories", label: "Stories", icon: Camera },
];

const ALL_NAV = [...NAV_MAIN, ...NAV_MANAGE, ROOMS_NAV_ITEM, ...NAV_MORE];

const FEATURE_ICONS: Record<FeatureTabId, typeof Zap> = {
  "quick-counter": Zap,
  "combo-meals": Layers,
  "rush-hour": Timer,
  takeaway: PackageCheck,
  "room-service": BedDouble,
  "multi-outlet": LayoutGrid,
  "event-catering": PartyPopper,
  "guest-billing": CreditCard,
  "buffet-manager": ChefHat,
  "pre-orders": CalendarClock,
  "custom-cakes": Cake,
  "daily-specials": Sparkles,
  "display-counter": Monitor,
  "delivery-ops": Truck,
  "multi-brand": Building2,
  "delivery-zones": MapPin,
  "package-tracking": PackageSearch,
  "happy-hours": Clock,
  "tab-management": Receipt,
  "cocktail-menu": Wine,
  "live-events": Music,
  "loyalty-rewards": Award,
  "wifi-seating": Wifi,
  "seasonal-menu": Leaf,
  "brunch-mode": Sun,
  "table-reservations": CalendarCheck,
  waitlist: ListOrdered,
  "private-dining": DoorOpen,
  "wifi-settings": Wifi,
  "guest-checkin": BedDouble,
  "room-qr-codes": QrCode,
  "hotel-bookings": CalendarCheck,
  "hotel-qr": QrCode,
};

/* ── Features that are fully implemented (not coming soon) ─────────── */
const LIVE_FEATURES = new Set<FeatureTabId>([
  "quick-counter",
  "combo-meals",
  "rush-hour",
  "takeaway",
  "room-service",
  "multi-outlet",
  "event-catering",
  "guest-billing",
  "buffet-manager",
  "pre-orders",
  "custom-cakes",
  "daily-specials",
  "display-counter",
  "delivery-ops",
  "multi-brand",
  "delivery-zones",
  "package-tracking",
  "happy-hours",
  "tab-management",
  "cocktail-menu",
  "live-events",
  "loyalty-rewards",
  "wifi-seating",
  "seasonal-menu",
  "brunch-mode",
  "table-reservations",
  "waitlist",
  "private-dining",
  "wifi-settings",
  "guest-checkin",
  "room-qr-codes",
  "hotel-bookings",
  "hotel-qr",
]);

const FEATURE_COMPONENTS: Record<FeatureTabId, React.ComponentType> = {
  "quick-counter": QuickCounterTab,
  "combo-meals": ComboMealsTab,
  "rush-hour": RushHourTab,
  takeaway: TakeawayTab,
  "room-service": RoomServiceTab,
  "multi-outlet": MultiOutletTab,
  "event-catering": EventCateringTab,
  "guest-billing": GuestBillingTab,
  "buffet-manager": BuffetManagerTab,
  "pre-orders": PreOrdersTab,
  "custom-cakes": CustomCakesTab,
  "daily-specials": DailySpecialsTab,
  "display-counter": DisplayCounterTab,
  "delivery-ops": DeliveryOpsTab,
  "multi-brand": MultiBrandTab,
  "delivery-zones": DeliveryZonesTab,
  "package-tracking": PackageTrackingTab,
  "happy-hours": HappyHoursTab,
  "tab-management": TabManagementTab,
  "cocktail-menu": CocktailMenuTab,
  "live-events": LiveEventsTab,
  "loyalty-rewards": LoyaltyRewardsTab,
  "wifi-seating": WifiSeatingTab,
  "seasonal-menu": SeasonalMenuTab,
  "brunch-mode": BrunchModeTab,
  "table-reservations": TableReservationsTab,
  waitlist: WaitlistTab,
  "private-dining": PrivateDiningTab,
  "wifi-settings": WifiSettingsTab,
  "guest-checkin": GuestCheckInTab,
  "room-qr-codes": RoomQRTab,
  "hotel-bookings": HotelBookingsTab,
  "hotel-qr": HotelQRTab,
};

function AnimatedNumber({
  value,
  duration = 800,
}: {
  value: number;
  duration?: number;
}) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    if (value === 0) {
      setDisplayed(0);
      return;
    }
    const startTime = performance.now();
    let raf: number;

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(eased * value));
      if (progress < 1) raf = requestAnimationFrame(animate);
    }

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <>{displayed.toLocaleString()}</>;
}

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
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
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
  setActive,
  newOrderCount,
  onClose,
  defaultOpen = true,
}: {
  label: string;
  items: typeof NAV_MAIN;
  active: DashTab;
  setActive: (t: DashTab) => void;
  newOrderCount: number;
  onClose?: () => void;
  defaultOpen?: boolean;
}) {
  const hasActive = items.some((i) => i.id === active);
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
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActive(item.id);
                onClose?.();
              }}
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
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-50" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent)]" />
                </span>
              )}
            </button>
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

function Sidebar({
  active,
  setActive,
  newOrderCount,
  onClose,
  restaurantType,
  featuresEnabled,
  featuresDisabled,
  isCollapsed,
  onToggleCollapse,
}: {
  active: DashTab;
  setActive: (t: DashTab) => void;
  newOrderCount: number;
  onClose?: () => void;
  restaurantType?: string;
  featuresEnabled?: string[];
  featuresDisabled?: string[];
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  /* Build dynamic feature nav items from restaurant type */
  const featureNavItems = useMemo(() => {
    if (!restaurantType) return [];
    const features = getFeatureTabsForType(restaurantType, {
      featuresEnabled,
      featuresDisabled,
    });
    return features.map((f) => ({
      id: f.id as DashTab,
      label: f.label,
      icon: FEATURE_ICONS[f.id] ?? Sparkles,
    }));
  }, [restaurantType, featuresEnabled, featuresDisabled]);

  const manageNavItems = useMemo(() => {
    const showRooms = restaurantType ? ROOM_ENABLED_TYPES.has(restaurantType) : false;
    if (!showRooms) return NAV_MANAGE;
    const insertAt = Math.max(0, NAV_MANAGE.length - 1);
    return [
      ...NAV_MANAGE.slice(0, insertAt),
      ROOMS_NAV_ITEM,
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
        <div className="flex-1 flex flex-col items-center gap-1 mt-2 overflow-y-auto w-full px-2 scrollbar-slim">
          {ALL_NAV
            .filter((item) =>
              item.id !== "rooms" ||
              (restaurantType ? ROOM_ENABLED_TYPES.has(restaurantType) : false),
            )
            .map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActive(item.id)}
                title={item.label}
                className={`relative flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                  isActive
                    ? "bg-[var(--accent-muted)] text-[var(--accent)] border border-[var(--accent-border)]"
                    : "text-[var(--text-3)] hover:bg-[var(--surface)] hover:text-[var(--text-2)]"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.badge === "live" && newOrderCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[var(--accent)] text-[7px] font-bold text-white">
                    {newOrderCount}
                  </span>
                )}
              </button>
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

      <nav className="flex-1 overflow-y-auto px-3 pb-2 scrollbar-slim">
        <NavSection
          label="Main"
          items={NAV_MAIN}
          active={active}
          setActive={setActive}
          newOrderCount={newOrderCount}
          onClose={onClose}
          defaultOpen={true}
        />

        {/* Type-specific features section */}
        {featureNavItems.length > 0 && (
          <NavSection
            label={`${typeLabel} Features`}
            items={featureNavItems}
            active={active}
            setActive={setActive}
            newOrderCount={newOrderCount}
            onClose={onClose}
            defaultOpen={false}
          />
        )}

        <NavSection
          label="Manage"
          items={manageNavItems}
          active={active}
          setActive={setActive}
          newOrderCount={newOrderCount}
          onClose={onClose}
          defaultOpen={false}
        />
        <NavSection
          label="More"
          items={NAV_MORE}
          active={active}
          setActive={setActive}
          newOrderCount={newOrderCount}
          onClose={onClose}
          defaultOpen={false}
        />
      </nav>

      <div className="pb-4" />
    </aside>
  );
}

/* ─── Stat card (fresh strip-accent design) ────────────────────────── */
interface StatCardProps {
  label: string;
  value: string;
  numericValue?: number;
  prefix?: string;
  suffix?: string;
  sub: string;
  accent: string;
  icon: typeof TrendingUp;
}

function StatCard({
  label,
  value,
  numericValue,
  prefix = "",
  suffix = "",
  sub,
  accent,
  icon: Icon,
}: StatCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className="relative rounded-3xl bg-[var(--canvas)]/70 backdrop-blur-md border border-[var(--border-soft)]/50 p-6 cursor-default overflow-hidden group shadow-[0_4px_24px_-4px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)] transition-all"
    >
      <div
        className="absolute -top-12 -right-12 h-32 w-32 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-500 blur-3xl"
        style={{ background: accent }}
      />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-[12px] font-bold text-[var(--text-2)] mb-1.5 uppercase tracking-wide">
            {label}
          </p>
          <p className="text-3xl font-black text-[var(--text-1)] tracking-tight leading-none mt-2">
            {numericValue !== undefined ? (
              <>
                {prefix}
                <AnimatedNumber value={numericValue} />
                {suffix}
              </>
            ) : (
              value
            )}
          </p>
          <p className="text-[11px] font-bold text-[var(--text-3)] mt-2.5 bg-[var(--surface)] w-fit px-2 py-1 rounded-md">{sub}</p>
        </div>
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-all duration-300 group-hover:scale-110 shadow-sm border border-black/5"
          style={{ background: `${accent}15` }}
        >
          <Icon className="h-5 w-5" style={{ color: accent }} />
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Overview tab (complete bento-grid redesign) ──────────────────── */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
}

function OverviewTab({
  setTab,
  userName,
}: {
  setTab: (t: DashTab) => void;
  userName?: string;
}) {
  const { selectedRestaurant, restaurants } = useRestaurant();
  const { orders } = useLiveOrders();
  const current = selectedRestaurant ?? restaurants[0];
  const cur = selectedRestaurant?.currency ?? "NPR";
  const restaurantName = current?.name ?? "Your Restaurant";

  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  const todayOrders = useMemo(
    () => orders.filter((o) => new Date(o.createdAt).getTime() >= todayStart),
    [orders, todayStart],
  );

  const todayRevenue = useMemo(
    () =>
      todayOrders
        .filter((o) => o.status === "DELIVERED")
        .reduce((sum, o) => sum + (o.total ?? 0), 0),
    [todayOrders],
  );

  const pendingCount = orders.filter((o) => o.status === "PENDING").length;
  const menuItemCount = current?._count?.menuItems ?? 0;

  const deliveredCount = todayOrders.filter(
    (o) => o.status === "DELIVERED",
  ).length;

  const stats: StatCardProps[] = [
    {
      label: "Revenue Today",
      value: formatPrice(todayRevenue, cur),
      numericValue: todayRevenue,
      prefix: "",
      sub: deliveredCount ? `${deliveredCount} delivered` : "No sales yet",
      accent: "#10B981",
      icon: TrendingUp,
    },
    {
      label: "Orders Today",
      value: String(todayOrders.length),
      numericValue: todayOrders.length,
      sub: pendingCount > 0 ? `${pendingCount} pending` : "All clear",
      accent: "#F59E0B",
      icon: ShoppingBag,
    },
    {
      label: "Tables",
      value: String(current?.tableCount ?? 0),
      numericValue: current?.tableCount ?? 0,
      sub: `${current?.tableCount ?? 0} configured`,
      accent: "#6366F1",
      icon: Users,
    },
    {
      label: "Rating",
      value: current?.rating ? `${current.rating}` : "N/A",
      numericValue: current?.rating
        ? parseFloat(String(current.rating))
        : undefined,
      suffix: "",
      sub: current?.rating ? "From reviews" : "No reviews yet",
      accent: "#EF4444",
      icon: Star,
    },
  ];

  const STATUS_COLOR: Record<string, string> = {
    DELIVERED: "#10B981",
    PENDING: "#F59E0B",
    ACCEPTED: "#3B82F6",
    PREPARING: "#F97316",
    READY: "#8B5CF6",
    CANCELLED: "#EF4444",
    REJECTED: "#EF4444",
  };

  function timeAgo(date: string) {
    const diff = Math.max(0, Date.now() - new Date(date).getTime());
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  const recentOrders = useMemo(
    () =>
      [...orders]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, 6),
    [orders],
  );

  /* Order status distribution for pipeline visualization */
  const statusDistribution = useMemo(() => {
    const STATUS_META: Record<
      string,
      { label: string; color: string; order: number }
    > = {
      PENDING: { label: "Pending", color: "#F59E0B", order: 0 },
      ACCEPTED: { label: "Accepted", color: "#3B82F6", order: 1 },
      PREPARING: { label: "Preparing", color: "#F97316", order: 2 },
      READY: { label: "Ready", color: "#8B5CF6", order: 3 },
      DELIVERED: { label: "Delivered", color: "#10B981", order: 4 },
      CANCELLED: { label: "Cancelled", color: "#EF4444", order: 5 },
      REJECTED: { label: "Rejected", color: "#EF4444", order: 6 },
    };

    const counts: Record<string, number> = {};
    todayOrders.forEach((o) => {
      counts[o.status] = (counts[o.status] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([status, count]) => ({
        status,
        count,
        percent:
          todayOrders.length > 0 ? (count / todayOrders.length) * 100 : 0,
        ...(STATUS_META[status] ?? {
          label: status,
          color: "#9CA3AF",
          order: 99,
        }),
      }))
      .sort((a, b) => a.order - b.order);
  }, [todayOrders]);

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10">
      {/* ── Welcome banner ────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl p-6 sm:p-8 shadow-[0_8px_30px_-4px_rgba(245,158,11,0.2)]"
        style={{
          background: "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)",
        }}
      >
        <div className="absolute top-0 right-0 -mt-12 -mr-12 h-64 w-64 rounded-full bg-[var(--canvas)]/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-16 -ml-16 h-48 w-48 rounded-full bg-[var(--canvas)]/10 blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3 bg-[var(--canvas)]/20 w-fit px-3 py-1.5 rounded-full backdrop-blur-md shadow-sm border border-white/10">
              <Sparkles className="h-3.5 w-3.5 text-white" />
              <span className="text-[10px] font-extrabold text-white uppercase tracking-widest drop-shadow-sm">
                {dateStr}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white mb-1.5 tracking-tight drop-shadow-md">
              {getGreeting()}
              {userName ? `, ${userName}` : ""}!
            </h1>
            <p className="text-sm font-medium text-white drop-shadow-sm">
              Here&apos;s how <strong className="font-extrabold text-white">{restaurantName}</strong> is performing today.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setTab("orders")}
              className="flex items-center gap-2 rounded-xl bg-[var(--canvas)]/20 backdrop-blur-md px-5 py-3 text-[13px] font-bold text-white hover:bg-[var(--canvas)]/30 transition-colors active:scale-95 border border-white/20 shadow-sm"
            >
              <Eye className="h-4 w-4" />
              View Orders
            </button>
            <button
              onClick={() => setTab("menu")}
              className="flex items-center gap-2 rounded-xl bg-[var(--canvas)] px-5 py-3 text-[13px] font-bold text-[var(--accent-text)] hover:bg-[var(--canvas-sub)] transition-colors active:scale-95 shadow-md hover:shadow-lg"
            >
              <UtensilsCrossed className="h-4 w-4" />
              Manage Menu
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Attention banner — pending orders ──────────────────── */}
      <AnimatePresence>
        {pendingCount > 0 && (
          <motion.button
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onClick={() => setTab("orders")}
            className="flex items-center gap-3 w-full rounded-xl bg-[var(--accent-muted)] border border-[var(--accent-border)] p-4 text-left hover:bg-[var(--surface)] transition-colors group cursor-pointer"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-muted)]">
              <AlertTriangle className="h-5 w-5 text-[var(--accent)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-[var(--accent-text)]">
                {pendingCount} order{pendingCount > 1 ? "s" : ""} waiting for
                action
              </p>
              <p className="text-[11px] text-[var(--accent)]">
                Click to review and accept pending orders
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-[var(--text-3)] group-hover:text-[var(--accent)] group-hover:translate-x-0.5 transition-all shrink-0" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Stat cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
          >
            <StatCard {...s} />
          </motion.div>
        ))}
      </div>

      {/* ── Order Pipeline ───────────────────────────────────── */}
      {todayOrders.length > 0 && statusDistribution.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl bg-[var(--canvas)]/90 ring-1 ring-[var(--border)] p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[14px] font-bold text-[var(--text-1)]">
                Order Pipeline
              </h3>
              <p className="text-[11px] text-[var(--text-3)] mt-0.5">
                Today&apos;s order status breakdown
              </p>
            </div>
            <span className="text-[12px] font-semibold text-[var(--text-2)]">
              {todayOrders.length} total
            </span>
          </div>

          <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
            {statusDistribution.map((s) => (
              <motion.div
                key={s.status}
                initial={{ width: 0 }}
                animate={{ width: `${s.percent}%` }}
                transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
                className="rounded-full first:rounded-l-full last:rounded-r-full"
                style={{ background: s.color, minWidth: s.percent > 0 ? 8 : 0 }}
                title={`${s.label}: ${s.count}`}
              />
            ))}
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3">
            {statusDistribution.map((s) => (
              <span
                key={s.status}
                className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-2)]"
              >
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ background: s.color }}
                />
                {s.label}:{" "}
                <span className="font-bold text-[var(--text-2)]">{s.count}</span>
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Body grid ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Revenue chart area — 3 cols */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="lg:col-span-3 rounded-2xl bg-[var(--canvas)]/90 ring-1 ring-[var(--border)] p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-[15px] font-bold text-[var(--text-1)]">
                Revenue Trend
              </h3>
              <p className="text-[11px] text-[var(--text-2)] mt-0.5">
                This week&apos;s performance
              </p>
            </div>
            <span className="flex items-center gap-1.5 rounded-lg bg-[var(--accent-muted)] px-3 py-1.5 text-[12px] font-bold text-[var(--accent-text)]">
              <TrendingUp className="h-3 w-3" />
              {formatPrice(todayRevenue, cur)}
            </span>
          </div>

          <div className="flex items-end justify-between gap-2 h-40 mb-3">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => {
              const heights = [40, 60, 45, 75, 65, 85, 30];
              const isToday = i === new Date().getDay() - 1;
              return (
                <div
                  key={day}
                  className="flex-1 flex flex-col items-center gap-2"
                >
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${heights[i]}%` }}
                    transition={{
                      delay: 0.3 + i * 0.06,
                      duration: 0.4,
                      ease: "easeOut",
                    }}
                    className={`w-full rounded-md transition-colors ${
                      isToday ? "bg-[var(--accent)]" : "bg-[var(--surface)] hover:bg-[var(--surface-alt)]"
                    }`}
                  />
                  <span
                    className={`text-[10px] font-semibold ${isToday ? "text-[var(--accent)]" : "text-[var(--text-3)]"}`}
                  >
                    {day}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-[var(--text-3)] text-center">
            Estimated weekly pattern · Real analytics coming soon
          </p>
        </motion.div>

        {/* Activity timeline — 2 cols */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 rounded-2xl bg-[var(--canvas)]/90 ring-1 ring-[var(--border)] p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-[15px] font-bold text-[var(--text-1)]">Activity</h3>
            <button
              onClick={() => setTab("orders")}
              className="text-[12px] font-semibold text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
            >
              View all
            </button>
          </div>

          {recentOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-[var(--text-3)]">
              <Activity className="h-8 w-8 mb-2" />
              <p className="text-sm">No orders yet</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {recentOrders.map((order, i) => {
                const color = STATUS_COLOR[order.status] ?? "#9CA3AF";
                return (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, x: 6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.14 }}
                    className="flex items-start gap-3 group"
                  >
                    <div className="flex flex-col items-center pt-1">
                      <div
                        className="h-2.5 w-2.5 rounded-full ring-2 ring-[var(--canvas)]"
                        style={{ background: color }}
                      />
                      {i < recentOrders.length - 1 && (
                        <div className="w-px flex-1 bg-[var(--surface)] mt-1" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[13px] font-semibold text-[var(--text-1)] group-hover:text-[var(--accent-text)] transition-colors truncate">
                          #{order.orderNo} ·{" "}
                          {order.status.charAt(0) +
                            order.status.slice(1).toLowerCase()}
                        </p>
                        <span className="shrink-0 text-[10px] text-[var(--text-3)]">
                          {timeAgo(order.createdAt)}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--text-3)] mt-0.5 truncate">
                        {order.tableNo ? `Table ${order.tableNo} · ` : ""}{formatPrice(order.total ?? 0, cur)} ·{" "}
                        {order.items?.length ?? 0} items
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Quick Actions ─────────────────────────────────────── */}
      <div>
        <h3 className="text-[14px] font-bold text-[var(--text-1)] mb-3">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            {
              icon: ClipboardList,
              label: "Live Orders",
              tab: "orders" as DashTab,
              accent: "#F59E0B",
              badge: pendingCount || undefined,
            },
            {
              icon: UtensilsCrossed,
              label: "Edit Menu",
              tab: "menu" as DashTab,
              accent: "#10B981",
              badge: undefined,
            },
            {
              icon: UsersRound,
              label: "Staff",
              tab: "staff" as DashTab,
              accent: "#6366F1",
              badge: undefined,
            },
            {
              icon: QrCode,
              label: "QR Codes",
              tab: "qr" as DashTab,
              accent: "#3B82F6",
              badge: undefined,
            },
            {
              icon: Package,
              label: "Stock",
              tab: "stock" as DashTab,
              accent: "#F97316",
              badge: undefined,
            },
            {
              icon: Tag,
              label: "Offers",
              tab: "offers" as DashTab,
              accent: "#EC4899",
              badge: undefined,
            },
          ].map((action) => (
            <motion.button
              key={action.label}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
              whileHover={{ y: -3, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setTab(action.tab)}
              className="relative flex flex-col items-center gap-3 rounded-2xl bg-[var(--canvas)] border border-[var(--border)] p-4 hover:border-[var(--accent-border)] transition-colors active:scale-[0.97] group cursor-pointer"
            >
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-300 group-hover:scale-110 shadow-sm border border-black/5"
                style={{ background: `${action.accent}15` }}
              >
                <action.icon
                  className="h-5 w-5"
                  style={{ color: action.accent }}
                />
              </div>
              <span className="text-[12px] font-bold text-[var(--text-2)] group-hover:text-[var(--text-1)] transition-colors">
                {action.label}
              </span>
              {action.badge && (
                <span className="absolute top-2 right-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--accent)] text-[9px] font-bold text-white px-1 shadow-sm ring-2 ring-[var(--canvas)]">
                  {action.badge}
                </span>
              )}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Root page + keyboard shortcuts ───────────────────────────────── */
const SHORTCUTS: Record<string, DashTab> = {
  "1": "overview",
  "2": "orders",
  "3": "menu",
  "4": "staff",
  "5": "reports",
};

const DASHBOARD_TAB_KEY = "hh_dashboard_tab";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<DashTab>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem(DASHBOARD_TAB_KEY) as DashTab) ?? "overview";
    }
    return "overview";
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { orders, setRestaurantId } = useLiveOrders();
  const { restaurants, selectedRestaurant, selectRestaurant, loading: resLoading } = useRestaurant();
  const { user, isLoaded, userRole } = useAuth();
  const dashRouter = useRouter();
  const newOrderCount = orders.filter((o) => o.status === "PENDING").length;

  const handleSetActiveTab = (tab: DashTab) => {
    setActiveTab(tab);
    localStorage.setItem(DASHBOARD_TAB_KEY, tab);
  };

  const restaurantType = selectedRestaurant?.type ?? "";
  const featuresEnabled = selectedRestaurant?.featuresEnabled;
  const featuresDisabled = selectedRestaurant?.featuresDisabled;
  const featureTabs = useMemo(
    () => getFeatureTabsForType(restaurantType, { featuresEnabled, featuresDisabled }),
    [restaurantType, featuresEnabled, featuresDisabled],
  );

  /* Resolve active tab label and icon (including type-specific feature tabs) */
  const activeLabel = useMemo(() => {
    const navMatch = ALL_NAV.find((n) => n.id === activeTab);
    if (navMatch) return navMatch.label;
    const featureMatch = featureTabs.find((f) => f.id === activeTab);
    if (featureMatch) return featureMatch.label;
    return "Overview";
  }, [activeTab, featureTabs]);

  const ActiveIcon = useMemo(() => {
    const navMatch = ALL_NAV.find((n) => n.id === activeTab);
    if (navMatch) return navMatch.icon;
    const featureId = activeTab as FeatureTabId;
    if (FEATURE_ICONS[featureId]) return FEATURE_ICONS[featureId];
    return LayoutDashboard;
  }, [activeTab]);

  useEffect(() => {
    if (!selectedRestaurant && restaurants.length > 0) {
      selectRestaurant(restaurants[0].id);
    }
  }, [selectedRestaurant, restaurants, selectRestaurant]);

  useEffect(() => {
    const saved = localStorage.getItem(DASHBOARD_TAB_KEY) as DashTab | null;
    if (saved) setActiveTab(saved);
  }, []);

  useEffect(() => {
    setRestaurantId(selectedRestaurant?.id ?? null);
  }, [selectedRestaurant?.id, setRestaurantId]);

  /* Reset to overview if current tab is a feature tab not available for the new type */
  useEffect(() => {
    const featureId = activeTab as FeatureTabId;
    if (FEATURE_COMPONENTS[featureId] && restaurantType) {
      const available = getFeatureTabsForType(restaurantType, { featuresEnabled, featuresDisabled });
      if (!available.some((f) => f.id === featureId)) {
        handleSetActiveTab("overview");
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantType, activeTab, featuresEnabled, featuresDisabled]);

  /* Live clock — updates every minute */
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  /* Keyboard shortcuts for fast tab switching */
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey
      )
        return;

      const tab = SHORTCUTS[e.key];
      if (tab) {
        e.preventDefault();
        handleSetActiveTab(tab);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  /* Redirect OWNER with no restaurants to onboarding */
  useEffect(() => {
    if (userRole === "OWNER" && !resLoading && restaurants.length === 0) {
      dashRouter.replace("/onboarding");
    }
  }, [userRole, dashRouter, resLoading, restaurants.length]);

  // Route customers away once auth resolves — no full-screen gate
  if (isLoaded && userRole === "CUSTOMER") {
    return <CustomerDashboard />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--canvas-sub)] font-sans">
      {/* ── Desktop sidebar ───────────────────────────────────── */}
      <div className={`hidden lg:block shrink-0 h-full transition-all duration-300 ${sidebarCollapsed ? "w-14" : "w-56"}`}>
        <Sidebar
          active={activeTab}
          setActive={handleSetActiveTab}
          newOrderCount={newOrderCount}
          restaurantType={restaurantType}
          featuresEnabled={selectedRestaurant?.featuresEnabled}
          featuresDisabled={selectedRestaurant?.featuresDisabled}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        />
      </div>

      {/* ── Mobile sidebar overlay ────────────────────────────── */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileSidebarOpen(false)}
              className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            />
            <motion.div
              key="drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="fixed top-0 left-0 bottom-0 z-50 w-56 lg:hidden"
            >
              <Sidebar
                active={activeTab}
                setActive={handleSetActiveTab}
                newOrderCount={newOrderCount}
                onClose={() => setMobileSidebarOpen(false)}
                restaurantType={restaurantType}
                featuresEnabled={selectedRestaurant?.featuresEnabled}
                featuresDisabled={selectedRestaurant?.featuresDisabled}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Main area ─────────────────────────────────────────── */}
      <div className="relative flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-[var(--border)]/50 bg-[var(--canvas)]/70 backdrop-blur-xl shadow-sm px-5 lg:px-8 py-3.5 shrink-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="rounded-lg p-2 text-[var(--text-2)] hover:bg-[var(--surface)] transition-colors lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="hidden sm:flex items-center gap-1.5 text-[13px]">
              <span className="text-[var(--text-3)]">Dashboard</span>
              <ChevronRight className="h-3 w-3 text-[var(--text-3)]" />
              <span className="flex items-center gap-1.5 font-semibold text-[var(--text-1)]">
                <ActiveIcon className="h-3.5 w-3.5 text-[var(--accent)]" />
                {activeLabel}
              </span>
            </div>

            <div className="hidden md:flex items-center gap-2 ml-4 rounded-lg bg-[var(--canvas-sub)] px-3.5 py-2 text-[var(--text-3)] ring-1 ring-[var(--border)] focus-within:ring-[var(--accent)] focus-within:bg-[var(--canvas)] transition-colors">
              <Search className="h-3.5 w-3.5 shrink-0" />
              <input
                type="text"
                placeholder="Search..."
                className="w-36 bg-transparent text-[13px] outline-none placeholder:text-[var(--text-3)] text-[var(--text-1)]"
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-[var(--text-3)]">
              <Clock className="h-3 w-3" />
              <span className="font-medium tabular-nums">
                {currentTime.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            </div>

            <div className="hidden lg:block h-4 w-px bg-[var(--border)]" />

            <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-[var(--accent-muted)] px-2.5 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
              <span className="text-[11px] font-semibold text-[var(--accent-text)]">
                Live
              </span>
            </div>

            <NotificationBell onNavigateToOrders={() => handleSetActiveTab("orders")} />

            <ThemeToggle />

            <div className="hidden sm:block h-6 w-px bg-[var(--border)]" />

            <Link
              href="/profile"
              className="flex h-8 w-8 items-center justify-center rounded-full ring-2 ring-[var(--border)] hover:ring-[var(--accent)] transition-colors overflow-hidden bg-[var(--accent-muted)]"
            >
              {user?.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt="Profile"
                  className="h-8 w-8 object-cover"
                />
              ) : (
                <User className="h-4 w-4 text-[var(--accent)]" />
              )}
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-5 lg:px-8 pt-6 pb-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12, ease: "easeOut" }}
            >
              {activeTab === "overview" && (
                <OverviewTab
                  setTab={handleSetActiveTab}
                  userName={user?.user_metadata?.full_name ?? undefined}
                />
              )}
              {activeTab === "orders" && <LiveOrdersTab />}
              {activeTab === "billing" && selectedRestaurant && (
                <BillingTab restaurantId={selectedRestaurant.id} currency={selectedRestaurant.currency ?? "NPR"} />
              )}
              {activeTab === "chat" && <ChatTab />}
              {activeTab === "menu" && <MenuManagementTab />}
              {activeTab === "drinks" && <DrinksTab />}
              {activeTab === "staff" && <StaffManagementTab />}
              {activeTab === "shifts" && <ShiftsTab />}
              {activeTab === "qr" && <QRCodesTab />}
              {activeTab === "payment-qr" && <PaymentQRTab />}
              {activeTab === "payment-settings" && <PaymentSettingsTab />}
              {activeTab === "tax-charges" && <TaxChargesTab />}
              {activeTab === "stock" && <StockTab />}
              {activeTab === "offers" && <OffersTab />}
              {activeTab === "manual-billing" && (
                <ManualBillingTab
                  restaurantId={selectedRestaurant?.id ?? ""}
                  currency={selectedRestaurant?.currency ?? "NPR"}
                  restaurantName={selectedRestaurant?.name ?? ""}
                  restaurantAddress={selectedRestaurant?.address ?? ""}
                  restaurantPhone={selectedRestaurant?.phone ?? ""}
                  taxRate={selectedRestaurant?.taxRate ?? 13}
                  taxEnabled={selectedRestaurant?.taxEnabled ?? true}
                />
              )}
              {activeTab === "tables" && (
                <TablesTab restaurantId={selectedRestaurant?.id ?? ""} currency={selectedRestaurant?.currency ?? "NPR"} />
              )}
              {activeTab === "coupons" && <CouponManagementTab />}
              {activeTab === "rooms" && <RoomManagementTab />}
              {activeTab === "hero-slides" && <HeroSlidesManager />}
              {activeTab === "media" && <MediaTab />}
              {activeTab === "owner-control" && <OwnerControlPanel />}
              {activeTab === "reports" && <ReportsTab />}
              {activeTab === "stories" && selectedRestaurant && (
                <StoryManager
                  restaurantId={selectedRestaurant.id}
                  restaurantName={selectedRestaurant.name}
                  restaurantAvatar={selectedRestaurant.imageUrl ?? undefined}
                />
              )}
              {/* ── Type-specific feature tabs ──────────────────── */}
              {(() => {
                const featureId = activeTab as FeatureTabId;
                const FeatureComponent = FEATURE_COMPONENTS[featureId];
                if (!FeatureComponent) return null;

                // Show Coming Soon overlay for unimplemented features
                if (!LIVE_FEATURES.has(featureId)) {
                  const Icon = FEATURE_ICONS[featureId] ?? Sparkles;
                  return (
                    <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--surface)]">
                        <Icon className="h-8 w-8 text-[var(--text-3)]" />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-[var(--text-2)]">Coming Soon</p>
                        <p className="mt-1 text-sm text-[var(--text-3)] max-w-xs">
                          This feature is under development and will be available soon.
                        </p>
                      </div>
                      <span className="rounded-full bg-[var(--accent-muted)] px-3 py-1 text-xs font-bold text-[var(--accent-text)]">In Development</span>
                    </div>
                  );
                }

                // Cast to accept restaurantId — tabs that don't need it simply ignore the prop
                const Comp = FeatureComponent as React.ComponentType<{ restaurantId?: string }>;
                return <Comp restaurantId={selectedRestaurant?.id} />;
              })()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Global floating chat for owner/admin — only when not on chat tab */}
      {selectedRestaurant && user && activeTab !== "chat" && (
        <GlobalChatButton
          restaurantId={selectedRestaurant.id}
          staffRole={userRole ?? "OWNER"}
          staffName={user.user_metadata?.name ?? user.email ?? "Owner"}
        />
      )}
    </div>
  );
}
