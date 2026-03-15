"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface HeroSlide {
  id: string;
  imageUrl: string;
  title: string | null;
  subtitle: string | null;
  linkItemId: string | null;
  linkItem: { id: string; name: string } | null;
  sortOrder: number;
}

interface FoodSliderProps {
  restaurantSlug: string;
  onSlideClick?: (linkItemId: string) => void;
}

export default function FoodSlider({
  restaurantSlug,
  onSlideClick,
}: FoodSliderProps) {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function fetchSlides() {
      try {
        const res = await fetch(
          `/api/public/restaurants/${restaurantSlug}/hero-slides`
        );
        if (!res.ok) return;
        const data: HeroSlide[] = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setSlides(data);
        }
      } catch {
        // silent
      } finally {
        setLoaded(true);
      }
    }
    fetchSlides();
  }, [restaurantSlug]);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (slides.length <= 1) return;
    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 5000);
  }, [slides.length]);

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startTimer]);

  const goTo = (idx: number) => {
    setCurrentIndex(idx);
    startTimer();
  };

  const prev = () =>
    goTo((currentIndex - 1 + slides.length) % slides.length);
  const next = () => goTo((currentIndex + 1) % slides.length);

  // Don't render anything if no slides or still loading
  if (!loaded || slides.length === 0) return null;

  const slide = slides[currentIndex];

  return (
    <div
      className="relative overflow-hidden rounded-2xl bg-white border border-gray-100 cursor-pointer group shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
      onClick={() => {
        if (slide.linkItemId && onSlideClick) {
          onSlideClick(slide.linkItemId);
        }
      }}
    >
      <div className="relative aspect-[2.2/1] md:aspect-3/1 overflow-hidden">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
            className="absolute inset-0"
          >
            <img
              src={slide.imageUrl}
              alt={slide.title || "Hero slide"}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
          </motion.div>
        </AnimatePresence>

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

        {/* Text overlay */}
        <AnimatePresence mode="popLayout">
          <motion.div
            key={`text-${slide.id}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="absolute bottom-4 left-5 right-5 pointer-events-none"
          >
            {slide.title && (
              <h2 className="text-lg md:text-xl font-bold text-white">
                {slide.title}
              </h2>
            )}
            {slide.subtitle && (
              <p className="text-xs text-white/70 line-clamp-1 mt-0.5">
                {slide.subtitle}
              </p>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Prev/Next arrows — desktop only, on hover */}
        {slides.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                prev();
              }}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm hover:bg-black/50 cursor-pointer hidden md:flex"
              aria-label="Previous slide"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                next();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm hover:bg-black/50 cursor-pointer hidden md:flex"
              aria-label="Next slide"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}

        {/* Dot indicators */}
        {slides.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  goTo(idx);
                }}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  currentIndex === idx
                    ? "w-6 bg-white"
                    : "w-1.5 bg-white/40 hover:bg-white/60"
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
