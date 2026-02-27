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
    <section className="bg-white py-12 md:py-16">
      <div className="container mx-auto px-4 md:px-6">
        <h2 className="text-2xl font-bold tracking-tight text-[#1F2A2A] md:text-3xl mb-8">
          Top Offers for you
        </h2>

        <div
          className="relative h-[200px] sm:h-[220px] md:h-[250px] w-full overflow-hidden rounded-3xl"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <AnimatePresence mode="popLayout">
            <motion.div
              key={currentIndex}
              initial={{ x: "100%", opacity: 0.8 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "-100%", opacity: 0.8 }}
              transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
              className={`absolute inset-0 flex items-center justify-start p-8 md:p-12 ${offers[currentIndex].bgColor}`}
            >
              {/* Pattern Overlay */}
              <div className="absolute inset-0 bg-white/5 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px] opacity-20 pointer-events-none" />

              <div className="relative z-10 flex flex-col justify-center max-w-xl text-white">
                <motion.h3
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 drop-shadow-md"
                >
                  {offers[currentIndex].title}
                </motion.h3>
                <motion.p
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="text-lg md:text-xl font-bold uppercase tracking-wider text-white/90 drop-shadow-sm bg-black/10 inline-block w-fit px-3 py-1 rounded-sm"
                >
                  {offers[currentIndex].subtitle}
                </motion.p>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Indicators */}
          <div className="absolute bottom-4 left-0 right-0 z-20 flex justify-center gap-2">
            {offers.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  currentIndex === idx ? "w-8 bg-white" : "w-2 bg-white/50"
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
