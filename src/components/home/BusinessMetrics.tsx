"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Cloud, Zap, ShieldCheck, Headphones } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const defaultMetrics = [
  { label: "Orders Processed", value: 125000, suffix: "+" },
  { label: "Active Tables", value: 3500, suffix: "+" },
];

const benefits = [
  { title: "Real-time Cloud Sync", description: "All devices sync instantly. No local servers required.", icon: Cloud },
  { title: "Zero Latency KOT", description: "Orders hit the kitchen instantly for faster prep times.", icon: Zap },
  { title: "Enterprise Security", description: "Role-based access, PIN logins, and audit logs.", icon: ShieldCheck },
  { title: "Dedicated Support", description: "24/7 technical assistance for uninterrupted operations.", icon: Headphones },
];

export default function BusinessMetrics() {
  const containerRef = useRef<HTMLDivElement>(null);
  const countersRef = useRef<(HTMLDivElement | null)[]>([]);
  const benefitsRef = useRef<(HTMLDivElement | null)[]>([]);
  const [hasAnimated, setHasAnimated] = useState(false);
  const [metrics, setMetrics] = useState(defaultMetrics);

  useEffect(() => {
    fetch("/api/admin/landing-settings")
      .then(res => res.json())
      .then(data => {
        if (data.metrics && data.metrics.length > 0) {
          setMetrics(data.metrics.map((m: any) => ({
            label: m.label,
            value: Number(m.value) || 0,
            suffix: m.suffix
          })));
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Benefit Cards Animation
      gsap.fromTo(
        benefitsRef.current,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top 80%",
          },
        }
      );

      // Counters Animation Trigger
      ScrollTrigger.create({
        trigger: containerRef.current,
        start: "top 75%",
        onEnter: () => setHasAnimated(true),
        once: true,
      });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={containerRef} className="py-12 md:py-24 bg-[var(--surface-alt)] relative">
      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          
          {/* Left: Benefits */}
          <div>
            <h2 className="text-3xl md:text-5xl font-black text-[var(--text-1)] tracking-tight mb-6">
              Why Top Venues Choose HimalHub
            </h2>
            <p className="text-lg text-[var(--text-2)] font-medium mb-12 max-w-lg">
              We replace fragmented tools with a single, powerful operating system built specifically for high-volume hospitality.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {benefits.map((benefit, i) => {
                const Icon = benefit.icon;
                return (
                  <div key={benefit.title} ref={el => { benefitsRef.current[i] = el; }} className="flex gap-4">
                    <div className="flex-shrink-0 mt-1">
                      <div className="h-10 w-10 rounded-xl bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center">
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-[var(--text-1)] mb-1">{benefit.title}</h4>
                      <p className="text-sm text-[var(--text-2)] leading-relaxed">{benefit.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Metrics */}
          <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl shadow-black/5 border border-[var(--border-soft)] grid grid-cols-2 gap-x-8">
            {metrics.map((metric, i) => (
              <div key={metric.label} ref={el => { countersRef.current[i] = el; }} className="text-center">
                <div className="text-4xl md:text-5xl font-black text-[var(--accent)] mb-2 font-syne flex justify-center items-baseline">
                  {hasAnimated ? <Counter from={0} to={metric.value} duration={2} decimals={metric.value % 1 !== 0 ? 1 : 0} /> : "0"}
                  <span>{metric.suffix}</span>
                </div>
                <div className="text-sm font-semibold text-[var(--text-2)] uppercase tracking-wider">
                  {metric.label}
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}

// Simple Counter Component
function Counter({ from, to, duration, decimals = 0 }: { from: number, to: number, duration: number, decimals?: number }) {
  const [count, setCount] = useState(from);
  
  useEffect(() => {
    let startTimestamp: number;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / (duration * 1000), 1);
      // easeOutExpo
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(ease * (to - from) + from);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [from, to, duration]);

  return <>{count.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</>;
}
