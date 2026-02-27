"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { QrCode, ArrowLeft, Hash, ArrowRight, Mountain } from "lucide-react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import Link from "next/link";

export default function ScanPage() {
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const [tableNum, setTableNum] = useState("");
  const scanBoxRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);

  const handleScan = () => {
    setScanning(true);
  };

  useEffect(() => {
    if (scanning && lineRef.current && scanBoxRef.current) {
      const ctx = gsap.context(() => {
        gsap.fromTo(
          lineRef.current!,
          { top: "10%" },
          { top: "90%", duration: 1.2, yoyo: true, repeat: 2, ease: "power1.inOut" },
        );
      });

      const timer = setTimeout(() => {
        router.push("/menu");
      }, 3000);

      return () => {
        ctx.revert();
        clearTimeout(timer);
      };
    }
  }, [scanning, router]);

  const handleTableSubmit = () => {
    if (tableNum.length >= 1 && tableNum.length <= 2) {
      router.push("/menu");
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-white overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,153,51,0.04),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(10,77,60,0.03),transparent_50%)]" />

      {/* Back button */}
      <Link
        href="/"
        className="absolute top-5 left-5 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>

      {/* Logo */}
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

      {/* Scan area */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="relative z-10 w-full max-w-sm px-6 space-y-8"
      >
        {/* QR Box */}
        <div
          ref={scanBoxRef}
          className={`relative mx-auto flex h-64 w-64 items-center justify-center rounded-3xl border-2 transition-all duration-500 ${
            scanning
              ? "border-[#FF9933] shadow-xl shadow-[#FF9933]/15 bg-[#FF9933]/5"
              : "border-gray-200 bg-gray-50"
          }`}
        >
          {/* Corner accents */}
          <div className="absolute top-0 left-0 h-8 w-8 rounded-tl-3xl border-t-4 border-l-4 border-[#0A4D3C]" />
          <div className="absolute top-0 right-0 h-8 w-8 rounded-tr-3xl border-t-4 border-r-4 border-[#0A4D3C]" />
          <div className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-3xl border-b-4 border-l-4 border-[#0A4D3C]" />
          <div className="absolute bottom-0 right-0 h-8 w-8 rounded-br-3xl border-b-4 border-r-4 border-[#0A4D3C]" />

          {scanning ? (
            <>
              <div
                ref={lineRef}
                className="absolute left-[10%] right-[10%] h-0.5 rounded-full bg-[#FF9933] shadow-lg shadow-[#FF9933]/50"
              />
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-sm font-bold text-[#FF9933]"
              >
                Scanning...
              </motion.p>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 text-gray-300">
              <QrCode className="h-16 w-16" />
              <p className="text-xs font-medium text-gray-400">
                Tap below to scan
              </p>
            </div>
          )}
        </div>

        {/* Scan button */}
        <button
          onClick={handleScan}
          disabled={scanning}
          className={`w-full rounded-2xl py-4 text-base font-bold text-white transition-all shadow-lg active:scale-[0.98] ${
            scanning
              ? "bg-gray-300 cursor-not-allowed shadow-none"
              : "bg-[#0A4D3C] hover:bg-[#083a2d] shadow-[#0A4D3C]/25"
          }`}
        >
          {scanning ? "Connecting to restaurant..." : "Scan Table QR"}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            or
          </span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Table number input */}
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

        {/* Skip link */}
        <div className="text-center pt-2">
          <Link
            href="/menu"
            className="text-xs font-bold text-[#0A4D3C] hover:underline"
          >
            Skip & Browse Menu Directly
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
