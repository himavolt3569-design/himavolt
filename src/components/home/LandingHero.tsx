"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
  AnimatePresence,
} from "framer-motion";
import { ArrowRight, QrCode, Truck, ChevronDown, MapPin } from "lucide-react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Link from "next/link";

/* ═══════════════════════════════════════════════════════
   CRAVING STRIP DATA — mouth-watering food showcase
   ═══════════════════════════════════════════════════════ */
const cravingItems = [
  { name: "Chicken Momo", tag: "🔥 Most Ordered", img: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=100&h=100&fit=crop", hot: true },
  { name: "Thakali Set", tag: "⭐ Top Rated", img: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=100&h=100&fit=crop", hot: false },
  { name: "Cheese Pizza", tag: "🍕 Trending", img: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=100&h=100&fit=crop", hot: true },
  { name: "Buff Sekuwa", tag: "🔥 Popular", img: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=100&h=100&fit=crop", hot: false },
  { name: "Newari Khaja", tag: "🏆 Chef's Pick", img: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=100&h=100&fit=crop", hot: true },
  { name: "Dal Bhat Power", tag: "❤️ Classic", img: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=100&h=100&fit=crop", hot: false },
  { name: "Chatamari", tag: "🍛 Nepali Pizza", img: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=100&h=100&fit=crop", hot: false },
  { name: "Buff Chhoila", tag: "🔥 Spicy Hit", img: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=100&h=100&fit=crop", hot: true },
];

/* ═══════════════════════════════════════════════════════
   LIVE ORDER FEED — creates FOMO
   ═══════════════════════════════════════════════════════ */
const liveOrders = [
  { name: "Aarav", area: "Thamel", item: "Chicken Momo", time: "2 min ago", img: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=80&h=80&fit=crop" },
  { name: "Priya", area: "Lazimpat", item: "Thakali Set", time: "just now", img: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=80&h=80&fit=crop" },
  { name: "Bikash", area: "Baluwatar", item: "Cheese Pizza", time: "1 min ago", img: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=80&h=80&fit=crop" },
  { name: "Sita", area: "Patan", item: "Dal Bhat", time: "just now", img: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=80&h=80&fit=crop" },
  { name: "Rohan", area: "Baneshwor", item: "Sekuwa Plate", time: "3 min ago", img: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=80&h=80&fit=crop" },
  { name: "Anisha", area: "Jhamsikhel", item: "Newari Khaja", time: "just now", img: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=80&h=80&fit=crop" },
  { name: "Kiran", area: "Bouddha", item: "Buff Chhoila", time: "2 min ago", img: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=80&h=80&fit=crop" },
  { name: "Diya", area: "Maharajgunj", item: "Chatamari", time: "just now", img: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=80&h=80&fit=crop" },
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
      }, 400);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const order = liveOrders[current];

  return (
    <div className="absolute bottom-24 md:bottom-16 left-4 md:left-8 lg:left-12 z-20">
      <AnimatePresence mode="wait">
        {visible && (
          <motion.div
            key={current}
            initial={{ opacity: 0, y: 16, scale: 0.95, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -10, scale: 0.95, filter: "blur(4px)" }}
            transition={{
              duration: 0.35,
              ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
            }}
            className="flex items-center gap-3 rounded-2xl bg-white/80 backdrop-blur-xl pl-1.5 pr-4 py-1.5 shadow-lg shadow-[#3e1e0c]/[0.06] border border-white/60 max-w-xs"
          >
            <div className="h-10 w-10 rounded-xl overflow-hidden shrink-0 ring-1 ring-[#eaa94d]/10">
              <img
                src={order.img}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-bold text-[#3e1e0c] truncate">
                {order.name} ordered{" "}
                <span className="text-[#d67620]">{order.item}</span>
              </p>
              <p className="text-[10px] text-[#8e491e]/40 flex items-center gap-1">
                <MapPin className="h-2.5 w-2.5" />
                {order.area} &middot; {order.time}
              </p>
            </div>
            {/* Pulse indicator */}
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#1e7b3e]/60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#1e7b3e]" />
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAGNETIC BUTTON — subtly pulls toward cursor
   ═══════════════════════════════════════════════════════ */
function MagneticButton({
  children,
  className,
  href,
}: {
  children: React.ReactNode;
  className: string;
  href: string;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 200, damping: 20 });
  const springY = useSpring(y, { stiffness: 200, damping: 20 });

  const handleMouse = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      x.set((e.clientX - centerX) * 0.2);
      y.set((e.clientY - centerY) * 0.2);
    },
    [x, y],
  );

  const handleLeave = useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);

  return (
    <motion.a
      ref={ref}
      href={href}
      style={{ x: springX, y: springY }}
      onMouseMove={handleMouse}
      onMouseLeave={handleLeave}
      className={className}
    >
      {children}
    </motion.a>
  );
}

/* ═══════════════════════════════════════════════════════
   ANIMATION VARIANTS
   ═══════════════════════════════════════════════════════ */
const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.15 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.7,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  },
};

const imageReveal = {
  hidden: { opacity: 0, scale: 0.85, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.7,
      delay: 0.3 + i * 0.1,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  }),
};

/* PLACEHOLDER images — replace with real food photography */
const foodImages = [
  "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=400&h=500&fit=crop",
  "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&h=500&fit=crop",
];

/* Per-image parallax depth multipliers */
const depthFactors = [0.8, 1.2, 0.6, 1.0];

/* ═══════════════════════════════════════════════════════
   HERO COMPONENT
   ═══════════════════════════════════════════════════════ */
export default function LandingHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  /* Scroll-linked transforms */
  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 500], [1, 0]);
  const heroY = useTransform(scrollY, [0, 500], [0, 60]);

  /* ── Mouse tracking for 3D tilt + parallax ── */
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  /* Spring-smoothed values for the grid tilt */
  const springConfig = { stiffness: 80, damping: 30, mass: 0.8 };
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [8, -8]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-8, 8]), springConfig);

  /* Per-image parallax offsets (each at different depth) */
  const imgOffsets = depthFactors.map((depth) => ({
    x: useSpring(useTransform(mouseX, [-0.5, 0.5], [-20 * depth, 20 * depth]), springConfig),
    y: useSpring(useTransform(mouseY, [-0.5, 0.5], [-20 * depth, 20 * depth]), springConfig),
  }));

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      mouseX.set(x);
      mouseY.set(y);
    },
    [mouseX, mouseY],
  );

  const handleMouseLeave = useCallback(() => {
    mouseX.set(0);
    mouseY.set(0);
  }, [mouseX, mouseY]);

  /* GSAP: gentle float on bento images */
  useGSAP(
    () => {
      if (!gridRef.current) return;
      const imgs = gsap.utils.toArray<HTMLElement>(".bento-img");
      imgs.forEach((el, i) => {
        gsap.to(el, {
          y: `${6 + i * 3}`,
          rotation: 1.5 - i * 0.8,
          duration: 4 + i * 0.6,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        });
      });
    },
    { scope: containerRef },
  );

  return (
    <motion.section
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ opacity: heroOpacity, y: heroY }}
      className="relative min-h-[100svh] flex items-center overflow-hidden"
    >
      {/* ── Video Background ── */}
      {/* Replace /hero-video.mp4 with your own video file placed in the /public folder */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
        src="/hero-video.mp4"
      />

      {/* Warm overlay — left side darker for text legibility, fades right for bento grid */}
      <div className="absolute inset-0 bg-linear-to-r from-[#3e1e0c]/85 via-[#3e1e0c]/60 to-[#1a0a03]/30" />
      {/* Extra top/bottom darkening */}
      <div className="absolute inset-0 bg-linear-to-b from-black/20 via-transparent to-black/40" />

      {/* Grain */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 6 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23fff' fill-opacity='1'%3E%3Ccircle cx='1' cy='1' r='0.6'/%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />

      {/* ── Content grid ── */}
      <div className="relative z-10 mx-auto max-w-7xl w-full px-4 md:px-8 lg:px-12 py-24 md:py-28 lg:py-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* ── Left: text ── */}
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="visible"
            className="text-center lg:text-left"
          >
            {/* Badge */}
            <motion.div variants={fadeUp}>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eaa94d]/20 px-4 py-1.5 text-[11px] font-bold text-[#eaa94d] uppercase tracking-wider border border-[#eaa94d]/30">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#1e7b3e] opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#1e7b3e]" />
                </span>
                Now live in Kathmandu
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={fadeUp}
              className="mt-6 text-[2.5rem] leading-[1.05] sm:text-5xl md:text-6xl lg:text-[4.25rem] font-extrabold tracking-tight text-white"
            >
              Nepal&apos;s Smartest
              <br />
              <span className="text-transparent bg-clip-text bg-linear-to-r from-[#d67620] via-[#eaa94d] to-[#e58f2a]">
                Food Platform.
              </span>
            </motion.h1>

            {/* Tagline */}
            <motion.p
              variants={fadeUp}
              className="mt-4 text-lg sm:text-xl md:text-2xl font-semibold text-white/70 tracking-tight"
            >
              Scan. Order. Stay.
            </motion.p>

            {/* Description */}
            <motion.p
              variants={fadeUp}
              className="mt-3 text-sm sm:text-base text-white/55 max-w-md mx-auto lg:mx-0 leading-relaxed"
            >
              Premium dining & lightning-fast delivery across Kathmandu. Your
              next meal is one scan away.
            </motion.p>

            {/* CTAs — magnetic on desktop */}
            <motion.div
              variants={fadeUp}
              className="mt-8 flex flex-col sm:flex-row items-center lg:items-start gap-3"
            >
              <MagneticButton
                href="/menu"
                className="group w-full sm:w-auto flex items-center justify-center gap-2 rounded-full bg-[#3e1e0c] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#3e1e0c]/15 transition-all duration-300 hover:shadow-xl active:scale-[0.98]"
              >
                <Truck className="h-4 w-4" />
                Order Delivery
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
              </MagneticButton>
              <MagneticButton
                href="/scan"
                className="group w-full sm:w-auto flex items-center justify-center gap-2 rounded-full bg-white/70 backdrop-blur-sm px-6 py-3 text-sm font-bold text-[#8e491e] border border-[#f4d69a]/60 shadow-sm transition-all duration-300 hover:bg-white hover:shadow-md active:scale-[0.98]"
              >
                <QrCode className="h-4 w-4 text-[#e58f2a]" />
                Scan Table QR
              </MagneticButton>
            </motion.div>

            {/* ── Craving Strip — auto-scrolling food showcase ── */}
            <motion.div variants={fadeUp} className="mt-8 w-full max-w-md mx-auto lg:mx-0 lg:max-w-lg">
              <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-2.5 text-center lg:text-left">
                🔥 Trending right now
              </p>
              <div className="relative overflow-hidden rounded-2xl">
                {/* Fade masks */}
                <div className="absolute left-0 top-0 bottom-0 w-8 bg-linear-to-r from-black/30 to-transparent z-10 pointer-events-none" />
                <div className="absolute right-0 top-0 bottom-0 w-8 bg-linear-to-l from-black/30 to-transparent z-10 pointer-events-none" />
                <motion.div
                  animate={{ x: ["0%", "-50%"] }}
                  transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                  className="flex gap-2.5 w-max"
                >
                  {[...cravingItems, ...cravingItems].map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2.5 rounded-2xl bg-white/80 backdrop-blur-sm pl-1.5 pr-4 py-1.5 border border-[#f4d69a]/25 shadow-sm shrink-0 hover:shadow-md hover:border-[#eaa94d]/30 transition-all duration-300"
                    >
                      <div className="relative h-10 w-10 rounded-xl overflow-hidden shrink-0">
                        <img src={item.img} alt={item.name} className="h-full w-full object-cover" />
                        {item.hot && (
                          <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#e58f2a]/60" />
                            <span className="relative inline-flex h-3 w-3 rounded-full bg-[#e58f2a] border border-white" />
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[12px] font-bold text-[#3e1e0c] truncate">{item.name}</p>
                        <p className="text-[10px] text-[#b25c1c]/50 font-medium">{item.tag}</p>
                      </div>
                    </div>
                  ))}
                </motion.div>
              </div>
            </motion.div>
          </motion.div>

          {/* ══════════════════════════════════════════════
             Right: 3D TILT BENTO GRID (desktop)
             Mouse-reactive perspective with per-image
             parallax depth — each image floats at a
             different "layer" creating real depth.
             ══════════════════════════════════════════════ */}
          <div ref={gridRef} className="hidden lg:block relative">
            <motion.div
              style={{
                rotateX,
                rotateY,
                transformPerspective: 1000,
                transformStyle: "preserve-3d",
              }}
              className="grid grid-cols-2 gap-3 max-w-md ml-auto"
            >
              {/* Col 1 */}
              <div className="space-y-3">
                <motion.div
                  custom={0}
                  variants={imageReveal}
                  initial="hidden"
                  animate="visible"
                  style={{ x: imgOffsets[0].x, y: imgOffsets[0].y }}
                  className="bento-img aspect-[4/5] rounded-3xl overflow-hidden shadow-xl shadow-[#eaa94d]/10 ring-1 ring-white/60"
                >
                  <img
                    src={foodImages[0]}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-700 hover:scale-110"
                  />
                </motion.div>
                <motion.div
                  custom={2}
                  variants={imageReveal}
                  initial="hidden"
                  animate="visible"
                  style={{ x: imgOffsets[2].x, y: imgOffsets[2].y }}
                  className="bento-img aspect-square rounded-3xl overflow-hidden shadow-xl shadow-[#eaa94d]/10 ring-1 ring-white/60"
                >
                  <img
                    src={foodImages[1]}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-700 hover:scale-110"
                  />
                </motion.div>
              </div>
              {/* Col 2 — offset down */}
              <div className="space-y-3 pt-10">
                <motion.div
                  custom={1}
                  variants={imageReveal}
                  initial="hidden"
                  animate="visible"
                  style={{ x: imgOffsets[1].x, y: imgOffsets[1].y }}
                  className="bento-img aspect-square rounded-3xl overflow-hidden shadow-xl shadow-[#eaa94d]/10 ring-1 ring-white/60"
                >
                  <img
                    src={foodImages[2]}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-700 hover:scale-110"
                  />
                </motion.div>
                <motion.div
                  custom={3}
                  variants={imageReveal}
                  initial="hidden"
                  animate="visible"
                  style={{ x: imgOffsets[3].x, y: imgOffsets[3].y }}
                  className="bento-img aspect-[4/5] rounded-3xl overflow-hidden shadow-xl shadow-[#eaa94d]/10 ring-1 ring-white/60"
                >
                  <img
                    src={foodImages[3]}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-700 hover:scale-110"
                  />
                </motion.div>
              </div>
            </motion.div>

            {/* Floating glow behind grid that reacts to mouse */}
            <motion.div
              style={{
                x: useSpring(useTransform(mouseX, [-0.5, 0.5], [-30, 30]), springConfig),
                y: useSpring(useTransform(mouseY, [-0.5, 0.5], [-30, 30]), springConfig),
              }}
              className="absolute -inset-10 rounded-full bg-[#eaa94d]/[0.05] blur-[80px] pointer-events-none -z-10"
            />
          </div>
        </div>
      </div>

      {/* ── Live order feed ── */}
      <LiveOrderFeed />

      {/* ── Scroll indicator ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.8 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex-col items-center gap-1.5 hidden md:flex"
      >
        <motion.div
          animate={{ y: [0, 5, 0] }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <ChevronDown className="h-4 w-4 text-white/40" />
        </motion.div>
      </motion.div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-linear-to-t from-black/50 to-transparent pointer-events-none" />
    </motion.section>
  );
}
