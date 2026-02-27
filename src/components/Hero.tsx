"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Search, QrCode, Utensils } from "lucide-react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Link from "next/link";

export default function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);

  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 500], [1, 0.3]);

  useGSAP(
    () => {
      if (bgRef.current) {
        gsap.to(bgRef.current, {
          scale: 1.04,
          duration: 14,
          ease: "power1.inOut",
          yoyo: true,
          repeat: -1,
        });
      }
    },
    { scope: containerRef },
  );

  return (
    <motion.section
      ref={containerRef}
      style={{ opacity: heroOpacity }}
      className="relative flex w-full items-center justify-center overflow-hidden bg-linear-to-br from-white via-[#F5F0E8] to-[#f9f6f0]"
    >
      <div
        ref={bgRef}
        className="absolute inset-0 pointer-events-none"
      >
        <div className="absolute top-0 right-0 -mr-48 -mt-48 h-[700px] w-[700px] rounded-full bg-[#FF9933]/4 blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-48 -mb-48 h-[700px] w-[700px] rounded-full bg-[#FF9933]/[0.07] blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1440px] w-full px-4 md:px-6 lg:px-10 pt-20 pb-16 md:pt-28 md:pb-20">
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FF9933]/10 text-[#FF9933] font-bold text-sm mb-6 border border-[#FF9933]/20"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF9933] opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#FF9933]" />
            </span>
            Nepal&apos;s #1 Food Delivery Platform
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="mb-5 text-[2.5rem] font-extrabold tracking-tight text-[#1F2A2A] sm:text-5xl md:text-6xl lg:text-7xl leading-[1.08]"
          >
            Craving something{" "}
            <span className="text-transparent bg-clip-text bg-linear-to-r from-[#FF9933] to-[#ff6b00]">
              Extraordinary?
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="mb-8 text-base font-medium text-gray-500 sm:text-lg md:text-xl max-w-xl leading-relaxed"
          >
            Order premium food right to your table or get it delivered
            to your doorstep in minutes.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="flex w-full max-w-xl rounded-2xl bg-white p-2 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.12)] sm:rounded-full border border-gray-100/80"
          >
            <div className="relative flex flex-1 items-center rounded-xl sm:rounded-l-full bg-gray-50 transition-all hover:bg-gray-100 focus-within:ring-2 focus-within:ring-[#FF9933]/40 focus-within:bg-white overflow-hidden group">
              <Search className="absolute left-4 h-[18px] w-[18px] text-gray-400 group-focus-within:text-[#FF9933] transition-colors shrink-0" />
              <input
                type="text"
                className="w-full bg-transparent py-3.5 pl-11 pr-4 text-sm font-semibold text-[#1F2A2A] placeholder-gray-400 focus:outline-none"
                placeholder="Search for restaurant, cuisine, or dish..."
              />
            </div>

            <button className="ml-2 rounded-xl sm:rounded-full bg-linear-to-r from-[#FF9933] to-[#ff8811] px-6 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg hover:shadow-[#FF9933]/30 hover:-translate-y-0.5 active:translate-y-0 shrink-0">
              Search
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-8 flex flex-row gap-3 justify-center"
          >
            <Link href="/scan" className="group flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm transition-all hover:shadow-md border border-gray-100 hover:border-[#FF9933]/20 hover:-translate-y-0.5 active:translate-y-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FF9933]/10 text-[#FF9933] transition-colors group-hover:bg-[#FF9933] group-hover:text-white">
                <QrCode className="h-[18px] w-[18px]" />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-bold text-[#1F2A2A] group-hover:text-[#FF9933] transition-colors leading-tight">
                  Scan QR
                </h3>
                <p className="text-[11px] text-gray-500 leading-tight">Order at table</p>
              </div>
            </Link>

            <Link href="/menu" className="group flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm transition-all hover:shadow-md border border-gray-100 hover:border-[#FF9933]/20 hover:-translate-y-0.5 active:translate-y-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FF9933]/10 text-[#FF9933] transition-colors group-hover:bg-[#FF9933] group-hover:text-white">
                <Utensils className="h-[18px] w-[18px]" />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-bold text-[#1F2A2A] group-hover:text-[#FF9933] transition-colors leading-tight">
                  Browse Menu
                </h3>
                <p className="text-[11px] text-gray-500 leading-tight">Restaurants near you</p>
              </div>
            </Link>
          </motion.div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-20 bg-linear-to-t from-white to-transparent pointer-events-none" />
    </motion.section>
  );
}
