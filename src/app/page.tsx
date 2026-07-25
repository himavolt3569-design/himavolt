"use client";

import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import Navbar from "@/components/layout/Navbar";
import LandingHero from "@/components/home/LandingHero";
import InstallAppBar from "@/components/home/InstallAppBar";

const NearbySection = dynamic(() => import("@/components/home/NearbySection"), { ssr: false });
const PlatformModules = dynamic(() => import("@/components/home/PlatformModules"), { ssr: false });
const HardwareShowcase = dynamic(() => import("@/components/home/HardwareShowcase"), { ssr: false });
const CoreFeatures = dynamic(() => import("@/components/home/CoreFeatures"), { ssr: false });
const HowItWorks = dynamic(() => import("@/components/home/HowItWorks"), { ssr: false });
const BusinessMetrics = dynamic(() => import("@/components/home/BusinessMetrics"), { ssr: false });
const FAQSection = dynamic(() => import("@/components/home/FAQSection"), { ssr: false });
const CTASection = dynamic(() => import("@/components/home/CTASection"), { ssr: false });
const Testimonials = dynamic(() => import("@/components/home/Testimonials"), { ssr: false });
const Footer = dynamic(() => import("@/components/layout/Footer"), { ssr: false });

export default function Home() {
  return (
    <>
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="min-h-screen relative bg-[var(--canvas)]"
      >
        <Navbar />

        <InstallAppBar />

        <LandingHero />

        {/* Directly under the hero: a visitor who arrived hungry should not have
            to scroll past the B2B pitch to find somewhere to order from. */}
        <NearbySection />

        <PlatformModules />

        <HardwareShowcase />

        <CoreFeatures />

        <HowItWorks />

        <BusinessMetrics />

        <Testimonials />

        <FAQSection />

        <CTASection />

        <Footer />
      </motion.main>
    </>
  );
}
