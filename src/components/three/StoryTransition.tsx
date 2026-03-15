"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * Cinematic text transition between story sections.
 * Large text fades/slides in on scroll, then out.
 */
export default function StoryTransition({
  title,
  subtitle,
  gradient = "from-[#E23744] to-[#FF6B81]",
  dark = false,
}: {
  title: string;
  subtitle?: string;
  gradient?: string;
  dark?: boolean;
}) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 70%",
          end: "bottom 30%",
          scrub: 1,
        },
      });

      // Line grows from center
      tl.fromTo(
        lineRef.current,
        { scaleX: 0 },
        { scaleX: 1, duration: 0.3, ease: "power2.out" },
        0,
      );

      // Title slides in
      tl.fromTo(
        titleRef.current,
        { opacity: 0, y: 40, filter: "blur(8px)" },
        { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.4, ease: "power3.out" },
        0.1,
      );

      // Subtitle
      if (subtitleRef.current) {
        tl.fromTo(
          subtitleRef.current,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.3 },
          0.25,
        );
      }

      // Fade out
      tl.to(
        [titleRef.current, subtitleRef.current, lineRef.current].filter(Boolean),
        { opacity: 0, y: -20, stagger: 0.05, duration: 0.25 },
        0.7,
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={sectionRef}
      className={`relative flex min-h-[50vh] items-center justify-center px-4 ${
        dark ? "bg-[#0F1219]/80 backdrop-blur-sm" : "bg-white/60 backdrop-blur-sm"
      }`}
    >
      <div className="text-center max-w-2xl">
        <div
          ref={lineRef}
          className={`mx-auto mb-6 h-[2px] w-16 rounded-full bg-gradient-to-r ${gradient} origin-center`}
        />
        <h2
          ref={titleRef}
          className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.1] opacity-0 ${
            dark ? "text-white" : "text-[#1F2A2A]"
          }`}
        >
          {title}
        </h2>
        {subtitle && (
          <p
            ref={subtitleRef}
            className={`mt-4 text-sm sm:text-base font-medium opacity-0 ${
              dark ? "text-gray-400" : "text-gray-500"
            }`}
          >
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
