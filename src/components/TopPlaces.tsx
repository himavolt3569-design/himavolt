"use client";

import { motion, Variants } from "framer-motion";
import { topPlaces } from "@/lib/data";
import { Star, Clock, Heart } from "lucide-react";
import Image from "next/image"; // Note: Since these are external URLs, next/image would require domains in config, so standard <img> is safer for mock static deployment if remotePatterns aren't set. We will use <img> to avoid build errors.

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  },
};

export default function TopPlaces() {
  return (
    <section className="container mx-auto px-4 md:px-6 py-12 md:py-16">
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight text-[#1F2A2A] md:text-3xl">
          Top places to explore in Nepal
        </h2>
        <p className="text-gray-500 mt-2 font-medium">
          Discover premium restaurants and stays
        </p>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8"
      >
        {topPlaces.map((place) => (
          <motion.div
            key={place.id}
            variants={itemVariants}
            className="group relative cursor-pointer"
          >
            {/* Image Container */}
            <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-sm transition-shadow group-hover:shadow-xl">
              <img
                src={place.image}
                alt={place.name}
                className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-transparent opacity-80" />

              {/* Like Button */}
              <button className="absolute top-3 right-3 p-2 rounded-full bg-black/20 text-white backdrop-blur-md transition-colors hover:bg-black/40 hover:text-red-400">
                <Heart className="h-5 w-5" />
              </button>

              {/* Discount Tag */}
              {place.discount && (
                <div className="absolute bottom-3 left-3 bg-[#FF9933] text-white text-xs font-black px-2 py-1 rounded-sm tracking-wider uppercase shadow-lg">
                  {place.discount}
                </div>
              )}
            </div>

            {/* Info Container */}
            <div className="pt-4 px-1">
              <div className="flex justify-between items-start gap-2">
                <h3 className="text-lg font-bold text-[#1F2A2A] line-clamp-1 group-hover:text-[#FF9933] transition-colors">
                  {place.name}
                </h3>
                <div className="flex items-center gap-1 bg-[#0A4D3C] text-white px-1.5 py-0.5 rounded text-sm font-bold shrink-0">
                  <Star className="h-3 w-3 fill-white" />
                  <span>{place.rating}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 mt-1.5 text-sm font-medium text-gray-600">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-green-600" />
                  <span>{place.time}</span>
                </div>
                <span className="text-gray-300">•</span>
                <span className="text-[#FF9933] font-bold">{place.type}</span>
              </div>

              <p className="mt-1.5 text-sm text-gray-500 line-clamp-1">
                {place.tags}
              </p>
              <p className="mt-0.5 text-sm text-gray-400">{place.location}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
