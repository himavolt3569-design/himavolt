import type { Metadata } from "next";
import dynamic from "next/dynamic";
import MarketplaceHeader from "@/components/marketplace/MarketplaceHeader";
import MobileTabBar from "@/components/marketplace/MobileTabBar";

/**
 * Offers.
 *
 * This page used to list restaurants with decorative badges ("BUY 1 GET 1",
 * "60% OFF") hardcoded in the client and attached to nothing, so the checkout
 * would never honour any of them. It now shows real discounted dishes, priced
 * from the same numbers the order path uses.
 */

const OffersBrowser = dynamic(
  () => import("@/components/marketplace/OffersBrowser"),
);
const Footer = dynamic(() => import("@/components/layout/Footer"));

export const metadata: Metadata = {
  title: "Today's offers, HimaVolt",
  description:
    "Real discounts on real dishes near you. Every price shown is the price you pay at checkout.",
};

export default function OffersPage() {
  return (
    <div className="min-h-screen bg-[var(--canvas)] pb-16 lg:pb-0">
      <MarketplaceHeader />

      <main className="mx-auto w-full max-w-7xl px-4 pb-20 pt-8 sm:px-6">
        <header className="mb-8">
          <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-red-500 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-white">
            Live deals
          </span>
          <h1 className="text-[28px] font-black tracking-tight text-[var(--text-1)] sm:text-[34px]">
            Dishes on offer right now
          </h1>
          <p className="mt-2 max-w-xl text-[14px] text-[var(--text-2)]">
            Actual discounted items from kitchens near you. Every price here is
            the price you pay at checkout, and expired offers disappear on their
            own.
          </p>
        </header>

        <OffersBrowser />
      </main>

      <Footer />
      <MobileTabBar />
    </div>
  );
}
