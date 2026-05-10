"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Clock, Star, ArrowRight, Sparkles } from "lucide-react";

import Link from "next/link";

const ANIMATED_WORDS = ["Delicious", "Fresh", "Fast", "Spicy", "Healthy"];

interface HeroSettings {
  images: { id: string; url: string; order: number }[];
  autoplay: boolean;
  interval: number;
  overlayOpacity: number;
}

const DEFAULT_HERO_SETTINGS: HeroSettings = {
  images: [],
  autoplay: true,
  interval: 5000,
  overlayOpacity: 40,
};

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
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const interval = setInterval(() => {
      setVisible(false);
      timeout = setTimeout(() => {
        setCurrent((prev) => (prev + 1) % liveOrders.length);
        setVisible(true);
      }, 350);
    }, 3500);
    return () => {
      clearInterval(interval);
      if (timeout) clearTimeout(timeout);
    };
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
            className="flex items-center gap-2.5 rounded-2xl bg-[var(--canvas)]/80 backdrop-blur-md border border-[var(--border)] pl-1.5 pr-4 py-1.5 shadow-xl shadow-black/[0.04] max-w-[260px]"
          >
            <div className="h-9 w-9 rounded-xl overflow-hidden shrink-0 ring-1 ring-black/[0.05]">
              <img
                src={order.img}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-[var(--text-1)] truncate">
                {order.name}{" "}
                <span className="text-[var(--text-3)] font-medium">
                  ordered
                </span>{" "}
                <span className="text-[var(--accent)]">{order.item}</span>
              </p>
              <p className="text-[10px] text-[var(--text-3)] flex items-center gap-1 mt-0.5">
                <MapPin className="h-2.5 w-2.5 opacity-70" />
                {order.area} · {order.time}
              </p>
            </div>
            <span className="relative flex h-1.5 w-1.5 shrink-0 ml-1">
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

