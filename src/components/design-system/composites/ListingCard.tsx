"use client";

import React, { useState } from "react";
import NextImage from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Heart, Star } from "lucide-react";
import { Typography } from "../primitives/Typography";
import { cn } from "@/lib/utils";

const FALLBACK = "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80";

export interface ListingCardProps {
  id: string;
  images: string[];
  title: string;
  subtitle: string;
  price: string;
  priceSubtext?: string;
  rating?: number;
  isFavorite?: boolean;
  onFavoriteToggle?: (id: string) => void;
  onClick?: () => void;
  className?: string;
}

export function ListingCard({
  id,
  images,
  title,
  subtitle,
  price,
  priceSubtext,
  rating,
  isFavorite = false,
  onFavoriteToggle,
  onClick,
  className,
}: ListingCardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1 === images.length ? 0 : prev + 1));
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFavoriteToggle?.(id);
  };

  return (
    <div
      className={cn(
        "group relative flex flex-col gap-3 cursor-pointer",
        className
      )}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Carousel Area */}
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[var(--radius-xl)] bg-[var(--surface-alt)]">
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={currentIndex}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <NextImage
              src={images[currentIndex] || FALLBACK}
              alt={title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="object-cover"
            />
          </motion.div>
        </AnimatePresence>

        {/* Favorite Button */}
        <button
          onClick={handleFavorite}
          className="absolute right-3 top-3 z-10 p-1.5 transition-transform active:scale-90"
          aria-label="Toggle favorite"
        >
          <Heart
            className={cn(
              "h-6 w-6 stroke-white stroke-2 drop-shadow-md transition-colors",
              isFavorite ? "fill-[var(--state-error)] stroke-[var(--state-error)]" : "fill-black/30"
            )}
          />
        </button>

        {/* Navigation Arrows (visible on hover) */}
        {images.length > 1 && (
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-between p-2 opacity-0 transition-opacity duration-300",
              isHovered && "opacity-100"
            )}
          >
            <button
              onClick={handlePrev}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur-sm transition-transform hover:scale-105 active:scale-95"
            >
              <ChevronLeft className="h-5 w-5 text-black" />
            </button>
            <button
              onClick={handleNext}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur-sm transition-transform hover:scale-105 active:scale-95"
            >
              <ChevronRight className="h-5 w-5 text-black" />
            </button>
          </div>
        )}

        {/* Dot Indicators */}
        {images.length > 1 && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
            {images.map((_, idx) => (
              <div
                key={idx}
                className={cn(
                  "h-1.5 rounded-full bg-white transition-all duration-300",
                  idx === currentIndex ? "w-3 opacity-100" : "w-1.5 opacity-60 hover:opacity-100"
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex flex-col gap-0.5 px-1">
        <div className="flex items-start justify-between">
          <Typography variant="large" className="line-clamp-1">
            {title}
          </Typography>
          {rating !== undefined && (
            <div className="flex items-center gap-1 text-[var(--text-1)]">
              <Star className="h-4 w-4 fill-current" />
              <Typography variant="small" className="font-semibold">
                {rating.toFixed(2)}
              </Typography>
            </div>
          )}
        </div>
        <Typography variant="muted" className="line-clamp-1">
          {subtitle}
        </Typography>
        <div className="mt-1 flex items-baseline gap-1">
          <Typography variant="large" className="font-semibold">
            {price}
          </Typography>
          {priceSubtext && (
            <Typography variant="muted" className="font-normal">
              {priceSubtext}
            </Typography>
          )}
        </div>
      </div>
    </div>
  );
}
