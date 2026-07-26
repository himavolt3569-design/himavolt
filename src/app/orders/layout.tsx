import MarketplaceHeader from "@/components/marketplace/MarketplaceHeader";
import MobileTabBar from "@/components/marketplace/MobileTabBar";

/**
 * Track Order shares the marketplace shell.
 *
 * The header lives in a layout rather than in the page because the page returns
 * from several branches (loading, signed out, empty, populated) and only one of
 * them had the nav. A layout wraps every branch, so the chrome cannot go missing
 * depending on which state the customer lands in.
 */
export default function OrdersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--canvas-sub)] pb-16 lg:pb-0">
      <MarketplaceHeader />
      {children}
      <MobileTabBar />
    </div>
  );
}
