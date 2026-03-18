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

/* Double the list for seamless infinite loop */
const row1 = [...partners, ...partners];
const row2 = [...partners.slice(8), ...partners.slice(0, 8), ...partners.slice(8), ...partners.slice(0, 8)];

export default function TrustMarquee() {
  return (
    <section className="relative py-12 md:py-16 overflow-hidden bg-white">
      {/* Top/bottom fade masks */}
      <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-[#eaa94d]/10 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 md:px-8 lg:px-12 mb-8 text-center">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{
            duration: 0.5,
            ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
          }}
          className="text-[11px] font-bold text-[#8e491e]/30 uppercase tracking-[0.2em]"
        >
          Trusted by 150+ restaurants across Nepal
        </motion.p>
      </div>

      {/* Marquee rows */}
      <div className="space-y-3">
        {/* Row 1 — scrolls left */}
        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-24 md:w-40 bg-linear-to-r from-white to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-24 md:w-40 bg-linear-to-l from-white to-transparent z-10 pointer-events-none" />

          <div className="flex overflow-hidden">
            <motion.div
              className="flex shrink-0 gap-3"
              animate={{ x: ["0%", "-50%"] }}
              transition={{
                x: { duration: 40, ease: "linear", repeat: Infinity },
              }}
            >
              {row1.map((name, i) => (
                <div
                  key={`r1-${i}`}
                  className="flex shrink-0 items-center gap-2 rounded-full bg-[#fdf9ef]/80 border border-[#f4d69a]/15 px-4 py-2 hover:border-[#eaa94d]/25 hover:bg-[#fdf9ef] transition-all duration-300 group cursor-default"
                >
                  <UtensilsCrossed className="h-3 w-3 text-[#eaa94d]/40 group-hover:text-[#eaa94d] transition-colors duration-300 shrink-0" />
                  <span className="text-xs font-semibold text-[#3e1e0c]/40 group-hover:text-[#3e1e0c]/70 transition-colors duration-300 whitespace-nowrap">
                    {name}
                  </span>
                </div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Row 2 — scrolls right (reverse) */}
        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-24 md:w-40 bg-linear-to-r from-white to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-24 md:w-40 bg-linear-to-l from-white to-transparent z-10 pointer-events-none" />

          <div className="flex overflow-hidden">
            <motion.div
              className="flex shrink-0 gap-3"
              animate={{ x: ["-50%", "0%"] }}
              transition={{
                x: { duration: 45, ease: "linear", repeat: Infinity },
              }}
            >
              {row2.map((name, i) => (
                <div
                  key={`r2-${i}`}
                  className="flex shrink-0 items-center gap-2 rounded-full bg-[#fdf9ef]/80 border border-[#f4d69a]/15 px-4 py-2 hover:border-[#eaa94d]/25 hover:bg-[#fdf9ef] transition-all duration-300 group cursor-default"
                >
                  <UtensilsCrossed className="h-3 w-3 text-[#eaa94d]/40 group-hover:text-[#eaa94d] transition-colors duration-300 shrink-0" />
                  <span className="text-xs font-semibold text-[#3e1e0c]/40 group-hover:text-[#3e1e0c]/70 transition-colors duration-300 whitespace-nowrap">
                    {name}
                  </span>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-[#eaa94d]/10 to-transparent" />
    </section>
  );
}
