"use client";

import dynamic from "next/dynamic";
import MarketplaceHeader from "@/components/marketplace/MarketplaceHeader";
import MarketplaceHero from "@/components/home/MarketplaceHero";
import TrustBar from "@/components/home/TrustBar";
import CategoryGrid from "@/components/home/CategoryGrid";
import StoreRail from "@/components/marketplace/StoreRail";
import InstallAppBar from "@/components/home/InstallAppBar";

/**
 * The customer marketplace landing page.
 *
 * This page used to be a B2B pitch for the platform. It is now addressed to
 * someone who wants to eat — the partner path survives as a nav link and a
 * promo card rather than half the page, because a hungry visitor scrolling past
 * feature comparisons is a bounce.
 *
 * Everything below the hero is live data keyed off the customer's location.
 * The rails are deliberately different queries rather than one list sliced up:
 * "delivering now" and "hotels" are genuinely different questions.
 */

const PromoBanners = dynamic(() => import("@/components/home/PromoBanners"));
const HowItWorksSteps = dynamic(() => import("@/components/home/HowItWorksSteps"));
const Testimonials = dynamic(() => import("@/components/home/Testimonials"));
const Footer = dynamic(() => import("@/components/layout/Footer"));

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--canvas)]">
      <MarketplaceHeader />
      <InstallAppBar />

      <main>
        <MarketplaceHero />
        <TrustBar />
        <CategoryGrid />

        <StoreRail
          title="Nearby stores"
          subtitle="Everything close to you — restaurants, hotels, cafes and bars"
          viewAllHref="/nearby"
          options={{ radiusKm: 5, limit: 10 }}
        />

        <StoreRail
          title="Delivering right now"
          subtitle="Open, in range, and ready to take your order"
          viewAllHref="/nearby?delivery=1&open=1"
          options={{ radiusKm: 8, deliveryOnly: true, openNow: true, limit: 10 }}
        />

        <PromoBanners />

        <StoreRail
          title="Drinks near you"
          subtitle="Juice bars, cafes and anywhere with a drinks menu"
          viewAllHref="/nearby?category=drinks"
          options={{ radiusKm: 8, kind: "drinks", limit: 10 }}
        />

        <StoreRail
          title="Hotels & stays"
          subtitle="Rooms, resorts and guest houses around you"
          viewAllHref="/nearby?category=hotels"
          options={{
            radiusKm: 15,
            types: ["HOTEL", "RESORT", "GUEST_HOUSE"],
            limit: 10,
          }}
        />

        <HowItWorksSteps />
        <Testimonials />
      </main>

      <Footer />
    </div>
  );
}
