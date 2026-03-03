"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import {
  motion,
  useScroll,
  useTransform,
  AnimatePresence,
} from "framer-motion";
import { Search, Sparkles } from "lucide-react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

/* ── Animated counter ───────────────────────────────────────────── */
function AnimatedStat({
  value,
  suffix,
  label,
  color,
  delay,
}: {
  value: number;
  suffix: string;
  label: string;
  color: string;
  delay: number;
}) {
  const [count, setCount] = useState(0);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const duration = 1200;
    const start = performance.now();
    let raf: number;
    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * value));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    const t = setTimeout(() => {
      raf = requestAnimationFrame(step);
    }, delay);
    return () => {
      clearTimeout(t);
      cancelAnimationFrame(raf);
    };
  }, [visible, value, delay]);

  return (
    <motion.div
      ref={ref}
      className="text-center"
      initial={{ opacity: 0, y: 16 }}
      animate={visible ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: 0.6,
        delay: delay / 1000,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      <p className={`text-2xl sm:text-3xl font-extrabold ${color}`}>
        {count}
        {suffix}
      </p>
      <p className="text-[11px] sm:text-xs text-gray-400 font-medium mt-0.5">
        {label}
      </p>
    </motion.div>
  );
}

/* ── Typing placeholder ─────────────────────────────────────────── */
const PLACEHOLDERS = [
  "Search for momo...",
  "Craving biryani?",
  "Try dal bhat...",
  "Find pizza nearby...",
  "Want some coffee?",
];

function TypingPlaceholder() {
  const [index, setIndex] = useState(0);
  const [text, setText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const full = PLACEHOLDERS[index];
    let timeout: NodeJS.Timeout;

    if (!deleting && text.length < full.length) {
      timeout = setTimeout(() => setText(full.slice(0, text.length + 1)), 80);
    } else if (!deleting && text.length === full.length) {
      timeout = setTimeout(() => setDeleting(true), 2000);
    } else if (deleting && text.length > 0) {
      timeout = setTimeout(() => setText(text.slice(0, -1)), 40);
    } else {
      setDeleting(false);
      setIndex((i) => (i + 1) % PLACEHOLDERS.length);
    }

    return () => clearTimeout(timeout);
  }, [text, deleting, index]);

  return (
    <span className="text-gray-400 pointer-events-none select-none">
      {text}
      <motion.span
        className="inline-block w-[2px] h-[14px] bg-[#E23744] ml-0.5 align-middle"
        animate={{ opacity: [1, 0, 1] }}
        transition={{ duration: 0.8, repeat: Infinity }}
      />
    </span>
  );
}

