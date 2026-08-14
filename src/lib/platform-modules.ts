import {
  QrCode,
  MonitorSmartphone,
  ChefHat,
  Building2,
  Users,
  LineChart,
  CreditCard,
  Box,
  Settings,
  type LucideIcon,
} from "lucide-react";

/**
 * Single source of truth for the nine platform-module tiles shown on the
 * landing page (`PlatformModules.tsx`) AND their marketing detail pages
 * (`/features/[id]` and the `/features` index).
 *
 * Keeping id/name/icon/copy in one place avoids a second registry drifting out
 * of sync — the landing strip, the index grid and each detail page all read
 * from `PLATFORM_MODULES`.
 */
export interface PlatformModule {
  /** URL slug: /features/{id} */
  id: string;
  /** Short tile label (landing strip) */
  name: string;
  /** Longer marketing headline */
  title: string;
  icon: LucideIcon;
  /** Tailwind classes for the circular icon chip (bg + text) */
  color: string;
  /** One-line pitch shown under the title */
  tagline: string;
  /** Full paragraph description */
  description: string;
  /** Concrete capabilities, rendered as a checklist */
  bullets: string[];
}

export const PLATFORM_MODULES: PlatformModule[] = [
  {
    id: "digital-menu",
    name: "Digital Menu",
    title: "Digital Menu & QR Ordering",
    icon: QrCode,
    color: "bg-blue-50 text-blue-600",
    tagline: "A scan-to-order menu your guests open in one tap.",
    description:
      "Give every table, room and counter its own QR code that opens a fast, branded menu. Guests browse photos, add to cart and order without waiting for a server or downloading an app — orders land straight in your kitchen and POS.",
    bullets: [
      "Unlimited QR codes for tables, rooms and takeaway counters",
      "Photo-rich menu with categories, stories and reviews",
      "Live availability — 86 an item and it hides instantly",
      "Your own colours, logo and layout (grid, list or compact)",
      "Works on any phone browser, no app install needed",
    ],
  },
  {
    id: "pos",
    name: "Cloud POS",
    title: "Cloud POS for Front-of-House",
    icon: MonitorSmartphone,
    color: "bg-purple-50 text-purple-600",
    tagline: "Take orders, split bills and settle payments from any device.",
    description:
      "A full point-of-sale that runs in the browser on the hardware you already own. Staff log in with a 4-digit PIN, fire orders to the kitchen, hold and recall tabs, and close bills with cash, wallet or bank — all synced live across every terminal.",
    bullets: [
      "PIN login per staff member with role-based permissions",
      "Dine-in, takeaway and delivery order flows",
      "Hold, recall and merge running tabs",
      "Fast Pay for walk-ins and counter service",
      "Customer-facing display and kitchen tickets in real time",
    ],
  },
  {
    id: "kds",
    name: "Smart KDS",
    title: "Smart Kitchen Display System",
    icon: ChefHat,
    color: "bg-orange-50 text-orange-600",
    tagline: "Replace paper tickets with a live kitchen screen.",
    description:
      "Orders stream to a rugged kitchen display the moment they are placed. Cooks see each ticket, mark items preparing and ready, and the guest's tracking page updates automatically. Nothing gets lost, nothing gets double-cooked.",
    bullets: [
      "Real-time tickets grouped into ordering rounds",
      "Per-item preparing / ready status",
      "Durable print outbox — survives a closed tab",
      "Add-on rounds flagged distinctly from the first order",
      "Prep-time snapshots so ETAs stay honest",
    ],
  },
  {
    id: "hotel-hub",
    name: "Hotel Hub",
    title: "Hotel Hub for Stays & Rooms",
    icon: Building2,
    color: "bg-emerald-50 text-emerald-600",
    tagline: "Rooms, bookings, check-in and room service in one place.",
    description:
      "Turn a hotel, resort or guest house into a full stays operation. Manage rooms and rates, take online bookings with an advance deposit, generate room QR codes for in-room ordering, and run check-in through check-out from a single hub.",
    bullets: [
      "Room inventory, rates and availability",
      "Online booking with configurable advance deposit",
      "Per-room QR codes for in-room service",
      "Guest check-in and check-out flow",
      "Booking payments via eSewa, Khalti or bank proof",
    ],
  },
  {
    id: "staff",
    name: "Staff Mgmt",
    title: "Staff Management & Shifts",
    icon: Users,
    color: "bg-pink-50 text-pink-600",
    tagline: "Roles, PINs, shifts and accountability for your team.",
    description:
      "Add your team, assign roles from waiter to manager, and control exactly what each can do. Shift-based staff clock in only during their scheduled window, and every order carries the staff member who processed it.",
    bullets: [
      "Role groups: super-admin, manager, cashier, waiter, chef",
      "Secure 4-digit PIN login (bcrypt-hashed) or QR badge",
      "Shift schedules with clock-in enforcement",
      "Per-order attribution to the staff who handled it",
      "Owner Control Panel to enable features per role",
    ],
  },
  {
    id: "analytics",
    name: "Analytics",
    title: "Analytics & Reporting",
    icon: LineChart,
    color: "bg-cyan-50 text-cyan-600",
    tagline: "See sales, profit and trends without a spreadsheet.",
    description:
      "Know how the business is doing at a glance. Daily revenue split by cash, digital and counter, a live profit-and-loss view with expenses, best-selling items and the trends behind them — all updating as orders come in.",
    bullets: [
      "Daily revenue by cash, digital and counter",
      "Profit & Loss with expense tracking",
      "Best-sellers and category breakdowns",
      "Per-staff sales reports",
      "Trends that update live through the day",
    ],
  },
  {
    id: "payments",
    name: "Payments",
    title: "Payments & Billing",
    icon: CreditCard,
    color: "bg-amber-50 text-amber-600",
    tagline: "Collect with eSewa, Khalti, bank transfer or cash.",
    description:
      "Accept payment however your guests prefer. Wallet checkout with eSewa and Khalti, bank transfer with screenshot verification, or cash at the counter — with automatic tax, service charge and coupon handling on every bill.",
    bullets: [
      "eSewa and Khalti hosted checkout",
      "Bank transfer with proof upload and staff verification",
      "Cash, counter and Fast Pay walk-in flows",
      "Automatic tax, service charge and coupon discounts",
      "Prepaid tokens for pay-before-you-eat venues",
    ],
  },
  {
    id: "inventory",
    name: "Inventory",
    title: "Inventory & Stock Control",
    icon: Box,
    color: "bg-red-50 text-red-600",
    tagline: "Track stock and auto-hide what has sold out.",
    description:
      "Link menu items to the ingredients and drinks they consume. As orders are placed, stock is deducted automatically, and anything that hits zero is hidden from the menu until you restock — no more selling what you do not have.",
    bullets: [
      "Ingredient and drink stock tracking",
      "Automatic deduction on every order",
      "Sold-out items hidden from the menu instantly",
      "Restock and the item comes back on its own",
      "Low-stock visibility before you run out",
    ],
  },
  {
    id: "settings",
    name: "Config",
    title: "Configuration & Branding",
    icon: Settings,
    color: "bg-slate-50 text-slate-600",
    tagline: "Make HimaVolt look and work like your venue.",
    description:
      "Tune the platform to your business type. Choose from twelve venue types that unlock the right feature tabs, set your colours and fonts, configure tax and service charge, and control which features each part of your team can use.",
    bullets: [
      "Twelve venue types, each with tailored feature tabs",
      "Brand colours, fonts and menu layout",
      "Tax and service-charge configuration",
      "Feature toggles per role via the Owner Control Panel",
      "Printing, WiFi and display-counter settings",
    ],
  },
];

/** Fast lookup by slug for the detail page. */
export const PLATFORM_MODULES_BY_ID: Record<string, PlatformModule> =
  Object.fromEntries(PLATFORM_MODULES.map((m) => [m.id, m]));
