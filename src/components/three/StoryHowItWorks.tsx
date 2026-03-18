"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  QrCode,
  UtensilsCrossed,
  Bell,
  CreditCard,
  Wifi,
  MapPin,
  Star,
  Clock,
  Check,
  ShoppingBag,
} from "lucide-react";
import { formatPrice } from "@/lib/currency";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const steps = [
  {
    Icon: QrCode,
    title: "Scan & Browse",
    desc: "Scan the QR code at your table or browse restaurants near you.",
    accent: "from-[#eaa94d] to-[#d67620]",
    accentColor: "#eaa94d",
    image:
      "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400&h=700&fit=crop",
    phoneLabel: "Scanning QR...",
  },
  {
    Icon: UtensilsCrossed,
    title: "Pick & Order",
    desc: "Choose from digital menus and customize your order effortlessly.",
    accent: "from-[#eaa94d] to-[#f1c980]",
    accentColor: "#eaa94d",
    image:
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=700&fit=crop",
    phoneLabel: "Choose your meal",
  },
  {
    Icon: Bell,
    title: "Live Tracking",
    desc: "Real-time updates while we prepare and deliver your food.",
    accent: "from-[#1E7B3E] to-[#34D399]",
    accentColor: "#1E7B3E",
    image:
      "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=700&fit=crop",
    phoneLabel: "Preparing your order",
  },
  {
    Icon: CreditCard,
    title: "Pay & Enjoy",
    desc: "Pay securely via your phone and savor the premium experience.",
    accent: "from-[#6366F1] to-[#818CF8]",
    accentColor: "#6366F1",
    image:
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=700&fit=crop",
    phoneLabel: "Payment successful!",
  },
];

/**
 * Pinned "How It Works" with left cards + right phone mockup.
 * Heading & phone are visible on entry; only step cards animate.
 */
