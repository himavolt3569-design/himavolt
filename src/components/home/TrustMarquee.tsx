"use client";

import { motion } from "framer-motion";
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

const row1 = [...partners, ...partners];
const row2 = [...partners.slice(8), ...partners.slice(0, 8), ...partners.slice(8), ...partners.slice(0, 8)];

export default function TrustMarquee() {
  return (
    <section className="relative py-12 md:py-16 overflow-hidden bg-[var(--canvas)]">
      <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-[var(--accent-border)] to-transparent" />

      <div className="mx-auto max-w-7xl px-4 md:px-8 lg:px-12 mb-8 text-center">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-[0.2em]"
        >
          Trusted by 150+ restaurants across Nepal
        </motion.p>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-24 md:w-40 bg-linear-to-r from-[var(--canvas)] to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-24 md:w-40 bg-linear-to-l from-[var(--canvas)] to-transparent z-10 pointer-events-none" />
          <div className="flex overflow-hidden">
            <motion.div
              className="flex shrink-0 gap-3"
              animate={{ x: ["0%", "-50%"] }}
              transition={{ x: { duration: 40, ease: "linear", repeat: Infinity } }}
            >
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
            </motion.div>
          </div>
        </div>

        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-24 md:w-40 bg-linear-to-r from-[var(--canvas)] to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-24 md:w-40 bg-linear-to-l from-[var(--canvas)] to-transparent z-10 pointer-events-none" />
          <div className="flex overflow-hidden">
            <motion.div
              className="flex shrink-0 gap-3"
              animate={{ x: ["-50%", "0%"] }}
              transition={{ x: { duration: 45, ease: "linear", repeat: Infinity } }}
            >
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
            </motion.div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-[var(--accent-border)] to-transparent" />
    </section>
  );
}
