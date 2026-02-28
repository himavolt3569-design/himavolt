"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import FoodCategories from "@/components/FoodCategories";
import OffersCarousel from "@/components/OffersCarousel";
import TopPlaces from "@/components/TopPlaces";
import HowItWorks from "@/components/HowItWorks";
import Footer from "@/components/Footer";
import AuthModals from "@/components/AuthModals";
import CartSidebar from "@/components/CartSidebar";
import FoodDetailModal from "@/components/FoodDetailModal";
import LoadingClock from "@/components/LoadingClock";
import type { FoodItem } from "@/lib/data";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [loginOpen, setLoginOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [foodModalOpen, setFoodModalOpen] = useState(false);

  const clockRef = useRef<HTMLDivElement>(null);
  const minuteHandRef = useRef<HTMLDivElement>(null);
  const hourHandRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1800);
    return () => clearTimeout(timer);
  }, []);

  useGSAP(
    () => {
      if (
        loading &&
        clockRef.current &&
        minuteHandRef.current &&
        hourHandRef.current
      ) {
        gsap.to(minuteHandRef.current, {
          rotation: 360,
          duration: 1,
          repeat: -1,
          ease: "linear",
          transformOrigin: "bottom center",
        });
        gsap.to(hourHandRef.current, {
          rotation: 360,
          duration: 12,
          repeat: -1,
          ease: "linear",
          transformOrigin: "bottom center",
        });
        gsap.fromTo(
          clockRef.current,
          { scale: 0.92, opacity: 0.8 },
          {
            scale: 1.08,
            opacity: 1,
            yoyo: true,
            repeat: -1,
            duration: 0.9,
            ease: "power1.inOut",
          },
        );
      }
    },
    { scope: clockRef, dependencies: [loading] },
  );

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
          <Navbar
            onLoginClick={() => setLoginOpen(true)}
            onRegisterClick={() => setRegisterOpen(true)}
            onCartClick={() => setCartOpen(true)}
          />
          <Hero />
          <FoodCategories />
          <OffersCarousel />
          <TopPlaces
            onFoodClick={(food: FoodItem) => {
              setSelectedFood(food);
              setFoodModalOpen(true);
            }}
          />
          <HowItWorks />
          <Footer />

          <AuthModals
            loginOpen={loginOpen}
            setLoginOpen={setLoginOpen}
            registerOpen={registerOpen}
            setRegisterOpen={setRegisterOpen}
          />
          <CartSidebar open={cartOpen} onClose={() => setCartOpen(false)} />
          <FoodDetailModal
            food={selectedFood}
            open={foodModalOpen}
            onClose={() => setFoodModalOpen(false)}
          />
        </motion.main>
      )}
    </>
  );
}
