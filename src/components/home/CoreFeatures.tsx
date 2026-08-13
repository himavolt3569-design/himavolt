"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useState } from "react";
import * as LucideIcons from "lucide-react";
import { ArrowRight, QrCode, MonitorSmartphone, Building2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

/** Feature entry as authored in the landing-settings CMS. */
interface CmsFeature {
  id?: string;
  title: string;
  description: string;
  icon?: string;
}

gsap.registerPlugin(ScrollTrigger);

const defaultFeatures = [
  {
    id: "digital-menu",
    name: "Interactive Digital Menu",
    category: "Customer Experience",
    description: "Immersive QR menus with dynamic themes, floating 3D visuals, and live table sessions.",
    icon: QrCode,
    image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&h=600&fit=crop", // Placeholder for UI mockup
    highlights: ["Live Table Sessions", "Custom Themes", "Self-Checkout"],
  },
  {
    id: "pos-kiosk",
    name: "Smart POS & Kiosk",
    category: "Operations",
    description: "Dual-mode terminal for staff cashiers or customer self-service, completely synced in real-time.",
    icon: MonitorSmartphone,
    image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=600&fit=crop", // Placeholder for UI mockup
    highlights: ["Split Billing", "Kiosk Mode", "eSewa & Khalti"],
  },
  {
    id: "hotel-hub",
    name: "Hotel Management",
    category: "Hospitality",
    description: "Manage rooms, handle advance bookings, and sync restaurant tabs directly to guest rooms.",
    icon: Building2,
    image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=600&fit=crop", // Placeholder for UI mockup
    highlights: ["Room Allocation", "Advance Types", "Unified Billing"],
  },
];

export default function CoreFeatures() {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const [features, setFeatures] = useState(defaultFeatures);

  useEffect(() => {
    fetch("/api/admin/landing-settings")
      .then(res => res.json())
      .then(data => {
        if (data.features && data.features.length > 0) {
          // Map the CMS data into the component's format
          const mappedFeatures = data.features.map((f: CmsFeature, index: number) => {
            // Provide a fallback icon if missing or invalid
            const iconsByName = LucideIcons as unknown as Record<string, LucideIcon | undefined>;
            const IconComponent = (f.icon ? iconsByName[f.icon] : undefined) || QrCode;
            return {
              id: f.id || `dynamic-feature-${index}`,
              name: f.title,
              category: "Platform Module",
              description: f.description,
              icon: IconComponent,
              image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&h=600&fit=crop",
              highlights: ["Scalable", "Real-time", "Cloud-native"],
            };
          });
          setFeatures(mappedFeatures);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Title Animation
      gsap.fromTo(
        titleRef.current,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: titleRef.current,
            start: "top 85%",
          },
        }
      );

      // Cards Stagger Animation
      gsap.fromTo(
        cardsRef.current,
        { opacity: 0, y: 50 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.15,
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
    <section ref={containerRef} className="py-12 md:py-24 bg-[var(--surface)]">
      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12">
        
        {/* Header */}
        <div ref={titleRef} className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
          <div className="max-w-2xl">
            <span className="text-sm font-bold text-[var(--accent)] tracking-widest uppercase mb-3 block">
              Core Modules
            </span>
            <h2 className="text-3xl md:text-5xl font-black text-[var(--text-1)] tracking-tight">
              Powerful Features for Modern Hospitality
            </h2>
            <p className="mt-4 text-lg text-[var(--text-2)] font-medium">
              Everything you need to run your restaurant, cafe, or hotel efficiently from a single unified platform.
            </p>
          </div>
          <Link href="/features" className="group hidden md:inline-flex items-center gap-2 text-sm font-bold text-[var(--text-1)] hover:text-[var(--accent)] transition-colors">
            View All Features
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--canvas)] group-hover:bg-[var(--accent)]/10 transition-colors">
              <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.id}
                ref={(el) => { cardsRef.current[i] = el; }}
                className="group flex flex-col bg-[var(--surface)] rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-black/5 transition-all duration-500 border border-[var(--border-soft)]"
              >
                {/* Image Container (Simulating UI Mockups) */}
                <div className="relative aspect-[4/3] overflow-hidden bg-[var(--canvas-sub)] p-6 flex items-center justify-center">
                  <div className="absolute top-4 left-4 z-10 bg-[var(--surface)]/90 backdrop-blur-md px-3 py-1 rounded-full shadow-sm flex items-center gap-2">
                    <Icon className="h-3 w-3 text-[var(--accent)]" />
                    <span className="text-[11px] font-black text-[var(--text-1)] uppercase tracking-wider">
                      {feature.category}
                    </span>
                  </div>
                  
                  {/* Abstract UI representation instead of just a raw image */}
                  <div className="w-full h-full rounded-2xl overflow-hidden shadow-lg border border-[var(--border-soft)] relative transition-transform duration-700 group-hover:scale-105 group-hover:rotate-1">
                    <img
                      src={feature.image}
                      alt={feature.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 md:p-8 flex flex-col flex-1">
                  <h3 className="text-xl font-black text-[var(--text-1)] mb-3 group-hover:text-[var(--accent)] transition-colors">
                    {feature.name}
                  </h3>
                  <p className="text-sm text-[var(--text-2)] leading-relaxed mb-6">
                    {feature.description}
                  </p>
                  
                  <ul className="space-y-2 mb-8 flex-1">
                    {feature.highlights.map((highlight, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm font-medium text-[var(--text-2)]">
                        <div className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                        {highlight}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto pt-6 border-t border-[var(--border-soft)]">
                    <Link href={`/features/${feature.id}`} className="inline-flex items-center gap-2 text-sm font-bold text-[var(--text-1)] group-hover:text-[var(--accent)] transition-colors">
                      Explore Module
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile View All */}
        <div className="mt-8 md:hidden flex justify-center">
          <Link href="/features" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--text-1)] border-b-2 border-[var(--text-1)] pb-1">
            View All Features
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

      </div>
    </section>
  );
}
