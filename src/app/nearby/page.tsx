import { Suspense } from "react";
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import MarketplaceHeader from "@/components/marketplace/MarketplaceHeader";
import MobileTabBar from "@/components/marketplace/MobileTabBar";

// Location resolution and the search are entirely client-side, so there is
// nothing meaningful to server-render here.
const NearbySearch = dynamic(() => import("@/components/nearby/NearbySearch"));
const Footer = dynamic(() => import("@/components/layout/Footer"));

export const metadata: Metadata = {
  title: "Eat near you, HimaVolt",
  description:
    "Find restaurants, hotels, cafes and bars near you that are open right now and deliver to your door. Food and drinks across Nepal.",
};

export default function NearbyPage() {
  return (
    <div className="min-h-screen bg-[var(--canvas)] pb-16 lg:pb-0">
      <MarketplaceHeader />

      <main className="mx-auto w-full max-w-7xl px-4 pb-20 pt-8 sm:px-6">
        <header className="mb-8">
          <h1 className="text-[28px] font-black tracking-tight text-[var(--text-1)] sm:text-[34px]">
            Eat near you
          </h1>
          <p className="mt-2 max-w-xl text-[14px] text-[var(--text-2)]">
            Restaurants, khaja ghar, cafes and bars close to you, with live
            opening hours and real delivery distances.
          </p>
        </header>

        {/* useSearchParams needs a Suspense boundary to prerender this route. */}
        <Suspense
          fallback={
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-56 animate-pulse rounded-2xl bg-[var(--surface)]"
                />
              ))}
            </div>
          }
        >
          <NearbySearch initialLimit={30} />
        </Suspense>
      </main>

      <Footer />
      <MobileTabBar />
    </div>
  );
}
