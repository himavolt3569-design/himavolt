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
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import LiveOrdersTab from "@/components/dashboard/LiveOrdersTab";
import QRCodesTab from "@/components/dashboard/QRCodesTab";
import MenuManagementTab from "@/components/dashboard/MenuManagementTab";
import ReportsTab from "@/components/dashboard/ReportsTab";
import StaffManagementTab from "@/components/dashboard/StaffManagementTab";
import ChatTab from "@/components/dashboard/ChatTab";
import BillingTab from "@/components/billing/BillingTab";
import StoryManager from "@/components/stories/StoryManager";
import PaymentQRTab from "@/components/dashboard/PaymentQRTab";
import PaymentSettingsTab from "@/components/dashboard/PaymentSettingsTab";
import TaxChargesTab from "@/components/dashboard/TaxChargesTab";
import StockTab from "@/components/dashboard/StockTab";
import OffersTab from "@/components/dashboard/OffersTab";
import HeroSlidesManager from "@/components/dashboard/HeroSlidesManager";
import { useLiveOrders } from "@/context/LiveOrdersContext";
import { useRestaurant } from "@/context/RestaurantContext";
import {
  getTypeLabel,
  getFeatureTabsForType,
  type FeatureTabId,
} from "@/lib/restaurant-types";
import { formatPrice } from "@/lib/currency";

/* ── Type-specific feature tab imports ────────────────────────────── */
import QuickCounterTab from "@/components/dashboard/features/QuickCounterTab";
import ComboMealsTab from "@/components/dashboard/features/ComboMealsTab";
import RushHourTab from "@/components/dashboard/features/RushHourTab";
import TakeawayTab from "@/components/dashboard/features/TakeawayTab";
import RoomServiceTab from "@/components/dashboard/features/RoomServiceTab";
import MultiOutletTab from "@/components/dashboard/features/MultiOutletTab";
import EventCateringTab from "@/components/dashboard/features/EventCateringTab";
import GuestBillingTab from "@/components/dashboard/features/GuestBillingTab";
import BuffetManagerTab from "@/components/dashboard/features/BuffetManagerTab";
import PreOrdersTab from "@/components/dashboard/features/PreOrdersTab";
import CustomCakesTab from "@/components/dashboard/features/CustomCakesTab";
import DailySpecialsTab from "@/components/dashboard/features/DailySpecialsTab";
import DisplayCounterTab from "@/components/dashboard/features/DisplayCounterTab";
import DeliveryOpsTab from "@/components/dashboard/features/DeliveryOpsTab";
import MultiBrandTab from "@/components/dashboard/features/MultiBrandTab";
import DeliveryZonesTab from "@/components/dashboard/features/DeliveryZonesTab";
import PackageTrackingTab from "@/components/dashboard/features/PackageTrackingTab";
import HappyHoursTab from "@/components/dashboard/features/HappyHoursTab";
import TabManagementTab from "@/components/dashboard/features/TabManagementTab";
import CocktailMenuTab from "@/components/dashboard/features/CocktailMenuTab";
import LiveEventsTab from "@/components/dashboard/features/LiveEventsTab";
import LoyaltyRewardsTab from "@/components/dashboard/features/LoyaltyRewardsTab";
import WifiSeatingTab from "@/components/dashboard/features/WifiSeatingTab";
import SeasonalMenuTab from "@/components/dashboard/features/SeasonalMenuTab";
import BrunchModeTab from "@/components/dashboard/features/BrunchModeTab";
import TableReservationsTab from "@/components/dashboard/features/TableReservationsTab";
import WaitlistTab from "@/components/dashboard/features/WaitlistTab";
import PrivateDiningTab from "@/components/dashboard/features/PrivateDiningTab";
import WifiSettingsTab from "@/components/dashboard/features/WifiSettingsTab";
import DrinksTab from "@/components/dashboard/DrinksTab";
import GuestCheckInTab from "@/components/dashboard/GuestCheckInTab";

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
  | FeatureTabId;

/* ─── Navigation groups for sidebar ───────────────────────────────── */
const NAV_MAIN: {
  id: DashTab;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: string;
}[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "orders", label: "Live Orders", icon: ClipboardList, badge: "live" },
  { id: "billing", label: "Billing", icon: Receipt },
  { id: "chat", label: "Chats", icon: MessageCircle },
  { id: "offers" as DashTab, label: "Offers", icon: Tag },
];

