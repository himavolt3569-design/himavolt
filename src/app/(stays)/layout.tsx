import React from "react";
import MarketplaceHeader from "@/components/marketplace/MarketplaceHeader";
import MobileTabBar from "@/components/marketplace/MobileTabBar";

/**
 * Stays shares the marketplace shell.
 *
 * This used to render its own 200-line `HotelNavbar` with a different logo, a
 * different account menu and a transparent-to-solid scroll behaviour. A customer
 * moving between food and stays watched the site change shape underneath them,
 * and every nav change had to be made twice. One header now, on every
 * customer-facing page.
 *
 * A server component: nothing in the shell needs client state, so it renders in
 * the first HTML byte instead of waiting for hydration.
 */
export default function StaysLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex min-h-screen flex-col bg-[var(--canvas)] pb-16 font-sans lg:pb-0"
      data-theme="hotel"
    >
      <MarketplaceHeader />
      <main className="flex flex-1 flex-col">{children}</main>
      <MobileTabBar />
    </div>
  );
}
