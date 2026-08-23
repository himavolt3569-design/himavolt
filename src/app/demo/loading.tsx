import MarketplaceHeader from "@/components/marketplace/MarketplaceHeader";
import dynamic from "next/dynamic";

const Footer = dynamic(() => import("@/components/layout/Footer"));

export default function DemoLoading() {
  return (
    <div className="min-h-screen bg-[var(--canvas)] pb-14 md:pb-0">
      <MarketplaceHeader />

      <main className="mx-auto w-full max-w-7xl px-4 pb-24 pt-8 sm:px-6">
        <header className="mb-9 max-w-2xl">
          <div className="mb-2.5 h-6 w-32 rounded-full bg-[var(--border-soft)] animate-pulse" />
          <div className="h-10 sm:h-12 w-3/4 rounded-lg bg-[var(--border-soft)] animate-pulse mb-3" />
          <div className="h-16 w-full rounded-lg bg-[var(--border-soft)] animate-pulse mt-3" />
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="block overflow-hidden rounded-2xl bg-[var(--surface)] text-left ring-1 ring-[var(--border)] h-[240px]">
              <div className="relative aspect-video overflow-hidden bg-[var(--canvas-sub)] animate-pulse" />
              <div className="p-3.5 space-y-2 mt-1">
                <div className="h-4 w-3/4 bg-[var(--border-soft)] animate-pulse rounded" />
                <div className="h-3 w-1/2 bg-[var(--border-soft)] animate-pulse rounded mt-2" />
              </div>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
