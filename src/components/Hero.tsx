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
      className="relative flex min-h-[85vh] md:min-h-[80vh] w-full flex-col items-center justify-center overflow-hidden"
    >
      {/* Background Image & Overlay */}
      <motion.div
        style={{ y }}
        className="absolute inset-0 -z-10 h-[120%] w-full"
      >
        <div
          ref={bgRef}
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1544735716-392fe2489ffa?q=80&w=2674&auto=format&fit=crop')",
          }}
        />
        {/* Refined gradient overlay for better text contrast and premium feel */}
        <div className="absolute inset-0 bg-linear-to-b from-[#0A4D3C]/90 via-[#1F2A2A]/70 to-[#F5F0E8] pointer-events-none mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#F5F0E8] via-transparent to-transparent opacity-90" />
      </motion.div>

      <div className="container relative z-10 mx-auto px-4 text-center md:px-6 mt-20 md:mt-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-4xl"
        >
          <h1 className="mb-6 text-5xl font-extrabold tracking-tight text-white sm:text-6xl md:text-7xl lg:text-[80px] drop-shadow-2xl">
            What's on your mind?
          </h1>
          <p className="mb-12 text-lg font-medium text-white/95 sm:text-xl md:text-2xl drop-shadow-lg max-w-2xl mx-auto tracking-wide">
            Order from table or book your perfect stay in Nepal.
          </p>

          {/* Big Search Bar - Enhanced */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mx-auto flex max-w-4xl flex-col gap-2 rounded-3xl bg-white/20 p-2 sm:p-3 backdrop-blur-xl sm:flex-row sm:rounded-full border border-white/30 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)]"
          >
            <div className="relative flex flex-1 items-center rounded-2xl sm:rounded-l-full bg-white transition-all hover:bg-gray-50 focus-within:ring-4 focus-within:ring-[#FF9933]/50 focus-within:bg-white overflow-hidden shadow-inner group">
              <MapPin className="absolute left-6 h-5 w-5 text-gray-400 group-focus-within:text-[#FF9933] transition-colors" />
              <input
                type="text"
                className="w-full bg-transparent py-4 pl-14 pr-4 text-lg font-medium text-[#1F2A2A] placeholder-gray-400 focus:outline-none"
                placeholder="Pokhara, Nepal"
              />
              <div className="absolute right-0 top-1/2 h-8 w-px -translate-y-1/2 bg-gray-200 hidden sm:block" />
            </div>

            <div className="relative flex flex-[2] items-center rounded-2xl sm:rounded-none bg-white transition-all hover:bg-gray-50 focus-within:ring-4 focus-within:ring-[#FF9933]/50 focus-within:bg-white focus-within:z-10 overflow-hidden mt-1 sm:mt-0 shadow-inner group">
              <Search className="absolute left-6 h-5 w-5 text-gray-400 group-focus-within:text-[#FF9933] transition-colors" />
              <input
                type="text"
                className="w-full bg-transparent py-4 pl-14 pr-4 text-lg font-medium text-[#1F2A2A] placeholder-gray-400 focus:outline-none"
                placeholder="Search restaurants, hotels, or dishes..."
              />
            </div>

            <button className="rounded-2xl sm:rounded-full bg-gradient-to-r from-[#FF9933] to-[#ff8811] px-10 py-4 text-lg font-bold text-white shadow-xl transition-all hover:shadow-[#FF9933]/40 hover:-translate-y-0.5 active:translate-y-0 mt-1 sm:mt-0">
              Search
            </button>
          </motion.div>

          {/* Two Big CTAs - Enhanced */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mx-auto mt-16 grid max-w-3xl grid-cols-1 gap-5 sm:grid-cols-2 lg:gap-8"
          >
            <button className="group relative overflow-hidden rounded-3xl bg-white/90 backdrop-blur-md p-6 text-left shadow-2xl transition-all hover:-translate-y-2 hover:bg-white hover:shadow-[0_20px_40px_-10px_rgba(255,153,51,0.2)] border border-white/50">
              <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-gradient-to-br from-[#0A4D3C]/5 to-[#1E9A6F]/10 transition-transform duration-500 group-hover:scale-[2.5]" />
              <div className="relative z-10 flex items-center gap-5">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0A4D3C]/10 to-[#1E9A6F]/20 text-[#0A4D3C] transition-all duration-300 group-hover:scale-110 group-hover:bg-[#0A4D3C] group-hover:text-[#FF9933] shadow-sm">
                  <QrCode className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-[#1F2A2A] tracking-tight group-hover:text-[#0A4D3C] transition-colors">
                    Scan QR at Table
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-gray-500">
                    Order instantly & securely
                  </p>
                </div>
              </div>
            </button>

            <button className="group relative overflow-hidden rounded-3xl bg-white/90 backdrop-blur-md p-6 text-left shadow-2xl transition-all hover:-translate-y-2 hover:bg-white hover:shadow-[0_20px_40px_-10px_rgba(10,77,60,0.2)] border border-white/50">
              <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-gradient-to-br from-[#FF9933]/5 to-[#ff8811]/10 transition-transform duration-500 group-hover:scale-[2.5]" />
              <div className="relative z-10 flex items-center gap-5">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FF9933]/10 to-[#ff8811]/20 text-[#FF9933] transition-all duration-300 group-hover:scale-110 group-hover:bg-[#FF9933] group-hover:text-white shadow-sm">
                  <Building2 className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-[#1F2A2A] tracking-tight group-hover:text-[#FF9933] transition-colors">
                    Book Hotels & Resorts
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-gray-500">
                    Premium Himalayan stays
                  </p>
                </div>
              </div>
            </button>
          </motion.div>
        </motion.div>
      </div>

      {/* Enhanced Fade out bottom to blend with next section */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-linear-to-t from-[#F5F0E8] via-[#F5F0E8]/80 to-transparent pointer-events-none" />
    </section>
  );
}
