"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { QrCode, MonitorSmartphone, ChefHat, CheckCircle2 } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const steps = [
  {
    id: "01",
    title: "Scan & Order",
    description: "Customers scan the QR code to view the digital menu and place their orders directly from the table.",
    icon: QrCode,
    color: "bg-blue-50 text-blue-600",
  },
  {
    id: "02",
    title: "Sync to POS",
    description: "Orders instantly appear on the POS terminal without any staff intervention, saving time.",
    icon: MonitorSmartphone,
    color: "bg-purple-50 text-purple-600",
  },
  {
    id: "03",
    title: "Kitchen Prep",
    description: "The Kitchen Display System (KDS) receives the KOT live, alerting chefs to start preparation.",
    icon: ChefHat,
    color: "bg-orange-50 text-orange-600",
  },
  {
    id: "04",
    title: "Serve & Pay",
    description: "Staff are pinged when food is ready. Customers can easily split the bill and pay digitally.",
    icon: CheckCircle2,
    color: "bg-emerald-50 text-emerald-600",
  },
];

export default function HowItWorks() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stepsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        stepsRef.current,
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.2,
          ease: "power2.out",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top 75%",
          },
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={containerRef} className="py-12 md:py-24 bg-[var(--canvas)] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12">
        <div className="text-center max-w-2xl mx-auto mb-20">
          <h2 className="text-3xl md:text-5xl font-black text-[var(--text-1)] tracking-tight">
            How HimalHub Works
          </h2>
          <p className="mt-4 text-lg text-[var(--text-2)] font-medium">
            A fully automated, end-to-end digital ecosystem that eliminates manual bottlenecks.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8 relative">
          {/* Connecting Line (Desktop only) */}
          <div className="hidden lg:block absolute top-12 left-[10%] right-[10%] h-0.5 bg-linear-to-r from-transparent via-[var(--border)] to-transparent" />

          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div
                key={step.id}
                ref={(el) => { stepsRef.current[i] = el; }}
                className="relative flex flex-col items-center text-center group"
              >
                {/* Step Number Badge */}
                <div className="absolute -top-4 -left-4 md:-left-0 text-[10px] font-black text-[var(--canvas)] bg-[var(--text-1)] px-2 py-1 rounded-full z-20 shadow-md">
                  STEP {step.id}
                </div>

                <div className={`h-24 w-24 rounded-3xl ${step.color} bg-opacity-40 flex items-center justify-center mb-6 relative z-10 shadow-sm border border-[var(--surface)] transition-transform duration-500 group-hover:-translate-y-2 group-hover:shadow-xl`}>
                  <Icon className="h-10 w-10" strokeWidth={1.5} />
                </div>
                
                <h3 className="text-xl font-black text-[var(--text-1)] mb-3">
                  {step.title}
                </h3>
                <p className="text-[15px] text-[var(--text-2)] leading-relaxed max-w-[260px]">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
