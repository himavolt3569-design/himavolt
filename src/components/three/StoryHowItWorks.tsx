"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  QrCode,
  UtensilsCrossed,
  Bell,
  CreditCard,
  ArrowRight,
  Wifi,
  MapPin,
  Star,
  Clock,
  Check,
  ShoppingBag,
} from "lucide-react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const steps = [
  {
    Icon: QrCode,
    title: "Scan & Browse",
    desc: "Scan the QR code at your table or browse restaurants near you.",
    accent: "from-[#E23744] to-[#FF6B81]",
    accentColor: "#E23744",
    // Phone mockup shows QR scanning scene
    image: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400&h=700&fit=crop",
    phoneLabel: "Scanning QR...",
  },
  {
    Icon: UtensilsCrossed,
    title: "Pick & Order",
    desc: "Choose from digital menus and customize your order effortlessly.",
    accent: "from-[#FF9933] to-[#FFB347]",
    accentColor: "#FF9933",
    // Phone mockup shows a beautiful food menu
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=700&fit=crop",
    phoneLabel: "Choose your meal",
  },
  {
    Icon: Bell,
    title: "Live Tracking",
    desc: "Real-time updates while we prepare and deliver your food.",
    accent: "from-[#1E7B3E] to-[#34D399]",
    accentColor: "#1E7B3E",
    // Kitchen prep / cooking scene
    image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=700&fit=crop",
    phoneLabel: "Preparing your order",
  },
  {
    Icon: CreditCard,
    title: "Pay & Enjoy",
    desc: "Pay securely via your phone and savor the premium experience.",
    accent: "from-[#6366F1] to-[#818CF8]",
    accentColor: "#6366F1",
    // Enjoying food scene
    image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=700&fit=crop",
    phoneLabel: "Payment successful!",
  },
];

/**
 * Pinned "How It Works" with left cards + right phone mockup.
 * Phone image swaps with each step as user scrolls.
 */
