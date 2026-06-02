export const RESTAURANT_TYPE_OPTIONS = [
  { value: "FAST_FOOD",    label: "Fast Food",     iconName: "Zap" },
  { value: "RESORT",       label: "Resort",         iconName: "Sun" },
  { value: "HOTEL",        label: "Hotel",          iconName: "Building2" },
  { value: "BAKERY",       label: "Bakery",         iconName: "Cake" },
  { value: "CLOUD_KITCHEN",label: "Cloud Kitchen",  iconName: "Cloud" },
  { value: "BAR",          label: "Bar",            iconName: "Wine" },
  { value: "CAFE",         label: "Cafe",           iconName: "Coffee" },
  { value: "RESTAURANT",   label: "Restaurant",     iconName: "UtensilsCrossed" },
  { value: "MO_MO_SHOP",   label: "Momo Shop",      iconName: "Utensils" },
  { value: "TANDOORI",     label: "Tandoori",       iconName: "Flame" },
  { value: "GUEST_HOUSE",  label: "Guest House",    iconName: "Home" },
  { value: "SWEETS",       label: "Sweets Shop",    iconName: "Candy" },
] as const;

const TYPE_MAP = Object.fromEntries(
  RESTAURANT_TYPE_OPTIONS.map((t) => [t.value, t]),
);

export function getTypeLabel(value: string) {
  return TYPE_MAP[value]?.label ?? value;
}

/** Returns the Lucide icon name string for a restaurant type. */
export function getTypeIconName(value: string): string {
  return TYPE_MAP[value]?.iconName ?? "UtensilsCrossed";
}

