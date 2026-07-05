"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Horizontal scroll container with discoverable overflow affordances.
 *
 * Many tab/chip strips across the app use `overflow-x-auto scrollbar-hide`,
 * which silently clips the last items on narrow viewports (or narrow modals)
 * with no hint that more content exists. This wraps that pattern and adds:
 *   - a subtle edge fade on whichever side has hidden content, and
 *   - a small chevron button that scrolls the strip (click on desktop, tap on
 *     mobile — native swipe keeps working too).
 *
 * Affordances auto-hide when there's nothing clipped in that direction, and
 * recompute on scroll, container resize, and content changes (tab labels,
 * counts, categories loading in), so they stay correct.
 */
export function ScrollableRow({
  children,
  className = "",
  innerClassName = "",
  edgeColor = "var(--canvas)",
  buttonSize = "sm",
  buttonClassName = "bg-[var(--canvas)] text-[var(--accent)] ring-1 ring-[var(--border)] hover:bg-[var(--accent-muted)]",
}: {
  children: React.ReactNode;
  /** Applied to the positioned wrapper (layout: padding, shrink-0, etc.). */
  className?: string;
  /** Applied to the inner scroller (usually `flex gap-* items-center`). */
  innerClassName?: string;
  /** Solid color the edge fade blends into — match the surrounding surface. */
  edgeColor?: string;
  /** Chevron button size. */
  buttonSize?: "sm" | "md";
  /** Chevron color/ring classes — override for non-CSS-var themes (e.g. the
   *  customer menu's hardcoded green palette). Defaults to the app accent. */
  buttonClassName?: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const recompute = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    // 2px slack so sub-pixel rounding doesn't leave a phantom affordance.
    setCanLeft(scrollLeft > 2);
    setCanRight(scrollLeft + clientWidth < scrollWidth - 2);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    recompute();

    el.addEventListener("scroll", recompute, { passive: true });

    // Container resize (viewport/modal width) — clientWidth changes.
    const ro = new ResizeObserver(recompute);
    ro.observe(el);

    // Content changes (items added/removed, labels/counts updated) — scrollWidth
    // changes without a container resize, which ResizeObserver alone misses.
    const mo = new MutationObserver(recompute);
    mo.observe(el, { childList: true, subtree: true, characterData: true });

    window.addEventListener("resize", recompute);
    return () => {
      el.removeEventListener("scroll", recompute);
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener("resize", recompute);
    };
  }, [recompute]);

  const scrollByStep = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(el.clientWidth * 0.72, 120), behavior: "smooth" });
  };

  const btn =
    buttonSize === "md"
      ? "h-8 w-8"
      : "h-6 w-6";
  const icon = buttonSize === "md" ? "h-4 w-4" : "h-3.5 w-3.5";
  const btnBase = `top-1/2 z-20 -translate-y-1/2 flex ${btn} items-center justify-center rounded-full shadow-md active:scale-90 transition-all ${buttonClassName}`;
  const fadeStyle = (dir: "left" | "right") => ({
    background: `linear-gradient(to ${dir === "left" ? "right" : "left"}, ${edgeColor}, transparent)`,
  });

  return (
    <div className={`relative min-w-0 ${className}`}>
      {/* Left affordance */}
      {canLeft && (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10"
            style={fadeStyle("left")}
          />
          <button
            type="button"
            aria-label="Scroll left"
            onClick={() => scrollByStep(-1)}
            className={`absolute left-0 ${btnBase}`}
          >
            <ChevronLeft className={icon} strokeWidth={2.5} />
          </button>
        </>
      )}

      <div ref={scrollerRef} className={`overflow-x-auto scrollbar-hide ${innerClassName}`}>
        {children}
      </div>

      {/* Right affordance */}
      {canRight && (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10"
            style={fadeStyle("right")}
          />
          <button
            type="button"
            aria-label="Scroll right"
            onClick={() => scrollByStep(1)}
            className={`absolute right-0 ${btnBase}`}
          >
            <ChevronRight className={icon} strokeWidth={2.5} />
          </button>
        </>
      )}
    </div>
  );
}

export default ScrollableRow;