export default function StoryHowItWorks() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
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

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: `+=${steps.length * 100}%`,
          pin: true,
          scrub: 1,
          pinSpacing: true,
        },
      });

      // Heading slides in
      tl.fromTo(
        headingRef.current,
        { opacity: 0, x: -40 },
        { opacity: 1, x: 0, duration: 0.12, ease: "power2.out" },
        0,
      );

      // Progress bar fades in
      tl.fromTo(
        progressRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.08 },
        0.03,
      );

      // Phone enters from right
      tl.fromTo(
        phoneRef.current,
        { opacity: 0, x: 80, scale: 0.85, rotateY: -15 },
        { opacity: 1, x: 0, scale: 1, rotateY: 0, duration: 0.15, ease: "power3.out" },
        0.02,
      );

      // Phone glow
      tl.fromTo(
        phoneGlowRef.current,
        { opacity: 0, scale: 0.5 },
        { opacity: 1, scale: 1, duration: 0.15 },
        0.04,
      );

      // Each card + corresponding phone screen reveals in sequence
      cards.forEach((card, i) => {
        const startAt = 0.1 + i * 0.2;
        const dot = progressDots[i];
        const screen = phoneScreens[i];
        const bar = phoneBars[i];

        // Card entrance
        tl.fromTo(
          card,
          { opacity: 0, y: 60, scale: 0.9, filter: "blur(6px)" },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            filter: "blur(0px)",
            duration: 0.12,
            ease: "power3.out",
          },
          startAt,
        );

        // Phone screen crossfade
        if (screen) {
          tl.fromTo(
            screen,
            { opacity: 0, scale: 1.1 },
            { opacity: 1, scale: 1, duration: 0.12, ease: "power2.out" },
            startAt,
          );

          // Hide previous screen
          if (i > 0 && phoneScreens[i - 1]) {
            tl.to(
              phoneScreens[i - 1],
              { opacity: 0, scale: 0.95, duration: 0.08 },
              startAt,
            );
          }
        }

        // Status bar text
        if (bar) {
          tl.fromTo(
            bar,
            { opacity: 0, y: 8 },
            { opacity: 1, y: 0, duration: 0.1 },
            startAt + 0.04,
          );
          if (i > 0 && phoneBars[i - 1]) {
            tl.to(phoneBars[i - 1], { opacity: 0, y: -8, duration: 0.06 }, startAt);
          }
        }

        // Activate progress dot
        if (dot) {
          tl.to(
            dot,
            { scale: 1.4, backgroundColor: steps[i].accentColor, duration: 0.06 },
            startAt,
          );
          // Deactivate previous
          if (i > 0 && progressDots[i - 1]) {
            tl.to(
              progressDots[i - 1],
              { scale: 1, backgroundColor: "rgba(255,255,255,0.2)", duration: 0.06 },
              startAt,
            );
          }
        }

        // Phone glow color shift
        tl.to(
          phoneGlowRef.current,
          { backgroundColor: steps[i].accentColor, duration: 0.1 },
          startAt,
        );

        // Card exits (except last)
        if (i < cards.length - 1) {
          tl.to(
            card,
            { opacity: 0.2, y: -30, scale: 0.95, duration: 0.08 },
            startAt + 0.17,
          );
        }
      });

      // All fade at end
      tl.to(
        [headingRef.current, cardsRef.current, progressRef.current, phoneRef.current, phoneGlowRef.current],
        { opacity: 0, y: -20, duration: 0.08 },
        0.95,
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen overflow-hidden bg-[#0F1219] text-white"
    >
      {/* Ambient glows */}
      <div className="absolute top-0 left-1/4 h-[500px] w-[500px] rounded-full bg-[#E23744]/[0.05] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 h-[400px] w-[400px] rounded-full bg-[#FF9933]/[0.05] blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 right-[10%] h-[350px] w-[350px] rounded-full bg-[#6366F1]/[0.04] blur-[100px] pointer-events-none" />

      {/* Grid / dot pattern for texture */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative z-10 mx-auto max-w-[1440px] px-4 md:px-8 lg:px-12 h-screen flex items-center">
        <div className="flex w-full gap-8 lg:gap-16 items-center">

          {/* ── Left column: heading + cards ── */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div ref={headingRef} className="mb-8 max-w-xl opacity-0">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] backdrop-blur-sm px-3.5 py-1.5 text-[11px] font-bold text-white/70 uppercase tracking-wider border border-white/[0.06] mb-5">
                <ArrowRight className="h-3 w-3 text-[#FF9933]" />
                How it works
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.1]">
                From scan to savour
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF9933] to-[#FFB347]">
                  in four easy steps.
                </span>
              </h2>
            </div>

            {/* Progress dots */}
            <div ref={progressRef} className="flex gap-3 mb-8 opacity-0">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className="story-step-dot h-2.5 w-2.5 rounded-full bg-white/20 transition-colors"
                />
              ))}
            </div>

            {/* Cards container - stacked */}
            <div ref={cardsRef} className="relative max-w-lg">
              {steps.map((step, idx) => (
                <div
                  key={idx}
                  className="story-step-card absolute top-0 left-0 w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm p-7 md:p-8 opacity-0"
                  style={{ position: idx === 0 ? "relative" : "absolute" }}
                >
                  {/* Step number */}
                  <div className="absolute top-5 right-6 text-[72px] font-extrabold leading-none text-white/[0.04] select-none pointer-events-none">
                    {idx + 1}
                  </div>

                  {/* Icon */}
                  <div
                    className={`flex h-13 w-13 items-center justify-center rounded-xl bg-gradient-to-br ${step.accent} shadow-lg shadow-[${step.accentColor}]/20 mb-5`}
                  >
                    <step.Icon className="h-6 w-6 text-white" strokeWidth={2} />
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-bold text-white mb-2 tracking-tight">
                    {step.title}
                  </h3>
                  <p className="text-sm text-gray-400 leading-relaxed max-w-sm">
                    {step.desc}
                  </p>

                  {/* Bottom accent */}
                  <div
                    className={`absolute bottom-0 left-7 right-7 h-px bg-gradient-to-r ${step.accent} opacity-30`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* ── Right column: phone mockup ── */}
          <div className="hidden md:flex flex-1 items-center justify-center relative">
            {/* Glow behind phone */}
            <div
              ref={phoneGlowRef}
              className="absolute w-[320px] h-[320px] rounded-full opacity-0"
              style={{
                backgroundColor: "#E23744",
                filter: "blur(100px)",
              }}
            />

            {/* Phone frame */}
            <div
              ref={phoneRef}
              className="relative w-[280px] sm:w-[300px] lg:w-[320px] opacity-0"
              style={{ perspective: "1000px" }}
            >
              {/* Phone body */}
              <div className="relative rounded-[40px] border-[6px] border-[#2A2A2A] bg-[#1A1A1A] shadow-2xl shadow-black/60 overflow-hidden">
                {/* Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 w-[120px] h-[28px] bg-[#1A1A1A] rounded-b-2xl flex items-center justify-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#2A2A2A] border border-[#333]" />
                  <div className="w-12 h-1 rounded-full bg-[#2A2A2A]" />
                </div>

                {/* Screen area */}
                <div className="relative w-full aspect-[9/18] overflow-hidden bg-[#0F1219]">
                  {/* Phone screens - stacked, crossfade with scroll */}
                  {steps.map((step, i) => (
                    <div
                      key={i}
                      className="phone-screen absolute inset-0 opacity-0"
                      style={{ zIndex: i }}
                    >
                      {/* Background image */}
                      <img
                        src={step.image}
                        alt={step.title}
                        className="absolute inset-0 w-full h-full object-cover"
                        loading="lazy"
                      />
                      {/* Dark overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/50" />

                      {/* Top status bar area */}
                      <div className="absolute top-9 left-5 right-5 flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-white/60">9:41</span>
                        <div className="flex items-center gap-1">
                          <Wifi className="h-3 w-3 text-white/60" />
                          <div className="w-5 h-2.5 rounded-sm border border-white/40 p-px">
                            <div className="h-full w-3/4 rounded-[1px] bg-white/60" />
                          </div>
                        </div>
                      </div>

                      {/* Step-specific UI overlay */}
                      <div className="absolute inset-0 flex flex-col justify-end p-6 pb-10">
                        {/* Step icon */}
                        <div
                          className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${step.accent} shadow-lg mb-3`}
                        >
                          <step.Icon className="h-5 w-5 text-white" strokeWidth={2} />
                        </div>

                        {/* Step title */}
                        <h4 className="text-lg font-bold text-white mb-1">{step.title}</h4>
                        <p className="text-xs text-white/60 leading-relaxed mb-4">{step.desc}</p>

                        {/* Fake UI elements per step */}
                        {i === 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 rounded-xl bg-white/10 backdrop-blur-sm p-3">
                              <QrCode className="h-8 w-8 text-white/80" />
                              <div>
                                <p className="text-xs font-bold text-white">Scan QR Code</p>
                                <p className="text-[10px] text-white/50">Point camera at table QR</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 rounded-xl bg-white/10 backdrop-blur-sm p-3">
                              <MapPin className="h-5 w-5 text-[#FF9933]" />
                              <div>
                                <p className="text-xs font-bold text-white">Or browse nearby</p>
                                <p className="text-[10px] text-white/50">12 restaurants found</p>
                              </div>
                            </div>
                          </div>
                        )}
                        {i === 1 && (
                          <div className="space-y-2">
                            {["Buff Momo", "Thakali Set", "Chicken Biryani"].map((name, j) => (
                              <div key={j} className="flex items-center justify-between rounded-xl bg-white/10 backdrop-blur-sm p-2.5">
                                <div className="flex items-center gap-2">
                                  <div className="h-9 w-9 rounded-lg bg-white/20 overflow-hidden">
                                    <img
                                      src={`https://images.unsplash.com/photo-${j === 0 ? "1534422298391-e4f8c172dddb" : j === 1 ? "1585937421612-70a008356fbe" : "1563379091339-03b21ab4a4f8"}?w=80&h=80&fit=crop`}
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <div>
                                    <p className="text-[11px] font-bold text-white">{name}</p>
                                    <div className="flex items-center gap-1">
                                      <Star className="h-2.5 w-2.5 fill-[#FF9933] text-[#FF9933]" />
                                      <span className="text-[9px] text-white/50">{(4.3 + j * 0.2).toFixed(1)}</span>
                                    </div>
                                  </div>
                                </div>
                                <span className="text-[10px] font-bold text-[#FF9933]">Rs.{220 + j * 130}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {i === 2 && (
                          <div className="space-y-3">
                            <div className="rounded-xl bg-white/10 backdrop-blur-sm p-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider">Order #2847</span>
                                <span className="text-[10px] font-bold text-[#34D399]">Preparing</span>
                              </div>
                              {/* Progress bar */}
                              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                                <div className="h-full w-[65%] rounded-full bg-gradient-to-r from-[#1E7B3E] to-[#34D399]" />
                              </div>
                              <div className="flex items-center justify-between mt-2">
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3 text-white/50" />
                                  <span className="text-[10px] text-white/50">~12 min left</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Bell className="h-3 w-3 text-[#34D399]" />
                                  <span className="text-[10px] text-[#34D399] font-semibold">Live</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {["Received", "Preparing", "Ready"].map((s, j) => (
                                <div key={j} className="flex-1 text-center">
                                  <div className={`mx-auto h-6 w-6 rounded-full flex items-center justify-center mb-1 ${j < 2 ? "bg-[#1E7B3E]" : "bg-white/10"}`}>
                                    {j < 2 ? <Check className="h-3 w-3 text-white" /> : <span className="text-[8px] text-white/40">{j + 1}</span>}
                                  </div>
                                  <span className={`text-[8px] font-semibold ${j < 2 ? "text-[#34D399]" : "text-white/30"}`}>{s}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {i === 3 && (
                          <div className="space-y-3">
                            <div className="rounded-xl bg-white/10 backdrop-blur-sm p-3 text-center">
                              <div className="mx-auto h-12 w-12 rounded-full bg-gradient-to-br from-[#6366F1] to-[#818CF8] flex items-center justify-center mb-2">
                                <Check className="h-6 w-6 text-white" />
                              </div>
                              <p className="text-sm font-bold text-white">Payment Successful!</p>
                              <p className="text-[10px] text-white/50 mt-0.5">Rs. 570.00 paid via eSewa</p>
                            </div>
                            <div className="flex items-center justify-between rounded-xl bg-white/10 backdrop-blur-sm p-3">
                              <div className="flex items-center gap-2">
                                <ShoppingBag className="h-4 w-4 text-[#818CF8]" />
                                <span className="text-[11px] font-bold text-white">3 items</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Star className="h-3 w-3 text-[#FF9933]" />
                                <span className="text-[10px] text-white/60">Rate your experience</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Status bar labels that swap */}
                  <div className="absolute top-[48px] left-0 right-0 z-20">
                    {steps.map((step, i) => (
                      <div
                        key={i}
                        className="phone-status-bar absolute inset-x-0 text-center opacity-0"
                      >
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold text-white/90 backdrop-blur-md"
                          style={{ backgroundColor: `${step.accentColor}40` }}
                        >
                          <step.Icon className="h-3 w-3" />
                          {step.phoneLabel}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Home indicator */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-28 h-1 rounded-full bg-white/20" />
              </div>

              {/* Phone reflection / shine */}
              <div
                className="absolute inset-0 rounded-[40px] pointer-events-none"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 50%, rgba(255,255,255,0.02) 100%)",
                }}
              />

              {/* Floating badges around phone */}
              <div className="absolute -top-4 -right-6 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 px-3 py-2 shadow-xl">
                <div className="flex items-center gap-1.5">
                  <div className="h-6 w-6 rounded-full bg-[#1E7B3E] flex items-center justify-center">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-white">Secure</p>
                    <p className="text-[8px] text-white/40">256-bit SSL</p>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-3 -left-8 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 px-3 py-2 shadow-xl">
                <div className="flex items-center gap-1.5">
                  <div className="h-6 w-6 rounded-full bg-[#FF9933] flex items-center justify-center">
                    <Clock className="h-3 w-3 text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-white">Fast</p>
                    <p className="text-[8px] text-white/40">Under 30 min</p>
                  </div>
                </div>
              </div>
              <div className="absolute top-1/2 -left-10 -translate-y-1/2 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 px-3 py-2 shadow-xl">
                <div className="flex items-center gap-1.5">
                  <div className="h-6 w-6 rounded-full bg-[#E23744] flex items-center justify-center">
                    <Star className="h-3 w-3 text-white fill-white" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-white">4.8</p>
                    <p className="text-[8px] text-white/40">Avg rating</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
