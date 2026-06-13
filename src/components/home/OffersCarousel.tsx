"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { offers } from "@/lib/data";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function OffersCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % offers.length);
    }, 5000);
  }, []);

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startTimer]);

  const goTo = (idx: number) => {
    setCurrentIndex(idx);
    startTimer();
  };

  const prev = () => goTo((currentIndex - 1 + offers.length) % offers.length);
  const next = () => goTo((currentIndex + 1) % offers.length);

  const offer = offers[currentIndex];

  return (
    <section className="bg-[var(--canvas)]">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8 lg:px-12 py-10 md:py-16">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)]/10">
              <Sparkles className="h-4.5 w-4.5 text-[var(--accent)]" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-[var(--text-1)] md:text-2xl">
                Deals that make you drool
              </h2>
              <p className="text-xs text-[var(--text-3)] font-medium mt-0.5 hidden sm:block">
                Limited-time offers on your favourite food
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={prev}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-2)] hover:bg-[var(--canvas-sub)] hover:border-[var(--border)] hover:text-[var(--text-1)] transition-all active:scale-95"
              aria-label="Previous offer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={next}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-2)] hover:bg-[var(--canvas-sub)] hover:border-[var(--border)] hover:text-[var(--text-1)] transition-all active:scale-95"
              aria-label="Next offer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="relative w-full overflow-hidden rounded-3xl shadow-xl shadow-black/5 h-[240px] sm:h-[260px] md:h-[300px]">
          <AnimatePresence mode="popLayout">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
              className={`absolute inset-0 bg-gradient-to-br ${offer.bgColor}`}
            >
              <div className="absolute right-0 top-0 bottom-0 w-[55%] sm:w-[50%]">
                <img
                  src={offer.image}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
              </div>

              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(255,255,255,0.06),transparent_60%)]" />
              <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                  backgroundImage:
                    "url(\"data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 6 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23fff' fill-opacity='1'%3E%3Ccircle cx='1' cy='1' r='0.6'/%3E%3C/g%3E%3C/svg%3E\")",
                }}
              />

              <div className="relative z-10 flex h-full flex-col justify-center p-6 sm:p-8 md:p-12 lg:p-16 max-w-[60%] sm:max-w-[55%]">
                <motion.div
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    delay: 0.1,
                    duration: 0.4,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--canvas)]/80 backdrop-blur-sm px-3.5 py-1.5 text-[11px] font-bold text-white/90 uppercase tracking-wider border border-white/10">
                    <Sparkles className="h-3 w-3" />
                    {offer.badge}
                  </span>
                </motion.div>

                <motion.h3
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 0.15,
                    duration: 0.5,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="mt-4 text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-[1.1]"
                >
                  {offer.title}
                </motion.h3>

                <motion.p
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 0.25,
                    duration: 0.4,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="mt-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-white/60"
                >
                  {offer.subtitle}
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 0.35,
                    duration: 0.4,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="mt-5"
                >
                  <Link href="/offers" className="group inline-flex items-center gap-2 rounded-full bg-[var(--canvas)] px-5 py-2.5 text-xs sm:text-sm font-bold text-[var(--text-1)] shadow-lg shadow-black/20 transition-all hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 cursor-pointer">
                    {offer.cta}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="absolute bottom-5 left-8 md:left-12 lg:left-16 z-20 flex items-center gap-1.5">
            {offers.map((_, idx) => (
              <button
                key={idx}
                onClick={() => goTo(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  currentIndex === idx
                    ? "w-7 bg-[var(--canvas)]"
                    : "w-1.5 bg-[var(--canvas)]/80 hover:bg-[var(--canvas)]/80"
                }`}
                aria-label={`Go to offer ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
          {offers.map((o, idx) => (
            <button
              key={o.id}
              onClick={() => goTo(idx)}
              className={`group relative overflow-hidden rounded-2xl p-4 text-left transition-all cursor-pointer ${
                currentIndex === idx
                  ? "ring-2 ring-[var(--accent)]/30 bg-[var(--accent)]/5"
                  : "bg-[var(--canvas-sub)] hover:bg-[var(--surface)]"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 overflow-hidden rounded-xl shrink-0">
                  <img
                    src={o.image}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <p
                    className={`text-xs font-bold truncate ${currentIndex === idx ? "text-[var(--accent)]" : "text-[var(--text-1)]"}`}
                  >
                    {o.title}
                  </p>
                  <p className="text-[10px] text-[var(--text-3)] font-medium truncate mt-0.5">
                    {o.badge}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
