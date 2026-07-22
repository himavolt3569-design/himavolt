"use client";

import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import Navbar from "@/components/layout/Navbar";
import LandingHero from "@/components/home/LandingHero";
import InstallAppBar from "@/components/home/InstallAppBar";

const PlatformModules = dynamic(() => import("@/components/home/PlatformModules"), { ssr: false });
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

        <PlatformModules />

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