export default function LandingHero() {
  const [wordIdx, setWordIdx] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [heroSettings, setHeroSettings] = useState<HeroSettings>(
    DEFAULT_HERO_SETTINGS,
  );
  const [currentSlide, setCurrentSlide] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const slideTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch hero settings
  useEffect(() => {
    fetch("/api/admin/hero-settings")
      .then((r) => r.json())
      .then((data) => {
        setHeroSettings({ ...DEFAULT_HERO_SETTINGS, ...data });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setMounted(true);
    timerRef.current = setInterval(() => {
      setWordIdx((i) => (i + 1) % ANIMATED_WORDS.length);
    }, 2200);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Hero carousel auto-slide
  useEffect(() => {
    if (!heroSettings.autoplay || heroSettings.images.length <= 1) return;

    slideTimerRef.current = setInterval(() => {
      setCurrentSlide((i) => (i + 1) % heroSettings.images.length);
    }, heroSettings.interval);

    return () => {
      if (slideTimerRef.current) clearInterval(slideTimerRef.current);
    };
  }, [
    heroSettings.autoplay,
    heroSettings.interval,
    heroSettings.images.length,
  ]);

  const hasHeroImages = heroSettings.images.length > 0;

  return (
    <section className="relative bg-[var(--canvas)] overflow-hidden min-h-[700px] md:min-h-[800px] flex items-center">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 -mr-32 -mt-32 h-[600px] w-[600px] rounded-full bg-[var(--accent)]/[0.04]" />
        <div className="absolute bottom-0 left-0 -ml-32 -mb-32 h-[600px] w-[600px] rounded-full bg-[#e58f2a]/[0.04]" />
      </div>

      {/* Floating Elements (Visible on Desktop) */}
      <div className="absolute inset-0 pointer-events-none hidden lg:block overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=120&h=120&fit=crop"
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute top-[15%] left-[5%] w-24 h-24 rounded-full object-cover shadow-2xl opacity-35"
        />
        <img
          src="https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=120&h=120&fit=crop"
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute bottom-[20%] left-[8%] w-20 h-20 rounded-full object-cover shadow-2xl opacity-30"
        />
        <div className="absolute top-[10%] right-[35%] h-4 w-4 rounded-full bg-[var(--accent)]/20" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 md:px-8 lg:px-12 w-full pt-24 md:pt-32 pb-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Content */}
          <div className="text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-[var(--accent)]/20 to-[var(--accent)]/5 border border-[var(--accent)]/30 backdrop-blur-md mb-6 shadow-[0_4px_12px_rgba(0,0,0,0.05)]"
            >
              <Sparkles className="h-4 w-4 text-[var(--accent)]" />
              <span className="text-xs font-black text-[var(--accent)] uppercase tracking-wider">
                Nepal&apos;s Premium Food Destination
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.65,
                delay: 0.08,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="text-[clamp(2.75rem,10vw,4.5rem)] leading-[1.02] font-black tracking-tighter text-[var(--text-1)]"
            >
              Scan. Order.
              <br />
              <span className="inline-block min-w-[1ch]">
                {mounted ? (
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={ANIMATED_WORDS[wordIdx]}
                      initial={{ y: 36, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -28, opacity: 0 }}
                      transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
                      className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent)] to-orange-400"
                    >
                      {ANIMATED_WORDS[wordIdx]}.
                    </motion.span>
                  </AnimatePresence>
                ) : (
                  <span className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent)] to-orange-400">
                    {ANIMATED_WORDS[0]}.
                  </span>
                )}
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-6 text-base md:text-lg text-[var(--text-2)] max-w-lg mx-auto lg:mx-0 leading-relaxed font-medium"
            >
              Experience the finest flavors of Nepal delivered to your doorstep
              or served at your table with a simple scan.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.6,
                delay: 0.25,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="mt-10 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4"
            >
              <Link href="/menu" className="w-full sm:w-auto">
                <motion.button
                  whileHover={{ scale: 1.05, translateY: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full sm:px-10 py-4.5 rounded-[2rem] bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] text-white font-black text-base shadow-2xl shadow-[var(--accent)]/40 flex items-center justify-center gap-2 hover:shadow-[var(--accent)]/50 transition-all group border border-white/10"
                >
                  Order Now
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </motion.button>
              </Link>
              <button
                onClick={() => {
                  document
                    .getElementById("explore-cuisines")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
                className="w-full sm:w-auto"
              >
                <motion.div
                  whileHover={{ scale: 1.05, translateY: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full sm:px-10 py-4.5 rounded-[2rem] font-black text-base border-2 border-[var(--border)] bg-[var(--canvas)]/50 backdrop-blur-sm text-[var(--text-1)] hover:bg-[var(--surface)] hover:border-[var(--accent)]/30 transition-all flex items-center justify-center shadow-lg shadow-black/5"
                >
                  Explore Menu
                </motion.div>
              </button>
            </motion.div>

            {/* Why Himavolt / Mobile Visual */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-12 lg:hidden"
            >
              <div className="relative aspect-[16/9] w-full rounded-3xl overflow-hidden shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1547592180-85f173990554?w=800&h=450&fit=crop"
                  alt="Himavolt Experience"
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6 text-left">
                  <p className="text-[var(--accent)] font-black text-xs uppercase tracking-widest mb-1">
                    Why Himavolt?
                  </p>
                  <h4 className="text-white font-black text-xl mb-2">
                    Nepal&apos;s First Smart Ordering
                  </h4>
                  <p className="text-white/80 text-xs font-medium max-w-[280px]">
                    Scan QR at your table to order instantly. No waiting, just
                    pure flavors.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right: Visual Image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, rotate: 5 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative hidden lg:block"
          >
            <div className="relative aspect-square max-w-[540px] ml-auto">
              {/* Main Circular Image */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[var(--accent)]/10 to-transparent" />
              <div className="relative h-full w-full rounded-[4rem] overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] group">
                <img
                  src="https://images.unsplash.com/photo-1547592180-85f173990554?w=800&h=800&fit=crop"
                  alt="Premium Food"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              {/* Decorative "Overlapping" Badges */}
              <motion.div
                initial={{ x: 40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.6 }}
                className="absolute -right-8 top-1/4 bg-white/90 backdrop-blur-xl p-4 rounded-3xl shadow-2xl border border-white/20"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                    <Star className="h-5 w-5 text-green-500 fill-green-500" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-900">
                      Top Rated
                    </p>
                    <p className="text-[10px] font-bold text-slate-500">
                      4.9/5 Service
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ x: -40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 1, duration: 0.6 }}
                className="absolute -left-12 bottom-1/4 bg-white/90 backdrop-blur-xl p-4 rounded-3xl shadow-2xl border border-white/20"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)]">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-900">
                      Fast Delivery
                    </p>
                    <p className="text-[10px] font-bold text-slate-500">
                      Under 20 Mins
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Quick Food Shelf */}
        <motion.div
          initial={{ opacity: 0, y: 36 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mt-20"
        >
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-black text-[var(--text-1)]">
              Trending Now
            </h3>
            <Link
              href="/menu"
              className="text-xs font-bold text-[var(--accent)] hover:underline"
            >
              View Full Menu
            </Link>
          </div>

          {/* Desktop Grid */}
          <div className="hidden md:grid grid-cols-5 gap-6">
            {shelfItems.map((item, i) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.55,
                  delay: 0.6 + i * 0.07,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <Link href="/menu" className="group block">
                  <div className="aspect-square rounded-[2rem] overflow-hidden bg-[var(--surface)] relative shadow-sm transition-all duration-500 group-hover:shadow-2xl group-hover:shadow-black/10 group-hover:-translate-y-1">
                    <img
                      src={item.img}
                      alt={item.name}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/90 backdrop-blur-md px-2 py-1 rounded-xl shadow-sm">
                      <Star className="h-3 w-3 fill-[var(--accent)] text-[var(--accent)]" />
                      <span className="text-[11px] font-black text-slate-900">
                        {item.rating}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm font-black text-[var(--text-1)] truncate group-hover:text-[var(--accent)] transition-colors">
                      {item.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] text-[var(--text-3)] font-medium">
                        {item.restaurant}
                      </span>
                      <div className="h-1 w-1 rounded-full bg-[var(--border)]" />
                      <span className="text-[11px] text-[var(--accent)] font-bold">
                        {item.time}
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Mobile Scroll */}
          <div className="flex gap-4 overflow-x-auto pb-6 -mx-4 px-4 md:hidden scrollbar-none">
            {shelfItems.map((item) => (
              <Link
                key={item.name}
                href="/menu"
                className="shrink-0 w-[180px] group"
              >
                <div className="aspect-square rounded-[2rem] overflow-hidden bg-[var(--surface)] relative shadow-sm">
                  <img
                    src={item.img}
                    alt={item.name}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute top-2.5 right-2.5 bg-white/90 backdrop-blur-md px-1.5 py-0.5 rounded-lg">
                    <span className="text-[10px] font-black">
                      ★ {item.rating}
                    </span>
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-sm font-black text-[var(--text-1)] truncate">
                    {item.name}
                  </p>
                  <p className="text-[11px] text-[var(--text-3)] mt-0.5">
                    {item.restaurant} · {item.time}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </motion.div>
      </div>

      <LiveOrderFeed />
    </section>
  );
}
// Force Next.js HMR recompile
