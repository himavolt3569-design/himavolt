"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/layout/Navbar";
import LandingHero from "@/components/home/LandingHero";
import FoodCategories from "@/components/home/FoodCategories";
import PopularFoods from "@/components/home/PopularFoods";
import ScrollHowItWorks from "@/components/home/ScrollHowItWorks";
import TopPlaces from "@/components/home/TopPlaces";
import DealsSection from "@/components/home/DealsSection";
import TrustMarquee from "@/components/home/TrustMarquee";
import StatsCounter from "@/components/home/StatsCounter";
import Testimonials from "@/components/home/Testimonials";
import Footer from "@/components/layout/Footer";
import CartSidebar from "@/components/cart/CartSidebar";
import LoadingClock from "@/components/shared/LoadingClock";

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <AnimatePresence>
        {loading && (
          <motion.div
            key="loader"
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-100 flex flex-col items-center justify-center bg-white"
          >
            <LoadingClock className="scale-125" />
          </motion.div>
        )}
      </AnimatePresence>

      {!loading && (
        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="min-h-screen relative bg-white"
        >
          <Navbar onCartClick={() => setCartOpen(true)} />

          <LandingHero />

          <TrustMarquee />

          <FoodCategories onCategoryChange={setActiveCategory} />

          <PopularFoods activeCategory={activeCategory} />

          <ScrollHowItWorks />

          <StatsCounter />

          <TopPlaces />

          <DealsSection />

          <Testimonials />

          <Footer />

          <CartSidebar open={cartOpen} onClose={() => setCartOpen(false)} />
        </motion.main>
      )}
    </>
  );
}