const NAV_MANAGE: typeof NAV_MAIN = [
  { id: "menu", label: "Menu", icon: UtensilsCrossed },
  { id: "drinks" as DashTab, label: "Drinks", icon: Package },
  { id: "staff", label: "Staff", icon: UsersRound },
  { id: "qr", label: "QR Codes", icon: QrCode },
  { id: "payment-qr", label: "Payment QR", icon: Wallet },
  { id: "payment-settings", label: "Payment Settings", icon: Settings },
  { id: "tax-charges" as DashTab, label: "Tax & Charges", icon: Receipt },
  { id: "stock" as DashTab, label: "Stock", icon: Package },
  { id: "hero-slides" as DashTab, label: "Hero Slides", icon: ImageIcon },
];

const NAV_MORE: typeof NAV_MAIN = [
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "stories", label: "Stories", icon: Camera },
];

const ALL_NAV = [...NAV_MAIN, ...NAV_MANAGE, ...NAV_MORE];

/* ── Feature tab icon mapping ─────────────────────────────────────── */
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
};

/* ── Feature tab component mapping ────────────────────────────────── */
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
  "room-qr-codes": GuestCheckInTab, // Room QR tab uses same component (different section)
};

/* ─── Animated number counter ─────────────────────────────────────── */
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

/* ─── Restaurant Switcher ──────────────────────────────────────────── */
function RestaurantSwitcher({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const { restaurants, selectedRestaurant, selectRestaurant } = useRestaurant();
  const [open, setOpen] = useState(false);
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
        className="flex w-full items-center gap-3 rounded-xl bg-amber-50/60 p-3 transition-all duration-150 hover:bg-amber-100/50 ring-1 ring-amber-200/40 cursor-pointer"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50">
          <Store className="h-4 w-4 text-amber-500" />
        </div>
        <div className="min-w-0 flex-1 text-left">
          <p className="truncate text-[13px] font-semibold text-gray-800">
            {current.name}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <p className="text-[10px] text-gray-400">Active</p>
          </div>
        </div>
        <ChevronDown
          className={`h-3.5 w-3.5 text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl bg-white ring-1 ring-gray-200 overflow-hidden shadow-xl"
          >
            {/* Current */}
            <div className="p-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
                  <Store className="h-4.5 w-4.5 text-amber-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold text-gray-800">
                    {current.name}
                  </p>
                  <span className="text-[10px] text-gray-400">
                    {getTypeLabel(current.type)}
                  </span>
                </div>
                <span className="h-2 w-2 rounded-full bg-amber-400" />
              </div>
            </div>

            {/* Quick links */}
            <div className="px-1.5 py-1.5 border-b border-gray-100">
              {[
                { icon: UsersRound, label: "Manage Users" },
                { icon: Settings, label: "Settings" },
              ].map((item) => (
                <button
                  key={item.label}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-all"
                >
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                </button>
              ))}
            </div>

            {/* Other restaurants */}
            {otherRestaurants.length > 0 && (
              <div className="px-3 py-2.5 border-b border-gray-100">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                  Switch to
                </p>
                <div className="space-y-1">
                  {otherRestaurants.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => handleSwitch(r.id)}
                      className="flex w-full items-center gap-3 rounded-lg p-2 hover:bg-gray-50 transition-all"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100">
                        <Store className="h-3.5 w-3.5 text-gray-500" />
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <p className="truncate text-[12px] font-semibold text-gray-700">
                          {r.name}
                        </p>
                        {r.address && (
                          <span className="flex items-center gap-0.5 text-[10px] text-gray-400 truncate">
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

            {/* Bottom actions */}
            <div className="flex items-center p-2 gap-2">
              <Link
                href="/manage-restaurants"
                onClick={() => {
                  setOpen(false);
                  onNavigate?.();
                }}
                className="flex-1 text-center text-[12px] font-semibold text-amber-600 hover:text-amber-500 transition-colors py-2 rounded-lg hover:bg-amber-50"
              >
                Manage All
              </Link>
              <button
                onClick={() => {
                  setOpen(false);
                  onNavigate?.();
                  router.push("/manage-restaurants");
                }}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-amber-500 py-2 text-[12px] font-bold text-white hover:bg-amber-400 transition-all active:scale-[0.97]"
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

/* ─── Sidebar ──────────────────────────────────────────────────────── */
/* Shortcut key lookup for sidebar hints */
const SHORTCUT_KEYS: Partial<Record<DashTab, string>> = {
  overview: "1",
  orders: "2",
  menu: "3",
  staff: "4",
  reports: "5",
};

function NavSection({
  label,
  items,
  active,
  setActive,
  newOrderCount,
  onClose,
}: {
  label: string;
  items: typeof NAV_MAIN;
  active: DashTab;
  setActive: (t: DashTab) => void;
  newOrderCount: number;
  onClose?: () => void;
}) {
  return (
    <div className="mb-3">
      <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">
        {label}
      </p>
      <div className="space-y-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          const shortcut = SHORTCUT_KEYS[item.id];
          return (
            <button
              key={item.id}
              onClick={() => {
                setActive(item.id);
                onClose?.();
              }}
              className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-all duration-300 cursor-pointer overflow-hidden ${
                isActive
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-[0_4px_14px_0_rgba(245,158,11,0.39)] ring-1 ring-amber-400/50"
                  : "text-gray-600 hover:bg-gray-100/80 hover:text-gray-900"
              }`}
            >
              <Icon
                className={`h-4 w-4 shrink-0 transition-colors ${isActive ? "text-white" : "text-gray-400 group-hover:text-amber-500"}`}
              />
              <span className="flex-1 text-left tracking-wide">{item.label}</span>

              {/* Keyboard shortcut hint */}
              {shortcut && !item.badge && (
                <span className={`hidden lg:flex h-5 w-5 items-center justify-center rounded text-[9px] font-bold transition-all duration-300 ${isActive ? "bg-white/20 text-white" : "bg-gray-100 text-gray-400 opacity-0 group-hover:opacity-100"}`}>
                  {shortcut}
                </span>
              )}

              {item.badge === "live" && newOrderCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-md bg-rose-50 px-1.5 text-[10px] font-bold text-rose-500 ring-1 ring-rose-100">
                  {newOrderCount}
                </span>
              )}
              {item.badge === "live" && newOrderCount === 0 && (
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Sidebar({
  active,
  setActive,
  newOrderCount,
  onClose,
  restaurantType,
}: {
  active: DashTab;
  setActive: (t: DashTab) => void;
  newOrderCount: number;
  onClose?: () => void;
  restaurantType?: string;
}) {
  /* Build dynamic feature nav items from restaurant type */
  const featureNavItems = useMemo(() => {
    if (!restaurantType) return [];
    const features = getFeatureTabsForType(restaurantType);
    return features.map((f) => ({
      id: f.id as DashTab,
      label: f.label,
      icon: FEATURE_ICONS[f.id] ?? Sparkles,
    }));
  }, [restaurantType]);

  const typeLabel = restaurantType ? getTypeLabel(restaurantType) : "";

  return (
    <aside className="flex h-full w-full flex-col bg-white/60 backdrop-blur-3xl border-r border-gray-200/50 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 pt-6 pb-5">
        <Link href="/" className="group flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 shadow-sm">
            <Mountain className="h-4 w-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-[17px] font-bold tracking-tight text-gray-900">
            Hima<span className="text-amber-500">Volt</span>
          </span>
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-gray-100 transition-colors lg:hidden text-gray-500"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Restaurant switcher */}
      <RestaurantSwitcher onNavigate={onClose} />

      {/* Navigation sections */}
      <nav className="flex-1 overflow-y-auto px-3 pb-2 scrollbar-hide">
        <NavSection
          label="Main"
          items={NAV_MAIN}
          active={active}
          setActive={setActive}
          newOrderCount={newOrderCount}
          onClose={onClose}
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
          />
        )}

        <NavSection
          label="Manage"
          items={NAV_MANAGE}
          active={active}
          setActive={setActive}
          newOrderCount={newOrderCount}
          onClose={onClose}
        />
        <NavSection
          label="More"
          items={NAV_MORE}
          active={active}
          setActive={setActive}
          newOrderCount={newOrderCount}
          onClose={onClose}
        />
      </nav>

      {/* Bottom spacing */}
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
      className="relative rounded-3xl bg-white/70 backdrop-blur-md border border-gray-100/50 p-6 cursor-default overflow-hidden group shadow-[0_4px_24px_-4px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)] transition-all"
    >
      {/* Subtle gradient glow */}
      <div
        className="absolute -top-12 -right-12 h-32 w-32 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-500 blur-3xl"
        style={{ background: accent }}
      />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-[12px] font-bold text-gray-500 mb-1.5 uppercase tracking-wide">
            {label}
          </p>
          <p className="text-3xl font-black text-gray-900 tracking-tight leading-none mt-2">
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
          <p className="text-[11px] font-bold text-gray-400 mt-2.5 bg-gray-50/80 w-fit px-2 py-1 rounded-md">{sub}</p>
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
      value: current?.rating ? `${current.rating} ★` : "N/A",
      numericValue: current?.rating
        ? parseFloat(String(current.rating))
        : undefined,
      suffix: current?.rating ? " ★" : "",
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
        {/* Decorative abstract shapes */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 h-64 w-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-16 -ml-16 h-48 w-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3 bg-white/20 w-fit px-3 py-1.5 rounded-full backdrop-blur-md shadow-sm border border-white/10">
              <Sparkles className="h-3.5 w-3.5 text-white" />
              <span className="text-[10px] font-extrabold text-white uppercase tracking-widest drop-shadow-sm">
                {dateStr}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white mb-1.5 tracking-tight drop-shadow-md">
              {getGreeting()}
              {userName ? `, ${userName}` : ""}!
            </h1>
            <p className="text-sm font-medium text-amber-50 drop-shadow-sm">
              Here&apos;s how <strong className="font-extrabold text-white">{restaurantName}</strong> is performing today.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setTab("orders")}
              className="flex items-center gap-2 rounded-xl bg-white/20 backdrop-blur-md px-5 py-3 text-[13px] font-bold text-white hover:bg-white/30 transition-all active:scale-95 border border-white/20 shadow-sm"
            >
              <Eye className="h-4 w-4" />
              View Orders
            </button>
            <button
              onClick={() => setTab("menu")}
              className="flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-[13px] font-bold text-amber-600 hover:bg-gray-50 transition-all active:scale-95 shadow-md hover:shadow-lg"
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
            className="flex items-center gap-3 w-full rounded-xl bg-rose-50 border border-rose-100 p-4 text-left hover:bg-rose-100/60 transition-all group cursor-pointer"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-100">
              <AlertTriangle className="h-5 w-5 text-rose-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-rose-700">
                {pendingCount} order{pendingCount > 1 ? "s" : ""} waiting for
                action
              </p>
              <p className="text-[11px] text-rose-500">
                Click to review and accept pending orders
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-rose-300 group-hover:text-rose-500 group-hover:translate-x-0.5 transition-all shrink-0" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Stat cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
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
          className="rounded-2xl bg-white/90 ring-1 ring-gray-100/80 p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[14px] font-bold text-gray-900">
                Order Pipeline
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Today&apos;s order status breakdown
              </p>
            </div>
            <span className="text-[12px] font-semibold text-gray-500">
              {todayOrders.length} total
            </span>
          </div>

          {/* Status bar */}
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

          {/* Legend */}
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3">
            {statusDistribution.map((s) => (
              <span
                key={s.status}
                className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500"
              >
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ background: s.color }}
                />
                {s.label}:{" "}
                <span className="font-bold text-gray-700">{s.count}</span>
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
          className="lg:col-span-3 rounded-2xl bg-white/90 ring-1 ring-gray-100/80 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-[15px] font-bold text-black">
                Revenue Trend
              </h3>
              <p className="text-[11px] text-gray-500 mt-0.5">
                This week&apos;s performance
              </p>
            </div>
            <span className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-[12px] font-bold text-emerald-600">
              <TrendingUp className="h-3 w-3" />
              {formatPrice(todayRevenue, cur)}
            </span>
          </div>

          {/* Bar chart */}
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
                      isToday ? "bg-amber-400" : "bg-gray-100 hover:bg-gray-200"
                    }`}
                  />
                  <span
                    className={`text-[10px] font-semibold ${isToday ? "text-amber-500" : "text-gray-400"}`}
                  >
                    {day}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-gray-300 text-center">
            Estimated weekly pattern · Real analytics coming soon
          </p>
        </motion.div>

        {/* Activity timeline — 2 cols */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 rounded-2xl bg-white/90 ring-1 ring-gray-100/80 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-[15px] font-bold text-black">Activity</h3>
            <button
              onClick={() => setTab("orders")}
              className="text-[12px] font-semibold text-amber-500 hover:text-amber-600 transition-colors"
            >
              View all
            </button>
          </div>

          {recentOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-300">
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
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.35 + i * 0.04 }}
                    className="flex items-start gap-3 group"
                  >
                    {/* Timeline dot */}
                    <div className="flex flex-col items-center pt-1">
                      <div
                        className="h-2.5 w-2.5 rounded-full ring-2 ring-white"
                        style={{ background: color }}
                      />
                      {i < recentOrders.length - 1 && (
                        <div className="w-px flex-1 bg-gray-100 mt-1" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[13px] font-semibold text-black group-hover:text-amber-600 transition-colors truncate">
                          #{order.orderNo} ·{" "}
                          {order.status.charAt(0) +
                            order.status.slice(1).toLowerCase()}
                        </p>
                        <span className="shrink-0 text-[10px] text-gray-400">
                          {timeAgo(order.createdAt)}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5 truncate">
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
        <h3 className="text-[14px] font-bold text-gray-900 mb-3">
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
          ].map((action, i) => (
            <motion.button
              key={action.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 + i * 0.04 }}
              whileHover={{ y: -4, scale: 1.02 }}
              onClick={() => setTab(action.tab)}
              className="relative flex flex-col items-center gap-3 rounded-2xl bg-white/70 backdrop-blur-md border border-gray-100/50 p-4 hover:border-amber-200 transition-all active:scale-[0.97] group cursor-pointer shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_-4px_rgba(245,158,11,0.15)]"
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
              <span className="text-[12px] font-bold text-gray-500 group-hover:text-gray-900 transition-colors">
                {action.label}
              </span>
              {action.badge && (
                <span className="absolute top-2 right-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white px-1 shadow-sm ring-2 ring-white">
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

export default function DashboardPage() {
  const [isHydrated, setIsHydrated] = useState(false);
  const [activeTab, setActiveTab] = useState<DashTab>("overview");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { orders, setRestaurantId } = useLiveOrders();
  const { restaurants, selectedRestaurant, selectRestaurant, loading: resLoading } = useRestaurant();
  const { user, isLoaded, userRole } = useAuth();
  const dashRouter = useRouter();
  const newOrderCount = orders.filter((o) => o.status === "PENDING").length;

  const restaurantType = selectedRestaurant?.type ?? "";
  const featureTabs = useMemo(
    () => getFeatureTabsForType(restaurantType),
    [restaurantType],
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
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    setRestaurantId(selectedRestaurant?.id ?? null);
  }, [selectedRestaurant?.id, setRestaurantId]);

  /* Reset to overview if current tab is a feature tab not available for the new type */
  useEffect(() => {
    const featureId = activeTab as FeatureTabId;
    if (FEATURE_COMPONENTS[featureId] && restaurantType) {
      const available = getFeatureTabsForType(restaurantType);
      if (!available.some((f) => f.id === featureId)) {
        setActiveTab("overview");
      }
    }
  }, [restaurantType, activeTab]);

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
        setActiveTab(tab);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  /* Customers go to their orders page — dashboard is for OWNER/ADMIN only */
  useEffect(() => {
    if (userRole === "CUSTOMER") {
      dashRouter.replace("/orders");
    } else if (userRole === "OWNER" && !resLoading && restaurants.length === 0) {
      dashRouter.replace("/onboarding");
    }
  }, [userRole, dashRouter, resLoading, restaurants.length]);

  if (!isHydrated || !isLoaded || userRole === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <span className="text-sm font-medium text-amber-700/70">
          Loading dashboard...
        </span>
      </div>
    );
  }

  if (userRole === "CUSTOMER") {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <span className="text-sm font-medium text-amber-700/70">
          Redirecting...
        </span>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans">
      {/* ── Desktop sidebar ───────────────────────────────────── */}
      <div className="hidden lg:block w-56 shrink-0 h-full">
        <Sidebar
          active={activeTab}
          setActive={setActiveTab}
          newOrderCount={newOrderCount}
          restaurantType={restaurantType}
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
                setActive={setActiveTab}
                newOrderCount={newOrderCount}
                onClose={() => setMobileSidebarOpen(false)}
                restaurantType={restaurantType}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Main area ─────────────────────────────────────────── */}
      <div className="relative flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center justify-between border-b border-gray-200/50 bg-white/70 backdrop-blur-xl shadow-sm px-5 lg:px-8 py-3.5 shrink-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 transition-colors lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Breadcrumb with icon */}
            <div className="hidden sm:flex items-center gap-1.5 text-[13px]">
              <span className="text-gray-400">Dashboard</span>
              <ChevronRight className="h-3 w-3 text-gray-300" />
              <span className="flex items-center gap-1.5 font-semibold text-gray-800">
                <ActiveIcon className="h-3.5 w-3.5 text-amber-500" />
                {activeLabel}
              </span>
            </div>

            {/* Search */}
            <div className="hidden md:flex items-center gap-2 ml-4 rounded-lg bg-gray-50 px-3.5 py-2 text-gray-400 ring-1 ring-gray-100 focus-within:ring-amber-300 focus-within:bg-white transition-all">
              <Search className="h-3.5 w-3.5 shrink-0" />
              <input
                type="text"
                placeholder="Search..."
                className="w-36 bg-transparent text-[13px] outline-none placeholder:text-gray-400 text-gray-800"
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Live clock */}
            <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-gray-400">
              <Clock className="h-3 w-3" />
              <span className="font-medium tabular-nums">
                {currentTime.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            </div>

            <div className="hidden lg:block h-4 w-px bg-gray-200" />

            {/* Live pill */}
            <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-semibold text-emerald-700">
                Live
              </span>
            </div>

            {/* Bell */}
            <button className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100 transition-colors">
              <Bell className="h-4.5 w-4.5" />
              {newOrderCount > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500 text-[8px] font-bold text-white">
                  {newOrderCount}
                </span>
              )}
            </button>

            <div className="hidden sm:block h-6 w-px bg-gray-200" />

            {/* User */}
            <Link
              href="/profile"
              className="flex h-8 w-8 items-center justify-center rounded-full ring-2 ring-gray-100 hover:ring-amber-300 transition-all overflow-hidden bg-[#eaa94d]/10"
            >
              {user?.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt="Profile"
                  className="h-8 w-8 object-cover"
                />
              ) : (
                <User className="h-4 w-4 text-[#eaa94d]" />
              )}
            </Link>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto px-5 lg:px-8 pt-6 pb-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              {activeTab === "overview" && (
                <OverviewTab
                  setTab={setActiveTab}
                  userName={user?.user_metadata?.full_name ?? undefined}
                />
              )}
              {activeTab === "orders" && <LiveOrdersTab />}
              {activeTab === "billing" && selectedRestaurant && (
                <BillingTab restaurantId={selectedRestaurant.id} />
              )}
              {activeTab === "chat" && <ChatTab />}
              {activeTab === "menu" && <MenuManagementTab />}
              {activeTab === "drinks" && <DrinksTab />}
              {activeTab === "staff" && <StaffManagementTab />}
              {activeTab === "qr" && <QRCodesTab />}
              {activeTab === "payment-qr" && <PaymentQRTab />}
              {activeTab === "payment-settings" && <PaymentSettingsTab />}
              {activeTab === "tax-charges" && <TaxChargesTab />}
              {activeTab === "stock" && <StockTab />}
              {activeTab === "offers" && <OffersTab />}
              {activeTab === "hero-slides" && <HeroSlidesManager />}
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
                const FeatureComponent =
                  FEATURE_COMPONENTS[activeTab as FeatureTabId];
                if (!FeatureComponent) return null;
                return <FeatureComponent />;
              })()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
