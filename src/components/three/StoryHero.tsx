"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import { Sparkles } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";

/* ── Inline SVG food pattern (sandwich, donut, cake outlines) ──────── */
const FOOD_PATTERN_SVG = `url("data:image/svg+xml,${encodeURIComponent(`
<svg xmlns='http://www.w3.org/2000/svg' width='260' height='260' viewBox='0 0 260 260'>
  <circle cx='40' cy='40' r='18' fill='none' stroke='%23E23744' stroke-width='1.2' opacity='0.12'/>
  <circle cx='40' cy='40' r='8' fill='none' stroke='%23E23744' stroke-width='1' opacity='0.10'/>
  <circle cx='32' cy='34' r='2' fill='%23FF6B81' opacity='0.10'/>
  <circle cx='46' cy='36' r='1.5' fill='%23FF9933' opacity='0.10'/>
  <circle cx='38' cy='50' r='1.8' fill='%231E7B3E' opacity='0.10'/>
  <g transform='translate(150,30)' opacity='0.12'>
    <path d='M-22,8 Q0,-8 22,8' fill='none' stroke='%23FF9933' stroke-width='1.3' stroke-linecap='round'/>
    <line x1='-20' y1='12' x2='20' y2='12' stroke='%231E7B3E' stroke-width='2' opacity='0.9'/>
    <line x1='-18' y1='16' x2='18' y2='16' stroke='%23E23744' stroke-width='1.5' opacity='0.8'/>
    <line x1='-19' y1='20' x2='19' y2='20' stroke='%23FFB347' stroke-width='1.2' opacity='0.7'/>
    <path d='M-20,22 Q0,30 20,22' fill='none' stroke='%23FF9933' stroke-width='1.3' stroke-linecap='round'/>
  </g>
  <g transform='translate(40,160)' opacity='0.12'>
    <rect x='-16' y='0' width='32' height='18' rx='3' fill='none' stroke='%23FF6B81' stroke-width='1.2'/>
    <rect x='-20' y='18' width='40' height='16' rx='3' fill='none' stroke='%23E23744' stroke-width='1.2'/>
    <line x1='-2' y1='-8' x2='-2' y2='0' stroke='%23FFB347' stroke-width='1'/>
    <circle cx='-2' cy='-10' r='2.5' fill='%23FF9933' opacity='0.9'/>
    <path d='M-14,6 Q-7,2 0,6 Q7,2 14,6' fill='none' stroke='%23FFB347' stroke-width='0.8'/>
  </g>
  <circle cx='220' cy='140' r='16' fill='none' stroke='%23FF9933' stroke-width='1.2' opacity='0.10'/>
  <circle cx='220' cy='140' r='7' fill='none' stroke='%23FF9933' stroke-width='1' opacity='0.08'/>
  <circle cx='213' cy='135' r='1.8' fill='%23E23744' opacity='0.09'/>
  <circle cx='226' cy='137' r='2' fill='%231E7B3E' opacity='0.09'/>
  <g transform='translate(130,200)' opacity='0.10'>
    <path d='M-18,6 Q0,-6 18,6' fill='none' stroke='%23FF9933' stroke-width='1.2' stroke-linecap='round'/>
    <line x1='-16' y1='10' x2='16' y2='10' stroke='%231E7B3E' stroke-width='1.8'/>
    <line x1='-15' y1='14' x2='15' y2='14' stroke='%23E23744' stroke-width='1.2'/>
    <path d='M-16,17 Q0,23 16,17' fill='none' stroke='%23FF9933' stroke-width='1.2' stroke-linecap='round'/>
  </g>
  <g transform='translate(230,40)' opacity='0.11'>
    <path d='M-10,8 L-14,22 L14,22 L10,8' fill='none' stroke='%23FFB347' stroke-width='1'/>
    <path d='M-12,8 Q-8,-4 0,2 Q8,-4 12,8' fill='none' stroke='%23FF6B81' stroke-width='1.2'/>
    <circle cx='0' cy='-4' r='2' fill='%23E23744' opacity='0.9'/>
  </g>
  <g transform='translate(80,100)' opacity='0.10'>
    <path d='M0,0 L20,16 L-20,16 Z' fill='none' stroke='%23E23744' stroke-width='1'/>
    <line x1='-16' y1='12' x2='16' y2='12' stroke='%23FFB347' stroke-width='0.8'/>
    <circle cx='0' cy='6' r='2' fill='%23FF9933' opacity='0.8'/>
  </g>
  <circle cx='140' cy='120' r='14' fill='none' stroke='%236366F1' stroke-width='1' opacity='0.08'/>
  <circle cx='140' cy='120' r='6' fill='none' stroke='%236366F1' stroke-width='0.8' opacity='0.06'/>
  <rect x='60' y='60' width='4' height='1.5' rx='0.75' fill='%23E23744' opacity='0.08' transform='rotate(30 62 61)'/>
  <rect x='180' y='80' width='4' height='1.5' rx='0.75' fill='%23FF9933' opacity='0.08' transform='rotate(-20 182 81)'/>
  <rect x='100' y='220' width='4' height='1.5' rx='0.75' fill='%231E7B3E' opacity='0.08' transform='rotate(45 102 221)'/>
  <rect x='200' y='200' width='4' height='1.5' rx='0.75' fill='%23FF6B81' opacity='0.08' transform='rotate(-35 202 201)'/>
