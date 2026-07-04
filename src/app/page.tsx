"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import Navbar from "@/components/layout/Navbar";
import LandingHero from "@/components/home/LandingHero";
import TrustMarquee from "@/components/home/TrustMarquee";
import LocationBar from "@/components/home/LocationBar";
import { LocationProvider } from "@/context/LocationContext";

const PopularFoods = dynamic(() => import("@/components/home/PopularFoods"), {
  ssr: false,
});
const HardwareStoreCarousel = dynamic(() => import("@/components/home/HardwareStoreCarousel"), {
  ssr: false,
});
const FeaturesSection = dynamic(
  () => import("@/components/home/FeaturesSection"),
  { ssr: false },
);
const TopPlaces = dynamic(() => import("@/components/home/TopPlaces"), {
  ssr: false,
});
const DealsSection = dynamic(() => import("@/components/home/DealsSection"), {
  ssr: false,
});
const Testimonials = dynamic(() => import("@/components/home/Testimonials"), {
  ssr: false,
});
const Footer = dynamic(() => import("@/components/layout/Footer"), {
  ssr: false,
});

export default function Home() {
  const [activeCategory] = useState("All");

  return (
    <LocationProvider>
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="min-h-screen relative bg-[var(--canvas)]"
      >
        <Navbar />

        <LocationBar />

        <LandingHero />

        <TrustMarquee />

        <HardwareStoreCarousel />

        <PopularFoods activeCategory={activeCategory} />

        <FeaturesSection />

        <TopPlaces />

        <DealsSection />

        <Testimonials />

        <Footer />
      </motion.main>
    </LocationProvider>
  );
}
