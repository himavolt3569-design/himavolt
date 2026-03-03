"use client";

import { motion } from "framer-motion";
import {
  QrCode,
  UtensilsCrossed,
  Bell,
  CreditCard,
  ArrowRight,
} from "lucide-react";

const steps = [
  {
    Icon: QrCode,
    title: "Scan & Browse",
    desc: "Scan the QR code at your table or browse restaurants near you.",
    accent: "from-[#E23744] to-[#FF6B81]",
  },
  {
    Icon: UtensilsCrossed,
    title: "Pick & Order",
    desc: "Choose from digital menus and customize your order effortlessly.",
    accent: "from-[#FF9933] to-[#FFB347]",
  },
  {
    Icon: Bell,
    title: "Live Tracking",
    desc: "Real-time updates while we prepare and deliver your food.",
    accent: "from-[#1E7B3E] to-[#34D399]",
  },
  {
    Icon: CreditCard,
    title: "Pay & Enjoy",
    desc: "Pay securely via your phone and savor the premium experience.",
    accent: "from-[#6366F1] to-[#818CF8]",
  },
];

export default function HowItWorks() {
  return (
    <section className="relative overflow-hidden bg-[#0F1219] text-white py-20 md:py-28">
      {/* Ambient glows */}
      <div className="absolute top-0 left-1/4 h-[500px] w-[500px] rounded-full bg-[#E23744]/[0.04] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 h-[400px] w-[400px] rounded-full bg-[#FF9933]/[0.04] blur-[100px] pointer-events-none" />

      {/* Noise texture */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 6 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23fff' fill-opacity='1'%3E%3Ccircle cx='1' cy='1' r='0.6'/%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />

      <div className="relative z-10 mx-auto max-w-[1440px] px-4 md:px-8 lg:px-12">
        {/* Header — left-aligned for asymmetry */}
        <div className="mb-14 md:mb-20 max-w-xl">
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] backdrop-blur-sm px-3.5 py-1.5 text-[11px] font-bold text-white/70 uppercase tracking-wider border border-white/[0.06] mb-5">
              <ArrowRight className="h-3 w-3 text-[#FF9933]" />
              How it works
            </span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
            className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.1]"
          >
            From scan to savour
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF9933] to-[#FFB347]">
              in four easy steps.
            </span>
          </motion.h2>
        </div>

        {/* Steps grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
          {steps.map((step, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{
                duration: 0.5,
                delay: idx * 0.08,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm p-7 transition-all duration-300 hover:bg-white/[0.06] hover:border-white/[0.1]"
            >
              {/* Step number — large, faded */}
              <div className="absolute top-5 right-6 text-[64px] font-extrabold leading-none text-white/[0.03] select-none pointer-events-none">
                {idx + 1}
              </div>

              {/* Icon container */}
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${step.accent} shadow-lg mb-5 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3`}
              >
                <step.Icon className="h-5 w-5 text-white" strokeWidth={2} />
              </div>

              {/* Content */}
              <h3 className="text-base font-bold text-white mb-2 tracking-tight">
                {step.title}
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                {step.desc}
              </p>

              {/* Bottom accent line */}
              <div
                className={`absolute bottom-0 left-7 right-7 h-px bg-gradient-to-r ${step.accent} opacity-0 group-hover:opacity-40 transition-opacity duration-300`}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
