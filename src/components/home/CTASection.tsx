"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight, PlayCircle } from "lucide-react";
import Link from "next/link";

gsap.registerPlugin(ScrollTrigger);

export default function CTASection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        contentRef.current,
        { opacity: 0, scale: 0.95, y: 30 },
        {
          opacity: 1,
          scale: 1,
          y: 0,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top 80%",
          },
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={containerRef} className="py-12 md:py-24 bg-[var(--canvas)] px-4 md:px-8 lg:px-12">
      <div 
        ref={contentRef}
        className="max-w-6xl mx-auto rounded-[3rem] overflow-hidden relative"
      >
        {/* Background gradient & glassmorphism effect */}
        <div className="absolute inset-0 bg-linear-to-br from-[var(--accent)] to-[#d67620]" />
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 -mr-32 -mt-32 w-[600px] h-[600px] rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-32 -mb-32 w-[400px] h-[400px] rounded-full bg-black/10 blur-3xl pointer-events-none" />
        
        <div className="relative z-10 px-6 py-20 md:py-28 text-center flex flex-col items-center">
          <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-6 max-w-3xl leading-tight">
            Ready to upgrade your hospitality operations?
          </h2>
          <p className="text-lg md:text-xl text-white/90 font-medium mb-12 max-w-xl">
            Join hundreds of venues relying on HimalHub to increase efficiency, boost sales, and delight customers.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <Link href="/sign-in" className="w-full sm:w-auto">
              <button className="w-full sm:w-auto px-8 py-4.5 rounded-full bg-white text-[var(--accent)] font-black text-base shadow-xl hover:scale-105 active:scale-95 transition-transform duration-300 flex items-center justify-center gap-2 group">
                Get Started for Free
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            </Link>
            
            <Link href="/demo/book" className="w-full sm:w-auto">
              <button className="w-full sm:w-auto px-8 py-4.5 rounded-full bg-black/20 text-white border border-white/20 backdrop-blur-md font-bold text-base hover:bg-black/30 hover:border-white/40 transition-all duration-300 flex items-center justify-center gap-2 group">
                <PlayCircle className="h-4 w-4" />
                Book a Live Demo
              </button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