/** @deprecated Use getTypeIconName + RESTAURANT_TYPE_ICON_MAP instead */
export function getTypeEmoji(value: string): string {
  return getTypeIconName(value);
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
    { label: "Display Counter", desc: "Showcase items for walk-in customers" },
    { label: "WiFi", desc: "Share WiFi credentials with customers" },
  ],
  RESORT: [
    { label: "Room Service", desc: "Deliver directly to guest rooms" },
    { label: "Multi-Outlet", desc: "Pool bar, restaurant, lounge menus" },
    { label: "Event Catering", desc: "Weddings, conferences, parties" },
    { label: "Guest Billing", desc: "Charge meals to room accounts" },
    { label: "Guest Check-In", desc: "Record guest details & room assignment" },
    { label: "Display Counter", desc: "Showcase available items for guests" },
    { label: "WiFi", desc: "Share WiFi credentials with guests" },
  ],
  HOTEL: [
    { label: "24/7 Room Service", desc: "Round-the-clock kitchen operations" },
    { label: "Buffet Manager", desc: "Buffet item tracking & rotation" },
    { label: "Conference Catering", desc: "Corporate events & meetings" },
    { label: "Guest Billing", desc: "Integrated room charge system" },
    { label: "Guest Check-In", desc: "Record guest details & room assignment" },
    { label: "Display Counter", desc: "Showcase available items for guests" },
    { label: "WiFi", desc: "Share WiFi credentials with guests" },
  ],
  BAKERY: [
    { label: "Pre-Orders", desc: "Schedule pickups for fresh goods" },
    { label: "Custom Cakes", desc: "Custom orders with specifications" },
    { label: "Daily Specials", desc: "Highlight fresh-from-oven items" },
    { label: "Display Counter", desc: "Showcase mode for walk-in customers" },
    { label: "WiFi", desc: "Share WiFi credentials with customers" },
  ],
  CLOUD_KITCHEN: [
    { label: "Delivery Only", desc: "No dine-in, pure delivery operations" },
    { label: "Multi-Brand", desc: "Run multiple brands from one kitchen" },
    { label: "Delivery Zones", desc: "Set up delivery area coverage" },
    { label: "Package Tracking", desc: "Order packaging & dispatch flow" },
    { label: "Display Counter", desc: "Showcase available items online" },
  ],
  BAR: [
    { label: "Happy Hours", desc: "Scheduled promotional drink pricing" },
    { label: "Tab Management", desc: "Open tabs & group billing" },
    { label: "Cocktail Menu", desc: "Recipe-based drink builder" },
    { label: "Live Events", desc: "Music nights & event listings" },
    { label: "Display Counter", desc: "Showcase available drinks & snacks" },
    { label: "WiFi", desc: "Share WiFi credentials with customers" },
  ],
  CAFE: [
    { label: "Loyalty Rewards", desc: "Points & rewards for regulars" },
    { label: "WiFi & Seating", desc: "WiFi info & table availability" },
    { label: "Seasonal Menu", desc: "Rotating seasonal specials" },
    { label: "Brunch Mode", desc: "Weekend brunch & pastry focus" },
    { label: "Display Counter", desc: "Showcase pastries & drinks for customers" },
  ],
  RESTAURANT: [
    { label: "Table Reservations", desc: "Online booking & waitlist" },
    { label: "QR Dine-In", desc: "Scan & order from the table" },
    { label: "Waitlist", desc: "Queue management for walk-ins" },
    { label: "Private Dining", desc: "Special rooms & set menus" },
    { label: "Display Counter", desc: "Showcase today's specials for customers" },
    { label: "WiFi", desc: "Share WiFi credentials with diners" },
  ],
  MO_MO_SHOP: [
    { label: "Quick Counter", desc: "Fast counter service for momos" },
    { label: "Momo Varieties", desc: "Manage steam, fried, jhol & more" },
    { label: "Rush Hour Mode", desc: "Queue management for peak times" },
    { label: "Takeaway Ready", desc: "Streamlined packaging & carry-out" },
    { label: "Display Counter", desc: "Showcase available momo varieties" },
    { label: "WiFi", desc: "Share WiFi credentials with customers" },
  ],
  TANDOORI: [
    { label: "Live Counter", desc: "Showcase live tandoor station" },
    { label: "Pre-Orders", desc: "Accept advance orders for tandoori items" },
    { label: "Daily Specials", desc: "Highlight fresh tandoori specials" },
    { label: "Takeaway Ready", desc: "Packaging for carry-out orders" },
    { label: "WiFi", desc: "Share WiFi credentials with customers" },
  ],
  GUEST_HOUSE: [
    { label: "Guest Check-In", desc: "Record guest details & room assignment" },
    { label: "Room Service", desc: "Food & drinks delivered to rooms" },
    { label: "Guest Billing", desc: "Integrated room charge system" },
    { label: "Room QR Codes", desc: "Generate QR codes per room" },
    { label: "Display Counter", desc: "Showcase available items for guests" },
    { label: "WiFi", desc: "Share WiFi credentials with guests" },
  ],
  SWEETS: [
    { label: "Display Counter", desc: "Showcase sweets & confections for walk-ins" },
    { label: "Pre-Orders", desc: "Festival & bulk sweet orders in advance" },
    { label: "Custom Orders", desc: "Laddu, barfi & mithai boxes by specification" },
    { label: "Daily Specials", desc: "Highlight fresh-made sweets of the day" },
    { label: "Seasonal Menu", desc: "Festival specials — Dashain, Tihar & more" },
    { label: "Loyalty Rewards", desc: "Reward regulars with points & offers" },
    { label: "Takeaway Ready", desc: "Gift packaging & carry-out orders" },
    { label: "Quick Counter", desc: "Fast walk-in counter service" },
    { label: "WiFi", desc: "Share WiFi credentials with customers" },
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
  | "private-dining"
  | "guest-checkin"
  | "wifi-settings"
  | "room-qr-codes"
  | "hotel-bookings"
  | "hotel-qr"
  | "rooms";

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
    { id: "display-counter", label: "Display Counter", desc: "Showcase items for walk-in customers", iconHint: "Monitor" },
    { id: "wifi-settings", label: "WiFi", desc: "Share WiFi credentials with customers", iconHint: "Wifi" },
  ],
  RESORT: [
    { id: "rooms", label: "Rooms", desc: "Add, edit and manage rooms", iconHint: "BedDouble" },
    { id: "room-service", label: "Room Service", desc: "Deliver directly to guest rooms", iconHint: "BedDouble" },
    { id: "multi-outlet", label: "Multi-Outlet", desc: "Pool bar, restaurant, lounge menus", iconHint: "LayoutGrid" },
    { id: "event-catering", label: "Event Catering", desc: "Weddings, conferences, parties", iconHint: "PartyPopper" },
    { id: "guest-billing", label: "Guest Billing", desc: "Charge meals to room accounts", iconHint: "CreditCard" },
    { id: "guest-checkin", label: "Guest Check-In", desc: "Record guest details & room assignment", iconHint: "ClipboardList" },
    { id: "hotel-bookings", label: "Room Bookings", desc: "Manage online room reservations", iconHint: "CalendarCheck" },
    { id: "hotel-qr", label: "Hotel QR Code", desc: "QR code linking to full hotel booking page", iconHint: "QrCode" },
    { id: "room-qr-codes", label: "Room QR Codes", desc: "Generate QR codes per room", iconHint: "QrCode" },
    { id: "display-counter", label: "Display Counter", desc: "Showcase available items for guests", iconHint: "Monitor" },
    { id: "wifi-settings", label: "WiFi", desc: "Share WiFi credentials with guests", iconHint: "Wifi" },
  ],
  HOTEL: [
    { id: "rooms", label: "Rooms", desc: "Add, edit and manage rooms", iconHint: "BedDouble" },
    { id: "room-service", label: "Room Service", desc: "Round-the-clock kitchen operations", iconHint: "BedDouble" },
    { id: "buffet-manager", label: "Buffet Manager", desc: "Buffet item tracking & rotation", iconHint: "ChefHat" },
    { id: "event-catering", label: "Conference Catering", desc: "Corporate events & meetings", iconHint: "PartyPopper" },
    { id: "guest-billing", label: "Guest Billing", desc: "Integrated room charge system", iconHint: "CreditCard" },
    { id: "guest-checkin", label: "Guest Check-In", desc: "Record guest details & room assignment", iconHint: "ClipboardList" },
    { id: "hotel-bookings", label: "Room Bookings", desc: "Manage online room reservations", iconHint: "CalendarCheck" },
    { id: "hotel-qr", label: "Hotel QR Code", desc: "QR code linking to full hotel booking page", iconHint: "QrCode" },
    { id: "room-qr-codes", label: "Room QR Codes", desc: "Generate QR codes per room", iconHint: "QrCode" },
    { id: "display-counter", label: "Display Counter", desc: "Showcase available items for guests", iconHint: "Monitor" },
    { id: "wifi-settings", label: "WiFi", desc: "Share WiFi credentials with guests", iconHint: "Wifi" },
  ],
  BAKERY: [
    { id: "pre-orders", label: "Pre-Orders", desc: "Schedule pickups for fresh goods", iconHint: "CalendarClock" },
    { id: "custom-cakes", label: "Custom Cakes", desc: "Custom orders with specifications", iconHint: "Cake" },
    { id: "daily-specials", label: "Daily Specials", desc: "Highlight fresh-from-oven items", iconHint: "Sparkles" },
    { id: "display-counter", label: "Display Counter", desc: "Showcase mode for walk-in customers", iconHint: "Monitor" },
    { id: "wifi-settings", label: "WiFi", desc: "Share WiFi credentials with customers", iconHint: "Wifi" },
  ],
  CLOUD_KITCHEN: [
    { id: "delivery-ops", label: "Delivery Ops", desc: "No dine-in, pure delivery operations", iconHint: "Truck" },
    { id: "multi-brand", label: "Multi-Brand", desc: "Run multiple brands from one kitchen", iconHint: "Building2" },
    { id: "delivery-zones", label: "Delivery Zones", desc: "Set up delivery area coverage", iconHint: "MapPin" },
    { id: "package-tracking", label: "Package Tracking", desc: "Order packaging & dispatch flow", iconHint: "PackageSearch" },
    { id: "display-counter", label: "Display Counter", desc: "Showcase available items online", iconHint: "Monitor" },
  ],
  BAR: [
    { id: "happy-hours", label: "Happy Hours", desc: "Scheduled promotional drink pricing", iconHint: "Clock" },
    { id: "tab-management", label: "Tab Management", desc: "Open tabs & group billing", iconHint: "Receipt" },
    { id: "cocktail-menu", label: "Cocktail Menu", desc: "Recipe-based drink builder", iconHint: "Wine" },
    { id: "live-events", label: "Live Events", desc: "Music nights & event listings", iconHint: "Music" },
    { id: "display-counter", label: "Display Counter", desc: "Showcase available drinks & snacks", iconHint: "Monitor" },
    { id: "wifi-settings", label: "WiFi", desc: "Share WiFi credentials with customers", iconHint: "Wifi" },
  ],
  CAFE: [
    { id: "loyalty-rewards", label: "Loyalty Rewards", desc: "Points & rewards for regulars", iconHint: "Award" },
    { id: "wifi-seating", label: "WiFi & Seating", desc: "WiFi info & table availability", iconHint: "Wifi" },
    { id: "seasonal-menu", label: "Seasonal Menu", desc: "Rotating seasonal specials", iconHint: "Leaf" },
    { id: "brunch-mode", label: "Brunch Mode", desc: "Weekend brunch & pastry focus", iconHint: "Sun" },
    { id: "display-counter", label: "Display Counter", desc: "Showcase pastries & drinks for customers", iconHint: "Monitor" },
  ],
  RESTAURANT: [
    { id: "table-reservations", label: "Reservations", desc: "Online booking & waitlist", iconHint: "CalendarCheck" },
    { id: "waitlist", label: "Waitlist", desc: "Queue management for walk-ins", iconHint: "ListOrdered" },
    { id: "private-dining", label: "Private Dining", desc: "Special rooms & set menus", iconHint: "DoorOpen" },
    { id: "display-counter", label: "Display Counter", desc: "Showcase today's specials for customers", iconHint: "Monitor" },
    { id: "wifi-settings", label: "WiFi", desc: "Share WiFi credentials with diners", iconHint: "Wifi" },
  ],
  MO_MO_SHOP: [
    { id: "quick-counter", label: "Quick Counter", desc: "Fast counter service for momos", iconHint: "Zap" },
    { id: "rush-hour", label: "Rush Hour", desc: "Queue management for peak times", iconHint: "Timer" },
    { id: "daily-specials", label: "Daily Specials", desc: "Highlight today's momo varieties", iconHint: "Sparkles" },
    { id: "takeaway", label: "Takeaway", desc: "Streamlined packaging & carry-out", iconHint: "PackageCheck" },
    { id: "display-counter", label: "Display Counter", desc: "Showcase available momo varieties", iconHint: "Monitor" },
    { id: "wifi-settings", label: "WiFi", desc: "Share WiFi credentials with customers", iconHint: "Wifi" },
  ],
  TANDOORI: [
    { id: "display-counter", label: "Live Counter", desc: "Showcase live tandoor station", iconHint: "Monitor" },
    { id: "pre-orders", label: "Pre-Orders", desc: "Accept advance orders for tandoori items", iconHint: "CalendarClock" },
    { id: "daily-specials", label: "Daily Specials", desc: "Highlight fresh tandoori specials", iconHint: "Sparkles" },
    { id: "takeaway", label: "Takeaway", desc: "Packaging for carry-out orders", iconHint: "PackageCheck" },
    { id: "wifi-settings", label: "WiFi", desc: "Share WiFi credentials with customers", iconHint: "Wifi" },
  ],
  GUEST_HOUSE: [
    { id: "rooms", label: "Rooms", desc: "Add, edit and manage rooms", iconHint: "BedDouble" },
    { id: "guest-checkin", label: "Guest Check-In", desc: "Record guest details & room assignment", iconHint: "ClipboardList" },
    { id: "room-service", label: "Room Service", desc: "Food & drinks delivered to rooms", iconHint: "BedDouble" },
    { id: "guest-billing", label: "Guest Billing", desc: "Integrated room charge system", iconHint: "CreditCard" },
    { id: "hotel-bookings", label: "Room Bookings", desc: "Manage online room reservations", iconHint: "CalendarCheck" },
    { id: "hotel-qr", label: "Hotel QR Code", desc: "QR code linking to full booking page", iconHint: "QrCode" },
    { id: "room-qr-codes", label: "Room QR Codes", desc: "Generate QR codes per room", iconHint: "QrCode" },
    { id: "display-counter", label: "Display Counter", desc: "Showcase available items for guests", iconHint: "Monitor" },
    { id: "wifi-settings", label: "WiFi", desc: "Share WiFi credentials with guests", iconHint: "Wifi" },
  ],
  SWEETS: [
    { id: "display-counter", label: "Display Counter", desc: "Showcase sweets & confections for walk-ins", iconHint: "Monitor" },
    { id: "pre-orders", label: "Pre-Orders", desc: "Festival & bulk sweet orders in advance", iconHint: "CalendarClock" },
    { id: "custom-cakes", label: "Custom Orders", desc: "Mithai boxes & special orders by specification", iconHint: "Candy" },
    { id: "daily-specials", label: "Daily Specials", desc: "Highlight fresh-made sweets of the day", iconHint: "Sparkles" },
    { id: "seasonal-menu", label: "Seasonal Menu", desc: "Festival specials — Dashain, Tihar & more", iconHint: "Leaf" },
    { id: "loyalty-rewards", label: "Loyalty Rewards", desc: "Reward regulars with points & offers", iconHint: "Award" },
    { id: "takeaway", label: "Takeaway & Gift Boxes", desc: "Gift packaging & carry-out orders", iconHint: "PackageCheck" },
    { id: "quick-counter", label: "Quick Counter", desc: "Fast walk-in counter service", iconHint: "Zap" },
    { id: "wifi-settings", label: "WiFi", desc: "Share WiFi credentials with customers", iconHint: "Wifi" },
  ],
};

