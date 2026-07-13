"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Images, ChevronLeft, ChevronRight, X, MapPin, Star } from "lucide-react";
import { SafeImage } from "@/components/design-system/SafeImage";
import { cn } from "@/lib/utils";

export function HotelHeroGallery({
  images,
  hotelName,
  address,
  city,
  rating,
}: {
  images: string[];
  hotelName: string;
  address: string;
  city: string;
  rating: number;
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const displayImages =
    images.length > 0
      ? images
      : ["https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80"];

  const open = useCallback((i: number) => { setCurrentIndex(i); setLightboxOpen(true); }, []);
  const prev = useCallback(
    () => setCurrentIndex((i) => (i === 0 ? displayImages.length - 1 : i - 1)),
    [displayImages.length],
  );
  const next = useCallback(
    () => setCurrentIndex((i) => (i === displayImages.length - 1 ? 0 : i + 1)),
    [displayImages.length],
  );

  return (
    <>
      {/* ── Mobile: full-bleed swipe carousel with overlaid info ── */}
      <div className="md:hidden relative -mx-4 overflow-hidden bg-[var(--surface-alt)]" style={{ height: "62vw", minHeight: 260, maxHeight: 480 }}>
        <div className="flex h-full w-full overflow-x-auto snap-x snap-mandatory scrollbar-hide">
          {displayImages.map((img, i) => (
            <div
              key={i}
              className="relative w-full h-full shrink-0 snap-center cursor-pointer"
              onClick={() => open(i)}
            >
              <SafeImage
                src={img}
                alt={`${hotelName} ${i + 1}`}
                priority={i === 0}
                sizes="100vw"
              />
            </div>
          ))}
        </div>

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

        {/* Hotel info at bottom */}
        <div className="absolute bottom-0 inset-x-0 px-4 pb-4 pointer-events-none">
          <h1 className="font-fraunces text-[7vw] font-black text-white leading-tight drop-shadow-xl mb-1.5">
            {hotelName}
          </h1>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1 text-white/80 text-xs font-semibold">
              <MapPin className="h-3 w-3 shrink-0" />
              {city}
            </span>
            <span className="flex items-center gap-1 bg-black/30 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full">
              <Star className="h-3 w-3 fill-[var(--accent)] text-[var(--accent)]" />
              {rating.toFixed(1)}
            </span>
          </div>
        </div>

        {/* Photos counter */}
        <button
          onClick={() => open(0)}
          className="absolute bottom-4 right-4 flex items-center gap-1.5 bg-black/40 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full"
        >
          <Images className="h-3.5 w-3.5" />
          {displayImages.length}
        </button>
      </div>

      {/* ── Desktop: main image left (60%) + 2×2 thumbnail right (40%) ── */}
      <div className="hidden md:flex h-[600px] gap-2">

        {/* Main hero image */}
        <div
          className="relative flex-[3] min-w-0 cursor-pointer group overflow-hidden rounded-l-3xl"
          onClick={() => open(0)}
        >
          <SafeImage
            src={displayImages[0]}
            alt={hotelName}
            priority
            sizes="(max-width: 768px) 100vw, 60vw"
            className="transition-transform duration-700 group-hover:scale-[1.03]"
          />
          {/* Strong bottom gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

          {/* Hotel info overlaid */}
          <div className="absolute bottom-0 inset-x-0 p-7 pb-8">
            <h1 className="font-fraunces text-4xl xl:text-5xl font-black text-white leading-tight drop-shadow-xl mb-3">
              {hotelName}
            </h1>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1.5 text-white/80 text-sm font-semibold">
                <MapPin className="h-4 w-4 shrink-0" />
                {address}, {city}
              </span>
              <span className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/20 text-white text-sm font-bold px-3 py-1.5 rounded-full">
                <Star className="h-3.5 w-3.5 fill-[var(--accent)] text-[var(--accent)]" />
                {rating.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* 2×2 thumbnail grid */}
        <div className="flex-[2] min-w-0 grid grid-cols-2 grid-rows-2 gap-2">
          {[1, 2, 3, 4].map((offset, i) => {
            const img = displayImages[offset % displayImages.length];
            const isTopRight    = i === 1;
            const isBottomRight = i === 3;
            const isLastSlot    = i === 3 && displayImages.length > 5;

            return (
              <div
                key={i}
                onClick={() => open(img ? offset : 0)}
                className={cn(
                  "relative cursor-pointer group overflow-hidden",
                  isTopRight    && "rounded-tr-3xl",
                  isBottomRight && "rounded-br-3xl",
                )}
              >
                {img ? (
                  <>
                    <SafeImage
                      src={img}
                      alt={`${hotelName} ${offset + 1}`}
                      sizes="(max-width: 768px) 100vw, 20vw"
                      className="transition-transform duration-700 group-hover:scale-[1.05]"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors duration-300" />
                    {/* Overflow indicator on last slot */}
                    {isLastSlot && (
                      <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-1.5">
                        <Images className="h-6 w-6 text-white" />
                        <span className="text-white font-bold text-sm">
                          +{displayImages.length - 4} more
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full bg-[var(--surface-alt)]" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* "Show all photos" button — desktop, below grid */}
      <div className="hidden md:flex justify-end mt-3 mb-1">
        <button
          onClick={() => open(0)}
          className="flex items-center gap-2 bg-white hover:bg-[var(--surface-alt)] border border-[var(--border)] text-[var(--text-1)] font-semibold text-sm px-4 py-2.5 rounded-xl shadow-sm transition-all hover:shadow-md active:scale-95"
        >
          <Images className="h-4 w-4" />
          Show all {displayImages.length} photos
        </button>
      </div>

      {/* ── Full-screen lightbox ── */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[200] bg-black/96 flex flex-col"
          >
            {/* Top bar */}
            <div className="shrink-0 flex justify-between items-center px-5 py-4">
              <span className="text-white/50 text-sm font-semibold tracking-wide">
                {currentIndex + 1} / {displayImages.length}
              </span>
              <button
                onClick={() => setLightboxOpen(false)}
                className="p-2.5 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>

            {/* Main image */}
            <div className="flex-1 relative flex items-center justify-center px-4 md:px-14 min-h-0">
              <AnimatePresence mode="wait">
                <motion.img
                  key={currentIndex}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  src={displayImages[currentIndex]}
                  className="max-w-full max-h-full object-contain rounded-xl"
                  alt={`${hotelName} ${currentIndex + 1}`}
                />
              </AnimatePresence>

              {displayImages.length > 1 && (
                <>
                  <button
                    onClick={prev}
                    className="absolute left-3 md:left-5 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    onClick={next}
                    className="absolute right-3 md:right-5 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail strip */}
            {displayImages.length > 1 && (
              <div className="shrink-0 flex gap-2 px-6 py-4 overflow-x-auto scrollbar-hide justify-center">
                {displayImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentIndex(i)}
                    className={cn(
                      "shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all",
                      i === currentIndex
                        ? "border-white opacity-100 scale-105"
                        : "border-transparent opacity-40 hover:opacity-70",
                    )}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
