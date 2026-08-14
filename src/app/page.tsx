import MarketplaceHeader from "@/components/marketplace/MarketplaceHeader";
import MarketplaceHero from "@/components/home/MarketplaceHero";
import CategoryGrid from "@/components/home/CategoryGrid";
import StoreRail from "@/components/marketplace/StoreRail";
import InstallAppBar from "@/components/home/InstallAppBar";
import PromoBanners from "@/components/home/PromoBanners";
import HowItWorksSteps from "@/components/home/HowItWorksSteps";
import Testimonials from "@/components/home/Testimonials";
import Footer from "@/components/layout/Footer";
import { readSiteSettings } from "@/lib/site-settings-store";

/**
 * The customer marketplace landing page.
 *
 * A SERVER component, deliberately. It used to be a client component that
 * fetched site settings after hydration, which put the hero photograph behind a
 * four step waterfall: HTML, then the JS bundle, then an HTTP round trip for the
 * settings, and only then did the browser learn the image URL and start
 * downloading it. The preload scanner never saw it, so the hero stayed empty for
 * seconds.
 *
 * Reading the settings here means the `<img src>` ships in the first HTML byte
 * and the browser starts fetching it before any JavaScript runs.
 *
 * Everything below the hero is live data keyed off the customer's location.
 * The rails are deliberately different queries rather than one list sliced up:
 * "delivering now" and "hotels" are genuinely different questions.
 */

// Settings change rarely and are read on every visit, so a short revalidate
// keeps the hero instant without pinning a stale photograph for long.
export const revalidate = 60;

export default async function Home() {
  const settings = await readSiteSettings();

  return (
    // Bottom padding clears the fixed mobile tab bar.
    <div className="min-h-screen bg-[var(--canvas)] pb-14 md:pb-0">
      {/* Tells the browser to start the hero image immediately, at high
          priority, ahead of everything else the page will ask for. */}
      {settings.heroImageUrl && (
        <link
          rel="preload"
          as="image"
          href={settings.heroImageUrl}
          fetchPriority="high"
        />
      )}

      {/* The hero owns the location control on this page, so the header hides
          its own. One setting, one picker. */}
      <MarketplaceHeader showLocation={false} />
      <InstallAppBar />

      <main>
        <MarketplaceHero settings={settings} />
        <CategoryGrid />

        <StoreRail
          title="Restaurants near you"
          subtitle="Everything close by, from khaja ghar to cafes and bars"
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
          title="Stays near you"
          subtitle="Hotels, lodges, guest houses and resorts with rooms free tonight"
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
