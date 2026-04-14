"use client";

import { motion } from "framer-motion";
import { QrCode, Truck, Gift } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const features = [
  {
    num: "01",
    title: "Scan & Dine",
    headline: "Your table, your menu, your pace.",
    description:
      "Walk in, scan the QR code at your table, and start browsing the full digital menu. No waiting, no waving down staff. Customize every dish and order when you are ready.",
    badge: "Dine-In",
    Icon: QrCode,
    accent: "#eaa94d",
  },
  {
    num: "02",
    title: "Order & Track",
    headline: "From kitchen to door, live.",
    description:
      "Place your order from anywhere and watch it move in real time. Live tracking from prep to pickup to your doorstep, so you always know exactly where your food is.",
    badge: "Delivery",
    Icon: Truck,
    accent: "#d67620",
  },
  {
    num: "03",
    title: "Earn & Save",
    headline: "Every order earns you more.",
    description:
      "Collect loyalty points on every order, unlock exclusive deals, and get rewarded just for eating the food you love. Points never expire.",
    badge: "Rewards",
    Icon: Gift,
    accent: "#b25c1c",
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
    <section className="bg-[#fdf9ef] py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-8 lg:px-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-12 md:mb-16"
        >
          <Badge variant="saffron" className="mb-4">
            Why HimaVolt
          </Badge>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#3e1e0c] leading-[1.1]">
            Built for Nepal.
            <br />
            <span className="text-[#8e491e]/50">Designed for now.</span>
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
              className="relative rounded-2xl border border-[#f4d69a]/25 bg-white p-7 md:p-8 overflow-hidden group hover:shadow-[0_8px_40px_rgba(234,169,77,0.08)] transition-shadow duration-500"
            >
              {/* Large background number */}
              <span className="absolute top-4 right-6 text-[72px] font-extrabold leading-none text-[#3e1e0c]/[0.035] select-none pointer-events-none">
                {f.num}
              </span>

              <div className="flex items-center gap-3 mb-6">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl border"
                  style={{
                    backgroundColor: `${f.accent}12`,
                    borderColor: `${f.accent}20`,
                  }}
                >
                  <f.Icon
                    className="h-5 w-5"
                    style={{ color: f.accent }}
                    strokeWidth={1.8}
                  />
                </div>
                <Badge variant="saffron">{f.badge}</Badge>
              </div>

              <h3 className="text-base font-extrabold text-[#3e1e0c] tracking-tight mb-1.5">
                {f.title}
              </h3>
              <p className="text-sm font-semibold text-[#3e1e0c]/70 mb-3">
                {f.headline}
              </p>
              <p className="text-sm leading-relaxed text-[#8e491e]/55">
                {f.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
