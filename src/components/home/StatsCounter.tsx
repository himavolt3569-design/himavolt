"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { TrendingUp, Users, MapPin, Clock } from "lucide-react";

/* ── Animated counter ── */
function useCounter(end: number, duration = 2200) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  useEffect(() => {
    if (!inView) return;
    const startTime = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      /* easeOutExpo for that satisfying deceleration */
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(Math.floor(end * eased));
      if (progress >= 1) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [inView, end, duration]);

  return { count, ref };
}

const stats = [
  {
    label: "Orders Delivered",
    value: 58000,
    suffix: "+",
    Icon: TrendingUp,
    color: "#eaa94d",
  },
  {
    label: "Happy Customers",
    value: 12000,
    suffix: "+",
    Icon: Users,
    color: "#e58f2a",
  },
  {
    label: "Restaurant Partners",
    value: 150,
    suffix: "+",
    Icon: MapPin,
    color: "#d67620",
  },
  {
    label: "Avg Delivery Time",
    value: 22,
    suffix: " min",
    Icon: Clock,
    color: "#b25c1c",
  },
];

export default function StatsCounter() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const bgX = useTransform(scrollYProgress, [0, 1], ["-10%", "10%"]);

  const counters = stats.map((s) => useCounter(s.value));

  return (
    <section
      ref={sectionRef}
      className="relative py-16 md:py-20 overflow-hidden"
    >
      {/* Animated gradient background */}
      <motion.div
        style={{ x: bgX }}
        className="absolute inset-0 bg-linear-to-r from-[#3e1e0c] via-[#2a1408] to-[#3e1e0c]"
      />

      {/* Subtle texture */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 6 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23fff' fill-opacity='1'%3E%3Ccircle cx='1' cy='1' r='0.6'/%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />

      {/* Glow orbs */}
      <div className="absolute top-0 left-1/4 w-60 h-40 rounded-full bg-[#eaa94d]/[0.06] blur-[80px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-60 h-40 rounded-full bg-[#d67620]/[0.06] blur-[80px] pointer-events-none" />

      <div className="relative mx-auto max-w-6xl px-4 md:px-8 lg:px-12">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {stats.map((stat, i) => {
            const counter = counters[i];
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{
                  duration: 0.6,
                  delay: i * 0.1,
                  ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
                }}
                className="group relative text-center"
              >
                {/* Icon */}
                <motion.div
                  whileHover={{ scale: 1.15, rotate: -6 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.06] transition-colors duration-300"
                  style={{ backgroundColor: `${stat.color}15` }}
                >
                  <stat.Icon
                    className="h-5 w-5"
                    style={{ color: stat.color }}
                    strokeWidth={2}
                  />
                </motion.div>

                {/* Number */}
                <span
                  ref={counter.ref}
                  className="block text-3xl md:text-4xl font-extrabold text-white tabular-nums tracking-tight"
                >
                  {counter.count.toLocaleString()}
                  <span style={{ color: stat.color }}>{stat.suffix}</span>
                </span>

                {/* Label */}
                <p className="mt-1.5 text-xs font-medium text-white/30 uppercase tracking-wider">
                  {stat.label}
                </p>

                {/* Separator (between items on desktop) */}
                {i < stats.length - 1 && (
                  <div className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 h-16 w-px bg-white/[0.06]" />
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
