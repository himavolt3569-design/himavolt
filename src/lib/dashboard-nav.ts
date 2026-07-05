import {
  LayoutDashboard,
  ClipboardList,
  UtensilsCrossed,
  QrCode,
  BarChart3,
  Receipt,
  MessageCircle,
  Settings,
  Tag,
  Package,
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
  MapPin,
  Clock,
  Wine,
  Music,
  Award,
  Wifi,
  Leaf,
  Sun,
  CalendarCheck,
  ListOrdered,
  DoorOpen,
  Sparkles,
  UsersRound,
  Star,
} from "lucide-react";
import { type FeatureTabId } from "./restaurant-types";

export type DashTab =
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
  | "hotel-hub"
  | "tables"
  | "owner-control"
  | "shifts"
  | "feedback"
  | "printing"
  | "settings"
  | FeatureTabId;

export const NAV_MAIN: {
  id: DashTab;
  label: string;
  icon: any;
  badge?: string;
}[] = [
  { id: "overview", label: "Dashboard", icon: LayoutDashboard },
  { id: "orders", label: "Live Orders", icon: ClipboardList, badge: "live" },
  { id: "manual-billing", label: "Fast Payment", icon: Zap },
  { id: "billing", label: "Billing", icon: Receipt },
  { id: "tables", label: "Tables", icon: LayoutGrid },
  { id: "chat", label: "Chats", icon: MessageCircle },
];

export const HOTEL_HUB_NAV_ITEM = {
  id: "hotel-hub" as DashTab,
  label: "Hotel Hub",
  icon: BedDouble,
};

export const ROOM_ENABLED_TYPES = new Set(["HOTEL", "RESORT", "GUEST_HOUSE"]);

/**
 * Feature ids that have been folded into the consolidated Hotel Hub.
 * For hotel-type venues these are never shown as standalone nav items —
 * they live inside the Hub. `room-service` and `guest-billing` are NOT
 * here: they remain standalone food-ops features.
 */
export const HUB_FEATURE_IDS = new Set<FeatureTabId>([
  "rooms",
  "hotel-bookings",
  "hotel-qr",
  "room-qr-codes",
  "guest-checkin",
]);

// Catalog / day-to-day operations.
export const NAV_CATALOG: typeof NAV_MAIN = [
  { id: "menu", label: "Menu", icon: UtensilsCrossed },
  // Drinks were merged into Stock (Stock page → Drinks tab). The standalone
  // Drinks nav item was removed; /dashboard/drinks still deep-links there.
  { id: "stock", label: "Stock", icon: Package },
  { id: "offers", label: "Offers", icon: Tag },
  { id: "coupons", label: "Coupons", icon: Tag },
];

// Team management. Shifts now lives as a tab inside the Staff page (Team
// Directory · Attendance · Shifts), so it's no longer a separate nav item.
// The /dashboard/shifts route still resolves for any existing deep links.
export const NAV_PEOPLE: typeof NAV_MAIN = [
  { id: "staff", label: "Staff", icon: UsersRound },
];

// Everything else, including the consolidated Settings entry. Payment QR,
// payment settings, tax, printing, owner controls, hero slides and media now
// live as sections inside the Settings tab rather than top-level nav items.
export const NAV_MORE: typeof NAV_MAIN = [
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "feedback", label: "Feedback", icon: Star },
  { id: "settings", label: "Settings", icon: Settings },
];

export const ALL_NAV = [
  ...NAV_MAIN,
  ...NAV_CATALOG,
  ...NAV_PEOPLE,
  HOTEL_HUB_NAV_ITEM,
  ...NAV_MORE,
];

export const FEATURE_ICONS: Record<FeatureTabId, any> = {
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
  "hotel-hub": BedDouble,
  rooms: BedDouble,
};

// Features with a REAL backend. UI-only stubs (useState + mock data, nothing
// persisted) were pulled from this set on 2026-07-03 so nothing fake is
// clickable — they can return one by one as their backends get built:
// multi-outlet*, multi-brand* (*superseded by the multi-branch consolidated
// view), event-catering, buffet-manager, pre-orders, custom-cakes,
// delivery-ops, package-tracking, tab-management, cocktail-menu, live-events,
// seasonal-menu, brunch-mode, waitlist, private-dining.
export const LIVE_FEATURES = new Set<FeatureTabId>([
  "quick-counter",
  "combo-meals",
  "rush-hour",
  "takeaway",
  "room-service",
  "guest-billing",
  "daily-specials",
  "display-counter",
  "delivery-zones",
  "happy-hours",
  "loyalty-rewards",
  "wifi-seating",
  "table-reservations",
  "wifi-settings",
  "guest-checkin",
  "room-qr-codes",
  "hotel-bookings",
  "hotel-qr",
  "hotel-hub",
  "rooms",
]);

export const SHORTCUTS: Record<string, DashTab> = {
  "1": "overview",
  "2": "orders",
  "3": "menu",
  "4": "staff",
  "5": "reports",
};
