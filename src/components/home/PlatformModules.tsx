"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { QrCode, MonitorSmartphone, ChefHat, Building2, Users, LineChart, CreditCard, Box, Settings } from "lucide-react";
import Link from "next/link";

gsap.registerPlugin(ScrollTrigger);

const modules = [
  { id: "digital-menu", name: "Digital Menu", icon: QrCode, color: "bg-blue-50 text-blue-600" },
  { id: "pos", name: "Cloud POS", icon: MonitorSmartphone, color: "bg-purple-50 text-purple-600" },
  { id: "kds", name: "Smart KDS", icon: ChefHat, color: "bg-orange-50 text-orange-600" },
  { id: "hotel-hub", name: "Hotel Hub", icon: Building2, color: "bg-emerald-50 text-emerald-600" },
  { id: "staff", name: "Staff Mgmt", icon: Users, color: "bg-pink-50 text-pink-600" },
  { id: "analytics", name: "Analytics", icon: LineChart, color: "bg-cyan-50 text-cyan-600" },
  { id: "payments", name: "Payments", icon: CreditCard, color: "bg-amber-50 text-amber-600" },
  { id: "inventory", name: "Inventory", icon: Box, color: "bg-red-50 text-red-600" },
  { id: "settings", name: "Config", icon: Settings, color: "bg-slate-50 text-slate-600" },
];

export default function PlatformModules() {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<(HTMLAnchorElement | null)[]>([]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        itemsRef.current,
        { opacity: 0, y: 20, scale: 0.9 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.5,
          stagger: 0.05,
          ease: "back.out(1.2)",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top 90%",
          },
        }
      );
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <section id="platform-modules" ref={containerRef} className="py-8 bg-[var(--canvas)] border-b border-[var(--border-soft)]">
      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12">
        <h2 className="sr-only">Platform Modules</h2>
        
        {/* Horizontal Scroll Container */}
        <div className="flex gap-4 md:gap-6 overflow-x-auto pb-4 scrollbar-none snap-x snap-mandatory -mx-4 px-4 md:mx-0 md:px-0">
          {modules.map((mod, i) => {
            const Icon = mod.icon;
            return (
              <Link
                key={mod.id}
                href={`/features/${mod.id}`}
                ref={(el) => { itemsRef.current[i] = el; }}
                className="flex flex-col items-center gap-3 shrink-0 snap-start group outline-none"
              >
                <div className="relative">
                  <div className="absolute -inset-1 rounded-full bg-linear-to-tr from-[var(--accent)] to-[var(--accent-hover)] opacity-0 scale-95 transition-all duration-300 group-hover:opacity-100 group-hover:scale-100 group-focus-visible:opacity-100 group-focus-visible:scale-100" />
                  
                  <div className={`relative h-16 w-16 md:h-20 md:w-20 rounded-full flex items-center justify-center bg-white shadow-sm ring-4 ring-[var(--canvas)] z-10 transition-transform duration-300 group-hover:scale-[0.97] group-focus-visible:scale-[0.97]`}>
                    <div className={`h-full w-full rounded-full flex items-center justify-center ${mod.color} bg-opacity-50`}>
                      <Icon className="h-6 w-6 md:h-8 md:w-8" strokeWidth={1.5} />
                    </div>
                  </div>
                </div>
                
                <span className="text-[11px] md:text-xs font-semibold text-[var(--text-2)] group-hover:text-[var(--text-1)] transition-colors">
                  {mod.name}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
