"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  Percent,
  Timer,
  Gift,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

const deals = [
  {
    id: 1,
    title: "50% Off First Order",
    subtitle: "Use code NAMASTE50 at checkout",
    Icon: Percent,
    gradient: "from-[#eaa94d] to-[#d67620]",
    bg: "bg-[#eaa94d]/6",
    border: "border-[#eaa94d]/12",
  },
  {
    id: 2,
    title: "Free Delivery Weekend",
    subtitle: "Every Saturday & Sunday, no minimum order",
    Icon: Timer,
    gradient: "from-[#e58f2a] to-[#b25c1c]",
    bg: "bg-[#e58f2a]/6",
    border: "border-[#e58f2a]/12",
  },
  {
    id: 3,
    title: "Dine-in Rewards",
    subtitle: "Earn points on every meal you scan & order",
    Icon: Gift,
    gradient: "from-[#d67620] to-[#8e491e]",
    bg: "bg-[#d67620]/6",
    border: "border-[#d67620]/12",
  },
];

export default function DealsSection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  /* Parallax on the floating food images */
  const img1Y = useTransform(scrollYProgress, [0, 1], [40, -40]);
  const img2Y = useTransform(scrollYProgress, [0, 1], [20, -60]);
  const img3Y = useTransform(scrollYProgress, [0, 1], [60, -20]);

  return (
    <section ref={sectionRef} className="bg-white">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8 lg:px-12 py-16 md:py-24">
        {/* ── Banner ── */}
        <div
          className="relative overflow-hidden rounded-3xl bg-linear-to-br from-[#eaa94d] via-[#e58f2a] to-[#d67620] p-8 md:p-12 lg:p-16 mb-10"
        >
          {/* Floating food images with parallax */}
          <div className="absolute right-0 top-0 bottom-0 w-[45%] hidden md:block pointer-events-none">
            <motion.div
              style={{ y: img1Y }}
              className="absolute top-6 right-8 h-28 w-28 lg:h-36 lg:w-36 overflow-hidden rounded-2xl rotate-6 shadow-2xl shadow-black/30"
            >
              <img
                src="https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=300&h=300&fit=crop"
                alt=""
                className="h-full w-full object-cover"
              />
            </motion.div>
            <motion.div
              style={{ y: img2Y }}
              className="absolute bottom-8 right-20 lg:right-28 h-24 w-24 lg:h-32 lg:w-32 overflow-hidden rounded-2xl -rotate-3 shadow-2xl shadow-black/30"
            >
              <img
                src="https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=300&h=300&fit=crop"
                alt=""
                className="h-full w-full object-cover"
              />
            </motion.div>
            <motion.div
              style={{ y: img3Y }}
              className="absolute top-1/2 -translate-y-1/2 right-44 lg:right-56 h-20 w-20 lg:h-28 lg:w-28 overflow-hidden rounded-2xl rotate-12 shadow-2xl shadow-black/30"
            >
              <img
                src="https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=300&h=300&fit=crop"
                alt=""
                className="h-full w-full object-cover"
              />
            </motion.div>
          </div>

          {/* Grain texture */}
          <div
            className="absolute inset-0 opacity-[0.05] pointer-events-none"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg width='4' height='4' viewBox='0 0 4 4' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000' fill-opacity='1'%3E%3Ccircle cx='1' cy='1' r='0.5'/%3E%3C/g%3E%3C/svg%3E\")",
            }}
          />

          {/* Decorative orb */}
          <div className="absolute -top-20 -right-20 h-75 w-75 rounded-full bg-white/8 blur-[60px] pointer-events-none" />

          <div className="relative z-10 max-w-lg">
            <motion.div
              initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0, ease: [0.16, 1, 0.3, 1] }}
              className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-sm px-4 py-2 text-[11px] font-bold text-white/90 uppercase tracking-wider border border-white/10 mb-5"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Limited time offers
            </motion.div>
            <motion.h3
              initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-[1.1] mb-3"
            >
              Deals that make
              <br />
              <span className="text-white/70">your wallet smile.</span>
            </motion.h3>
            <motion.p
              initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="text-sm text-white/50 font-medium mb-6 max-w-md"
            >
              Save big on your favourite meals. New deals every week across 100+
              restaurants in Kathmandu.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
            >
              <Link
                href="/offers"
                className="group inline-flex items-center gap-2.5 rounded-full bg-white px-6 py-3 text-sm font-bold text-[#3e1e0c] shadow-lg shadow-black/20 transition-all hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
              >
                View All Offers
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </motion.div>
          </div>
        </div>

        {/* ── Deal cards grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {deals.map((deal, i) => (
            <motion.div
              key={deal.id}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{
                y: -6,
                transition: { type: "spring", stiffness: 300, damping: 18 },
              }}
              className={`group relative rounded-2xl border ${deal.border} ${deal.bg} p-6 transition-all duration-300 hover:shadow-lg hover:shadow-[#eaa94d]/8 cursor-pointer`}
            >
              <motion.div
                whileHover={{ scale: 1.1, rotate: -6 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
                className={`flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br ${deal.gradient} shadow-md mb-4`}
              >
                <deal.Icon className="h-5 w-5 text-white" strokeWidth={2} />
              </motion.div>
              <h4 className="text-base font-bold text-[#3e1e0c] mb-1 tracking-tight">
                {deal.title}
              </h4>
              <p className="text-sm text-[#8e491e]/60 leading-relaxed">
                {deal.subtitle}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