export default function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const floatingRef = useRef<HTMLDivElement>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 500], [1, 0.3]);
  const heroY = useTransform(scrollY, [0, 500], [0, 60]);

  useGSAP(
    () => {
      if (bgRef.current) {
        gsap.to(bgRef.current, {
          scale: 1.04,
          duration: 14,
          ease: "power1.inOut",
          yoyo: true,
          repeat: -1,
        });
      }

      // Floating food images
      if (floatingRef.current) {
        const floats = gsap.utils.toArray<HTMLElement>(".float-food");
        floats.forEach((el, i) => {
          gsap.to(el, {
            y: `${10 + i * 3}`,
            rotation: 2 + i,
            duration: 3 + i * 0.5,
            ease: "power1.inOut",
            yoyo: true,
            repeat: -1,
          });
        });
      }
    },
    { scope: containerRef },
  );

  return (
    <motion.section
      ref={containerRef}
      style={{ opacity: heroOpacity, y: heroY }}
      className="relative flex w-full items-center justify-center overflow-hidden"
    >
      {/* Vibrant gradient background */}
      <div ref={bgRef} className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#FFF5F5] via-[#FFE8E8] to-[#FFF0F5]" />
        <div className="absolute top-0 right-0 -mr-32 -mt-32 h-[600px] w-[600px] rounded-full bg-[#E23744]/[0.06] blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-32 -mb-32 h-[600px] w-[600px] rounded-full bg-[#FF6B81]/[0.08] blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[400px] rounded-full bg-[#1E7B3E]/[0.03] blur-3xl" />
      </div>

      {/* Floating food images */}
      <div
        ref={floatingRef}
        className="absolute inset-0 pointer-events-none overflow-hidden"
      >
        <img
          src="https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=120&h=120&fit=crop"
          alt=""
          className="float-food absolute top-[15%] left-[8%] w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover shadow-xl opacity-60 hidden md:block"
        />
        <img
          src="https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=120&h=120&fit=crop"
          alt=""
          className="float-food absolute top-[20%] right-[10%] w-14 h-14 sm:w-18 sm:h-18 rounded-full object-cover shadow-xl opacity-50 hidden md:block"
        />
        <img
          src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=120&h=120&fit=crop"
          alt=""
          className="float-food absolute bottom-[25%] left-[12%] w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover shadow-xl opacity-50 hidden lg:block"
        />
        <img
          src="https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=120&h=120&fit=crop"
          alt=""
          className="float-food absolute bottom-[20%] right-[8%] w-14 h-14 sm:w-18 sm:h-18 rounded-full object-cover shadow-xl opacity-60 hidden lg:block"
        />
      </div>

      <div className="relative z-10 mx-auto max-w-[1440px] w-full px-4 md:px-8 lg:px-12 pt-20 pb-16 md:pt-28 md:pb-24">
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
          {/* Subtle badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mb-5"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E23744]/[0.08] px-4 py-1.5 text-[11px] font-bold text-[#E23744] uppercase tracking-wider border border-[#E23744]/10">
              <motion.span
                animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <Sparkles className="h-3 w-3" />
              </motion.span>
              Nepal&apos;s Smartest Food Platform
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="mb-5 text-[2.5rem] font-extrabold tracking-tight text-[#1F2A2A] sm:text-5xl md:text-6xl lg:text-7xl leading-[1.08]"
          >
            Craving something{" "}
            <motion.span
              className="text-transparent bg-clip-text bg-gradient-to-r from-[#E23744] to-[#FF6B81] inline-block"
              animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
              transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
              style={{ backgroundSize: "200% 200%" }}
            >
              Delicious?
            </motion.span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-8 text-base font-medium text-gray-500 sm:text-lg md:text-xl max-w-xl leading-relaxed"
          >
            Discover the best food around you. Order to your table or get it
            delivered in minutes.
          </motion.p>

          {/* Search bar with typing animation */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex w-full max-w-xl rounded-2xl bg-white p-2 shadow-[0_8px_40px_-12px_rgba(226,55,68,0.15)] sm:rounded-full border border-gray-100/80"
          >
            {/* Focus glow */}
            <AnimatePresence>
              {searchFocused && (
                <motion.div
                  className="absolute -inset-1 rounded-3xl sm:rounded-full bg-[#E23744]/[0.06]"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                />
              )}
            </AnimatePresence>

            <div className="relative flex flex-1 items-center rounded-xl sm:rounded-l-full bg-gray-50/60 transition-all hover:bg-gray-100/60 focus-within:ring-2 focus-within:ring-[#E23744]/20 focus-within:bg-white overflow-hidden group">
              <Search className="absolute left-4 h-[18px] w-[18px] text-gray-400 group-focus-within:text-[#E23744] transition-colors shrink-0" />
              <input
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                className="w-full bg-transparent py-3.5 pl-11 pr-4 text-sm font-semibold text-[#1F2A2A] placeholder-gray-400 focus:outline-none"
                placeholder=""
              />
              {/* Typing placeholder when empty and not focused */}
              {!searchValue && !searchFocused && (
                <div className="absolute left-11 top-1/2 -translate-y-1/2 text-sm font-semibold">
                  <TypingPlaceholder />
                </div>
              )}
            </div>
            <motion.button
              className="relative ml-2 rounded-xl sm:rounded-full bg-gradient-to-r from-[#E23744] to-[#FF6B81] px-6 py-3.5 text-sm font-bold text-white shadow-md shrink-0 overflow-hidden cursor-pointer"
              whileHover={{
                scale: 1.03,
                boxShadow: "0 12px 24px -8px rgba(226,55,68,0.35)",
              }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              {/* Shimmer */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent"
                initial={{ x: "-100%" }}
                animate={{ x: "200%" }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  repeatDelay: 4,
                  ease: "easeInOut",
                }}
              />
              <span className="relative z-[1]">Search</span>
            </motion.button>
          </motion.div>

          {/* Animated Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-10 flex items-center gap-8 md:gap-12"
          >
            <AnimatedStat
              value={100}
              suffix="+"
              label="Dishes"
              color="text-[#E23744]"
              delay={600}
            />
            <div className="h-8 w-px bg-gray-200" />
            <AnimatedStat
              value={4}
              suffix=".5★"
              label="Avg Rating"
              color="text-[#1E7B3E]"
              delay={800}
            />
            <div className="h-8 w-px bg-gray-200" />
            <AnimatedStat
              value={15}
              suffix=" min"
              label="Fast Delivery"
              color="text-[#1F2A2A]"
              delay={1000}
            />
          </motion.div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none" />
    </motion.section>
  );
}
