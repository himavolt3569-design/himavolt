"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { apiFetch } from "@/lib/api-client";

type Category = {
  id: string;
  name: string;
  image: string;
};

export default function FoodCategories({
  onCategoryChange,
}: {
  onCategoryChange?: (name: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const scrollStateRef = useRef({ left: false, right: true });
  const scrollRafRef = useRef<number | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [activeId, setActiveId] = useState<string>("all");
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<Category[]>("/api/public/categories")
      .then((data) => {
        setCategories(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (scrollRafRef.current != null) return;
    scrollRafRef.current = window.requestAnimationFrame(() => {
      scrollRafRef.current = null;
      const next = {
        left: el.scrollLeft > 2,
        right: el.scrollLeft < el.scrollWidth - el.clientWidth - 2,
      };
      if (scrollStateRef.current.left !== next.left) {
        setCanScrollLeft(next.left);
      }
      if (scrollStateRef.current.right !== next.right) {
        setCanScrollRight(next.right);
      }
      scrollStateRef.current = next;
    });
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      if (scrollRafRef.current != null) {
        window.cancelAnimationFrame(scrollRafRef.current);
      }
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll, categories]);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.6;
    scrollRef.current.scrollBy({
      left: dir === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  const handleClick = (cat: Category) => {
    setActiveId(cat.id);
    onCategoryChange?.(cat.name);
  };

  return (
    <section
      id="explore-cuisines"
      ref={containerRef}
      className="relative bg-[var(--canvas)] overflow-hidden"
    >
      <div className="h-px bg-linear-to-r from-transparent via-[var(--accent-border)] to-transparent" />

      <div className="mx-auto max-w-[1440px] px-4 md:px-8 lg:px-12 pt-12 md:pt-16 pb-10 md:pb-14">
        <div
          ref={headingRef}
          className="flex items-end justify-between mb-8 md:mb-10"
        >
          <div>
            <span className="heading-el inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-muted)] px-3 py-1 text-[10px] font-bold text-[var(--accent-text)] uppercase tracking-wider border border-[var(--accent-border)] mb-3">
              <Sparkles className="h-2.5 w-2.5" />
              Explore cuisines
            </span>
            <h2 className="heading-el text-2xl md:text-3xl font-bold tracking-tight text-[var(--text-1)] leading-tight">
              What&apos;s on your mind
              <span className="text-[var(--accent)]">?</span>
            </h2>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={() => scroll("left")}
              disabled={!canScrollLeft}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--canvas)] text-[var(--text-2)] hover:text-[var(--text-1)] hover:border-[var(--accent-border)] transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
            </button>
            <button
              onClick={() => scroll("right")}
              disabled={!canScrollRight}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--canvas)] text-[var(--text-2)] hover:text-[var(--text-1)] hover:border-[var(--accent-border)] transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </div>
        </div>

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
                  <div className="relative">
                    <motion.div
                      className={`relative h-[76px] w-[76px] sm:h-[90px] sm:w-[90px] md:h-[100px] md:w-[100px] lg:h-[110px] lg:w-[110px] rounded-[28px] overflow-hidden transition-all duration-300 ${
                        isActive
                          ? "shadow-xl shadow-[var(--accent)]/20 ring-[2.5px] ring-[var(--accent)]"
                          : "shadow-sm ring-1 ring-black/[0.04] group-hover:shadow-lg group-hover:ring-[var(--accent-border)]"
                      }`}
                      animate={isActive ? { scale: 1.05 } : { scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 15 }}
                    >
                      <img
                        src={cat.image}
                        alt={cat.name}
                        loading="lazy"
                        className={`h-full w-full object-cover transition-transform duration-500 ${
                          isActive ? "scale-110" : "group-hover:scale-110"
                        }`}
                      />
                      <div
                        className={`absolute inset-0 transition-opacity duration-300 ${
                          isActive
                            ? "bg-linear-to-t from-[var(--accent)]/20 to-transparent opacity-100"
                            : "bg-linear-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100"
                        }`}
                      />
                    </motion.div>

                    <AnimatePresence>
                      {isActive && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="absolute -inset-1.5 rounded-[32px] bg-[var(--accent-muted)] -z-10"
                        />
                      )}
                    </AnimatePresence>
                  </div>

                  <span
                    className={`mt-2.5 text-[11px] sm:text-xs md:text-[13px] font-bold text-center leading-tight transition-colors duration-200 ${
                      isActive
                        ? "text-[var(--accent)]"
                        : "text-[var(--text-2)] group-hover:text-[var(--text-1)]"
                    }`}
                  >
                    {cat.name}
                  </span>

                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        layoutId="cat-dot"
                        className="mt-1.5 h-1 w-1 rounded-full bg-[var(--accent)]"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 25 }}
                      />
                    )}
                  </AnimatePresence>
                </motion.button>
              );
            })}
          </div>

          {canScrollLeft && (
            <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-12 md:w-20 bg-linear-to-r from-[var(--canvas)] to-transparent z-10" />
          )}
          {canScrollRight && (
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 md:w-20 bg-linear-to-l from-[var(--canvas)] to-transparent z-10" />
          )}
        </div>
      </div>

      <div className="mx-auto max-w-[1440px] px-4 md:px-8 lg:px-12">
        <div className="h-px bg-linear-to-r from-transparent via-[var(--accent-border)] to-transparent" />
      </div>
    </section>
  );
}
