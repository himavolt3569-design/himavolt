"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

const TYPEWRITER_WORDS = [
  "Delicious?",
  "Spicy?",
  "Fresh?",
  "Authentic?",
  "Healthy?",
  "Special?",
];

function useTypewriter(words: string[], typingSpeed = 80, pauseMs = 1800, deletingSpeed = 50) {
  const [display, setDisplay] = useState("");
  const [wordIdx, setWordIdx] = useState(0);
  const [phase, setPhase] = useState<"typing" | "pausing" | "deleting">("typing");
  const [charIdx, setCharIdx] = useState(0);

  useEffect(() => {
    const word = words[wordIdx];

    if (phase === "typing") {
      if (charIdx < word.length) {
        const t = setTimeout(() => {
          setDisplay(word.slice(0, charIdx + 1));
          setCharIdx((c) => c + 1);
        }, typingSpeed);
        return () => clearTimeout(t);
      } else {
        const t = setTimeout(() => setPhase("deleting"), pauseMs);
        return () => clearTimeout(t);
      }
    }

    if (phase === "deleting") {
      if (charIdx > 0) {
        const t = setTimeout(() => {
          setCharIdx((c) => c - 1);
          setDisplay(word.slice(0, charIdx - 1));
        }, deletingSpeed);
        return () => clearTimeout(t);
      } else {
        setPhase("typing");
        setWordIdx((i) => (i + 1) % words.length);
      }
    }
  }, [charIdx, phase, wordIdx, words, typingSpeed, pauseMs, deletingSpeed]);

  return display;
}

export default function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const floatingRef = useRef<HTMLDivElement>(null);
  const typedWord = useTypewriter(TYPEWRITER_WORDS);

  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 500], [1, 0.3]);
  const heroY = useTransform(scrollY, [0, 500], [0, 60]);

  useGSAP(
    () => {
      if (bgRef.current) {
        gsap.to(bgRef.current, {
          scale: 1.04,
          duration: 14,
          ease: "power1.inOut",
          yoyo: true,
          repeat: -1,
        });
      }

      // Floating food images
      if (floatingRef.current) {
        const floats = gsap.utils.toArray<HTMLElement>(".float-food");
        floats.forEach((el, i) => {
          gsap.to(el, {
            y: `${10 + i * 3}`,
            rotation: 2 + i,
            duration: 3 + i * 0.5,
            ease: "power1.inOut",
            yoyo: true,
            repeat: -1,
          });
        });
      }
    },
    { scope: containerRef },
  );

  return (
    <motion.section
      ref={containerRef}
      style={{ opacity: heroOpacity, y: heroY }}
      className="relative flex w-full items-center justify-center overflow-hidden"
    >
      {/* Vibrant gradient background */}
      <div ref={bgRef} className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#FFF5F5] via-[#FFE8E8] to-[#FFF0F5]" />
        <div className="absolute top-0 right-0 -mr-32 -mt-32 h-[600px] w-[600px] rounded-full bg-[#E23744]/[0.06] blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-32 -mb-32 h-[600px] w-[600px] rounded-full bg-[#FF6B81]/[0.08] blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[400px] rounded-full bg-[#1E7B3E]/[0.03] blur-3xl" />
      </div>

      {/* Floating food images */}
      <div
        ref={floatingRef}
        className="absolute inset-0 pointer-events-none overflow-hidden"
      >
        <img
          src="https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=120&h=120&fit=crop"
          alt=""
          className="float-food absolute top-[15%] left-[8%] w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover shadow-xl opacity-60 hidden md:block"
        />
        <img
          src="https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=120&h=120&fit=crop"
          alt=""
          className="float-food absolute top-[20%] right-[10%] w-14 h-14 sm:w-18 sm:h-18 rounded-full object-cover shadow-xl opacity-50 hidden md:block"
        />
        <img
          src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=120&h=120&fit=crop"
          alt=""
          className="float-food absolute bottom-[25%] left-[12%] w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover shadow-xl opacity-50 hidden lg:block"
        />
        <img
          src="https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=120&h=120&fit=crop"
          alt=""
          className="float-food absolute bottom-[20%] right-[8%] w-14 h-14 sm:w-18 sm:h-18 rounded-full object-cover shadow-xl opacity-60 hidden lg:block"
        />
      </div>

      <div className="relative z-10 mx-auto max-w-[1440px] w-full px-4 md:px-8 lg:px-12 pt-20 pb-16 md:pt-28 md:pb-24">
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
          {/* Subtle badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mb-5"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E23744]/[0.08] px-4 py-1.5 text-[11px] font-bold text-[#E23744] uppercase tracking-wider border border-[#E23744]/10">
              <motion.span
                animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <Sparkles className="h-3 w-3" />
              </motion.span>
              Nepal&apos;s Smartest Food Platform
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="mb-5 text-[2.5rem] font-extrabold tracking-tight text-[#1F2A2A] sm:text-5xl md:text-6xl lg:text-7xl leading-[1.15]"
          >
            <span className="block">Craving something</span>
            <span className="block min-h-[1.15em]">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E23744] via-[#FF6B81] to-[#FF9933]" style={{ backgroundSize: "200% 200%" }}>
                {typedWord}
              </span>
              <span
                className="inline-block w-[2px] h-[0.8em] bg-[#E23744] ml-[2px] align-middle rounded-sm"
                style={{ animation: "blink 1s step-start infinite" }}
              />
            </span>
          </motion.h1>

          <style>{`@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }`}</style>

          <motion.p
            initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-8 text-base font-medium text-gray-500 sm:text-lg md:text-xl max-w-xl leading-relaxed"
          >
            Discover the best food around you. Order to your table or get it
            delivered in minutes.
          </motion.p>

        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none" />
    </motion.section>
  );
}
