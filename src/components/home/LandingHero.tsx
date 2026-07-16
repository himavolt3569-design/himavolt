"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ArrowRight, Play, Sparkles } from "lucide-react";
import Link from "next/link";

export default function LandingHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subheadRef = useRef<HTMLParagraphElement>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.fromTo(
        badgeRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, delay: 0.1 }
      )
      .fromTo(
        headlineRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8 },
        "-=0.4"
      )
      .fromTo(
        subheadRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.7 },
        "-=0.5"
      )
      .fromTo(
        buttonsRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6 },
        "-=0.4"
      )
      .fromTo(
        imageRef.current,
        { opacity: 0, scale: 0.95, y: 40 },
        { opacity: 1, scale: 1, y: 0, duration: 1, ease: "power2.out" },
        "-=0.8"
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section 
      ref={containerRef} 
      className="relative bg-[var(--canvas)] pt-8 pb-8 md:pt-24 md:pb-24 overflow-hidden md:min-h-[60vh] flex flex-col justify-start md:justify-center border-b border-[var(--border-soft)]"
    >
      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 -mr-32 -mt-32 h-[500px] w-[500px] rounded-full bg-[var(--accent)]/[0.03] pointer-events-none blur-3xl" />
      <div className="absolute bottom-0 left-0 -ml-32 -mb-32 h-[400px] w-[400px] rounded-full bg-blue-500/[0.03] pointer-events-none blur-3xl" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 md:px-8 lg:px-12 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          
          {/* Left: Content */}
          <div className="text-center lg:text-left flex flex-col items-center lg:items-start">
            <div 
              ref={badgeRef}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[var(--border-soft)] shadow-sm mb-6"
            >
              <Sparkles className="h-3.5 w-3.5 text-[var(--accent)]" />
              <span className="text-[11px] font-bold text-[var(--text-2)] uppercase tracking-wider">
                Nepal&apos;s Ultimate Hospitality OS
              </span>
            </div>

            <h1 
              ref={headlineRef}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-[4rem] leading-[1.1] font-black tracking-tight text-[var(--text-1)] mb-6"
            >
              The complete operating system for <span className="text-[var(--accent)]">restaurants & hotels.</span>
            </h1>

            <p 
              ref={subheadRef}
              className="text-base md:text-lg text-[var(--text-2)] max-w-lg mb-10 leading-relaxed font-medium"
            >
              Manage digital menus, intelligent POS terminals, live table sessions, and hotel room bookings all from one seamless cloud platform.
            </p>

            <div 
              ref={buttonsRef}
              className="flex flex-col sm:flex-row w-full sm:w-auto items-center gap-4"
            >
              <Link href="/contact" className="w-full sm:w-auto">
                <button className="w-full sm:w-auto px-8 py-4 rounded-[1.5rem] bg-[var(--text-1)] text-white font-bold text-sm hover:scale-105 active:scale-95 transition-transform duration-300 flex items-center justify-center gap-2 group shadow-lg shadow-black/10">
                  Book a Demo
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>
              </Link>
              <button 
                onClick={() => {
                  document.getElementById("platform-modules")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="w-full sm:w-auto px-8 py-4 rounded-[1.5rem] bg-white border border-[var(--border-soft)] text-[var(--text-1)] font-bold text-sm hover:bg-[var(--surface-alt)] hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 shadow-sm"
              >
                <Play className="h-4 w-4 fill-current opacity-70" />
                See How It Works
              </button>
            </div>
          </div>

          {/* Right: Visual */}
          <div className="relative hidden lg:block" ref={imageRef}>
            <div className="relative aspect-[4/3] w-full rounded-[2.5rem] overflow-hidden shadow-2xl shadow-black/5 bg-[var(--surface)] border border-[var(--border-soft)] p-2">
              <div className="absolute inset-0 bg-linear-to-tr from-[var(--canvas)] to-transparent pointer-events-none z-10" />
              
              {/* Abstract Software UI Mockup */}
              <div className="w-full h-full rounded-[2rem] overflow-hidden bg-white border border-[var(--border-soft)] shadow-inner relative flex flex-col">
                {/* Header Mockup */}
                <div className="h-12 border-b border-[var(--border-soft)] flex items-center px-6 gap-4 bg-[var(--canvas)]">
                  <div className="flex gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
                    <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                    <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
                  </div>
                  <div className="h-6 w-48 bg-white rounded-md mx-auto shadow-sm" />
                </div>
                {/* Body Mockup */}
                <div className="flex-1 p-6 flex gap-6">
                  {/* Sidebar */}
                  <div className="w-1/4 h-full rounded-xl bg-[var(--canvas-sub)] p-4 flex flex-col gap-3">
                    <div className="h-8 rounded-lg bg-[var(--accent)]/20 w-full" />
                    <div className="h-8 rounded-lg bg-white/60 w-3/4" />
                    <div className="h-8 rounded-lg bg-white/60 w-full" />
                    <div className="h-8 rounded-lg bg-white/60 w-5/6" />
                  </div>
                  {/* Main Grid */}
                  <div className="w-3/4 grid grid-cols-2 gap-4">
                    <div className="col-span-2 h-32 rounded-2xl bg-gradient-to-r from-[var(--accent)]/10 to-orange-500/10 border border-[var(--accent)]/20 p-4">
                      <div className="h-4 w-24 bg-[var(--accent)]/40 rounded-full mb-4" />
                      <div className="h-10 w-32 bg-[var(--text-1)]/80 rounded-lg" />
                    </div>
                    <div className="h-full rounded-2xl bg-[var(--canvas-sub)] p-4" />
                    <div className="h-full rounded-2xl bg-[var(--canvas-sub)] p-4" />
                  </div>
                </div>
              </div>

              {/* Floating Badge */}
              <div className="absolute bottom-8 left-8 bg-white/95 backdrop-blur-md px-4 py-3 rounded-2xl shadow-xl border border-white flex items-center gap-3 z-20">
                <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Live Sync</p>
                  <p className="text-[10px] font-semibold text-slate-500">Zero latency updates</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
