"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  ChevronRight,
  Search,
  Clock,
  User,
} from "lucide-react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLiveOrders } from "@/context/LiveOrdersContext";
import { useRestaurant } from "@/context/RestaurantContext";
import DashboardSidebar from "@/components/dashboard/layout/DashboardSidebar";
import NotificationBell from "@/components/dashboard/NotificationBell";
import ThemeToggle from "@/components/shared/ThemeToggle";
import GlobalChatButton from "@/components/chat/GlobalChatButton";
import POSActivationGate from "@/components/pos/activation/POSActivationGate";
import CustomerDashboard from "@/app/dashboard/CustomerDashboard";
import CreateRestaurantModal from "@/components/modals/CreateRestaurantModal";
import { ALL_NAV, FEATURE_ICONS } from "@/lib/dashboard-nav";
import { getFeatureTabsForType, type FeatureTabId } from "@/lib/restaurant-types";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoaded, userRole } = useAuth();
  const { orders, setRestaurantId } = useLiveOrders();
  const {
    restaurants,
    selectedRestaurant,
    loading: resLoading,
    hasFetched: resHasFetched,
    fetchRestaurants
  } = useRestaurant();
  const router = useRouter();
  const pathname = usePathname();

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [posWizardOpen, setPosWizardOpen] = useState(false);
  const [createRestaurantOpen, setCreateRestaurantOpen] = useState(false);

  // Wave 1 — most-visited tabs warmed almost immediately so a click lands on a
  // ready chunk (no skeleton, instant render).
  useEffect(() => {
    const t = setTimeout(() => {
      import("@/components/billing/BillingTab");
      import("@/components/dashboard/LiveOrdersTab");
      import("@/components/dashboard/MenuManagementTab");
      import("@/components/dashboard/OverviewTab");
      import("@/components/dashboard/StaffManagementTab");
      import("@/components/dashboard/ReportsTab");
      import("@/components/dashboard/ChatTab");
      import("@/components/dashboard/ManualBillingTab");
      import("@/components/dashboard/StockTab");
    }, 250);
    return () => clearTimeout(t);
  }, []);

  // Wave 2 — remaining tabs warmed shortly after wave 1 / first paint settle.
  useEffect(() => {
    const t = setTimeout(() => {
      import("@/components/dashboard/ShiftsTab");
      import("@/components/dashboard/QRCodesTab");
      import("@/components/dashboard/TablesTab");
      import("@/components/stories/StoryManager");
      import("@/components/dashboard/PaymentQRTab");
      import("@/components/dashboard/PaymentSettingsTab");
      import("@/components/dashboard/TaxChargesTab");
      import("@/components/dashboard/OffersTab");
      import("@/components/dashboard/HeroSlidesManager");
      import("@/components/dashboard/DrinksTab");
      import("@/components/dashboard/GuestCheckInTab");
      import("@/components/dashboard/MediaTab");
      import("@/components/dashboard/CouponManagementTab");
      import("@/components/dashboard/HotelBookingsTab");
      import("@/components/dashboard/HotelQRTab");
      import("@/components/dashboard/RoomQRTab");
      import("@/components/dashboard/HotelHubTab");
      import("@/components/dashboard/OwnerControlPanel");
      import("@/components/dashboard/FeedbackTab");
      import("@/components/dashboard/PrintingSettingsTab");
      import("@/components/dashboard/features/QuickCounterTab");
      import("@/components/dashboard/features/ComboMealsTab");
      import("@/components/dashboard/features/RushHourTab");
      import("@/components/dashboard/features/TakeawayTab");
      import("@/components/dashboard/features/RoomServiceTab");
      import("@/components/dashboard/features/MultiOutletTab");
      import("@/components/dashboard/features/EventCateringTab");
      import("@/components/dashboard/features/GuestBillingTab");
      import("@/components/dashboard/features/BuffetManagerTab");
      import("@/components/dashboard/features/PreOrdersTab");
      import("@/components/dashboard/features/CustomCakesTab");
      import("@/components/dashboard/features/DailySpecialsTab");
      import("@/components/dashboard/features/DisplayCounterTab");
      import("@/components/dashboard/features/DeliveryOpsTab");
      import("@/components/dashboard/features/MultiBrandTab");
      import("@/components/dashboard/features/DeliveryZonesTab");
      import("@/components/dashboard/features/PackageTrackingTab");
      import("@/components/dashboard/features/HappyHoursTab");
      import("@/components/dashboard/features/TabManagementTab");
      import("@/components/dashboard/features/CocktailMenuTab");
      import("@/components/dashboard/features/LiveEventsTab");
      import("@/components/dashboard/features/LoyaltyRewardsTab");
      import("@/components/dashboard/features/WifiSeatingTab");
      import("@/components/dashboard/features/SeasonalMenuTab");
      import("@/components/dashboard/features/BrunchModeTab");
      import("@/components/dashboard/features/TableReservationsTab");
      import("@/components/dashboard/features/WaitlistTab");
      import("@/components/dashboard/features/PrivateDiningTab");
      import("@/components/dashboard/features/WifiSettingsTab");
    }, 1200);
    return () => clearTimeout(t);
  }, []);

  const newOrderCount = orders.filter((o) => o.status === "PENDING").length;

  // Active tab info for breadcrumbs
  const pathSegments = pathname.split("/").filter(Boolean);
  const activeTabId = pathSegments.length > 1 ? pathSegments[pathSegments.length - 1] : "overview";
  
  const activeTab = ALL_NAV.find(n => n.id === activeTabId) 
    || getFeatureTabsForType(selectedRestaurant?.type || "", {
         featuresEnabled: selectedRestaurant?.featuresEnabled,
         featuresDisabled: selectedRestaurant?.featuresDisabled
       }).find(f => f.id === activeTabId);

  const activeLabel = activeTab?.label || "Overview";
  const ActiveIcon =
    (activeTab && "icon" in activeTab ? (activeTab as { icon: any }).icon : null) ||
    FEATURE_ICONS[activeTabId as FeatureTabId] ||
    User;

  // Selection is restored by RestaurantContext on fetch (last-selected, then
  // first), so no fallback auto-select is needed here.
  useEffect(() => {
    setRestaurantId(selectedRestaurant?.id ?? null);
  }, [selectedRestaurant?.id, setRestaurantId]);

  // An owner with no restaurants must create one — open the modal inline (the
  // old /manage-restaurants route is gone) and keep it open until they do.
  const needsRestaurant =
    userRole === "OWNER" && resHasFetched && !resLoading && restaurants.length === 0;
  useEffect(() => {
    if (needsRestaurant) setCreateRestaurantOpen(true);
  }, [needsRestaurant]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Route customers away once auth resolves — no full-screen gate
  if (isLoaded && userRole === "CUSTOMER") {
    return <CustomerDashboard />;
  }

  const isActuallyLoaded = isLoaded && !!user;

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--canvas-sub)] font-sans text-[var(--text-1)]">
      {/* ── Desktop sidebar ───────────────────────────────────── */}
      <div className={`hidden lg:block shrink-0 h-full transition-all duration-300 ${sidebarCollapsed ? "w-14" : "w-56"}`}>
        {!isActuallyLoaded ? null : (
          <DashboardSidebar
            newOrderCount={newOrderCount}
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
            onRequestPOSActivate={() => setPosWizardOpen(true)}
            onRequestCreateRestaurant={() => setCreateRestaurantOpen(true)}
          />
        )}
      </div>

      {/* ── Mobile sidebar overlay ────────────────────────────── */}
      <AnimatePresence>
        {mobileSidebarOpen && isActuallyLoaded && (
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
              <DashboardSidebar
                newOrderCount={newOrderCount}
                onClose={() => setMobileSidebarOpen(false)}
                onRequestPOSActivate={() => {
                  setPosWizardOpen(true);
                  setMobileSidebarOpen(false);
                }}
                onRequestCreateRestaurant={() => {
                  setCreateRestaurantOpen(true);
                  setMobileSidebarOpen(false);
                }}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Main area ─────────────────────────────────────────── */}
      <div className="relative flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-[var(--border)]/50 bg-[var(--canvas)]/70 backdrop-blur-xl shadow-sm px-5 lg:px-8 py-3.5 shrink-0 z-30">
          {!isActuallyLoaded ? null : (
            <>
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
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                  <span className="text-[11px] font-semibold text-[var(--accent-text)]">
                    Live
                  </span>
                </div>

                <NotificationBell onNavigateToOrders={() => router.push("/dashboard/orders")} />

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
            </>
          )}
        </header>

        <main className="flex-1 overflow-y-auto px-5 lg:px-8 pt-6 pb-8">
          {!isActuallyLoaded ? null : children}
        </main>
      </div>

      {/* Global floating chat for owner/admin — only when not on chat tab */}
      {isActuallyLoaded && selectedRestaurant && user && activeTabId !== "chat" && (
        <GlobalChatButton
          restaurantId={selectedRestaurant.id}
          staffRole={userRole ?? "OWNER"}
          staffName={user.user_metadata?.name ?? user.email ?? "Owner"}
        />
      )}

      {/* Create-restaurant modal — opened from the sidebar "New" button, or
          forced open for an owner who has no restaurants yet. */}
      <CreateRestaurantModal
        open={createRestaurantOpen}
        onOpenChange={(v) => {
          if (!v && needsRestaurant) return; // can't dismiss until one exists
          setCreateRestaurantOpen(v);
        }}
      />

      {/* POS welcome tour + activation wizard */}
      {isActuallyLoaded && (
        <POSActivationGate
          restaurant={selectedRestaurant}
          openWizard={posWizardOpen}
          onWizardClose={() => setPosWizardOpen(false)}
          onActivated={fetchRestaurants}
        />
      )}
    </div>
  );
}
