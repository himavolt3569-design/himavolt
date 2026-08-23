"use client";

import React, { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export default function ScrollReveal({ 
  children, 
  delay = 0,
  yOffset = 40,
}: { 
  children: React.ReactNode;
  delay?: number;
  yOffset?: number;
}) {
  const container = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!container.current) return;
    
    // Instead of animating the container, animate its direct children with stagger
    gsap.fromTo(
      container.current.children,
      { 
        opacity: 0, 
        y: yOffset 
      },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        delay,
        stagger: 0.1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: container.current,
          start: "top 85%",
          toggleActions: "play none none none",
        }
      }
    );
  }, { scope: container });

  return <div ref={container}>{children}</div>;
}
