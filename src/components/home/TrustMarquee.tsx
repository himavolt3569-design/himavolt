"use client";

import { UtensilsCrossed } from "lucide-react";

const partners = [
  "Bota Momo",
  "Thamel House",
  "Bajeko Sekuwa",
  "Himalayan Java",
  "Roadhouse Cafe",
  "Nanglo Bakery",
  "OR2K",
  "Fire & Ice",
  "Momo Star",
  "Thakali Kitchen",
  "Newari Bhoj",
  "Everest Dine",
  "Kathmandu Steak House",
  "Yin Yang",
  "Bhojan Griha",
  "Third Eye",
];

const row1 = partners.slice(0, 8);
const row2 = partners.slice(8);

export default function TrustMarquee() {
  return (
    <section className="relative py-12 md:py-16 overflow-hidden bg-[var(--canvas)]">
      <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-[var(--accent-border)] to-transparent" />

      <div className="mx-auto max-w-7xl px-4 md:px-8 lg:px-12 mb-8 text-center">
        <p className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-[0.2em]">
          Trusted by 150+ restaurants across Nepal
        </p>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <div className="mx-auto flex max-w-7xl flex-wrap justify-center gap-3 px-4 md:px-8 lg:px-12">
              {row1.map((name, i) => (
                <div
                  key={`r1-${i}`}
                  className="flex shrink-0 items-center gap-2 rounded-full bg-[var(--surface)] border border-[var(--border)] px-4 py-2 hover:border-[var(--accent-border)] hover:bg-[var(--accent-muted)] transition-colors group cursor-default"
                >
                  <UtensilsCrossed className="h-3 w-3 text-[var(--text-3)] group-hover:text-[var(--accent)] transition-colors shrink-0" />
                  <span className="text-xs font-semibold text-[var(--text-3)] group-hover:text-[var(--text-2)] transition-colors whitespace-nowrap">
                    {name}
                  </span>
                </div>
              ))}
          </div>
        </div>

        <div className="relative">
          <div className="mx-auto flex max-w-7xl flex-wrap justify-center gap-3 px-4 md:px-8 lg:px-12">
              {row2.map((name, i) => (
                <div
                  key={`r2-${i}`}
                  className="flex shrink-0 items-center gap-2 rounded-full bg-[var(--surface)] border border-[var(--border)] px-4 py-2 hover:border-[var(--accent-border)] hover:bg-[var(--accent-muted)] transition-colors group cursor-default"
                >
                  <UtensilsCrossed className="h-3 w-3 text-[var(--text-3)] group-hover:text-[var(--accent)] transition-colors shrink-0" />
                  <span className="text-xs font-semibold text-[var(--text-3)] group-hover:text-[var(--text-2)] transition-colors whitespace-nowrap">
                    {name}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-[var(--accent-border)] to-transparent" />
    </section>
  );
}
