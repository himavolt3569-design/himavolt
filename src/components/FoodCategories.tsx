"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { categories } from "@/lib/data";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function FoodCategories() {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const half = Math.ceil(categories.length / 2);
  const row1 = categories.slice(0, half);
  const row2 = categories.slice(half);

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

  useGSAP(
    () => {
      const items = gsap.utils.toArray<HTMLElement>(".cat-item");
      items.forEach((item) => {
        item.addEventListener("mouseenter", () => {
          gsap.to(item, {
            scale: 1.08,
            duration: 0.25,
            ease: "back.out(2)",
          });
        });
        item.addEventListener("mouseleave", () => {
          gsap.to(item, { scale: 1, duration: 0.2, ease: "power2.out" });
        });
      });
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

  return (
    <section ref={containerRef} className="relative bg-white">
      <div className="mx-auto max-w-[1440px] px-4 md:px-6 lg:px-10 py-8 md:py-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold tracking-tight text-[#1F2A2A] md:text-2xl">
            What&apos;s on your mind?
          </h2>
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={() => scroll("left")}
              disabled={!canScrollLeft}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e2e2e7] text-[#1F2A2A] transition-all hover:bg-[#d4d4d9] disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={3} />
            </button>
            <button
              onClick={() => scroll("right")}
              disabled={!canScrollRight}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e2e2e7] text-[#1F2A2A] transition-all hover:bg-[#d4d4d9] disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-5 w-5" strokeWidth={3} />
            </button>
          </div>
        </div>

        <div className="relative -mx-4 md:-mx-6 lg:-mx-10">
          <div
            ref={scrollRef}
            className="flex flex-col gap-2 md:gap-4 overflow-x-auto px-4 md:px-6 lg:px-10 pb-2"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            {[row1, row2].map((row, rowIdx) => (
              <div key={rowIdx} className="flex gap-1 sm:gap-2">
                {row.map((cat) => (
                  <div
                    key={cat.id}
                    className="cat-item flex flex-col items-center shrink-0 cursor-pointer w-[80px] sm:w-[100px] md:w-[120px] lg:w-[144px] py-1"
                  >
                    <div className="flex h-[72px] w-[72px] sm:h-[90px] sm:w-[90px] md:h-[110px] md:w-[110px] lg:h-[130px] lg:w-[130px] items-center justify-center rounded-full bg-gradient-to-b from-[#fff4e6] to-[#ffe8cc] transition-shadow hover:shadow-lg">
                      <span className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl select-none drop-shadow-sm">
                        {cat.image}
                      </span>
                    </div>
                    <span className="mt-1 text-[11px] sm:text-xs md:text-sm font-semibold text-[#1F2A2A] text-center leading-tight">
                      {cat.name}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {canScrollLeft && (
            <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-10 md:w-16 bg-gradient-to-r from-white to-transparent z-10" />
          )}
          {canScrollRight && (
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 md:w-16 bg-gradient-to-l from-white to-transparent z-10" />
          )}
        </div>
      </div>

      <div className="mx-auto max-w-[1440px] px-4 md:px-6 lg:px-10">
        <hr className="border-gray-200" />
      </div>
    </section>
  );
}
