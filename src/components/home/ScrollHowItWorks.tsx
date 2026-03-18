"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { QrCode, UtensilsCrossed, Bell, CreditCard } from "lucide-react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const steps = [
  {
    num: "01",
    Icon: QrCode,
    title: "Scan & Browse",
    desc: "Point your camera at the QR code. The full digital menu loads instantly.",
    color: "#eaa94d",
  },
  {
    num: "02",
    Icon: UtensilsCrossed,
    title: "Pick & Order",
    desc: "Customize portions, add notes, and build your perfect meal with one tap.",
    color: "#e58f2a",
  },
  {
    num: "03",
    Icon: Bell,
    title: "Live Tracking",
    desc: "Watch your order move from kitchen to table in real time.",
    color: "#d67620",
  },
  {
    num: "04",
    Icon: CreditCard,
    title: "Pay & Enjoy",
    desc: "Split bills, pay via eSewa or Khalti, and earn loyalty points.",
    color: "#b25c1c",
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      delay: i * 0.12,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  }),
};

export default function ScrollHowItWorks() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);

  /* GSAP: animate the connecting line on scroll */
  useGSAP(
    () => {
      if (!lineRef.current || !sectionRef.current) return;

      gsap.fromTo(
        lineRef.current,
        { scaleX: 0 },
        {
          scaleX: 1,
          ease: "none",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 70%",
            end: "top 30%",
            scrub: 0.5,
          },
        },
      );

      /* Stagger the step cards */
      const cards = gsap.utils.toArray<HTMLElement>(".hiw-card");
      cards.forEach((card, i) => {
        gsap.fromTo(
          card,
          { opacity: 0, y: 40 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            delay: i * 0.1,
            ease: "power3.out",
            scrollTrigger: {
              trigger: card,
              start: "top 85%",
              toggleActions: "play none none none",
            },
          },
        );
      });
    },
    { scope: sectionRef },
  );

  return (
    <section ref={sectionRef} className="relative bg-[#fdf9ef] overflow-hidden">
      {/* Subtle top/bottom gradients for smooth blend */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-white to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none" />

      <div className="mx-auto max-w-6xl px-4 md:px-8 lg:px-12 py-20 md:py-28">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-16 md:mb-20"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eaa94d]/[0.1] px-3.5 py-1 text-[11px] font-bold text-[#b25c1c] uppercase tracking-wider border border-[#eaa94d]/15 mb-4">
            How it works
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#3e1e0c] leading-[1.1]">
            From scan to savour
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#eaa94d] to-[#d67620]">
              in four simple steps.
            </span>
          </h2>
        </motion.div>

        {/* ── Desktop: horizontal timeline ── */}
        <div className="hidden md:block relative">
          {/* Connecting line */}
          <div className="absolute top-[52px] left-[12.5%] right-[12.5%] h-px bg-[#eaa94d]/15">
            <div
              ref={lineRef}
              className="h-full bg-gradient-to-r from-[#eaa94d] to-[#b25c1c] origin-left"
              style={{ transform: "scaleX(0)" }}
            />
          </div>

          <div className="grid grid-cols-4 gap-6 lg:gap-8">
            {steps.map((step, i) => (
              <motion.div
                key={step.num}
                custom={i}
                variants={cardVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-40px" }}
                className="hiw-card relative flex flex-col items-center text-center group"
              >
                {/* Step number ring */}
                <div className="relative mb-5">
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: -8 }}
                    transition={{ type: "spring", stiffness: 300, damping: 15 }}
                    className="relative flex h-[104px] w-[104px] items-center justify-center"
                  >
                    {/* Outer ring */}
                    <div
                      className="absolute inset-0 rounded-full border-2 opacity-20 transition-opacity duration-300 group-hover:opacity-40"
                      style={{ borderColor: step.color }}
                    />
                    {/* Inner circle */}
                    <div
                      className="flex h-16 w-16 items-center justify-center rounded-full shadow-lg transition-transform duration-300 group-hover:scale-105"
                      style={{ backgroundColor: step.color }}
                    >
                      <step.Icon className="h-6 w-6 text-white" strokeWidth={1.8} />
                    </div>
                  </motion.div>
                  {/* Step number */}
                  <span
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-extrabold tracking-widest uppercase"
                    style={{ color: step.color }}
                  >
                    {step.num}
                  </span>
                </div>

                <h3 className="text-base font-bold text-[#3e1e0c] tracking-tight mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-[#8e491e]/50 leading-relaxed max-w-[200px]">
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── Mobile: vertical timeline ── */}
        <div className="md:hidden relative">
          {/* Vertical connecting line */}
          <div className="absolute left-[27px] top-0 bottom-0 w-px bg-[#eaa94d]/15" />

          <div className="space-y-10">
            {steps.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{
                  duration: 0.5,
                  delay: i * 0.08,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="relative flex items-start gap-5 pl-1"
              >
                {/* Icon circle */}
                <div className="relative shrink-0">
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-full shadow-md z-10 relative"
                    style={{ backgroundColor: step.color }}
                  >
                    <step.Icon className="h-5 w-5 text-white" strokeWidth={1.8} />
                  </div>
                </div>

                {/* Content */}
                <div className="pt-1">
                  <span
                    className="text-[10px] font-extrabold tracking-widest uppercase"
                    style={{ color: step.color }}
                  >
                    Step {step.num}
                  </span>
                  <h3 className="text-base font-bold text-[#3e1e0c] tracking-tight mt-0.5">
                    {step.title}
                  </h3>
                  <p className="text-sm text-[#8e491e]/50 leading-relaxed mt-1">
                    {step.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
