"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, QrCode, Truck, MapPin, Clock, Star } from "lucide-react";
import Link from "next/link";

const liveOrders = [
  {
    name: "Aarav",
    area: "Thamel",
    item: "Chicken Momo",
    time: "2 min ago",
    img: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=80&h=80&fit=crop",
  },
  {
    name: "Priya",
    area: "Lazimpat",
    item: "Thakali Set",
    time: "just now",
    img: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=80&h=80&fit=crop",
  },
  {
    name: "Bikash",
    area: "Baluwatar",
    item: "Cheese Pizza",
    time: "1 min ago",
    img: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=80&h=80&fit=crop",
  },
  {
    name: "Sita",
    area: "Patan",
    item: "Dal Bhat",
    time: "just now",
    img: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=80&h=80&fit=crop",
  },
  {
    name: "Rohan",
    area: "Baneshwor",
    item: "Sekuwa Plate",
    time: "3 min ago",
    img: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=80&h=80&fit=crop",
  },
  {
    name: "Anisha",
    area: "Jhamsikhel",
    item: "Newari Khaja",
    time: "just now",
    img: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=80&h=80&fit=crop",
  },
];

function LiveOrderFeed() {
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setCurrent((prev) => (prev + 1) % liveOrders.length);
        setVisible(true);
      }, 350);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const order = liveOrders[current];

  return (
    <div className="absolute bottom-6 left-4 md:left-8 lg:left-12 z-20">
      <AnimatePresence mode="wait">
        {visible && (
          <motion.div
            key={current}
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-2.5 rounded-2xl bg-[var(--canvas)] border border-[var(--border)] pl-1.5 pr-4 py-1.5 shadow-lg shadow-black/[0.06] max-w-[260px]"
          >
            <div className="h-9 w-9 rounded-xl overflow-hidden shrink-0">
              <img
                src={order.img}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-[var(--text-1)] truncate">
                {order.name} ordered{" "}
                <span className="text-[var(--accent-hover)]">{order.item}</span>
              </p>
              <p className="text-[10px] text-[var(--text-3)] flex items-center gap-1 mt-0.5">
                <MapPin className="h-2.5 w-2.5" />
                {order.area} · {order.time}
              </p>
            </div>
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)]/60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const shelfItems = [
  {
    name: "Chicken Momo",
    restaurant: "Bota Momo",
    time: "18 min",
    rating: 4.9,
    img: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=320&h=320&fit=crop",
  },
  {
    name: "Thakali Set",
    restaurant: "Thakali Kitchen",
    time: "25 min",
    rating: 4.7,
    img: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=320&h=320&fit=crop",
  },
  {
    name: "Cheese Pizza",
    restaurant: "Pizza Hut KTM",
    time: "30 min",
    rating: 4.6,
    img: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=320&h=320&fit=crop",
  },
  {
    name: "Buff Sekuwa",
    restaurant: "Newari Chowk",
    time: "20 min",
    rating: 4.8,
    img: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=320&h=320&fit=crop",
  },
  {
    name: "Dal Bhat Power",
    restaurant: "Doko Restaurant",
    time: "22 min",
    rating: 4.9,
    img: "https://images.unsplash.com/photo-1547592180-85f173990554?w=320&h=320&fit=crop",
  },
];

const stats = [
  { value: "58K+", label: "Orders" },
  { value: "4.8", label: "Rating" },
  { value: "22 min", label: "Avg Delivery" },
  { value: "150+", label: "Restaurants" },
];

export default function LandingHero() {
  return (
    <section className="relative bg-[var(--canvas)] overflow-hidden">
      <div
        className="absolute top-0 left-0 right-0 h-[500px] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% -5%, rgba(234,169,77,0.08) 0%, transparent 100%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-7xl px-4 md:px-8 lg:px-12 pt-20 md:pt-28 lg:pt-32 pb-10">
        <div className="text-center max-w-2xl mx-auto">
          {/* Live pill
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-muted)] border border-[var(--accent-border)] px-3.5 py-1 text-[10px] font-bold text-[var(--accent-text)] uppercase tracking-wider">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)]/60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
              </span>
              Now live in Kathmandu
            </span>
          </motion.div> */}
          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.65,
              delay: 0.08,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="mt-5 text-[2.75rem] leading-[1.05] sm:text-5xl md:text-6xl lg:text-[4rem] font-black tracking-tight text-[var(--text-1)]"
          >
            Scan. Order. Enjoy.
            <br />
            <span className="text-[var(--accent)]"></span>
          </motion.h1>
          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="mt-4 text-base md:text-lg text-[var(--text-2)] leading-relaxed"
          >
            Scan your table QR to dine-in, or get delivery straight to your door
            - live-tracked from kitchen to doorstep.
          </motion.p>
          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Link
              href="/menu"
              className="group w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-bold text-white shadow-md shadow-[var(--accent)]/20 hover:bg-[var(--accent-hover)] active:scale-[0.97] transition-colors"
            >
              <Truck className="h-4 w-4" />
              Order Delivery
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/scan"
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-[var(--text-1)] px-6 py-3 text-sm font-bold text-[var(--canvas)] hover:opacity-80 active:scale-[0.97] transition-all"
            >
              <QrCode className="h-4 w-4" />
              Scan Table QR
            </Link>
          </motion.div>
          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.38 }}
            className="mt-10 flex items-center justify-center gap-5 md:gap-8"
          >
            {stats.map((s, i) => (
              <div key={s.label} className="flex items-center gap-5 md:gap-8">
                {i > 0 && <div className="h-5 w-px bg-[var(--border)]" />}
                <div className="text-center">
                  <p className="text-lg font-black text-[var(--text-1)] leading-none tabular-nums">
                    {s.value}
                  </p>
                  <p className="text-[10px] text-[var(--text-3)] uppercase tracking-wider mt-0.5">
                    {s.label}
                  </p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Food shelf */}
        <motion.div
          initial={{ opacity: 0, y: 36 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.32, ease: [0.16, 1, 0.3, 1] }}
          className="mt-14 md:mt-16"
        >
          {/* Mobile: horizontal scroll */}
          <div
            className="flex gap-3.5 overflow-x-auto pb-4 -mx-4 px-4 md:hidden"
            style={{ scrollbarWidth: "none" }}
          >
            {shelfItems.map((item) => (
              <Link
                key={item.name}
                href="/menu"
                className="shrink-0 w-[150px] group"
              >
                <div className="aspect-square rounded-2xl overflow-hidden bg-[var(--surface)]">
                  <img
                    src={item.img}
                    alt={item.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <p className="mt-2 text-[13px] font-bold text-[var(--text-1)] truncate">
                  {item.name}
                </p>
                <p className="text-[11px] text-[var(--text-3)] flex items-center gap-1 mt-0.5">
                  <Clock className="h-2.5 w-2.5" />
                  {item.time}
                </p>
              </Link>
            ))}
          </div>

          {/* Desktop: even grid */}
          <div className="hidden md:grid grid-cols-5 gap-5">
            {shelfItems.map((item, i) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.55,
                  delay: 0.38 + i * 0.07,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <Link href="/menu" className="group block">
                  <div className="aspect-square rounded-2xl overflow-hidden bg-[var(--surface)] relative">
                    <img
                      src={item.img}
                      alt={item.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute top-2 right-2 flex items-center gap-1 bg-[var(--canvas)]/90 backdrop-blur-sm px-1.5 py-0.5 rounded-md">
                      <Star className="h-2.5 w-2.5 fill-[var(--accent)] text-[var(--accent)]" />
                      <span className="text-[10px] font-bold text-[var(--text-1)]">
                        {item.rating}
                      </span>
                    </div>
                  </div>
                  <p className="mt-2.5 text-[13px] font-bold text-[var(--text-1)] truncate group-hover:text-[var(--accent)] transition-colors">
                    {item.name}
                  </p>
                  <p className="text-[11px] text-[var(--text-3)] mt-0.5 truncate">
                    {item.restaurant}
                  </p>
                  <p className="text-[11px] text-[var(--text-3)] flex items-center gap-1 mt-0.5">
                    <Clock className="h-2.5 w-2.5" />
                    {item.time}
                  </p>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      <LiveOrderFeed />
    </section>
  );
}
