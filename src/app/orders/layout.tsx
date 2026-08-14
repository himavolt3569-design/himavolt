import MarketplaceHeader from "@/components/marketplace/MarketplaceHeader";

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
    <div className="min-h-screen bg-[var(--canvas-sub)] pb-14 md:pb-0">
      <MarketplaceHeader />
      {children}
    </div>
  );
}
