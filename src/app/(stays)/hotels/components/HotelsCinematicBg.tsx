"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The Stays hero backdrop.
 *
 * Previously this eagerly pulled five 1920px Unsplash photographs from a
 * cross-origin CDN and drove them with GSAP, so the first paint waited on a cold
 * DNS lookup, a TLS handshake, a large image, and the animation bundle. The hero
 * sat grey for seconds.
 *
 * Three changes fix that:
 *  · the slide list comes from the server as a prop, so the first `<img src>` is
 *    in the initial HTML where the browser's preload scanner finds it
 *  · only the FIRST slide is fetched up front; the rest wait until it has
 *    painted, so they compete with nothing
 *  · the crossfade is plain CSS opacity rather than GSAP, removing an animation
 *    library from the critical path of a purely decorative effect
 *
 * A gradient sits underneath at all times, so the section is never empty even
 * before the first byte of the photograph arrives.
 */

const SHOW_MS = 6000;

export function HotelsCinematicBg({ slides }: { slides: string[] }) {
  const [active, setActive] = useState(0);
  // Extra slides stay out of the DOM until the hero has actually painted, so
  // they cannot compete with the LCP image for bandwidth.
  const [loadRest, setLoadRest] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (slides.length < 2) return;

    // requestIdleCallback where available, otherwise a short delay. Either way
    // the extra slides are a background concern, never a blocking one.
    const idle = window.requestIdleCallback
      ? window.requestIdleCallback(() => setLoadRest(true), { timeout: 2500 })
      : window.setTimeout(() => setLoadRest(true), 1200);

    return () => {
      if (window.cancelIdleCallback && typeof idle === "number") {
        window.cancelIdleCallback(idle);
      } else {
        clearTimeout(idle as number);
      }
    };
  }, [slides.length]);

  useEffect(() => {
    if (!loadRest || slides.length < 2) return;
    timer.current = setInterval(
      () => setActive((i) => (i + 1) % slides.length),
      SHOW_MS,
    );
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [loadRest, slides.length]);

  const visible = loadRest ? slides : slides.slice(0, 1);

  return (
    <div className="absolute inset-0 overflow-hidden bg-[linear-gradient(160deg,#1c1917_0%,#2b2320_55%,#3f2d1a_100%)]">
      {visible.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-in-out"
          style={{ opacity: i === active ? 1 : 0 }}
          // The first slide is the LCP element and is preloaded by the page.
          loading={i === 0 ? "eager" : "lazy"}
          fetchPriority={i === 0 ? "high" : "low"}
          decoding="async"
        />
      ))}

      {/* Brand overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/25 to-[var(--canvas)]" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-[var(--accent)]/5 mix-blend-overlay" />
    </div>
  );
}
