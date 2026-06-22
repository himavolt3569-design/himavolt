"use client";

import { useMemo, use } from "react";
import dynamic from "next/dynamic";
import { useRestaurant } from "@/context/RestaurantContext";
import { 
  type FeatureTabId, 
  getFeatureTabsForType 
} from "@/lib/restaurant-types";
import {
  FEATURE_ICONS,
  LIVE_FEATURES,
  DashTab
} from "@/lib/dashboard-nav";
import { apiFetch } from "@/lib/api-client";
import { Sparkles } from "lucide-react";

type PreloadableComponent = React.ComponentType<any> & {
  preload?: () => Promise<unknown>;
};

// Attach the raw import loader to the dynamic component so we can warm its JS
// chunk ahead of time (on nav hover/focus + idle preloading in the layout).
// No `loading` fallback: chunks are warmed eagerly, so a tab renders the moment
// it's clicked with no skeleton flash. If a chunk somehow isn't warm yet,
// dynamic() renders nothing (not a skeleton) until it resolves.
const lazyTab = (
  loader: () => Promise<{ default: React.ComponentType<any> }>,
): PreloadableComponent => {
  const Comp = dynamic(loader, { ssr: false }) as PreloadableComponent;
  Comp.preload = loader;
  return Comp;
};

const OverviewTab = lazyTab(() => import("@/components/dashboard/OverviewTab"));
const MenuManagementTab = lazyTab(() => import("@/components/dashboard/MenuManagementTab"));
const ReportsTab = lazyTab(() => import("@/components/dashboard/ReportsTab"));
const ChatTab = lazyTab(() => import("@/components/dashboard/ChatTab"));
const LiveOrdersTab = lazyTab(() => import("@/components/dashboard/LiveOrdersTab"));
const BillingTab = lazyTab(() => import("@/components/billing/BillingTab"));
const StaffManagementTab = lazyTab(() => import("@/components/dashboard/StaffManagementTab"));
const ShiftsTab = lazyTab(() => import("@/components/dashboard/ShiftsTab"));
const QRCodesTab = lazyTab(() => import("@/components/dashboard/QRCodesTab"));
const TablesTab = lazyTab(() => import("@/components/dashboard/TablesTab"));
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
const CouponManagementTab = lazyTab(() => import("@/components/dashboard/CouponManagementTab"));
const HotelBookingsTab = lazyTab(() => import("@/components/dashboard/HotelBookingsTab"));
const HotelQRTab = lazyTab(() => import("@/components/dashboard/HotelQRTab"));
const RoomQRTab = lazyTab(() => import("@/components/dashboard/RoomQRTab"));
const HotelHubTab = lazyTab(() => import("@/components/dashboard/HotelHubTab"));
const OwnerControlPanel = lazyTab(() => import("@/components/dashboard/OwnerControlPanel"));
const FeedbackTab = lazyTab(() => import("@/components/dashboard/FeedbackTab"));
const PrintingSettingsTab = lazyTab(() => import("@/components/dashboard/PrintingSettingsTab"));
const SettingsTab = lazyTab(() => import("@/components/dashboard/SettingsTab"));

