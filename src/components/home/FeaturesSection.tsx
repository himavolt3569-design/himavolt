"use client";

import { motion } from "framer-motion";
import { QrCode, Truck, Gift } from "lucide-react";

const features = [
  {
    num: "01",
    title: "Scan & Dine",
    headline: "Your table, your menu, your pace.",
    description:
      "Walk in, scan the QR code at your table, and start browsing the full digital menu. No waiting, no waving down staff. Customize every dish and order when you are ready.",
    badge: "Dine-In",
    Icon: QrCode,
    accent: "var(--accent)",
  },
  {
    num: "02",
    title: "Order & Track",
    headline: "From kitchen to door, live.",
    description:
      "Place your order from anywhere and watch it move in real time. Live tracking from prep to pickup to your doorstep, so you always know exactly where your food is.",
    badge: "Delivery",
    Icon: Truck,
    accent: "var(--accent-hover)",
  },
  {
    num: "03",
    title: "Earn & Save",
    headline: "Every order earns you more.",
    description:
      "Collect loyalty points on every order, unlock exclusive deals, and get rewarded just for eating the food you love. Points never expire.",
    badge: "Rewards",
    Icon: Gift,
    accent: "var(--accent-text)",
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.05 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

export default function FeaturesSection() {
  return (
    <section className="bg-[var(--canvas-sub)] py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-8 lg:px-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-12 md:mb-16"
        >
          <span className="inline-flex items-center rounded-full bg-[var(--accent-muted)] border border-[var(--accent-border)] px-3 py-1 text-[10px] font-bold text-[var(--accent-text)] uppercase tracking-wider mb-4">
            Why HimaVolt
          </span>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[var(--text-1)] leading-[1.1]">
            Built for Nepal.
            <br />
            <span className="text-[var(--text-3)]">Designed for now.</span>
          </h2>
        </motion.div>

        {/* Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6"
        >
          {features.map((f) => (
            <motion.div
              key={f.num}
              variants={cardVariants}
              className="relative rounded-2xl border border-[var(--border)] bg-[var(--canvas)] p-7 md:p-8 overflow-hidden group hover:border-[var(--accent-border)] transition-colors duration-300"
            >
              <span className="absolute top-4 right-6 text-[72px] font-black leading-none text-[var(--text-1)]/[0.03] select-none pointer-events-none">
                {f.num}
              </span>

              <div className="flex items-center gap-3 mb-6">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--accent-border)] bg-[var(--accent-muted)]"
                >
                  <f.Icon
                    className="h-5 w-5 text-[var(--accent)]"
                    strokeWidth={1.8}
                  />
                </div>
                <span className="inline-flex items-center rounded-md bg-[var(--accent-muted)] border border-[var(--accent-border)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--accent-text)]">
                  {f.badge}
                </span>
              </div>

              <h3 className="text-[15px] font-semibold text-[var(--text-1)] tracking-tight mb-1.5">
                {f.title}
              </h3>
              <p className="text-sm font-semibold text-[var(--text-2)] mb-3">
                {f.headline}
              </p>
              <p className="text-sm leading-relaxed text-[var(--text-2)]">
                {f.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
