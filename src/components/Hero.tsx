"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Search, MapPin, QrCode, Building2, Map } from "lucide-react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

export default function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);

  // Smooth parallax with framer motion
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 1000], [0, 400]);

  // Gentle subtle zoom on load with GSAP
  useGSAP(
    () => {
      if (bgRef.current) {
        gsap.to(bgRef.current, {
          scale: 1.05,
          duration: 10,
          ease: "power1.inOut",
          yoyo: true,
          repeat: -1,
        });
      }
    },
    { scope: containerRef },
  );

  return (
    <section
      ref={containerRef}
      className="relative flex min-h-[90vh] w-full items-center justify-center overflow-hidden bg-gradient-to-br from-white via-[#F5F0E8] to-[#f9f6f0]"
    >
      {/* Subtle background decoration */}
      <div className="absolute top-0 right-0 -mr-40 -mt-40 h-[600px] w-[600px] rounded-full bg-[#FF9933]/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-40 -mb-40 h-[600px] w-[600px] rounded-full bg-[#FF9933]/10 blur-3xl pointer-events-none" />

      <div className="container relative z-10 mx-auto px-4 md:px-6 pt-24 pb-16 lg:py-0">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col text-center lg:text-left z-20"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FF9933]/10 text-[#FF9933] font-bold text-sm w-fit mx-auto lg:mx-0 mb-6 border border-[#FF9933]/20"
            >
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF9933] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#FF9933]"></span>
              </span>
              Nepal's #1 Premium Delivery & Booking
            </motion.div>

            <h1 className="mb-6 text-5xl font-extrabold tracking-tight text-[#1F2A2A] sm:text-6xl md:text-7xl drop-shadow-sm leading-tight">
              Craving something <br className="hidden lg:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF9933] to-[#ff6b00]">
                Extraordinary?
              </span>
            </h1>

            <p className="mb-10 text-lg font-medium text-gray-600 sm:text-xl max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Order premium food right to your table, or book your perfect
              Himalayan stay in seconds.
            </p>

            {/* Powerful Search Bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col gap-3 rounded-3xl bg-white p-3 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] sm:flex-row sm:rounded-full border border-gray-100 max-w-2xl mx-auto lg:mx-0 w-full"
            >
              <div className="relative flex flex-[1.5] items-center rounded-2xl sm:rounded-l-full bg-gray-50 transition-all hover:bg-gray-100 focus-within:ring-2 focus-within:ring-[#FF9933]/50 focus-within:bg-white overflow-hidden group">
                <MapPin className="absolute left-5 h-5 w-5 text-gray-400 group-focus-within:text-[#FF9933] transition-colors" />
                <input
                  type="text"
                  className="w-full bg-transparent py-4 pl-12 pr-4 text-base font-semibold text-[#1F2A2A] placeholder-gray-400 focus:outline-none"
                  placeholder="Where are you?"
                />
                <div className="absolute right-0 top-1/2 h-8 w-px -translate-y-1/2 bg-gray-200 hidden sm:block" />
              </div>

              <div className="relative flex flex-[2] items-center rounded-2xl sm:rounded-none bg-gray-50 transition-all hover:bg-gray-100 focus-within:ring-2 focus-within:ring-[#FF9933]/50 focus-within:bg-white focus-within:z-10 overflow-hidden group">
                <Search className="absolute left-5 h-5 w-5 text-gray-400 group-focus-within:text-[#FF9933] transition-colors" />
                <input
                  type="text"
                  className="w-full bg-transparent py-4 pl-12 pr-4 text-base font-semibold text-[#1F2A2A] placeholder-gray-400 focus:outline-none"
                  placeholder="Restaurant, hotel, dish..."
                />
              </div>

              <button className="rounded-2xl sm:rounded-full bg-gradient-to-r from-[#FF9933] to-[#ff8811] px-8 py-4 text-base font-bold text-white shadow-lg transition-all hover:shadow-xl hover:shadow-[#FF9933]/40 hover:-translate-y-0.5 active:translate-y-0 shrink-0">
                Let's Go
              </button>
            </motion.div>

            {/* Quick Action CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mt-12 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
            >
              <button className="group flex items-center gap-4 rounded-2xl bg-white px-6 py-4 shadow-md transition-all hover:shadow-xl border border-gray-100 hover:border-[#FF9933]/30 hover:-translate-y-1">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#FF9933]/10 text-[#FF9933] transition-colors group-hover:bg-[#FF9933] group-hover:text-white">
                  <QrCode className="h-6 w-6" />
                </div>
                <div className="text-left">
                  <h3 className="text-base font-bold text-[#1F2A2A] group-hover:text-[#FF9933] transition-colors">
                    Scan QR
                  </h3>
                  <p className="text-xs font-medium text-gray-500">
                    Order at table
                  </p>
                </div>
              </button>

              <button className="group flex items-center gap-4 rounded-2xl bg-white px-6 py-4 shadow-md transition-all hover:shadow-xl border border-gray-100 hover:border-[#FF9933]/30 hover:-translate-y-1">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#FF9933]/10 text-[#FF9933] transition-colors group-hover:bg-[#FF9933] group-hover:text-white">
                  <Building2 className="h-6 w-6" />
                </div>
                <div className="text-left">
                  <h3 className="text-base font-bold text-[#1F2A2A] group-hover:text-[#FF9933] transition-colors">
                    Book Stay
                  </h3>
                  <p className="text-xs font-medium text-gray-500">
                    Hotels & Resorts
                  </p>
                </div>
              </button>
            </motion.div>
          </motion.div>

          {/* Right Content - 3D Floating Food Universe */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1 }}
            className="relative h-[400px] lg:h-[600px] w-full hidden md:block perspective-1000"
          >
            {/* Center Main Dish */}
            <motion.div
              animate={{ y: [0, -20, 0], rotate: [0, 2, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30"
            >
              <div className="relative h-64 w-64 lg:h-80 lg:w-80 rounded-full overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.2)] border-8 border-white">
                <img
                  src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80"
                  alt="Premium Burger"
                  className="h-full w-full object-cover"
                />
              </div>
            </motion.div>

            {/* Floating Element 1 - Top Right */}
            <motion.div
              animate={{ y: [0, -15, 0], x: [0, 10, 0], rotate: [0, -5, 0] }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1,
              }}
              className="absolute right-0 lg:right-4 top-10 lg:top-20 z-20"
            >
              <div className="relative h-40 w-40 lg:h-48 lg:w-48 rounded-full overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.15)] border-4 border-white">
                <img
                  src="https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=400&q=80"
                  alt="Pizza"
                  className="h-full w-full object-cover"
                />
              </div>
            </motion.div>

            {/* Floating Element 2 - Bottom Left */}
            <motion.div
              animate={{ y: [0, 20, 0], x: [0, -10, 0], rotate: [0, 5, 0] }}
              transition={{
                duration: 7,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.5,
              }}
              className="absolute left-0 lg:left-4 bottom-10 lg:bottom-20 z-40"
            >
              <div className="relative h-44 w-44 lg:h-52 lg:w-52 rounded-full overflow-hidden shadow-[0_25px_50px_rgba(0,0,0,0.2)] border-6 border-white">
                <img
                  src="https://images.unsplash.com/photo-1496116218417-1a781b1c416c?auto=format&fit=crop&w=400&q=80"
                  alt="Healthy Bowl"
                  className="h-full w-full object-cover"
                />
              </div>
            </motion.div>

            {/* Floating Sub-element - Top Left */}
            <motion.div
              animate={{ y: [0, -10, 0], rotate: [0, -10, 0] }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 2,
              }}
              className="absolute left-10 lg:left-20 top-0 lg:top-10 z-10"
            >
              <div className="relative h-24 w-24 lg:h-32 lg:w-32 rounded-full overflow-hidden shadow-[0_15px_30px_rgba(0,0,0,0.1)] border-4 border-white">
                <img
                  src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=400&q=80"
                  alt="Salad"
                  className="h-full w-full object-cover"
                />
              </div>
            </motion.div>

            {/* Decorative Floating Dots */}
            <motion.div
              animate={{ y: [0, -30, 0], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="absolute right-1/4 top-1/4 h-4 w-4 rounded-full bg-[#FF9933] blur-sm"
            />
            <motion.div
              animate={{ y: [0, 40, 0], opacity: [0.3, 0.8, 0.3] }}
              transition={{ duration: 6, repeat: Infinity, delay: 1 }}
              className="absolute left-1/3 bottom-1/4 h-6 w-6 rounded-full bg-[#ff6b00] blur-md"
            />
            <motion.div
              animate={{ y: [0, -20, 0], opacity: [0.4, 0.9, 0.4] }}
              transition={{ duration: 5, repeat: Infinity, delay: 2 }}
              className="absolute right-1/3 bottom-1/3 h-3 w-3 rounded-full bg-yellow-400 blur-sm"
            />
          </motion.div>
        </div>
      </div>

      {/* Fade out bottom to blend with next section */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-linear-to-t from-white to-transparent pointer-events-none" />
    </section>
  );
}