const COMPONENTS: Record<string, React.ComponentType<any>> = {
  overview: OverviewTab,
  orders: LiveOrdersTab,
  billing: BillingTab,
  menu: MenuManagementTab,
  staff: StaffManagementTab,
  shifts: ShiftsTab,
  qr: QRCodesTab,
  tables: TablesTab,
  reports: ReportsTab,
  chat: ChatTab,
  "payment-qr": PaymentQRTab,
  "payment-settings": PaymentSettingsTab,
  "tax-charges": TaxChargesTab,
  stock: StockTab,
  offers: OffersTab,
  "hero-slides": HeroSlidesManager,
  media: MediaTab,
  coupons: CouponManagementTab,
  "hotel-hub": HotelHubTab,
  rooms: HotelHubTab,
  "owner-control": OwnerControlPanel,
  stories: StoryManager,
  drinks: DrinksTab,
  "manual-billing": ManualBillingTab,
  feedback: FeedbackTab,
  printing: PrintingSettingsTab,
  settings: SettingsTab,

  // Feature tabs
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

// Primary GET endpoints each tab reads on mount. Warming them into the apiFetch
// GET cache on nav hover means the tab seeds from cache (peekApiCache) and
// paints instantly on click instead of firing a request behind a spinner.
// Keyed by tab id; builder takes the selected restaurant id.
const TAB_DATA: Record<string, (r: string) => string[]> = {
  billing: (r) => [
    `/api/restaurants/${r}/billing?filter=unpaid`,
    `/api/restaurants/${r}/billing/summary`,
  ],
  staff: (r) => [`/api/restaurants/${r}/staff`, `/api/restaurants/${r}/attendance`],
  shifts: (r) => [
    `/api/restaurants/${r}/shifts?date=${new Date().toISOString().slice(0, 10)}`,
    `/api/restaurants/${r}/staff`,
  ],
  stock: (r) => [`/api/restaurants/${r}/inventory`],
  offers: (r) => [`/api/restaurants/${r}/stories`],
  coupons: (r) => [`/api/restaurants/${r}/coupons`],
  drinks: (r) => [`/api/restaurants/${r}/menu?isDrink=true`, `/api/restaurants/${r}/categories`],
  feedback: (r) => [`/api/restaurants/${r}/feedback?limit=100`],
  media: (r) => [`/api/restaurants/${r}/media`],
  "hero-slides": (r) => [`/api/restaurants/${r}/hero-slides`],
  "guest-checkin": (r) => [`/api/restaurants/${r}/guest-checkins`],
  "payment-qr": (r) => [`/api/restaurants/${r}/payment-qrs`],
  "payment-settings": (r) => [`/api/restaurants/${r}/payment-config`],
  "tax-charges": (r) => [`/api/restaurants/${r}/tax-config`],
  "room-qr-codes": (r) => [`/api/restaurants/${r}/rooms`],
  "hotel-bookings": (r) => [`/api/restaurants/${r}/bookings?limit=100`],
  "loyalty-rewards": (r) => [`/api/restaurants/${r}/loyalty`],
  "combo-meals": (r) => [
    `/api/restaurants/${r}/combo-meals`,
    `/api/restaurants/${r}/menu-items/all`,
  ],
  "rush-hour": (r) => [`/api/restaurants/${r}/rush-hour`],
  "display-counter": (r) => [`/api/restaurants/${r}/display-counter`],
  qr: (r) => [`/api/restaurants/${r}/tables`],
  menu: (r) => [`/api/restaurants/${r}/menu`, `/api/restaurants/${r}/categories`],
  tables: (r) => [`/api/restaurants/${r}/tables`],
};

// Read the owner's selected restaurant without prop-drilling through the nav.
// Mirrors RestaurantContext's SELECTED_KEY so hover-prefetch knows which
// restaurant to warm data for.
function selectedRestaurantId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem("himavolt:selectedRestaurantId");
  } catch {
    return null;
  }
}

/**
 * Warm a dashboard tab's lazy JS chunk AND its primary data before the user
 * clicks it (called on nav hover/focus). No-ops for unknown tabs and swallows
 * network errors.
 */
export function preloadTab(tab: string): void {
  const Component = COMPONENTS[tab] as PreloadableComponent | undefined;
  Component?.preload?.().catch(() => {});

  const build = TAB_DATA[tab] as ((r: string) => string[]) | undefined;
  if (!build) return;
  const rid = selectedRestaurantId();
  if (!rid) return;
  for (const path of build(rid)) {
    apiFetch(path, { cacheTtl: 30_000 }).catch(() => {});
  }
}

export default function DynamicDashboardTab({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = use(params);
  const { selectedRestaurant } = useRestaurant();

  const Component = COMPONENTS[tab];

  if (!Component) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-lg font-bold text-[var(--text-2)]">Page not found</p>
      </div>
    );
  }

  // Handle "Coming Soon" for features
  const featureId = tab as FeatureTabId;
  if (FEATURE_ICONS[featureId] && !LIVE_FEATURES.has(featureId)) {
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

  // Props mapping for specific components
  const props: any = { restaurantId: selectedRestaurant?.id };
  
  if (tab === "manual-billing") {
    props.currency = selectedRestaurant?.currency ?? "NPR";
    props.restaurantName = selectedRestaurant?.name ?? "";
    props.restaurantAddress = selectedRestaurant?.address ?? "";
    props.restaurantPhone = selectedRestaurant?.phone ?? "";
    props.taxRate = selectedRestaurant?.taxRate ?? 13;
    props.taxEnabled = selectedRestaurant?.taxEnabled ?? true;
    props.counterWidth = selectedRestaurant?.printCounterWidth ?? 80;
    props.kitchenWidth = selectedRestaurant?.printKitchenWidth ?? 80;
  }

  if (tab === "stories" && selectedRestaurant) {
    props.restaurantName = selectedRestaurant.name;
    props.restaurantAvatar = selectedRestaurant.imageUrl ?? undefined;
  }

  return <Component {...props} />;
}
