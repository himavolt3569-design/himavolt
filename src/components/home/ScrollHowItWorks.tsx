"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { QrCode, UtensilsCrossed, Bell, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

export default function ScrollHowItWorks() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const panelsRef = useRef<HTMLDivElement>(null);
  const dotsRef = useRef<HTMLDivElement[]>([]);

  /* Desktop: GSAP pinned horizontal scroll */
  useGSAP(
    () => {
      if (window.matchMedia("(max-width: 1023px)").matches) return;
      if (!sectionRef.current || !panelsRef.current) return;

      const panels = gsap.utils.toArray<HTMLElement>(
        ".step-panel",
        panelsRef.current,
      );
      if (panels.length === 0) return;

      const totalScroll =
        panelsRef.current.scrollWidth - panelsRef.current.offsetWidth;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: `+=${(panels.length - 1) * window.innerHeight}`,
          pin: true,
          scrub: 1,
          anticipatePin: 1,
          snap: {
            snapTo: 1 / (panels.length - 1),
            duration: { min: 0.3, max: 0.6 },
            ease: "power1.inOut",
          },
        },
      });

      tl.to(panelsRef.current, {
        x: -totalScroll,
        ease: "none",
        duration: panels.length - 1,
      });

      /* Animate dots in sync */
      panels.forEach((_, i) => {
        if (i > 0 && dotsRef.current[i]) {
          tl.to(
            dotsRef.current[i],
            { backgroundColor: "#eaa94d", duration: 0.1 },
            i,
          );
          tl.to(dotsRef.current[i - 1], { opacity: 0.3, duration: 0.1 }, i);
        }
      });
    },
    { scope: sectionRef },
  );

  return (
    <section ref={sectionRef} className="relative bg-[#fdf9ef]">
      {/* ── Desktop: pinned horizontal scroll ── */}
      <div className="hidden lg:flex min-h-screen items-center">
        <div className="mx-auto max-w-7xl w-full px-4 md:px-8 lg:px-12">
          <div className="grid grid-cols-[340px_1fr] gap-16 items-center">
            {/* Left: persistent panel */}
            <div>
              <Badge variant="saffron">How it works</Badge>
              <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-[var(--text-1)] leading-[1.1]">
                From scan to savour
                <br />
                <span className="text-transparent bg-clip-text bg-linear-to-r from-[var(--accent)] to-[var(--accent-hover)]">
                  in four simple steps.
                </span>
              </h2>
              {/* Step dots */}
              <div className="flex items-center gap-3 mt-10">
                {steps.map((_, i) => (
                  <div
                    key={i}
                    ref={(el) => {
                      if (el) dotsRef.current[i] = el;
                    }}
                    className="h-2.5 w-2.5 rounded-full transition-colors duration-300"
                    style={{
                      backgroundColor:
                        i === 0 ? "#eaa94d" : "rgba(62,30,12,0.1)",
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Right: scrolling panel strip */}
            <div className="overflow-hidden">
              <div ref={panelsRef} className="flex">
                {steps.map((step) => (
                  <div
                    key={step.num}
                    className="step-panel w-full shrink-0 px-3"
                  >
                    <div className="rounded-2xl border border-[#f4d69a]/25 bg-[var(--canvas)] p-10 relative overflow-hidden min-h-[320px]">
                      <span className="absolute top-6 right-8 text-[80px] font-extrabold leading-none text-[var(--text-1)]/[0.03] select-none pointer-events-none">
                        {step.num}
                      </span>
                      <div
                        className="flex h-14 w-14 items-center justify-center rounded-xl mb-6"
                        style={{
                          backgroundColor: `${step.color}15`,
                          border: `1px solid ${step.color}25`,
                        }}
                      >
                        <step.Icon
                          className="h-6 w-6"
                          style={{ color: step.color }}
                          strokeWidth={1.8}
                        />
                      </div>
                      <span
                        className="text-[11px] font-bold uppercase tracking-widest"
                        style={{ color: step.color }}
                      >
                        Step {step.num}
                      </span>
                      <h3 className="mt-2 text-2xl font-extrabold text-[var(--text-1)] tracking-tight">
                        {step.title}
                      </h3>
                      <p className="mt-3 text-base text-[#8e491e]/55 leading-relaxed max-w-sm">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile/Tablet: vertical timeline ── */}
      <div className="lg:hidden">
        <div className="mx-auto max-w-6xl px-4 md:px-8 py-20 md:py-28">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="text-center mb-14"
          >
            <Badge variant="saffron" className="mb-4">
              How it works
            </Badge>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#111111] leading-[1.1]">
              From scan to savour
              <br />
              <span className="text-transparent bg-clip-text bg-linear-to-r from-[var(--accent)] to-[var(--accent-hover)]">
                in four simple steps.
              </span>
            </h2>
          </motion.div>

          <div className="relative">
            <div className="absolute left-[27px] top-0 bottom-0 w-px bg-[var(--accent)]/15" />

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
                  <div className="relative shrink-0">
                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-full shadow-md z-10 relative"
                      style={{ backgroundColor: step.color }}
                    >
                      <step.Icon
                        className="h-5 w-5 text-white"
                        strokeWidth={1.8}
                      />
                    </div>
                  </div>

                  <div className="pt-1">
                    <span
                      className="text-[10px] font-extrabold tracking-widest uppercase"
                      style={{ color: step.color }}
                    >
                      Step {step.num}
                    </span>
                    <h3 className="text-base font-bold text-[#111111] tracking-tight mt-0.5">
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
      </div>
    </section>
  );
}
