"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Star, Clock, MapPin } from "lucide-react";

interface MenuStoryHeroProps {
  name: string;
  address: string;
  rating: number;
  openingTime: string;
  closingTime: string;
  coverUrl: string | null;
  imageUrl: string | null;
}

const FALLBACK =
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&h=600&fit=crop";

/**
 * Simple parallax hero banner for restaurant menu page.
 * Cover image parallaxes on scroll. No pinning.
 */
export default function MenuStoryHero({
  name,
  address,
  rating,
  openingTime,
  closingTime,
  coverUrl,
  imageUrl,
}: MenuStoryHeroProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();

  const imgY = useTransform(scrollY, [0, 500], [0, 80]);
  const overlayOpacity = useTransform(scrollY, [0, 400], [0.4, 0.75]);
  const contentOpacity = useTransform(scrollY, [0, 350], [1, 0]);
  const contentY = useTransform(scrollY, [0, 350], [0, -30]);

  const coverSrc = coverUrl || imageUrl || FALLBACK;

  return (
    <section
      ref={sectionRef}
      className="relative h-[50vh] sm:h-[55vh] md:h-[60vh] w-full overflow-hidden"
    >
      {/* Cover image with parallax */}
      <motion.div className="absolute inset-0" style={{ y: imgY }}>
        <img
          src={coverSrc}
          alt={name}
          className="h-[120%] w-full object-cover"
        />
      </motion.div>

      {/* Dark overlay */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/20"
        style={{ opacity: overlayOpacity }}
      />

      {/* Content */}
      <motion.div
        className="absolute inset-0 flex flex-col items-center justify-end pb-10 sm:pb-14 px-4 text-center"
        style={{ opacity: contentOpacity, y: contentY }}
      >
        {/* Rating badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 400, damping: 15 }}
          className="mb-3"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-md px-3.5 py-1.5 text-sm font-bold text-white border border-white/10">
            <Star className="h-3.5 w-3.5 fill-[#eaa94d] text-[#eaa94d]" />
            {rating.toFixed(1)}
          </span>
        </motion.div>

        {/* Restaurant name */}
        <motion.h1
          initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-[1.1] max-w-2xl"
        >
          {name}
        </motion.h1>

        {/* Info row */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="mt-3 flex flex-wrap items-center justify-center gap-3 text-white/70"
        >
          <span className="inline-flex items-center gap-1 text-xs sm:text-sm font-medium">
            <MapPin className="h-3 w-3" />
            {address}
          </span>
          <span className="h-3 w-px bg-white/20" />
          <span className="inline-flex items-center gap-1 text-xs sm:text-sm font-medium">
            <Clock className="h-3 w-3" />
            {openingTime} – {closingTime}
          </span>
        </motion.div>
      </motion.div>

      {/* Bottom fade into page bg */}
      <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#F7F8FA] to-transparent pointer-events-none" />
    </section>
  );
}
