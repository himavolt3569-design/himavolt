"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import QRCode from "react-qr-code";
import { Download, Printer, Share2, Check, X } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import gsap from "gsap";

const TABLES = Array.from({ length: 12 }, (_, i) => i + 1);

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  angle: number;
  speed: number;
}

function ConfettiBurst({ active, origin }: { active: boolean; origin: { x: number; y: number } }) {
  const COLORS = ["#FF9933", "#0A4D3C", "#FF6B6B", "#4ECDC4", "#FFE66D", "#6C63FF"];
  const particles: Particle[] = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    x: origin.x,
    y: origin.y,
    color: COLORS[i % COLORS.length],
    angle: (i / 24) * 360,
    speed: 60 + Math.random() * 80,
  }));

  return (
    <AnimatePresence>
      {active &&
        particles.map((p) => {
          const rad = (p.angle * Math.PI) / 180;
          const dx = Math.cos(rad) * p.speed;
          const dy = Math.sin(rad) * p.speed;
          return (
            <motion.div
              key={p.id}
              initial={{ x: p.x, y: p.y, opacity: 1, scale: 1 }}
              animate={{
                x: p.x + dx,
                y: p.y + dy,
                opacity: 0,
                scale: 0,
                rotate: Math.random() * 360,
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="pointer-events-none fixed z-200 h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: p.color }}
            />
          );
        })}
    </AnimatePresence>
  );
}

function QRCard({ tableNo }: { tableNo: number }) {
  const { showToast } = useToast();
  const [confetti, setConfetti] = useState(false);
  const [confettiOrigin, setConfettiOrigin] = useState({ x: 0, y: 0 });
  const shareRef = useRef<HTMLButtonElement>(null);
  const downloadRef = useRef<HTMLButtonElement>(null);

  const tableUrl = `https://himalhub.app/menu?table=${tableNo}`;

  const handleShare = useCallback(
    (e: React.MouseEvent) => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setConfettiOrigin({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
      setConfetti(true);
      showToast(`Table ${tableNo} QR shared!`);

      if (shareRef.current) {
        gsap.fromTo(
          shareRef.current,
          { scale: 1 },
          { scale: 1.25, yoyo: true, repeat: 1, duration: 0.15, ease: "power1.inOut" },
        );
      }

      setTimeout(() => setConfetti(false), 800);
    },
    [tableNo, showToast],
  );

  const handleDownload = () => {
    showToast(`QR for Table ${tableNo} downloaded!`);
    if (downloadRef.current) {
      gsap.fromTo(
        downloadRef.current,
        { scale: 1.2, color: "#FF9933" },
        { scale: 1, color: "", duration: 0.3, ease: "back.out(2)" },
      );
    }
  };

  const handlePrint = () => {
    showToast(`Printing Table ${tableNo} QR...`);
  };

  return (
    <>
      <ConfettiBurst active={confetti} origin={confettiOrigin} />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="group flex flex-col items-center rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
      >
        {/* Table badge */}
        <div className="mb-4 flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0A4D3C]/10 text-xs font-bold text-[#0A4D3C]">
              {tableNo}
            </span>
            <span className="text-sm font-bold text-[#1F2A2A]">Table {tableNo}</span>
          </div>
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-600">
            Active
          </span>
        </div>

        {/* QR Code */}
        <div className="relative rounded-xl bg-gray-50 p-4 mb-4 border border-gray-100">
          <QRCode
            value={tableUrl}
            size={100}
            fgColor="#0A4D3C"
            bgColor="transparent"
            level="M"
          />
          {/* Logo overlay hint */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="h-5 w-5 rounded-sm bg-white flex items-center justify-center border border-gray-100">
              <span className="text-[7px] font-black text-[#FF9933]">HH</span>
            </div>
          </div>
        </div>

        <p className="text-[10px] text-gray-400 truncate w-full text-center mb-4 font-mono">
          /menu?table={tableNo}
        </p>

        {/* Action buttons */}
        <div className="flex w-full gap-2">
          <button
            ref={downloadRef}
            onClick={handleDownload}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#0A4D3C] py-2.5 text-xs font-bold text-white hover:bg-[#083a2d] transition-all active:scale-[0.97]"
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </button>
          <button
            onClick={handlePrint}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <Printer className="h-3.5 w-3.5" />
          </button>
          <button
            ref={shareRef}
            onClick={handleShare}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FF9933]/10 text-[#FF9933] hover:bg-[#FF9933] hover:text-white transition-all"
          >
            <Share2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </motion.div>
    </>
  );
}

export default function QRCodesTab() {
  const { showToast } = useToast();
  const [downloading, setDownloading] = useState(false);

  const handleDownloadAll = () => {
    setDownloading(true);
    setTimeout(() => {
      setDownloading(false);
      showToast("All 12 QR codes downloaded!");
    }, 1800);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#1F2A2A]">QR Codes</h2>
          <p className="text-sm text-gray-400">
            One QR per table — customers scan to view menu and order
          </p>
        </div>
        <button
          onClick={handleDownloadAll}
          disabled={downloading}
          className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${
            downloading
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-[#0A4D3C] text-white hover:bg-[#083a2d] shadow-md shadow-[#0A4D3C]/20 active:scale-[0.97]"
          }`}
        >
          {downloading ? (
            <>
              <div className="h-4 w-4 rounded-full border-2 border-gray-300 border-t-gray-500 animate-spin" />
              Preparing...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Download All QRs
            </>
          )}
        </button>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl bg-[#FF9933]/8 border border-[#FF9933]/20 px-4 py-3">
        <Check className="h-4 w-4 text-[#FF9933] mt-0.5 shrink-0" />
        <p className="text-xs font-medium text-[#1F2A2A]">
          Each QR code links directly to your menu with the table number pre-selected. Customers scan and order instantly — no app needed.
        </p>
      </div>

      {/* QR grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {TABLES.map((t) => (
          <QRCard key={t} tableNo={t} />
        ))}
      </div>
    </div>
  );
}
