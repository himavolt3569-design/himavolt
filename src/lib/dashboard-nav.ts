import {
  LayoutDashboard,
  ClipboardList,
  UtensilsCrossed,
  QrCode,
  BarChart3,
  Receipt,
  MessageCircle,
  Settings,
  Wallet,
  Tag,
  Package,
  Image as ImageIcon,
  Crown,
  Camera,
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
  | FeatureTabId;

export const NAV_MAIN: {
  id: DashTab;
  label: string;
  icon: any;
  badge?: string;
}[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "orders", label: "Live Orders", icon: ClipboardList, badge: "live" },
  { id: "billing", label: "Billing", icon: Receipt },
  { id: "manual-billing", label: "Fast Billing", icon: Receipt },
  { id: "tables", label: "Tables", icon: LayoutGrid },
  { id: "offers", label: "Offers", icon: Tag },
  { id: "chat", label: "Chats", icon: MessageCircle },
];

export const HOTEL_HUB_NAV_ITEM = {
  id: "hotel-hub" as DashTab,
  label: "Hotel Hub",
  icon: BedDouble,
};

export const ROOM_ENABLED_TYPES = new Set(["HOTEL", "RESORT", "GUEST_HOUSE"]);

export const HUB_FEATURE_IDS = new Set<FeatureTabId>([
  "hotel-bookings",
  "hotel-qr",
  "room-qr-codes",
  "guest-checkin",
  "room-service",
  "guest-billing",
]);

export const NAV_MANAGE: typeof NAV_MAIN = [
  { id: "menu", label: "Menu", icon: UtensilsCrossed },
  { id: "staff", label: "Staff", icon: UsersRound },
  { id: "shifts", label: "Shifts", icon: Clock },
  { id: "stock", label: "Stock", icon: Package },
  { id: "qr", label: "QR Codes", icon: QrCode },
  { id: "tax-charges", label: "Tax & Charges", icon: Receipt },
  { id: "payment-settings", label: "Payment Settings", icon: Settings },
  { id: "payment-qr", label: "Payment QR", icon: Wallet },
  { id: "coupons", label: "Coupons", icon: Tag },
  { id: "drinks", label: "Drinks", icon: Package },
  { id: "hero-slides", label: "Hero Slides", icon: ImageIcon },
  { id: "owner-control", label: "Owner Control", icon: Crown },
];

export const NAV_MORE: typeof NAV_MAIN = [
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "media", label: "Media Library", icon: ImageIcon },
  { id: "stories", label: "Stories", icon: Camera },
];

export const ALL_NAV = [...NAV_MAIN, ...NAV_MANAGE, HOTEL_HUB_NAV_ITEM, ...NAV_MORE];

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
  rooms: BedDouble,
};

export const LIVE_FEATURES = new Set<FeatureTabId>([
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

export const SHORTCUTS: Record<string, DashTab> = {
  "1": "overview",
  "2": "orders",
  "3": "menu",
  "4": "staff",
  "5": "reports",
};
