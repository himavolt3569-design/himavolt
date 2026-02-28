"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

export default function LoadingClock({
  className = "",
}: {
  className?: string;
}) {
  const hourRef = useRef<SVGRectElement>(null);
  const minRef = useRef<SVGRectElement>(null);

  useEffect(() => {
    gsap.to(hourRef.current, {
      rotation: 360,
      transformOrigin: "bottom center",
      ease: "none",
      duration: 3,
      repeat: -1,
    });

    gsap.to(minRef.current, {
      rotation: 360,
      transformOrigin: "bottom center",
      ease: "none",
      duration: 0.5,
      repeat: -1,
    });
  }, []);

  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 ${className}`}
    >
      <svg
        width="48"
        height="48"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-[#FF9933]"
      >
        <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="4" />
        <rect
          ref={hourRef}
          x="22"
          y="12"
          width="4"
          height="12"
          rx="2"
          fill="currentColor"
        />
        <rect
          ref={minRef}
          x="22"
          y="6"
          width="4"
          height="18"
          rx="2"
          fill="currentColor"
        />
        <circle cx="24" cy="24" r="4" fill="currentColor" />
      </svg>
      <p className="text-sm font-bold text-gray-400 animate-pulse">
        Loading mock data...
      </p>
    </div>
  );
}
