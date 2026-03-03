"use client";

import { Suspense, useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  QrCode,
  ArrowLeft,
  Hash,
  ArrowRight,
  Mountain,
  Flashlight,
  FlashlightOff,
  CheckCircle2,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/context/ToastContext";
import gsap from "gsap";
import Link from "next/link";

export default function ScanPage() {
  return (
    <Suspense>
      <ScanPageContent />
    </Suspense>
  );
}

function ScanPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const restaurantSlug = searchParams.get("restaurant");
  const { showToast } = useToast();
  const [scanning, setScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [flashlightOn, setFlashlightOn] = useState(false);
  const [tableNum, setTableNum] = useState("");
  const scanBoxRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);

  const navigateToMenu = (table?: string) => {
    if (restaurantSlug) {
      const url = table
        ? `/menu/${restaurantSlug}?table=${table}`
        : `/menu/${restaurantSlug}`;
      router.push(url);
    } else {
      showToast("Please scan a valid QR code at a restaurant table", "info");
      router.push("/");
    }
  };

  const handleScan = () => {
    setScanning(true);
  };

  useEffect(() => {
    if (scanning && !scanSuccess && lineRef.current && scanBoxRef.current) {
      const ctx = gsap.context(() => {
        gsap.fromTo(
          lineRef.current!,
          { top: "5%" },
          {
            top: "95%",
            duration: 1.5,
            yoyo: true,
            repeat: -1,
            ease: "sine.inOut",
          },
        );
      });

      const timer = setTimeout(() => {
        setScanSuccess(true);
        showToast("Table scanned successfully!", "success");
      }, 2500);

      return () => {
        ctx.revert();
        clearTimeout(timer);
      };
    }
  }, [scanning, scanSuccess, showToast]);

  useEffect(() => {
    if (scanSuccess) {
      const navTimer = setTimeout(() => {
        navigateToMenu(tableNum || "1");
      }, 1000);
      return () => clearTimeout(navTimer);
    }
  }, [scanSuccess]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTableSubmit = () => {
    if (tableNum.length >= 1 && tableNum.length <= 2) {
      showToast("Table confirmed!", "success");
      navigateToMenu(tableNum);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-white overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,153,51,0.04),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(10,77,60,0.03),transparent_50%)]" />

      <Link
        href="/"
        className="absolute top-5 left-5 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-10 flex items-center gap-2"
      >
        <Mountain className="h-7 w-7 text-[#FF9933]" strokeWidth={2.5} />
        <span className="text-xl font-extrabold tracking-tight text-[#1F2A2A]">
          Himal<span className="text-[#FF9933]">Hub</span>
        </span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="relative z-10 w-full max-w-sm px-6 space-y-8"
      >
        {restaurantSlug && (
          <p className="text-center text-sm text-gray-500">
            Scanning for <strong className="text-[#1F2A2A]">{restaurantSlug.replace(/-/g, " ")}</strong>
          </p>
        )}

        <div
          ref={scanBoxRef}
          className={`relative mx-auto flex h-64 w-64 items-center justify-center rounded-3xl border-2 transition-all duration-500 overflow-hidden ${
            scanSuccess
              ? "border-[#0A4D3C] bg-[#0A4D3C]/10 shadow-2xl shadow-[#0A4D3C]/20"
              : scanning
                ? "border-[#FF9933] shadow-xl shadow-[#FF9933]/15 bg-black/5"
                : "border-gray-200 bg-gray-50"
          }`}
        >
          <div className="absolute inset-0 z-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]" />

          <button
            onClick={() => setFlashlightOn(!flashlightOn)}
            className="absolute top-3 right-3 z-20 p-2 rounded-full bg-white/50 backdrop-blur text-charcoal-slate hover:bg-white transition-colors"
          >
            {flashlightOn ? (
              <Flashlight className="w-5 h-5 text-saffron-flame" />
            ) : (
              <FlashlightOff className="w-5 h-5" />
            )}
          </button>

          <div className="absolute top-0 left-0 h-10 w-10 rounded-tl-3xl border-t-4 border-l-4 border-[#0A4D3C] transition-colors" />
          <div className="absolute top-0 right-0 h-10 w-10 rounded-tr-3xl border-t-4 border-r-4 border-[#0A4D3C] transition-colors" />
          <div className="absolute bottom-0 left-0 h-10 w-10 rounded-bl-3xl border-b-4 border-l-4 border-[#0A4D3C] transition-colors" />
          <div className="absolute bottom-0 right-0 h-10 w-10 rounded-br-3xl border-b-4 border-r-4 border-[#0A4D3C] transition-colors" />

          {flashlightOn && (
            <div className="absolute inset-0 bg-yellow-200/20 mix-blend-overlay pointer-events-none" />
          )}

          <AnimatePresence mode="wait">
            {scanSuccess ? (
              <motion.div
                key="success"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center gap-2 z-10"
              >
                <div className="bg-white rounded-full p-2 shadow-lg">
                  <CheckCircle2 className="h-12 w-12 text-[#0A4D3C]" />
                </div>
                <p className="text-[#0A4D3C] font-bold text-lg drop-shadow-sm">
                  Success!
                </p>
              </motion.div>
            ) : scanning ? (
              <motion.div
                key="scanning"
                className="relative w-full h-full z-10"
              >
                <div
                  ref={lineRef}
                  className="absolute left-[5%] right-[5%] h-[3px] rounded-full bg-[#FF9933] shadow-[0_0_15px_rgba(255,153,51,0.8)]"
                />
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-3 text-gray-300 z-10"
              >
                <QrCode className="h-16 w-16" />
                <p className="text-xs font-medium text-gray-400">
                  Tap below to scan
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          onClick={handleScan}
          disabled={scanning || scanSuccess}
          className={`w-full rounded-2xl py-4 text-base font-bold text-white transition-all shadow-lg active:scale-[0.98] ${
            scanning || scanSuccess
              ? "bg-gray-300 cursor-not-allowed shadow-none"
              : "bg-[#0A4D3C] hover:bg-[#083a2d] hover:shadow-xl hover:-translate-y-0.5 shadow-[#0A4D3C]/25"
          }`}
        >
          {scanSuccess
            ? "Redirecting..."
            : scanning
              ? "Connecting to camera..."
              : "Scan Table QR"}
        </button>

        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            or
          </span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <div className="space-y-3">
          <p className="text-sm font-bold text-[#1F2A2A] text-center">
            Enter table number manually
          </p>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Hash className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={tableNum}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 2);
                  setTableNum(val);
                }}
                placeholder="e.g. 07"
                maxLength={2}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3.5 pl-11 pr-4 text-center text-lg font-bold text-[#1F2A2A] placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FF9933]/30 focus:border-[#FF9933]/30 focus:bg-white transition-all tracking-[0.3em]"
              />
            </div>
            <button
              onClick={handleTableSubmit}
              disabled={tableNum.length < 1}
              className={`flex h-[52px] w-[52px] items-center justify-center rounded-xl transition-all ${
                tableNum.length >= 1
                  ? "bg-[#FF9933] text-white shadow-md hover:bg-[#ff8811]"
                  : "bg-gray-100 text-gray-300 cursor-not-allowed"
              }`}
            >
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="text-center pt-2">
          <Link
            href="/"
            className="text-xs font-bold text-[#0A4D3C] hover:underline"
          >
            Skip & Browse Restaurants
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
