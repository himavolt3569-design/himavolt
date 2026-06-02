"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import Navbar from "@/components/layout/Navbar";
import LandingHero from "@/components/home/LandingHero";
import TrustMarquee from "@/components/home/TrustMarquee";
import LocationBar from "@/components/home/LocationBar";
import FloatingCart from "@/components/shared/FloatingCart";
import { LocationProvider } from "@/context/LocationContext";

const FoodCategories = dynamic(
  () => import("@/components/home/FoodCategories"),
  { ssr: false },
);
const PopularFoods = dynamic(() => import("@/components/home/PopularFoods"), {
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
const CartSidebar = dynamic(() => import("@/components/cart/CartSidebar"), {
  ssr: false,
});

export default function Home() {
  const [cartOpen, setCartOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");

  return (
    <LocationProvider>
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="min-h-screen relative bg-[var(--canvas)]"
      >
        <Navbar onCartClick={() => setCartOpen(true)} />

        <LocationBar />

        <LandingHero />

        <TrustMarquee />

        <PopularFoods activeCategory={activeCategory} />

        <FeaturesSection />

        <TopPlaces />

        <DealsSection />

        <Testimonials />

        <Footer />

        <CartSidebar open={cartOpen} onClose={() => setCartOpen(false)} />

        <FloatingCart onOpen={() => setCartOpen(true)} />
      </motion.main>
    </LocationProvider>
  );
}
