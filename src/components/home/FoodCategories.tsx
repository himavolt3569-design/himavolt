"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { categories } from "@/lib/data";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export default function FoodCategories({
  onCategoryChange,
}: {
  onCategoryChange?: (name: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [activeId, setActiveId] = useState(1);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll]);

  /* GSAP: heading reveal + staggered category bounce-in */
  useGSAP(
    () => {
      if (!containerRef.current) return;

      /* Heading */
      if (headingRef.current) {
        const els = headingRef.current.querySelectorAll(".heading-el");
        gsap.fromTo(
          els,
          { opacity: 0, y: 24, filter: "blur(6px)" },
          {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 0.6,
            stagger: 0.06,
            ease: "power3.out",
            scrollTrigger: {
              trigger: containerRef.current,
              start: "top 85%",
              toggleActions: "play none none none",
            },
          },
        );
      }

      /* Category circles — stagger from center outward */
      const items = gsap.utils.toArray<HTMLElement>(".cat-circle");
      const mid = Math.floor(items.length / 2);
      const sorted = [...items].sort(
        (a, b) =>
          Math.abs(items.indexOf(a) - mid) - Math.abs(items.indexOf(b) - mid),
      );

      gsap.fromTo(
        sorted,
        { opacity: 0, y: 50, scale: 0.7, rotation: -5 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          rotation: 0,
          duration: 0.6,
          stagger: 0.035,
          ease: "back.out(1.7)",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top 78%",
            toggleActions: "play none none none",
          },
        },
      );
    },
    { scope: containerRef },
  );

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.6;
    scrollRef.current.scrollBy({
      left: dir === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  const handleClick = (cat: (typeof categories)[0]) => {
    setActiveId(cat.id);
    onCategoryChange?.(cat.name);
  };

  return (
    <section ref={containerRef} className="relative bg-white overflow-hidden">
      {/* Subtle top accent */}
      <div className="h-px bg-linear-to-r from-transparent via-[#eaa94d]/10 to-transparent" />

      <div className="mx-auto max-w-[1440px] px-4 md:px-8 lg:px-12 pt-12 md:pt-16 pb-10 md:pb-14">
        {/* Header row */}
        <div
          ref={headingRef}
          className="flex items-end justify-between mb-8 md:mb-10"
        >
          <div>
            <span className="heading-el inline-flex items-center gap-1.5 rounded-full bg-[#eaa94d]/8 px-3 py-1 text-[10px] font-bold text-[#b25c1c] uppercase tracking-wider border border-[#eaa94d]/15 mb-3">
              <Sparkles className="h-2.5 w-2.5" />
              Explore cuisines
            </span>
            <h2 className="heading-el text-2xl md:text-3xl font-extrabold tracking-tight text-[#3e1e0c] leading-tight">
              What&apos;s on your mind
              <span className="text-[#eaa94d]">?</span>
            </h2>
          </div>

          {/* Nav arrows */}
          <div className="hidden sm:flex items-center gap-2">
            <motion.button
              onClick={() => scroll("left")}
              disabled={!canScrollLeft}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#eaa94d]/15 bg-white text-[#3e1e0c]/60 hover:text-[#3e1e0c] hover:border-[#eaa94d]/30 hover:shadow-md transition-all disabled:opacity-20 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
            </motion.button>
            <motion.button
              onClick={() => scroll("right")}
              disabled={!canScrollRight}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#eaa94d]/15 bg-white text-[#3e1e0c]/60 hover:text-[#3e1e0c] hover:border-[#eaa94d]/30 hover:shadow-md transition-all disabled:opacity-20 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
            </motion.button>
          </div>
        </div>

        {/* ── Scrollable category carousel ── */}
        <div className="relative -mx-4 md:-mx-6 lg:-mx-10">
          <div
            ref={scrollRef}
            className="flex gap-3 sm:gap-4 overflow-x-auto px-4 md:px-6 lg:px-10 pb-4"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {categories.map((cat) => {
              const isActive = activeId === cat.id;
              return (
                <motion.button
                  key={cat.id}
                  onClick={() => handleClick(cat)}
                  whileHover={{ y: -6 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  className="cat-circle relative flex flex-col items-center shrink-0 cursor-pointer group"
                >
                  {/* Image container */}
                  <div className="relative">
                    <motion.div
                      className={`relative h-[76px] w-[76px] sm:h-[90px] sm:w-[90px] md:h-[100px] md:w-[100px] lg:h-[110px] lg:w-[110px] rounded-[28px] overflow-hidden transition-all duration-300 ${
                        isActive
                          ? "shadow-xl shadow-[#eaa94d]/20 ring-[2.5px] ring-[#eaa94d]"
                          : "shadow-sm ring-1 ring-black/[0.04] group-hover:shadow-lg group-hover:ring-[#eaa94d]/20"
                      }`}
                      animate={isActive ? { scale: 1.05 } : { scale: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 15,
                      }}
                    >
                      <img
                        src={cat.image}
                        alt={cat.name}
                        loading="lazy"
                        className={`h-full w-full object-cover transition-transform duration-500 ${
                          isActive
                            ? "scale-110"
                            : "group-hover:scale-110"
                        }`}
                      />
                      {/* Hover overlay gradient */}
                      <div
                        className={`absolute inset-0 transition-opacity duration-300 ${
                          isActive
                            ? "bg-linear-to-t from-[#eaa94d]/20 to-transparent opacity-100"
                            : "bg-linear-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100"
                        }`}
                      />
                    </motion.div>

                    {/* Active glow ring */}
                    <AnimatePresence>
                      {isActive && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="absolute -inset-1.5 rounded-[32px] bg-[#eaa94d]/8 -z-10"
                        />
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Label */}
                  <span
                    className={`mt-2.5 text-[11px] sm:text-xs md:text-[13px] font-bold text-center leading-tight transition-colors duration-200 ${
                      isActive
                        ? "text-[#eaa94d]"
                        : "text-[#3e1e0c]/70 group-hover:text-[#3e1e0c]"
                    }`}
                  >
                    {cat.name}
                  </span>

                  {/* Active dot indicator */}
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        layoutId="cat-dot"
                        className="mt-1.5 h-1 w-1 rounded-full bg-[#eaa94d]"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 25,
                        }}
                      />
                    )}
                  </AnimatePresence>
                </motion.button>
              );
            })}
          </div>

          {/* Fade masks */}
          {canScrollLeft && (
            <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-12 md:w-20 bg-linear-to-r from-white to-transparent z-10" />
          )}
          {canScrollRight && (
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 md:w-20 bg-linear-to-l from-white to-transparent z-10" />
          )}
        </div>
      </div>

      {/* Bottom divider */}
      <div className="mx-auto max-w-[1440px] px-4 md:px-8 lg:px-12">
        <div className="h-px bg-linear-to-r from-transparent via-[#eaa94d]/10 to-transparent" />
      </div>
    </section>
  );
}
