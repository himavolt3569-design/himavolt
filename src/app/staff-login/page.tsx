"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  useSpring,
  type Variants,
} from "framer-motion";
import {
  Mountain,
  Building2,
  Loader2,
  ArrowRight,
  AlertTriangle,
  ShieldCheck,
  ChefHat,
  CheckCircle2,
  Utensils,
  Coffee,
  Flame,
} from "lucide-react";
import Link from "next/link";

/* ── Animation variants ─────────────────────────────────────────── */

const stagger: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.2 },
  },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20, filter: "blur(8px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
};

const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
};

const shake: Variants = {
  idle: { x: 0 },
  error: {
    x: [0, -12, 12, -8, 8, -4, 4, 0],
    transition: { duration: 0.5, ease: "easeInOut" },
  },
};

/* ── Floating food image component ──────────────────────────────── */

function FloatingImage({
  src,
  className,
  delay,
  duration,
}: {
  src: string;
  className: string;
  delay: number;
  duration: number;
}) {
  return (
    <motion.div
      className={`absolute overflow-hidden rounded-2xl shadow-2xl shadow-black/40 pointer-events-none ${className}`}
      initial={{ opacity: 0, scale: 0.6, rotate: -10 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ delay, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        animate={{ y: [0, -12, 0] }}
        transition={{
          duration,
          repeat: Infinity,
          ease: "easeInOut",
          delay: delay + 0.3,
        }}
      >
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          loading="eager"
        />
      </motion.div>
    </motion.div>
  );
}

/* ── Animated orb ───────────────────────────────────────────────── */

function Orb({
  color,
  size,
  x,
  y,
  delay,
}: {
  color: string;
  size: number;
  x: string;
  y: string;
  delay: number;
}) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size,
        height: size,
        left: x,
        top: y,
        background: color,
        filter: `blur(${size * 0.6}px)`,
      }}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{
        opacity: [0, 0.6, 0.3, 0.6, 0],
        scale: [0.5, 1.2, 0.8, 1.1, 0.5],
        x: [0, 30, -20, 15, 0],
        y: [0, -25, 15, -10, 0],
      }}
      transition={{
        duration: 12,
        repeat: Infinity,
        ease: "easeInOut",
        delay,
      }}
    />
  );
}

/* ── Animated PIN digit ─────────────────────────────────────────── */