/**
 * Per-restaurant admin override of the type-based feature map.
 * `featuresDisabled` wins when a feature id appears in both lists.
 */
export interface FeatureOverride {
  featuresEnabled?: string[];
  featuresDisabled?: string[];
}

/** Flat catalog of every feature def across every type — used for force-enable lookups. */
const FEATURE_CATALOG: Map<string, FeatureTabDef> = (() => {
  const map = new Map<string, FeatureTabDef>();
  Object.values(TYPE_FEATURE_TABS).forEach((list) =>
    list.forEach((f) => {
      if (!map.has(f.id)) map.set(f.id, f);
    }),
  );
  return map;
})();

/** Check if a feature tab is available for a given restaurant type, applying optional admin overrides. */
export function isFeatureAvailable(
  restaurantType: string,
  featureId: FeatureTabId,
  overrides?: FeatureOverride,
): boolean {
  if (overrides?.featuresDisabled?.includes(featureId)) return false;
  if (overrides?.featuresEnabled?.includes(featureId)) return true;
  const features = TYPE_FEATURE_TABS[restaurantType];
  if (!features) return false;
  return features.some((f) => f.id === featureId);
}

/** Get the effective feature tab list for a restaurant: type defaults minus force-disabled, plus force-enabled. */
export function getFeatureTabsForType(
  restaurantType: string,
  overrides?: FeatureOverride,
): FeatureTabDef[] {
  const base = TYPE_FEATURE_TABS[restaurantType] ?? [];
  const disabled = new Set<string>(overrides?.featuresDisabled ?? []);
  const filtered = base.filter((f) => !disabled.has(f.id));
  const existingIds = new Set<string>(filtered.map((f) => f.id));
  const extras = (overrides?.featuresEnabled ?? [])
    .filter((id) => !disabled.has(id) && !existingIds.has(id))
    .map((id) => FEATURE_CATALOG.get(id))
    .filter((f): f is FeatureTabDef => !!f);
  return [...filtered, ...extras];
}

export const ALL_FEATURE_IDS: FeatureTabId[] = Array.from(FEATURE_CATALOG.keys()) as FeatureTabId[];

export function isValidFeatureId(id: string): id is FeatureTabId {
  return FEATURE_CATALOG.has(id);
}
