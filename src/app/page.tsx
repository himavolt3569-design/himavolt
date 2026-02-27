"use client";

import { useState, useEffect, useRef } from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import FoodCategories from "@/components/FoodCategories";
import OffersCarousel from "@/components/OffersCarousel";
import TopPlaces from "@/components/TopPlaces";
import HowItWorks from "@/components/HowItWorks";
import Footer from "@/components/Footer";
import AuthModals from "@/components/AuthModals";
import { Clock } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [loginOpen, setLoginOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);

  const clockRef = useRef<HTMLDivElement>(null);
  const minuteHandRef = useRef<HTMLDivElement>(null);
  const hourHandRef = useRef<HTMLDivElement>(null);

  // Fake mock fetch delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);
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
        // Spinning clock animation
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
          { scale: 0.9, opacity: 0.8 },
          {
            scale: 1.1,
            opacity: 1,
            yoyo: true,
            repeat: -1,
            duration: 0.8,
            ease: "power1.inOut",
          },
        );
      }
    },
    { scope: clockRef, dependencies: [loading] },
  );

  if (loading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-[#F5F0E8]">
        <div
          ref={clockRef}
          className="relative flex h-24 w-24 items-center justify-center rounded-full border-4 border-[#0A4D3C] bg-white shadow-2xl"
        >
          <div className="absolute top-1/2 left-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FF9933] z-10" />
          <div
            ref={hourHandRef}
            className="absolute bottom-1/2 left-1/2 h-6 w-1 -translate-x-1/2 rounded-full bg-[#1F2A2A] origin-bottom"
            style={{ marginBottom: "0px" }}
          />
          <div
            ref={minuteHandRef}
            className="absolute bottom-1/2 left-1/2 h-8 w-1 -translate-x-1/2 rounded-full bg-[#FF9933] origin-bottom"
            style={{ marginBottom: "0px" }}
          />
        </div>
        <h2 className="mt-8 text-2xl font-bold text-[#0A4D3C] tracking-tight">
          Preparing HimalHub...
        </h2>
        <p className="mt-2 font-medium text-gray-500">
          Fetching the best places in Nepal
        </p>
      </div>
    );
  }

  return (
    <main className="min-h-screen relative">
      <Navbar
        onLoginClick={() => setLoginOpen(true)}
        onRegisterClick={() => setRegisterOpen(true)}
      />

      <Hero />
      <FoodCategories />
      <OffersCarousel />
      <TopPlaces />
      <HowItWorks />
      <Footer />

      <AuthModals
        loginOpen={loginOpen}
        setLoginOpen={setLoginOpen}
        registerOpen={registerOpen}
        setRegisterOpen={setRegisterOpen}
      />
    </main>
  );
}
