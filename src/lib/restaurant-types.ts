export const RESTAURANT_TYPE_OPTIONS = [
  { value: "FAST_FOOD", label: "Fast Food", emoji: "🍟" },
  { value: "RESORT", label: "Resort", emoji: "🏖️" },
  { value: "HOTEL", label: "Hotel", emoji: "🏨" },
  { value: "BAKERY", label: "Bakery", emoji: "🧁" },
  { value: "CLOUD_KITCHEN", label: "Cloud Kitchen", emoji: "☁️" },
  { value: "BAR", label: "Bar", emoji: "🍸" },
  { value: "CAFE", label: "Cafe", emoji: "☕" },
  { value: "RESTAURANT", label: "Restaurant", emoji: "🍽️" },
] as const;

const TYPE_MAP = Object.fromEntries(
  RESTAURANT_TYPE_OPTIONS.map((t) => [t.value, t]),
);

export function getTypeLabel(value: string) {
  return TYPE_MAP[value]?.label ?? value;
}

export function getTypeEmoji(value: string) {
  return TYPE_MAP[value]?.emoji ?? "🍽️";
}

/* ── Type-specific feature highlights ──────────────────────────────── */
export interface TypeFeature {
  label: string;
  desc: string;
}

export const TYPE_FEATURES: Record<string, TypeFeature[]> = {
  FAST_FOOD: [
    { label: "Quick Counter", desc: "Fast order processing & pickup flow" },
    { label: "Combo Meals", desc: "Bundle items into value combos" },
    { label: "Rush Hour Mode", desc: "Queue management for peak times" },
    { label: "Takeaway Ready", desc: "Streamlined packaging & delivery" },
  ],
  RESORT: [
    { label: "Room Service", desc: "Deliver directly to guest rooms" },
    { label: "Multi-Outlet", desc: "Pool bar, restaurant, lounge menus" },
    { label: "Event Catering", desc: "Weddings, conferences, parties" },
    { label: "Guest Billing", desc: "Charge meals to room accounts" },
  ],
  HOTEL: [
    { label: "24/7 Room Service", desc: "Round-the-clock kitchen operations" },
    { label: "Buffet Manager", desc: "Buffet item tracking & rotation" },
    { label: "Conference Catering", desc: "Corporate events & meetings" },
    { label: "Guest Billing", desc: "Integrated room charge system" },
  ],
  BAKERY: [
    { label: "Pre-Orders", desc: "Schedule pickups for fresh goods" },
    { label: "Custom Cakes", desc: "Custom orders with specifications" },
    { label: "Daily Specials", desc: "Highlight fresh-from-oven items" },
    { label: "Display Counter", desc: "Showcase mode for walk-in customers" },
  ],
  CLOUD_KITCHEN: [
    { label: "Delivery Only", desc: "No dine-in, pure delivery operations" },
    { label: "Multi-Brand", desc: "Run multiple brands from one kitchen" },
    { label: "Delivery Zones", desc: "Set up delivery area coverage" },
    { label: "Package Tracking", desc: "Order packaging & dispatch flow" },
  ],
  BAR: [
    { label: "Happy Hours", desc: "Scheduled promotional drink pricing" },
    { label: "Tab Management", desc: "Open tabs & group billing" },
    { label: "Cocktail Menu", desc: "Recipe-based drink builder" },
    { label: "Live Events", desc: "Music nights & event listings" },
  ],
  CAFE: [
    { label: "Loyalty Rewards", desc: "Points & rewards for regulars" },
    { label: "WiFi & Seating", desc: "WiFi info & table availability" },
    { label: "Seasonal Menu", desc: "Rotating seasonal specials" },
    { label: "Brunch Mode", desc: "Weekend brunch & pastry focus" },
  ],
  RESTAURANT: [
    { label: "Table Reservations", desc: "Online booking & waitlist" },
    { label: "QR Dine-In", desc: "Scan & order from the table" },
    { label: "Waitlist", desc: "Queue management for walk-ins" },
    { label: "Private Dining", desc: "Special rooms & set menus" },
  ],
};

/* ── Feature Tab IDs (used in dashboard navigation) ───────────────── */
export type FeatureTabId =
  | "quick-counter"
  | "combo-meals"
  | "rush-hour"
  | "takeaway"
  | "room-service"
  | "multi-outlet"
  | "event-catering"
  | "guest-billing"
  | "buffet-manager"
  | "pre-orders"
  | "custom-cakes"
  | "daily-specials"
  | "display-counter"
  | "delivery-ops"
  | "multi-brand"
  | "delivery-zones"
  | "package-tracking"
  | "happy-hours"
  | "tab-management"
  | "cocktail-menu"
  | "live-events"
  | "loyalty-rewards"
  | "wifi-seating"
  | "seasonal-menu"
  | "brunch-mode"
  | "table-reservations"
  | "waitlist"
  | "private-dining";

