import Link from "next/link";
import MarketplaceHeader from "@/components/marketplace/MarketplaceHeader";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { PLATFORM_MODULES } from "@/lib/platform-modules";

export const metadata: Metadata = {
  title: "Features, HimaVolt",
  description:
    "Everything HimaVolt gives your restaurant, cafe or hotel, from QR ordering to cloud POS, kitchen displays, payments and analytics.",
};

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-[var(--canvas)] flex flex-col pb-14 md:pb-0">
      <MarketplaceHeader />

      <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-12 md:py-20">
        <div className="text-center max-w-2xl mx-auto mb-12 md:mb-16">
          <h1 className="text-4xl md:text-5xl font-black text-[var(--text-1)] tracking-tight">
            One platform, <span className="text-[var(--accent)]">every module</span>
          </h1>
          <p className="mt-4 text-lg text-[var(--text-2)] font-medium">
            The complete operating system for hospitality in Nepal. Tap any module to
            see what it does.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {PLATFORM_MODULES.map((mod) => {
            const Icon = mod.icon;
            return (
              <Link
                key={mod.id}
                href={`/features/${mod.id}`}
                className="group flex flex-col rounded-3xl border border-[var(--border-soft)] bg-[var(--surface)] p-6 shadow-sm hover:shadow-lg transition-all"
              >
                <div
                  className={`h-14 w-14 rounded-2xl flex items-center justify-center ${mod.color} mb-5`}
                >
                  <Icon className="h-7 w-7" strokeWidth={1.5} />
                </div>
                <h2 className="text-lg font-bold text-[var(--text-1)] mb-1.5">
                  {mod.title}
                </h2>
                <p className="text-sm font-medium text-[var(--text-2)] leading-relaxed flex-1">
                  {mod.tagline}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-[var(--accent)]">
                  Learn more
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            );
          })}
        </div>

        <div className="mt-16 text-center">
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[var(--accent)] text-white font-black text-base shadow-lg shadow-[var(--accent)]/20 hover:scale-105 active:scale-95 transition-transform"
          >
            Get Started for Free
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>
    </div>
  );
}