</svg>
`)}")`;

/* Floating food images — scattered around the hero */
const FLOAT_ITEMS = [
  { src: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=120&h=120&fit=crop", top: "12%", left: "6%", size: "w-14 h-14 sm:w-18 sm:h-18", delay: 0 },
  { src: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=120&h=120&fit=crop", top: "18%", right: "8%", size: "w-12 h-12 sm:w-16 sm:h-16", delay: 0.4 },
  { src: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=120&h=120&fit=crop", bottom: "28%", left: "10%", size: "w-12 h-12 sm:w-14 sm:h-14", delay: 0.2 },
  { src: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=120&h=120&fit=crop", bottom: "22%", right: "7%", size: "w-13 h-13 sm:w-16 sm:h-16", delay: 0.6 },
  { src: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=120&h=120&fit=crop", top: "40%", left: "3%", size: "w-10 h-10 sm:w-13 sm:h-13", delay: 0.8 },
  { src: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=120&h=120&fit=crop", top: "8%", left: "30%", size: "w-10 h-10 sm:w-12 sm:h-12", delay: 0.3 },
  { src: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=120&h=120&fit=crop", top: "30%", right: "4%", size: "w-11 h-11 sm:w-14 sm:h-14", delay: 0.5 },
  { src: "https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=120&h=120&fit=crop", bottom: "12%", left: "22%", size: "w-10 h-10 sm:w-12 sm:h-12", delay: 0.7 },
];

/**
 * Simple animated hero — everything visible immediately.
 * No pinning. Food pattern background + floating food images.
 * Parallax on scroll via framer-motion.
 */
export default function StoryHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const floatingRef = useRef<HTMLDivElement>(null);

  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 500], [1, 0.3]);
  const heroY = useTransform(scrollY, [0, 500], [0, 50]);
  const patternY = useTransform(scrollY, [0, 600], [0, 30]);

  // Float the food images continuously
  useEffect(() => {
    if (!floatingRef.current) return;
    const items = gsap.utils.toArray<HTMLElement>(".hero-float-img");
    items.forEach((el, i) => {
      gsap.to(el, {
        y: `${8 + (i % 3) * 5}`,
        rotation: 2 + (i % 2 === 0 ? 3 : -3),
        duration: 2.8 + i * 0.4,
        ease: "power1.inOut",
        yoyo: true,
        repeat: -1,
      });
    });
  }, []);

  return (
    <motion.section
      ref={containerRef}
      style={{ opacity: heroOpacity, y: heroY }}
      className="relative flex w-full items-center justify-center overflow-hidden"
    >
      {/* Warm gradient base */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#FFF8F0] via-[#FFF0E8] to-[#FFE8E0] pointer-events-none" />

      {/* Food pattern (sandwich/donut/cake SVG) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: FOOD_PATTERN_SVG,
          backgroundSize: "260px 260px",
        }}
      />

      {/* Ambient glows */}
      <div className="absolute top-[10%] right-[10%] h-[350px] w-[350px] rounded-full bg-[#E23744]/[0.06] blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[10%] left-[10%] h-[400px] w-[400px] rounded-full bg-[#FF9933]/[0.08] blur-[100px] pointer-events-none" />
      <div className="absolute top-[40%] left-[40%] h-[300px] w-[300px] rounded-full bg-[#FF6B81]/[0.04] blur-[80px] pointer-events-none" />

      {/* Floating food images */}
      <div ref={floatingRef} className="absolute inset-0 pointer-events-none overflow-hidden">
        {FLOAT_ITEMS.map((item, i) => (
          <motion.img
            key={i}
            src={item.src}
            alt=""
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 0.55, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 + item.delay, ease: [0.16, 1, 0.3, 1] }}
            className={`hero-float-img absolute ${item.size} rounded-full object-cover shadow-lg hidden md:block`}
            style={{
              top: item.top,
              left: item.left,
              right: item.right,
              bottom: item.bottom,
            } as React.CSSProperties}
            loading="lazy"
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-[1440px] w-full px-4 md:px-8 lg:px-12 pt-20 pb-16 md:pt-28 md:pb-24">
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mb-5"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 backdrop-blur-sm px-4 py-2 text-[11px] font-bold text-[#E23744] uppercase tracking-wider border border-[#E23744]/10 shadow-sm">
              <motion.span
                animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <Sparkles className="h-3 w-3" />
              </motion.span>
              Nepal&apos;s Smartest Food Platform
            </span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="mb-2 text-[2.5rem] font-extrabold tracking-tight text-[#1F2A2A] sm:text-5xl md:text-6xl lg:text-7xl leading-[1.08]"
          >
            Craving something{" "}
            <motion.span
              className="text-transparent bg-clip-text bg-gradient-to-r from-[#E23744] via-[#FF6B81] to-[#FF9933] inline-block"
              animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
              transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
              style={{ backgroundSize: "200% 200%" }}
            >
              Delicious?
            </motion.span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-8 text-base font-medium text-gray-500 sm:text-lg md:text-xl max-w-xl leading-relaxed"
          >
            Discover the best food around you. Order to your table or get it
            delivered in minutes.
          </motion.p>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none" />
    </motion.section>
  );
}
