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
        {/* Swiggy-style dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#1F2A2A]/80 via-[#1F2A2A]/60 to-[#F5F0E8] pointer-events-none" />
      </motion.div>

      <div className="container relative z-10 mx-auto px-4 text-center md:px-6 mt-16 md:mt-0">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-4xl"
        >
          <h1 className="mb-4 text-5xl font-extrabold tracking-tight text-white sm:text-6xl md:text-7xl lg:text-[80px] drop-shadow-xl">
            What's on your mind?
          </h1>
          <p className="mb-10 text-lg font-medium text-white/90 sm:text-xl md:text-2xl drop-shadow-md max-w-2xl mx-auto">
            Order from table or book your perfect stay in Nepal.
          </p>

          {/* Big Search Bar */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mx-auto flex max-w-3xl flex-col gap-2 rounded-2xl bg-white/10 p-2 backdrop-blur-md sm:flex-row sm:rounded-full sm:p-2 border border-white/20 shadow-2xl"
          >
            <div className="relative flex flex-1 items-center rounded-xl sm:rounded-l-full bg-white transition-all hover:bg-gray-50 focus-within:ring-2 focus-within:ring-[#FF9933] overflow-hidden">
              <MapPin className="absolute left-5 h-5 w-5 text-gray-400" />
              <input
                type="text"
                className="w-full bg-transparent py-4 pl-14 pr-4 font-medium text-[#1F2A2A] placeholder-gray-500 focus:outline-none"
                placeholder="Pokhara, Nepal"
              />
              <div className="absolute right-0 top-1/2 h-8 w-px -translate-y-1/2 bg-gray-200" />
            </div>

            <div className="relative flex flex-[2] items-center rounded-xl sm:rounded-none bg-white transition-all hover:bg-gray-50 focus-within:ring-2 focus-within:ring-[#FF9933] focus-within:z-10 overflow-hidden mt-1 sm:mt-0">
              <Search className="absolute left-5 h-5 w-5 text-gray-400" />
              <input
                type="text"
                className="w-full bg-transparent py-4 pl-14 pr-4 font-medium text-[#1F2A2A] placeholder-gray-500 focus:outline-none"
                placeholder="Find restaurants & hotels..."
              />
            </div>
            <button className="rounded-xl sm:rounded-full bg-[#FF9933] px-8 py-4 font-bold text-white shadow-lg transition-all hover:bg-[#ff8811] hover:scale-105 active:scale-95 mt-1 sm:mt-0">
              Search
            </button>
          </motion.div>

          {/* Two Big CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mx-auto mt-12 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-8"
          >
            <button className="group relative overflow-hidden rounded-2xl bg-white p-6 text-left shadow-xl transition-all hover:-translate-y-1 hover:shadow-2xl">
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[#0A4D3C]/5 transition-transform group-hover:scale-150" />
              <div className="relative z-10 flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#0A4D3C]/10 text-[#0A4D3C] transition-colors group-hover:bg-[#0A4D3C] group-hover:text-[#FF9933]">
                  <QrCode className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#1F2A2A]">
                    Scan QR at Table
                  </h3>
                  <p className="mt-1 text-sm font-medium text-gray-500">
                    Order instantly
                  </p>
                </div>
              </div>
            </button>

            <button className="group relative overflow-hidden rounded-2xl bg-white p-6 text-left shadow-xl transition-all hover:-translate-y-1 hover:shadow-2xl">
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[#FF9933]/5 transition-transform group-hover:scale-150" />
              <div className="relative z-10 flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#FF9933]/10 text-[#FF9933] transition-colors group-hover:bg-[#FF9933] group-hover:text-white">
                  <Building2 className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#1F2A2A]">
                    Book Hotels & Resorts
                  </h3>
                  <p className="mt-1 text-sm font-medium text-gray-500">
                    Premium stays
                  </p>
                </div>
              </div>
            </button>
          </motion.div>
        </motion.div>
      </div>

      {/* Fade out bottom to blend with next section */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#F5F0E8] to-transparent pointer-events-none" />
    </section>
  );
}
