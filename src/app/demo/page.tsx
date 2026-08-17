import type { Metadata } from "next";
import dynamic from "next/dynamic";
import MarketplaceHeader from "@/components/marketplace/MarketplaceHeader";

/**
 * Product walkthroughs.
 *
 * Public surface for the tutorial videos authored by the master admin. Videos
 * marked AUTHENTICATED are filtered out server-side for signed-out visitors —
 * see `/api/tutorials`.
 */

const TutorialGallery = dynamic(
  () => import("@/components/tutorials/TutorialGallery"),
);
const Footer = dynamic(() => import("@/components/layout/Footer"));

export const metadata: Metadata = {
  title: "Watch how it works, HimaVolt",
  description:
    "Short, practical walkthroughs of HimaVolt — setting up your restaurant, adding dishes, running the POS, and taking payments.",
};

export default async function DemoPage({
  searchParams,
}: {
  searchParams: Promise<{ v?: string }>;
}) {
  // `?v=<id>` deep link, used by the post-signup prompt so "Watch the demo"
  // opens on the featured video rather than whatever sorts first.
  const { v } = await searchParams;

  return (
    <div className="min-h-screen bg-[var(--canvas)] pb-14 md:pb-0">
      <MarketplaceHeader />

      <main className="mx-auto w-full max-w-7xl px-4 pb-24 pt-8 sm:px-6">
        <header className="mb-9 max-w-2xl">
          <span className="mb-2.5 inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-3 py-1 text-[11px] font-black uppercase tracking-wide text-white">
            Watch &amp; learn
          </span>
          <h1 className="text-[28px] font-black leading-[1.1] tracking-tight text-[var(--text-1)] sm:text-[38px]">
            See HimaVolt actually running.
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-[var(--text-2)]">
            No slideshows and no stock footage — these are real screens from the
            live product. Start with the demo, then jump to whichever part of the
            system you are setting up today.
          </p>

          <a
            href="/demo/book"
            className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-[var(--accent-text)] underline-offset-4 hover:underline"
          >
            Prefer a live walkthrough? Book a demo →
          </a>
        </header>

        <TutorialGallery initialVideoId={v} />
      </main>

      <Footer />
    </div>
  );
}
