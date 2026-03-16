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
  BedDouble,
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
  const [roomNum, setRoomNum] = useState("");
  const [inputMode, setInputMode] = useState<"table" | "room">("table");
  const scanBoxRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);

  const navigateToMenu = (table?: string, room?: string) => {
    if (restaurantSlug) {
      const params = new URLSearchParams();
      if (table) params.set("table", table);
      if (room) params.set("room", room);
      const qs = params.toString();
      const url = `/menu/${restaurantSlug}${qs ? `?${qs}` : ""}`;
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
        navigateToMenu(tableNum || "1", roomNum || undefined);
      }, 1000);
      return () => clearTimeout(navTimer);
    }
  }, [scanSuccess]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTableSubmit = () => {
    if (inputMode === "table" && tableNum.length >= 1) {
      showToast("Table confirmed!", "success");
      navigateToMenu(tableNum, roomNum || undefined);
    } else if (inputMode === "room" && roomNum.length >= 1) {
      showToast("Room confirmed!", "success");
      navigateToMenu(tableNum || undefined, roomNum);
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
          Hima<span className="text-[#FF9933]">Volt</span>
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
          {/* Toggle: Table or Room */}
          <div className="flex justify-center gap-2">
            <button
              onClick={() => setInputMode("table")}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                inputMode === "table"
                  ? "bg-[#0A4D3C] text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              <Hash className="h-3.5 w-3.5" />
              Table Number
            </button>
            <button
              onClick={() => setInputMode("room")}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                inputMode === "room"
                  ? "bg-[#0A4D3C] text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              <BedDouble className="h-3.5 w-3.5" />
              Room Number
            </button>
          </div>

          <p className="text-sm font-bold text-[#1F2A2A] text-center">
            {inputMode === "table"
              ? "Enter table number manually"
              : "Enter guest house room number"}
          </p>
          <div className="flex gap-3">
            <div className="relative flex-1">
              {inputMode === "table" ? (
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              ) : (
                <BedDouble className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              )}
              <input
                type="text"
                value={inputMode === "table" ? tableNum : roomNum}
                onChange={(e) => {
                  if (inputMode === "table") {
                    setTableNum(e.target.value.replace(/\D/g, "").slice(0, 2));
                  } else {
                    setRoomNum(e.target.value.slice(0, 10));
                  }
                }}
                placeholder={inputMode === "table" ? "e.g. 07" : "e.g. 101"}
                maxLength={inputMode === "table" ? 2 : 10}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3.5 pl-11 pr-4 text-center text-lg font-bold text-[#1F2A2A] placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FF9933]/30 focus:border-[#FF9933]/30 focus:bg-white transition-all tracking-[0.3em]"
              />
            </div>
            <button
              onClick={handleTableSubmit}
              disabled={
                inputMode === "table"
                  ? tableNum.length < 1
                  : roomNum.length < 1
              }
              className={`flex h-[52px] w-[52px] items-center justify-center rounded-xl transition-all ${
                (inputMode === "table" ? tableNum.length >= 1 : roomNum.length >= 1)
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
