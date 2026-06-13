"use client";

import { useRef, useState, MouseEvent } from "react";
import { motion, useTransform, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import { ArrowRight, Percent, Timer, Trophy, Zap, Heart, Sparkles } from "lucide-react";
import Link from "next/link";

const BENTO_DEALS = [
  {
    id: 1,
    title: "50% Off First Order",
    desc: "Welcome to Himavolt family",
    code: "NAMASTE50",
    icon: Percent,
    color: "bg-orange-500",
    size: "large",
    img: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=800&h=600&fit=crop",
  },
  {
    id: 2,
    title: "Free Delivery",
    desc: "Saturdays are for feasting",
    icon: Timer,
    color: "bg-blue-500",
    size: "small",
    img: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&h=400&fit=crop",
  },
  {
    id: 3,
    title: "Loyalty Points",
    desc: "Earn while you eat",
    icon: Trophy,
    color: "bg-yellow-500",
    size: "small",
    img: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&h=400&fit=crop",
  },
  {
    id: 4,
    title: "BOGOF Deals",
    desc: "Two is better than one",
    icon: Zap,
    color: "bg-purple-500",
    size: "small",
    img: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=400&fit=crop",
  },
  {
    id: 5,
    title: "Student Specials",
    desc: "Fuel for your studies",
    icon: Heart,
    color: "bg-red-500",
    size: "small",
    img: "https://images.unsplash.com/photo-1547592180-85f173990554?w=400&h=400&fit=crop",
  },
];

function BentoCard({ deal, index }: { deal: (typeof BENTO_DEALS)[0]; index: number }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["7.5deg", "-7.5deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-7.5deg", "7.5deg"]);

  const [hovered, setHovered] = useState(false);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
    setHovered(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX: deal.size === "large" ? rotateX : 0,
        rotateY: deal.size === "large" ? rotateY : 0,
        transformStyle: "preserve-3d",
      }}
      className={`group relative overflow-hidden rounded-[2.5rem] bg-[var(--surface)] border border-[var(--border)] p-8 flex flex-col justify-between transition-colors duration-500 hover:border-[var(--accent)]/40 ${
        deal.size === "large" ? "md:col-span-2 md:row-span-2 shadow-xl" : "md:col-span-1 md:row-span-1 shadow-sm"
      } hover:shadow-2xl hover:shadow-[var(--accent)]/10`}
    >
      {/* 3D Content Container */}
      <div style={{ transform: "translateZ(50px)", transformStyle: "preserve-3d" }} className="relative z-10 h-full flex flex-col justify-between">
        <div>
          <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${deal.color} text-white shadow-lg mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
            <deal.icon className="h-6 w-6" />
          </div>
          <h4 className={`font-black text-[var(--text-1)] tracking-tight mb-2 ${deal.size === "large" ? "text-3xl md:text-5xl" : "text-xl"}`}>
            {deal.title}
          </h4>
          <p className="text-[var(--text-3)] font-medium text-sm max-w-[200px]">
            {deal.desc}
          </p>
        </div>

        <div className="mt-8 flex items-end justify-between">
          {deal.code && (
            <div className="px-4 py-2 rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-[var(--accent)] font-black text-xs tracking-widest uppercase backdrop-blur-sm">
              Code: {deal.code}
            </div>
          )}
          <motion.div
            whileHover={{ scale: 1.1, x: 4 }}
            whileTap={{ scale: 0.95 }}
            className="h-10 w-10 rounded-full bg-[var(--accent)] flex items-center justify-center text-white shadow-lg shadow-[var(--accent)]/30 transition-all"
          >
            <ArrowRight className="h-5 w-5" />
          </motion.div>
        </div>
      </div>

      {/* Background with Parallax */}
      <div className="absolute inset-0 z-0">
        <motion.img
          animate={{ 
            scale: hovered ? 1.15 : 1.05, 
            opacity: hovered ? 0.35 : 0.1,
            x: hovered && deal.size === "large" ? 10 : 0,
            y: hovered && deal.size === "large" ? 10 : 0,
          }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          src={deal.img}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover opacity-20 transition-opacity duration-700"
        />
        <div className={`absolute inset-0 bg-linear-to-t from-[var(--surface)] via-[var(--surface)]/80 to-transparent ${hovered ? "opacity-60" : "opacity-100"} transition-opacity duration-500`} />
      </div>

      {/* Glossy Overlay for Large Cards */}
      {deal.size === "large" && (
        <div className="absolute inset-0 z-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_var(--mouse-x,50%)_var(--mouse-y,50%),rgba(255,255,255,0.15),transparent_60%)]" />
        </div>
      )}

      {/* Animated Shine */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ x: "-100%", opacity: 0 }}
            animate={{ x: "100%", opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: "easeInOut" }}
            className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent -skew-x-20 z-20 pointer-events-none"
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function DealsSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  return (
    <section ref={containerRef} className="relative bg-[var(--canvas)] overflow-hidden">
      {/* Abstract Background Shapes */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-[var(--accent)]/[0.03] rounded-full" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-orange-500/[0.03] rounded-full" />
      </div>

      <div className="mx-auto max-w-7xl px-4 md:px-8 lg:px-12 py-24 md:py-32">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-10">
          <div className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20 mb-6"
            >
              <Sparkles className="h-4 w-4 text-[var(--accent)]" />
              <span className="text-xs font-black text-[var(--accent)] uppercase tracking-wider">Exclusive Offers</span>
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl sm:text-5xl md:text-7xl font-black text-[var(--text-1)] tracking-tighter leading-[0.9] mb-4"
            >
              Deals that make <br />
              <span className="relative inline-block">
                your wallet smile
                <motion.span 
                  initial={{ width: 0 }}
                  whileInView={{ width: "100%" }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                  className="absolute -bottom-2 left-0 h-2 bg-[var(--accent)]/30 rounded-full -z-10"
                />
              </span>
            </motion.h2>
          </div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col items-start md:items-end text-left md:text-right"
          >
            <p className="text-[var(--text-3)] font-medium mb-8 max-w-xs leading-relaxed">
              Curated flash deals from Kathmandu&apos;s most loved kitchens. Don&apos;t miss out.
            </p>
            <Link href="/offers">
              <motion.button
                whileHover={{ scale: 1.05, x: 4 }}
                whileTap={{ scale: 0.95 }}
                className="group px-10 py-5 rounded-[2rem] bg-[var(--text-1)] text-[var(--canvas)] font-black text-base shadow-2xl shadow-black/20 flex items-center gap-3"
              >
                View All Deals
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </motion.button>
            </Link>
          </motion.div>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 auto-rows-[260px]">
          {BENTO_DEALS.map((deal, i) => (
            <BentoCard key={deal.id} deal={deal} index={i} />
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 md:px-8 lg:px-12">
        <div className="h-px bg-linear-to-r from-transparent via-[var(--border)] to-transparent opacity-50" />
      </div>
    </section>
  );
}