export default function StoryHowItWorks() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);
  const phoneGlowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current || !cardsRef.current) return;

    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray<HTMLElement>(".story-step-card");
      const progressDots = gsap.utils.toArray<HTMLElement>(".story-step-dot");
      const phoneScreens = gsap.utils.toArray<HTMLElement>(".phone-screen");
      const phoneBars = gsap.utils.toArray<HTMLElement>(".phone-status-bar");

      // Shorter pin — 3 "pages" instead of 4 since heading is already visible
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: `+=${steps.length * 80}%`,
          pin: true,
          scrub: 0.8,
          pinSpacing: true,
        },
      });

      // Phone glow fades in gently
      tl.fromTo(
        phoneGlowRef.current,
        { opacity: 0, scale: 0.6 },
        { opacity: 0.7, scale: 1, duration: 0.1 },
        0,
      );

      // First phone screen visible immediately
      if (phoneScreens[0]) {
        tl.set(phoneScreens[0], { opacity: 1, scale: 1 }, 0);
      }
      if (phoneBars[0]) {
        tl.set(phoneBars[0], { opacity: 1, y: 0 }, 0);
      }
      // First dot active
      if (progressDots[0]) {
        tl.set(progressDots[0], {
          scale: 1.4,
          backgroundColor: steps[0].accentColor,
        }, 0);
      }

      // Each card + corresponding phone screen reveals in sequence
      cards.forEach((card, i) => {
        const startAt = i * 0.22;
        const dot = progressDots[i];
        const screen = phoneScreens[i];
        const bar = phoneBars[i];

        // Card entrance
        tl.fromTo(
          card,
          { opacity: 0, y: 40, scale: 0.95 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.14,
            ease: "power2.out",
          },
          startAt,
        );

        // Phone screen crossfade (skip first — already visible)
        if (screen && i > 0) {
          tl.fromTo(
            screen,
            { opacity: 0, scale: 1.05 },
            { opacity: 1, scale: 1, duration: 0.12, ease: "power2.out" },
            startAt,
          );
          if (phoneScreens[i - 1]) {
            tl.to(
              phoneScreens[i - 1],
              { opacity: 0, scale: 0.95, duration: 0.1 },
              startAt,
            );
          }
        }

        // Status bar text
        if (bar && i > 0) {
          tl.fromTo(
            bar,
            { opacity: 0, y: 8 },
            { opacity: 1, y: 0, duration: 0.1 },
            startAt + 0.04,
          );
          if (phoneBars[i - 1]) {
            tl.to(
              phoneBars[i - 1],
              { opacity: 0, y: -8, duration: 0.06 },
              startAt,
            );
          }
        }

        // Activate progress dot
        if (dot && i > 0) {
          tl.to(
            dot,
            {
              scale: 1.4,
              backgroundColor: steps[i].accentColor,
              duration: 0.06,
            },
            startAt,
          );
          if (progressDots[i - 1]) {
            tl.to(
              progressDots[i - 1],
              {
                scale: 1,
                backgroundColor: "rgba(255,255,255,0.15)",
                duration: 0.06,
              },
              startAt,
            );
          }
        }

        // Phone glow color shift
        tl.to(
          phoneGlowRef.current,
          { backgroundColor: steps[i].accentColor, duration: 0.12 },
          startAt,
        );

        // Card exits (except last)
        if (i < cards.length - 1) {
          tl.to(
            card,
            { opacity: 0, y: -20, scale: 0.97, duration: 0.1 },
            startAt + 0.18,
          );
        }
      });

      // Final fade out
      tl.to(
        sectionRef.current,
        { opacity: 0, duration: 0.08 },
        0.92,
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen overflow-hidden bg-[#0B0E14] text-white"
    >
      {/* Smooth gradient transition from light content above */}
      <div className="absolute -top-32 left-0 right-0 h-32 bg-gradient-to-b from-transparent to-[#0B0E14] pointer-events-none z-10" />

      {/* Ambient glows — softer, fewer */}
      <div className="absolute top-[15%] left-[15%] h-[500px] w-[500px] rounded-full bg-[#eaa94d]/[0.03] blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[15%] h-[450px] w-[450px] rounded-full bg-[#6366F1]/[0.03] blur-[140px] pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-[1440px] px-4 md:px-8 lg:px-12 h-screen flex items-center">
        <div className="flex w-full gap-8 lg:gap-16 items-center">
          {/* Left column: heading + cards */}
          <div className="flex-1 min-w-0">
            {/* Header — visible immediately, no animation needed */}
            <div className="mb-8 max-w-xl">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] px-3.5 py-1.5 text-[11px] font-bold text-white/50 uppercase tracking-wider border border-white/[0.05] mb-5">
                How it works
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.1]">
                From scan to savour
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#eaa94d] to-[#f1c980]">
                  in four easy steps.
                </span>
              </h2>
              <p className="mt-4 text-sm text-white/40 max-w-md leading-relaxed">
                A seamless ordering experience designed for speed, simplicity,
                and delight.
              </p>
            </div>

            {/* Progress dots */}
            <div ref={progressRef} className="flex gap-3 mb-8">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className="story-step-dot h-2 w-2 rounded-full bg-white/15 transition-colors"
                />
              ))}
            </div>

            {/* Cards container — stacked */}
            <div ref={cardsRef} className="relative max-w-lg">
              {steps.map((step, idx) => (
                <div
                  key={idx}
                  className="story-step-card absolute top-0 left-0 w-full rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm p-7 md:p-8 opacity-0"
                  style={{ position: idx === 0 ? "relative" : "absolute" }}
                >
                  {/* Step number — subtle watermark */}
                  <div className="absolute top-4 right-6 text-[64px] font-extrabold leading-none text-white/[0.03] select-none pointer-events-none">
                    {idx + 1}
                  </div>

                  {/* Icon */}
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${step.accent} mb-5`}
                  >
                    <step.Icon className="h-5 w-5 text-white" strokeWidth={2} />
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-bold text-white mb-2 tracking-tight">
                    {step.title}
                  </h3>
                  <p className="text-sm text-white/40 leading-relaxed max-w-sm">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Right column: phone mockup */}
          <div className="hidden md:flex flex-1 items-center justify-center relative">
            {/* Glow behind phone */}
            <div
              ref={phoneGlowRef}
              className="absolute w-[280px] h-[280px] rounded-full opacity-0"
              style={{
                backgroundColor: "#eaa94d",
                filter: "blur(120px)",
              }}
            />

            {/* Phone frame */}
            <div
              ref={phoneRef}
              className="relative w-[260px] sm:w-[280px] lg:w-[300px]"
              style={{ perspective: "1000px" }}
            >
              {/* Phone body */}
              <div className="relative rounded-[36px] border-[5px] border-[#1E1E1E] bg-[#111] shadow-2xl shadow-black/50 overflow-hidden">
                {/* Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 w-[100px] h-[26px] bg-[#111] rounded-b-2xl flex items-center justify-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#222]" />
                  <div className="w-10 h-[3px] rounded-full bg-[#222]" />
                </div>

                {/* Screen area */}
                <div className="relative w-full aspect-[9/18] overflow-hidden bg-[#0B0E14]">
                  {/* Phone screens — stacked, crossfade with scroll */}
                  {steps.map((step, i) => (
                    <div
                      key={i}
                      className="phone-screen absolute inset-0 opacity-0"
                      style={{ zIndex: i }}
                    >
                      <img
                        src={step.image}
                        alt={step.title}
                        className="absolute inset-0 w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/40" />

                      {/* Top bar */}
                      <div className="absolute top-8 left-5 right-5 flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-white/50">
                          9:41
                        </span>
                        <div className="flex items-center gap-1">
                          <Wifi className="h-2.5 w-2.5 text-white/50" />
                          <div className="w-4 h-2 rounded-sm border border-white/30 p-px">
                            <div className="h-full w-3/4 rounded-[1px] bg-white/50" />
                          </div>
                        </div>
                      </div>

                      {/* Step-specific UI overlay */}
                      <div className="absolute inset-0 flex flex-col justify-end p-5 pb-8">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${step.accent} mb-3`}
                        >
                          <step.Icon
                            className="h-4 w-4 text-white"
                            strokeWidth={2}
                          />
                        </div>

                        <h4 className="text-base font-bold text-white mb-1">
                          {step.title}
                        </h4>
                        <p className="text-[11px] text-white/50 leading-relaxed mb-3">
                          {step.desc}
                        </p>

                        {/* Mini UI per step */}
                        {i === 0 && (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2 rounded-xl bg-white/8 p-2.5">
                              <QrCode className="h-6 w-6 text-white/70" />
                              <div>
                                <p className="text-[10px] font-bold text-white">
                                  Scan QR Code
                                </p>
                                <p className="text-[9px] text-white/40">
                                  Point camera at table QR
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 rounded-xl bg-white/8 p-2.5">
                              <MapPin className="h-4 w-4 text-[#eaa94d]" />
                              <div>
                                <p className="text-[10px] font-bold text-white">
                                  Or browse nearby
                                </p>
                                <p className="text-[9px] text-white/40">
                                  12 restaurants found
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                        {i === 1 && (
                          <div className="space-y-1.5">
                            {["Buff Momo", "Thakali Set", "Chicken Biryani"].map(
                              (name, j) => (
                                <div
                                  key={j}
                                  className="flex items-center justify-between rounded-xl bg-white/8 p-2"
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="h-8 w-8 rounded-lg bg-white/10 overflow-hidden">
                                      <img
                                        src={`https://images.unsplash.com/photo-${j === 0 ? "1534422298391-e4f8c172dddb" : j === 1 ? "1585937421612-70a008356fbe" : "1563379091339-03b21ab4a4f8"}?w=80&h=80&fit=crop`}
                                        alt=""
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                    <div>
                                      <p className="text-[10px] font-bold text-white">
                                        {name}
                                      </p>
                                      <div className="flex items-center gap-1">
                                        <Star className="h-2 w-2 fill-[#eaa94d] text-[#eaa94d]" />
                                        <span className="text-[8px] text-white/40">
                                          {(4.3 + j * 0.2).toFixed(1)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <span className="text-[9px] font-bold text-[#eaa94d]">
                                    {formatPrice(220 + j * 130, "NPR")}
                                  </span>
                                </div>
                              ),
                            )}
                          </div>
                        )}
                        {i === 2 && (
                          <div className="space-y-2">
                            <div className="rounded-xl bg-white/8 p-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[9px] font-bold text-white/60 uppercase tracking-wider">
                                  Order #2847
                                </span>
                                <span className="text-[9px] font-bold text-[#34D399]">
                                  Preparing
                                </span>
                              </div>
                              <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                                <div className="h-full w-[65%] rounded-full bg-gradient-to-r from-[#1E7B3E] to-[#34D399]" />
                              </div>
                              <div className="flex items-center justify-between mt-2">
                                <div className="flex items-center gap-1">
                                  <Clock className="h-2.5 w-2.5 text-white/40" />
                                  <span className="text-[9px] text-white/40">
                                    ~12 min left
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Bell className="h-2.5 w-2.5 text-[#34D399]" />
                                  <span className="text-[9px] text-[#34D399] font-semibold">
                                    Live
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {["Received", "Preparing", "Ready"].map(
                                (s, j) => (
                                  <div key={j} className="flex-1 text-center">
                                    <div
                                      className={`mx-auto h-5 w-5 rounded-full flex items-center justify-center mb-1 ${j < 2 ? "bg-[#1E7B3E]" : "bg-white/8"}`}
                                    >
                                      {j < 2 ? (
                                        <Check className="h-2.5 w-2.5 text-white" />
                                      ) : (
                                        <span className="text-[7px] text-white/30">
                                          {j + 1}
                                        </span>
                                      )}
                                    </div>
                                    <span
                                      className={`text-[7px] font-semibold ${j < 2 ? "text-[#34D399]" : "text-white/25"}`}
                                    >
                                      {s}
                                    </span>
                                  </div>
                                ),
                              )}
                            </div>
                          </div>
                        )}
                        {i === 3 && (
                          <div className="space-y-2">
                            <div className="rounded-xl bg-white/8 p-3 text-center">
                              <div className="mx-auto h-10 w-10 rounded-full bg-gradient-to-br from-[#6366F1] to-[#818CF8] flex items-center justify-center mb-2">
                                <Check className="h-5 w-5 text-white" />
                              </div>
                              <p className="text-[11px] font-bold text-white">
                                Payment Successful!
                              </p>
                              <p className="text-[9px] text-white/40 mt-0.5">
                                {formatPrice(570, "NPR")} paid via eSewa
                              </p>
                            </div>
                            <div className="flex items-center justify-between rounded-xl bg-white/8 p-2.5">
                              <div className="flex items-center gap-2">
                                <ShoppingBag className="h-3.5 w-3.5 text-[#818CF8]" />
                                <span className="text-[10px] font-bold text-white">
                                  3 items
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Star className="h-2.5 w-2.5 text-[#eaa94d]" />
                                <span className="text-[9px] text-white/50">
                                  Rate your experience
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Status bar labels that swap */}
                  <div className="absolute top-[44px] left-0 right-0 z-20">
                    {steps.map((step, i) => (
                      <div
                        key={i}
                        className="phone-status-bar absolute inset-x-0 text-center opacity-0"
                      >
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[9px] font-bold text-white/80 backdrop-blur-md"
                          style={{
                            backgroundColor: `${step.accentColor}30`,
                          }}
                        >
                          <step.Icon className="h-2.5 w-2.5" />
                          {step.phoneLabel}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Home indicator */}
                <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-24 h-[3px] rounded-full bg-white/15" />
              </div>

              {/* Phone reflection */}
              <div
                className="absolute inset-0 rounded-[36px] pointer-events-none"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 50%, rgba(255,255,255,0.01) 100%)",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
