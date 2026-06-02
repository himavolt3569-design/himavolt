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
import { Sparkles } from "lucide-react";

const TabLoader = () => (
  <div className="w-full space-y-4 pt-2 opacity-0" style={{ animation: "appleFadeIn 0.4s ease-out 0.1s forwards" }}>
    <div className="h-32 w-full rounded-3xl bg-[var(--surface)]" />
    <div className="grid grid-cols-2 gap-4">
      <div className="h-24 rounded-3xl bg-[var(--surface)]" />
      <div className="h-24 rounded-3xl bg-[var(--surface)]" />
    </div>
    <div className="h-64 w-full rounded-3xl bg-[var(--surface)] opacity-50" />
  </div>
);

const lazyTab = (loader: () => Promise<{ default: React.ComponentType<any> }>) =>
  dynamic(loader, { loading: TabLoader, ssr: false });

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
  }

  if (tab === "stories" && selectedRestaurant) {
    props.restaurantName = selectedRestaurant.name;
    props.restaurantAvatar = selectedRestaurant.imageUrl ?? undefined;
  }

  return <Component {...props} />;
}
