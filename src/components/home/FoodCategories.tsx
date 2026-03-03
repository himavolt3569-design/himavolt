"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { categories } from "@/lib/data";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
  const headingRef = useRef<HTMLHeadingElement>(null);
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

  // GSAP ScrollTrigger for section reveal + staggered category items
  useGSAP(
    () => {
      if (!containerRef.current) return;

      // Heading slide in
      if (headingRef.current) {
        gsap.fromTo(
          headingRef.current,
          { opacity: 0, y: 30 },
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
            ease: "power3.out",
            scrollTrigger: {
              trigger: containerRef.current,
              start: "top 85%",
              toggleActions: "play none none none",
            },
          },
        );
      }

      // Staggered category circles
      const items = gsap.utils.toArray<HTMLElement>(".cat-circle");
      gsap.fromTo(
        items,
        { opacity: 0, y: 40, scale: 0.8 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.5,
          stagger: 0.04,
          ease: "back.out(1.7)",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top 80%",
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
    <section ref={containerRef} className="relative bg-white">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8 lg:px-12 py-10 md:py-14">
        <div className="flex items-center justify-between mb-6">
          <h2
            ref={headingRef}
            className="text-xl font-bold tracking-tight text-[#1F2A2A] md:text-2xl"
          >
            What&apos;s on your mind?
          </h2>
          <div className="hidden sm:flex items-center gap-2">
            <motion.button
              onClick={() => scroll("left")}
              disabled={!canScrollLeft}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-[#1F2A2A] transition-colors hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={3} />
            </motion.button>
            <motion.button
              onClick={() => scroll("right")}
              disabled={!canScrollRight}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-[#1F2A2A] transition-colors hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-5 w-5" strokeWidth={3} />
            </motion.button>
          </div>
        </div>

        <div className="relative -mx-4 md:-mx-6 lg:-mx-10">
          <div
            ref={scrollRef}
            className="flex gap-2 sm:gap-3 overflow-x-auto px-4 md:px-6 lg:px-10 pb-2"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {categories.map((cat) => {
              const isActive = activeId === cat.id;
              return (
                <motion.button
                  key={cat.id}
                  onClick={() => handleClick(cat)}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 500, damping: 20 }}
                  className="cat-circle relative flex flex-col items-center shrink-0 cursor-pointer w-[80px] sm:w-[100px] md:w-[110px] lg:w-[120px] py-1 group"
                >
                  <motion.div
                    className={`flex h-[72px] w-[72px] sm:h-[85px] sm:w-[85px] md:h-[95px] md:w-[95px] lg:h-[100px] lg:w-[100px] items-center justify-center rounded-full overflow-hidden border-2 ${
                      isActive
                        ? "border-[#E23744] shadow-lg shadow-[#E23744]/20"
                        : "border-transparent hover:shadow-md"
                    }`}
                    animate={isActive ? { scale: 1.05 } : { scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  >
                    <img
                      src={cat.image}
                      alt={cat.name}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </motion.div>
                  <span
                    className={`mt-1.5 text-[11px] sm:text-xs md:text-[13px] font-semibold text-center leading-tight transition-colors ${
                      isActive ? "text-[#E23744]" : "text-[#1F2A2A]"
                    }`}
                  >
                    {cat.name}
                  </span>
                  {/* Animated active indicator */}
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        layoutId="cat-indicator"
                        className="absolute -bottom-0.5 h-[3px] w-8 rounded-full bg-[#E23744]"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        exit={{ scaleX: 0 }}
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

          {canScrollLeft && (
            <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-10 md:w-16 bg-gradient-to-r from-white to-transparent z-10" />
          )}
          {canScrollRight && (
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 md:w-16 bg-gradient-to-l from-white to-transparent z-10" />
          )}
        </div>
      </div>

      <div className="mx-auto max-w-[1440px] px-4 md:px-8 lg:px-12">
        <hr className="border-gray-100" />
      </div>
    </section>
  );
}
