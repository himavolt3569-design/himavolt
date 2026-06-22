"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

/**
 * Renders a dropdown/menu in a portal on <body> with fixed positioning anchored
 * to a trigger element. Because it lives outside the DOM subtree, it can never
 * be clipped by an ancestor's `overflow-hidden` nor sit behind a sibling card's
 * stacking context — the two reasons dropdowns elsewhere were getting
 * "overlapped" and un-clickable. Reflows on scroll/resize and closes on an
 * outside click.
 */
export function AnchoredMenu({
  anchorRef,
  open,
  onClose,
  align = "left",
  width,
  gap = 6,
  className = "",
  children,
}: {
  anchorRef: RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  /** Which edge of the menu lines up with the trigger. */
  align?: "left" | "right";
  /** Fixed menu width in px. Defaults to the trigger's width. */
  width?: number;
  /** Vertical gap between trigger and menu, in px. */
  gap?: number;
  className?: string;
  children: ReactNode;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{
    top: number;
    left: number;
    placement: "down" | "up";
  } | null>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const r = anchor.getBoundingClientRect();
      const w = width ?? r.width;
      const left = align === "right" ? r.right - w : r.left;
      // Flip upward when there isn't room below.
      const menuH = menuRef.current?.offsetHeight ?? 0;
      const spaceBelow = window.innerHeight - r.bottom;
      const flip = menuH > 0 && spaceBelow < menuH + gap && r.top > spaceBelow;
      setPos({
        top: flip ? r.top - gap - menuH : r.bottom + gap,
        left: Math.max(8, Math.min(left, window.innerWidth - w - 8)),
        placement: flip ? "up" : "down",
      });
    };
    update();
    // Run once more after paint so we can measure height for flip detection.
    const raf = requestAnimationFrame(update);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, align, width, gap, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || anchorRef.current?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, anchorRef]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        width: width ?? undefined,
        zIndex: 1000,
        visibility: pos ? "visible" : "hidden",
      }}
      className={className}
    >
      {children}
    </div>,
    document.body,
  );
}
