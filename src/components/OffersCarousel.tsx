"use client";

import { useEffect, useRef, useState } from "react";
import { offers } from "@/lib/data";
import { motion, AnimatePresence } from "framer-motion";

export default function OffersCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % offers.length);
    }, 4000);
  };

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleMouseEnter = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleMouseLeave = () => {
    startTimer();
  };

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-[1440px] px-4 md:px-6 lg:px-10 py-6 md:py-8">
        <h2 className="text-xl font-bold tracking-tight text-[#1F2A2A] md:text-2xl mb-5">
          Top Offers for you
        </h2>

        <div
          className="relative h-[180px] sm:h-[200px] md:h-[220px] w-full overflow-hidden rounded-2xl"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <AnimatePresence mode="popLayout">
            <motion.div
              key={currentIndex}
              initial={{ x: "100%", opacity: 0.8 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "-100%", opacity: 0.8 }}
              transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
              className={`absolute inset-0 flex items-center justify-start p-8 md:p-12 ${offers[currentIndex].bgColor}`}
            >
              <div className="absolute inset-0 bg-white/5 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px] opacity-15 pointer-events-none" />

              <div className="relative z-10 flex flex-col justify-center max-w-xl text-white">
                <motion.h3
                  initial={{ y: 16, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.15, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3 drop-shadow-sm"
                >
                  {offers[currentIndex].title}
                </motion.h3>
                <motion.p
                  initial={{ y: 16, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.25, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="text-sm md:text-base font-bold uppercase tracking-wider text-white/80"
                >
                  {offers[currentIndex].subtitle}
                </motion.p>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="absolute bottom-4 left-0 right-0 z-20 flex justify-center gap-1.5">
            {offers.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  currentIndex === idx ? "w-6 bg-white" : "w-1.5 bg-white/40"
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1440px] px-4 md:px-6 lg:px-10">
        <hr className="border-gray-200" />
      </div>
    </section>
  );
}
