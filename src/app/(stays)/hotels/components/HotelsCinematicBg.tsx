"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

// 4K copyright-free Unsplash images — luxury hotel / resort aesthetics
const SLIDES = [
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1920&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=1920&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?q=80&w=1920&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=1920&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1618773928121-c32242e63f39?q=80&w=1920&auto=format&fit=crop",
];

export function HotelsCinematicBg() {
  const imgRefs = useRef<(HTMLImageElement | null)[]>([]);

  useEffect(() => {
    const imgs = imgRefs.current.filter(Boolean) as HTMLImageElement[];
    if (imgs.length < 2) return;

    const SHOW = 5;    // seconds each slide is fully visible
    const FADE = 1.4;  // crossfade duration
    const n = imgs.length;

    // Start state: first image visible, rest hidden at natural scale
    gsap.set(imgs, { opacity: 0, scale: 1 });
    gsap.set(imgs[0], { opacity: 1 });

    const tl = gsap.timeline({ repeat: -1 });

    for (let i = 0; i < n; i++) {
      const curr = imgs[i];
      const next = imgs[(i + 1) % n];
      const t = i * (SHOW + FADE);

      // Ken Burns: slow zoom-in while image is on screen
      tl.to(curr, { scale: 1.07, duration: SHOW + FADE, ease: "none" }, t);

      // Crossfade: fade out current, bring in next at scale 1
      tl.to(curr, { opacity: 0, duration: FADE, ease: "power2.inOut" }, t + SHOW);
      tl.fromTo(
        next,
        { opacity: 0, scale: 1 },
        { opacity: 1, duration: FADE, ease: "power2.inOut" },
        t + SHOW,
      );

      // Reset scale for the next cycle of this slide
      tl.set(curr, { scale: 1 }, t + SHOW + FADE);
    }

    return () => { tl.kill(); };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {SLIDES.map((src, i) => (
        <img
          key={src}
          ref={(el) => { imgRefs.current[i] = el; }}
          src={src}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover will-change-transform"
          style={{ opacity: i === 0 ? 1 : 0 }}
          loading={i === 0 ? "eager" : "lazy"}
          fetchPriority={i === 0 ? "high" : "low"}
        />
      ))}

      {/* Brand-themed overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/25 to-[var(--canvas)]" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-transparent" />

      {/* Warm amber colour wash — ties the hero to the site accent */}
      <div className="absolute inset-0 bg-[var(--accent)]/5 mix-blend-overlay pointer-events-none" />
    </div>
  );
}