function PinBox({
  digit,
  index,
  focused,
  inputRef,
  onChange,
  onKeyDown,
}: {
  digit: string;
  index: number;
  focused: boolean;
  inputRef: (el: HTMLInputElement | null) => void;
  onChange: (i: number, v: string) => void;
  onKeyDown: (i: number, e: React.KeyboardEvent) => void;
}) {
  return (
    <motion.div
      className="relative flex-1 max-w-[72px]"
      initial={{ opacity: 0, y: 20, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay: 0.5 + index * 0.08,
        duration: 0.5,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {/* Glow ring when focused */}
      <AnimatePresence>
        {focused && (
          <motion.div
            className="absolute -inset-1 rounded-2xl bg-[#FF9933]/20"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </AnimatePresence>

      {/* Filled indicator dot */}
      <AnimatePresence>
        {digit && (
          <motion.div
            className="absolute -top-1 -right-1 z-10 h-3 w-3 rounded-full bg-[#FF9933] border-2 border-[#0A0D14]"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
          />
        )}
      </AnimatePresence>

      <motion.input
        ref={inputRef}
        type="password"
        inputMode="numeric"
        maxLength={1}
        value={digit}
        onChange={(e) => onChange(index, e.target.value)}
        onKeyDown={(e) => onKeyDown(index, e)}
        animate={
          digit
            ? { scale: [1, 1.08, 1], borderColor: "rgba(255,153,51,0.3)" }
            : { scale: 1, borderColor: "rgba(255,255,255,0.08)" }
        }
        transition={{ duration: 0.2 }}
        className="relative z-[1] h-14 w-full text-center text-xl font-bold bg-white/[0.04] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#FF9933]/30 focus:border-[#FF9933]/40 transition-colors font-mono"
        aria-label={`PIN digit ${index + 1}`}
      />
    </motion.div>
  );
}

/* ── Main page ──────────────────────────────────────────────────── */

export default function StaffLoginPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [pinDigits, setPinDigits] = useState(["", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [success, setSuccess] = useState(false);
  const [focusedPin, setFocusedPin] = useState(-1);
  const [formShake, setFormShake] = useState(false);
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Mouse parallax for left panel
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 50, damping: 20 });
  const imgX = useTransform(springX, [0, 1], [-15, 15]);
  const imgY = useTransform(springY, [0, 1], [-10, 10]);

  const pin = pinDigits.join("");

  useEffect(() => {
    const t = setTimeout(() => pinRefs.current[0]?.focus(), 400);
    return () => clearTimeout(t);
  }, []);

  // Track mouse for parallax
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const rect = e.currentTarget.getBoundingClientRect();
      mouseX.set((e.clientX - rect.left) / rect.width);
      mouseY.set((e.clientY - rect.top) / rect.height);
    },
    [mouseX, mouseY],
  );

  const handlePinChange = useCallback(
    (index: number, value: string) => {
      const digit = value.replace(/\D/g, "").slice(-1);
      const next = [...pinDigits];
      next[index] = digit;
      setPinDigits(next);
      setErrorMsg("");

      if (digit && index < 3) {
        pinRefs.current[index + 1]?.focus();
      }
    },
    [pinDigits],
  );

  const handlePinKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent) => {
      if (e.key === "Backspace" && !pinDigits[index] && index > 0) {
        pinRefs.current[index - 1]?.focus();
      }
    },
    [pinDigits],
  );

  const handlePinPaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 4);
    const next = ["", "", "", ""];
    pasted.split("").forEach((ch, i) => (next[i] = ch));
    setPinDigits(next);
    const focusIdx = Math.min(pasted.length, 3);
    pinRefs.current[focusIdx]?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || pin.length !== 4) return;

    setLoading(true);
    try {
      const res = await fetch("/api/staff-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantCode: code.toUpperCase(), pin }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      // Success animation before redirect
      setSuccess(true);
      await new Promise((r) => setTimeout(r, 1200));
      router.push("/kitchen");
      router.refresh();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Invalid Code or PIN");
      setPinDigits(["", "", "", ""]);
      setFormShake(true);
      setTimeout(() => setFormShake(false), 600);
      pinRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const isReady = code.length > 0 && pin.length === 4 && !loading;

  return (
    <div className="min-h-screen flex bg-[#0F1219]">
      {/* ── Left panel — animated food imagery ── */}
      <div
        className="hidden lg:flex lg:w-[45%] xl:w-[50%] relative overflow-hidden bg-[#0F1219]"
        onMouseMove={handleMouseMove}
      >
        {/* Parallax food background */}
        <motion.img
          src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&h=1600&fit=crop"
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-30"
          style={{ x: imgX, y: imgY, scale: 1.1 }}
        />

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F1219] via-[#0F1219]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#0F1219]/80" />

        {/* Animated orbs */}
        <Orb
          color="rgba(226,55,68,0.15)"
          size={200}
          x="20%"
          y="30%"
          delay={0}
        />
        <Orb
          color="rgba(255,153,51,0.12)"
          size={160}
          x="60%"
          y="60%"
          delay={3}
        />
        <Orb
          color="rgba(52,211,153,0.08)"
          size={120}
          x="40%"
          y="15%"
          delay={6}
        />

        {/* Floating food images */}
        <FloatingImage
          src="https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=200&h=200&fit=crop"
          className="top-[12%] right-[15%] h-24 w-24 xl:h-28 xl:w-28 rotate-6"
          delay={0.4}
          duration={4}
        />
        <FloatingImage
          src="https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=200&h=200&fit=crop"
          className="bottom-[22%] right-[25%] h-20 w-20 xl:h-24 xl:w-24 -rotate-3"
          delay={0.7}
          duration={5}
        />
        <FloatingImage
          src="https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=200&h=200&fit=crop"
          className="top-[45%] right-[8%] h-16 w-16 xl:h-20 xl:w-20 rotate-12"
          delay={1.0}
          duration={4.5}
        />

        {/* Noise texture */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 6 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23fff' fill-opacity='1'%3E%3Ccircle cx='1' cy='1' r='0.6'/%3E%3C/g%3E%3C/svg%3E\")",
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
          {/* Top — brand with animated entry */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <Link href="/" className="flex items-center gap-2.5 group">
              <motion.div
                animate={{ rotate: [0, -5, 5, 0] }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <Mountain
                  className="h-6 w-6 text-[#FF9933]"
                  strokeWidth={2.5}
                />
              </motion.div>
              <span className="text-xl font-extrabold text-white tracking-tight">
                Hima<span className="text-[#FF9933]">Volt</span>
              </span>
            </Link>
          </motion.div>

          {/* Bottom — animated icons & messaging */}
          <motion.div variants={stagger} initial="hidden" animate="show">
            <motion.div
              variants={fadeUp}
              className="flex items-center gap-3 mb-6"
            >
              {[
                { Icon: ChefHat, color: "text-[#FF9933]" },
                { Icon: Utensils, color: "text-[#E23744]" },
                { Icon: Coffee, color: "text-[#34D399]" },
                { Icon: Flame, color: "text-[#FF6B81]" },
              ].map(({ Icon, color }, i) => (
                <motion.div
                  key={i}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] border border-white/[0.06]"
                  whileHover={{ scale: 1.15, rotate: -5 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                >
                  <Icon className={`h-5 w-5 ${color}`} />
                </motion.div>
              ))}
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="text-3xl xl:text-4xl font-extrabold text-white tracking-tight leading-[1.15] mb-3"
            >
              Kitchen & POS
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF9933] to-[#FFB347]">
                Command Centre.
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="text-sm text-gray-500 max-w-sm leading-relaxed"
            >
              Manage orders, update menus, and track everything in real-time
              from one secure portal.
            </motion.p>

            {/* Animated feature pills */}
            <motion.div variants={fadeUp} className="flex flex-wrap gap-2 mt-6">
              {["Live Orders", "Menu Editor", "POS", "Reports"].map(
                (label, i) => (
                  <motion.span
                    key={label}
                    className="rounded-full bg-white/[0.05] border border-white/[0.06] px-3 py-1.5 text-[11px] font-semibold text-white/40"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      delay: 0.8 + i * 0.1,
                      duration: 0.4,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  >
                    {label}
                  </motion.span>
                ),
              )}
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* ── Right panel — animated login form ── */}
      <div className="flex-1 flex flex-col bg-[#0F1219] lg:bg-[#0A0D14] relative overflow-hidden">
        {/* Background animated orbs for right panel */}
        <Orb
          color="rgba(255,153,51,0.06)"
          size={300}
          x="70%"
          y="20%"
          delay={2}
        />
        <Orb
          color="rgba(226,55,68,0.05)"
          size={250}
          x="10%"
          y="70%"
          delay={5}
        />

        {/* Mobile header */}
        <motion.div
          className="lg:hidden flex items-center justify-between p-5"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Link href="/" className="flex items-center gap-2">
            <Mountain className="h-5 w-5 text-[#FF9933]" strokeWidth={2.5} />
            <span className="text-lg font-extrabold text-white tracking-tight">
              Hima<span className="text-[#FF9933]">Volt</span>
            </span>
          </Link>
          <Link
            href="/"
            className="text-xs font-medium text-gray-500 hover:text-white transition-colors"
          >
            &larr; Back to App
          </Link>
        </motion.div>

        {/* Form container — centered */}
        <div className="flex-1 flex items-center justify-center px-5 py-12 sm:px-8 relative z-10">
          <AnimatePresence mode="wait">
            {success ? (
              /* ── Success state ── */
              <motion.div
                key="success"
                className="flex flex-col items-center text-center"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  duration: 0.5,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <motion.div
                  className="relative mb-6"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 200,
                    damping: 15,
                    delay: 0.1,
                  }}
                >
                  {/* Pulsing ring */}
                  <motion.div
                    className="absolute inset-0 rounded-full bg-[#34D399]/20"
                    animate={{ scale: [1, 1.8, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeOut",
                    }}
                    style={{
                      width: 80,
                      height: 80,
                      left: -8,
                      top: -8,
                    }}
                  />
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#34D399]/10 border border-[#34D399]/20">
                    <CheckCircle2 className="h-8 w-8 text-[#34D399]" />
                  </div>
                </motion.div>
                <motion.h3
                  className="text-xl font-extrabold text-white mb-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  Welcome back!
                </motion.h3>
                <motion.p
                  className="text-sm text-gray-500"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  Redirecting to your portal...
                </motion.p>

                {/* Animated dots */}
                <motion.div
                  className="flex gap-1.5 mt-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-[#34D399]"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        delay: i * 0.2,
                      }}
                    />
                  ))}
                </motion.div>
              </motion.div>
            ) : (
              /* ── Login form ── */
              <motion.div
                key="form"
                variants={shake}
                animate={formShake ? "error" : "idle"}
                className="w-full max-w-sm"
              >
                <motion.div variants={stagger} initial="hidden" animate="show">
                  {/* Header */}
                  <motion.div variants={fadeUp} className="mb-9">
                    <motion.div
                      className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] backdrop-blur-sm px-3.5 py-1.5 text-[11px] font-bold text-white/60 uppercase tracking-wider border border-white/[0.06] mb-5"
                      variants={scaleIn}
                    >
                      <motion.div
                        animate={{
                          scale: [1, 1.2, 1],
                          opacity: [0.7, 1, 0.7],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      >
                        <ShieldCheck className="h-3 w-3 text-[#34D399]" />
                      </motion.div>
                      Secure staff access
                    </motion.div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                      Staff Portal
                    </h2>
                    <p className="mt-2 text-sm text-gray-500">
                      Enter your restaurant code and PIN to continue.
                    </p>
                  </motion.div>

                  <form className="space-y-7" onSubmit={handleSubmit}>
                    {/* Restaurant Code */}
                    <motion.div variants={fadeUp}>
                      <label
                        htmlFor="code"
                        className="block text-[11px] font-bold text-white/50 uppercase tracking-wider mb-2.5"
                      >
                        Restaurant Code
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Building2 className="h-4 w-4 text-gray-600 group-focus-within:text-[#FF9933] transition-colors" />
                        </div>
                        <motion.input
                          id="code"
                          type="text"
                          required
                          value={code}
                          onChange={(e) => {
                            setCode(e.target.value.toUpperCase());
                            setErrorMsg("");
                          }}
                          whileFocus={{ scale: 1.01 }}
                          transition={{ duration: 0.15 }}
                          className="block w-full pl-11 pr-4 py-3.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white font-mono tracking-widest text-sm placeholder:tracking-normal placeholder:font-sans placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#FF9933]/30 focus:border-[#FF9933]/40 transition-all"
                          placeholder="e.g. HH-1A2B"
                        />
                        {/* Filled indicator */}
                        <AnimatePresence>
                          {code.length >= 4 && (
                            <motion.div
                              className="absolute inset-y-0 right-3 flex items-center"
                              initial={{ opacity: 0, scale: 0 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0 }}
                              transition={{
                                type: "spring",
                                stiffness: 500,
                                damping: 25,
                              }}
                            >
                              <CheckCircle2 className="h-4 w-4 text-[#34D399]" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>

                    {/* 4-Digit PIN — animated individual boxes */}
                    <motion.div variants={fadeUp}>
                      <label className="block text-[11px] font-bold text-white/50 uppercase tracking-wider mb-2.5">
                        4-Digit PIN
                      </label>
                      <div className="flex gap-3" onPaste={handlePinPaste}>
                        {pinDigits.map((digit, i) => (
                          <PinBox
                            key={i}
                            digit={digit}
                            index={i}
                            focused={focusedPin === i}
                            inputRef={(el) => {
                              pinRefs.current[i] = el;
                              if (el) {
                                el.onfocus = () => setFocusedPin(i);
                                el.onblur = () => setFocusedPin(-1);
                              }
                            }}
                            onChange={handlePinChange}
                            onKeyDown={handlePinKeyDown}
                          />
                        ))}
                      </div>

                      {/* PIN progress bar */}
                      <div className="mt-3 h-1 rounded-full bg-white/[0.04] overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-[#FF9933] to-[#FFB347]"
                          initial={{ width: "0%" }}
                          animate={{
                            width: `${(pin.length / 4) * 100}%`,
                          }}
                          transition={{
                            duration: 0.3,
                            ease: [0.16, 1, 0.3, 1],
                          }}
                        />
                      </div>
                    </motion.div>

                    {/* Error message */}
                    <AnimatePresence>
                      {errorMsg && (
                        <motion.div
                          initial={{
                            opacity: 0,
                            y: -8,
                            height: 0,
                            filter: "blur(8px)",
                          }}
                          animate={{
                            opacity: 1,
                            y: 0,
                            height: "auto",
                            filter: "blur(0px)",
                          }}
                          exit={{
                            opacity: 0,
                            y: -8,
                            height: 0,
                            filter: "blur(8px)",
                          }}
                          transition={{ duration: 0.3 }}
                          className="flex items-center gap-2.5 p-3.5 rounded-xl bg-[#E23744]/10 border border-[#E23744]/20 text-[#FF6B81]"
                        >
                          <motion.div
                            animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                          >
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                          </motion.div>
                          <span className="text-sm font-medium">
                            {errorMsg}
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Submit — animated button */}
                    <motion.div variants={fadeUp}>
                      <motion.button
                        type="submit"
                        disabled={loading || !code || pin.length !== 4}
                        className="relative w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-sm font-bold transition-colors cursor-pointer disabled:cursor-not-allowed bg-gradient-to-r from-[#E23744] to-[#FF6B81] text-white shadow-lg shadow-[#E23744]/20 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 disabled:shadow-none overflow-hidden"
                        whileHover={
                          isReady
                            ? {
                                scale: 1.02,
                                boxShadow:
                                  "0 20px 40px -12px rgba(226,55,68,0.35)",
                              }
                            : {}
                        }
                        whileTap={isReady ? { scale: 0.98 } : {}}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 20,
                        }}
                      >
                        {/* Animated shine effect when ready */}
                        {isReady && (
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                            initial={{ x: "-100%" }}
                            animate={{ x: "200%" }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              repeatDelay: 3,
                              ease: "easeInOut",
                            }}
                          />
                        )}
                        <span className="relative z-[1] flex items-center gap-2">
                          {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <>
                              Enter Portal
                              <motion.span
                                animate={isReady ? { x: [0, 4, 0] } : { x: 0 }}
                                transition={{
                                  duration: 1.2,
                                  repeat: Infinity,
                                  ease: "easeInOut",
                                }}
                              >
                                <ArrowRight className="w-4 h-4" />
                              </motion.span>
                            </>
                          )}
                        </span>
                      </motion.button>
                    </motion.div>
                  </form>

                  {/* Footer link */}
                  <motion.div
                    variants={fadeUp}
                    className="hidden lg:block mt-8 pt-6 border-t border-white/[0.06]"
                  >
                    <Link
                      href="/"
                      className="text-sm font-medium text-gray-600 hover:text-white transition-colors flex items-center justify-center gap-1.5"
                    >
                      &larr; Back to App
                    </Link>
                  </motion.div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
