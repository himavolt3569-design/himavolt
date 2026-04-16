"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/layout/Navbar";
import LandingHero from "@/components/home/LandingHero";
import FoodCategories from "@/components/home/FoodCategories";
import PopularFoods from "@/components/home/PopularFoods";
import FeaturesSection from "@/components/home/FeaturesSection";
import TopPlaces from "@/components/home/TopPlaces";
import DealsSection from "@/components/home/DealsSection";
import TrustMarquee from "@/components/home/TrustMarquee";
import Testimonials from "@/components/home/Testimonials";
import Footer from "@/components/layout/Footer";
import CartSidebar from "@/components/cart/CartSidebar";
import FloatingCart from "@/components/shared/FloatingCart";
import LocationBar from "@/components/home/LocationBar";
import { LocationProvider } from "@/context/LocationContext";

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

        <FoodCategories onCategoryChange={setActiveCategory} />

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
