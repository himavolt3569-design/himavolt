"use client";
import React, { useState } from "react";
import NextImage from "next/image";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

const FALLBACK = "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80";

export function SafeImage({
  src,
  alt = "",
  className,
  priority = false,
  sizes = "100vw",
}: {
  src?: string | null;
  alt?: string;
  className?: string;
  /** True for LCP/above-the-fold images — skips lazy-loading and adds fetchpriority="high" */
  priority?: boolean;
  /** Passed to next/image for correct responsive resizing; default "100vw" */
  sizes?: string;
}) {
  const [imgSrc, setImgSrc] = useState(src || FALLBACK);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className={cn("absolute inset-0 flex items-center justify-center bg-[var(--surface-alt)] text-[var(--text-3)]")}>
        <ImageOff className="h-6 w-6" />
      </div>
    );
  }

  return (
    <NextImage
      src={imgSrc || FALLBACK}
      alt={alt}
      fill
      className={cn("object-cover", className)}
      priority={priority}
      sizes={sizes}
      onError={() => {
        if (imgSrc !== FALLBACK) {
          setImgSrc(FALLBACK);
        } else {
          setFailed(true);
        }
      }}
    />
  );
}
