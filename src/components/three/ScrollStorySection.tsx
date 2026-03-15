"use client";

import { useRef, useEffect, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * A scroll-storytelling section that pins content and animates children
 * as the user scrolls through it.
 */
export default function ScrollStorySection({
  children,
  className = "",
  pin = false,
  pinSpacing = true,
  fadeIn = true,
  slideFrom = "bottom",
  scrub = true,
  id,
}: {
  children: ReactNode;
  className?: string;
  pin?: boolean;
  pinSpacing?: boolean;
  fadeIn?: boolean;
  slideFrom?: "bottom" | "left" | "right" | "none";
  scrub?: boolean;
  id?: string;
}) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current || !contentRef.current) return;

    const ctx = gsap.context(() => {
      const el = contentRef.current!;

      if (fadeIn) {
        const fromVars: gsap.TweenVars = { opacity: 0 };
        const toVars: gsap.TweenVars = {
          opacity: 1,
          duration: 1,
          ease: "power2.out",
        };

        if (slideFrom === "bottom") {
          fromVars.y = 60;
          toVars.y = 0;
        } else if (slideFrom === "left") {
          fromVars.x = -60;
          toVars.x = 0;
        } else if (slideFrom === "right") {
          fromVars.x = 60;
          toVars.x = 0;
        }

        if (scrub) {
          toVars.scrollTrigger = {
            trigger: sectionRef.current,
            start: "top 80%",
            end: "top 20%",
            scrub: 1,
          };
        } else {
          toVars.scrollTrigger = {
            trigger: sectionRef.current,
            start: "top 75%",
            toggleActions: "play none none reverse",
          };
        }

        gsap.fromTo(el, fromVars, toVars);
      }

      if (pin) {
        ScrollTrigger.create({
          trigger: sectionRef.current,
          start: "top top",
          end: "+=100%",
          pin: true,
          pinSpacing,
        });
      }
    }, sectionRef);

    return () => ctx.revert();
  }, [fadeIn, pin, pinSpacing, slideFrom, scrub]);

  return (
    <div ref={sectionRef} className={`relative ${className}`} id={id}>
      <div ref={contentRef}>{children}</div>
    </div>
  );
}