export interface FeatureTabDef {
  id: FeatureTabId;
  label: string;
  desc: string;
  /** lucide icon name hint (actual icon mapped in dashboard) */
  iconHint: string;
}

/** Map each restaurant type to its exclusive feature tabs */
export const TYPE_FEATURE_TABS: Record<string, FeatureTabDef[]> = {
  FAST_FOOD: [
    { id: "quick-counter", label: "Quick Counter", desc: "Fast order processing & pickup flow", iconHint: "Zap" },
    { id: "combo-meals", label: "Combo Meals", desc: "Bundle items into value combos", iconHint: "Layers" },
    { id: "rush-hour", label: "Rush Hour", desc: "Queue management for peak times", iconHint: "Timer" },
    { id: "takeaway", label: "Takeaway", desc: "Streamlined packaging & delivery", iconHint: "PackageCheck" },
  ],
  RESORT: [
    { id: "room-service", label: "Room Service", desc: "Deliver directly to guest rooms", iconHint: "BedDouble" },
    { id: "multi-outlet", label: "Multi-Outlet", desc: "Pool bar, restaurant, lounge menus", iconHint: "LayoutGrid" },
    { id: "event-catering", label: "Event Catering", desc: "Weddings, conferences, parties", iconHint: "PartyPopper" },
    { id: "guest-billing", label: "Guest Billing", desc: "Charge meals to room accounts", iconHint: "CreditCard" },
  ],
  HOTEL: [
    { id: "room-service", label: "Room Service", desc: "Round-the-clock kitchen operations", iconHint: "BedDouble" },
    { id: "buffet-manager", label: "Buffet Manager", desc: "Buffet item tracking & rotation", iconHint: "ChefHat" },
    { id: "event-catering", label: "Conference Catering", desc: "Corporate events & meetings", iconHint: "PartyPopper" },
    { id: "guest-billing", label: "Guest Billing", desc: "Integrated room charge system", iconHint: "CreditCard" },
  ],
  BAKERY: [
    { id: "pre-orders", label: "Pre-Orders", desc: "Schedule pickups for fresh goods", iconHint: "CalendarClock" },
    { id: "custom-cakes", label: "Custom Cakes", desc: "Custom orders with specifications", iconHint: "Cake" },
    { id: "daily-specials", label: "Daily Specials", desc: "Highlight fresh-from-oven items", iconHint: "Sparkles" },
    { id: "display-counter", label: "Display Counter", desc: "Showcase mode for walk-in customers", iconHint: "Monitor" },
  ],
  CLOUD_KITCHEN: [
    { id: "delivery-ops", label: "Delivery Ops", desc: "No dine-in, pure delivery operations", iconHint: "Truck" },
    { id: "multi-brand", label: "Multi-Brand", desc: "Run multiple brands from one kitchen", iconHint: "Building2" },
    { id: "delivery-zones", label: "Delivery Zones", desc: "Set up delivery area coverage", iconHint: "MapPin" },
    { id: "package-tracking", label: "Package Tracking", desc: "Order packaging & dispatch flow", iconHint: "PackageSearch" },
  ],
  BAR: [
    { id: "happy-hours", label: "Happy Hours", desc: "Scheduled promotional drink pricing", iconHint: "Clock" },
    { id: "tab-management", label: "Tab Management", desc: "Open tabs & group billing", iconHint: "Receipt" },
    { id: "cocktail-menu", label: "Cocktail Menu", desc: "Recipe-based drink builder", iconHint: "Wine" },
    { id: "live-events", label: "Live Events", desc: "Music nights & event listings", iconHint: "Music" },
  ],
  CAFE: [
    { id: "loyalty-rewards", label: "Loyalty Rewards", desc: "Points & rewards for regulars", iconHint: "Award" },
    { id: "wifi-seating", label: "WiFi & Seating", desc: "WiFi info & table availability", iconHint: "Wifi" },
    { id: "seasonal-menu", label: "Seasonal Menu", desc: "Rotating seasonal specials", iconHint: "Leaf" },
    { id: "brunch-mode", label: "Brunch Mode", desc: "Weekend brunch & pastry focus", iconHint: "Sun" },
  ],
  RESTAURANT: [
    { id: "table-reservations", label: "Reservations", desc: "Online booking & waitlist", iconHint: "CalendarCheck" },
    { id: "waitlist", label: "Waitlist", desc: "Queue management for walk-ins", iconHint: "ListOrdered" },
    { id: "private-dining", label: "Private Dining", desc: "Special rooms & set menus", iconHint: "DoorOpen" },
  ],
};

/** Check if a feature tab is available for a given restaurant type */
export function isFeatureAvailable(restaurantType: string, featureId: FeatureTabId): boolean {
  const features = TYPE_FEATURE_TABS[restaurantType];
  if (!features) return false;
  return features.some((f) => f.id === featureId);
}

/** Get all feature tab IDs for a restaurant type */
export function getFeatureTabsForType(restaurantType: string): FeatureTabDef[] {
  return TYPE_FEATURE_TABS[restaurantType] ?? [];
}
