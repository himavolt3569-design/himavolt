"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  QrCode,
  Download,
  Copy,
  Check,
  ExternalLink,
  Building2,
  Sparkles,
} from "lucide-react";
import QRCode from "react-qr-code";
import { useRestaurant } from "@/context/RestaurantContext";

const APP_URL =
  typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL || "";

export default function HotelQRTab() {
  const { selectedRestaurant } = useRestaurant();
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  const slug = selectedRestaurant?.slug ?? "";
  const hotelName = selectedRestaurant?.name ?? "Hotel";
  const hotelUrl = `${APP_URL}/hotel/${slug}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(hotelUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const CARD_W = 400;
    const CARD_H = 520;
    canvas.width = CARD_W;
    canvas.height = CARD_H;

    // Background
    ctx.fillStyle = "#FFFBF0";
    roundRect(ctx, 0, 0, CARD_W, CARD_H, 24);
    ctx.fill();

    // Top accent bar
    const grad = ctx.createLinearGradient(0, 0, CARD_W, 0);
    grad.addColorStop(0, "#f59e0b");
    grad.addColorStop(1, "#ea580c");
    ctx.fillStyle = grad;
    roundRect(ctx, 0, 0, CARD_W, 72, { tl: 24, tr: 24, bl: 0, br: 0 });
    ctx.fill();

    // Hotel name
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 20px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(hotelName, CARD_W / 2, 38);

    // Subtitle
    ctx.font = "13px system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fillText("Scan to browse rooms & book", CARD_W / 2, 58);

    // QR code image
    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgData);
    });
    const QR_SIZE = 220;
    const qrX = (CARD_W - QR_SIZE) / 2;
    ctx.fillStyle = "#ffffff";
    roundRect(ctx, qrX - 16, 88, QR_SIZE + 32, QR_SIZE + 32, 16);
    ctx.fill();
    ctx.drawImage(img, qrX, 104, QR_SIZE, QR_SIZE);

    // URL text
    ctx.fillStyle = "#92400e";
    ctx.font = "bold 12px system-ui, sans-serif";
    ctx.fillText(hotelUrl.replace(/^https?:\/\//, ""), CARD_W / 2, 376);

    // Divider
    ctx.strokeStyle = "#fde68a";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, 392);
    ctx.lineTo(CARD_W - 40, 392);
    ctx.stroke();

    // Footer
    ctx.fillStyle = "#d97706";
    ctx.font = "bold 11px system-ui, sans-serif";
    ctx.fillText("Powered by HimaVolt", CARD_W / 2, 416);

    ctx.fillStyle = "#a16207";
    ctx.font = "11px system-ui, sans-serif";
    ctx.fillText("Browse all rooms, amenities & book online", CARD_W / 2, 436);

    // Decorative dots
    ctx.fillStyle = "#fde68a";
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(CARD_W / 2 - 12 + i * 12, 458, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    const link = document.createElement("a");
    link.download = `${slug}-hotel-qr.png`;
    link.href = canvas.toDataURL("image/png", 1.0);
    link.click();

    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-[20px] font-black text-gray-900">Hotel QR Code</h2>
        <p className="text-[12px] text-gray-500 mt-0.5">
          Share this QR so guests can browse all rooms and book online
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* QR preview card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 ring-1 ring-amber-100 shadow-sm"
        >
          {/* Header bar */}
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 text-center">
            <p className="text-[18px] font-black text-white">{hotelName}</p>
            <p className="text-[11px] text-amber-100 mt-0.5">Scan to browse rooms &amp; book</p>
          </div>

          {/* QR */}
          <div className="flex flex-col items-center py-8 px-6">
            <div ref={qrRef} className="rounded-2xl bg-white p-5 shadow-md ring-1 ring-amber-100">
              {slug ? (
                <QRCode value={hotelUrl} size={200} level="M" />
              ) : (
                <div className="flex h-[200px] w-[200px] items-center justify-center">
                  <QrCode className="h-16 w-16 text-gray-300" />
                </div>
              )}
            </div>

            {/* URL */}
            <div className="mt-4 flex items-center gap-2 rounded-full bg-white ring-1 ring-amber-200 px-4 py-2 max-w-full overflow-hidden">
              <span className="truncate text-[11px] font-medium text-amber-700">{hotelUrl.replace(/^https?:\/\//, "")}</span>
            </div>

            {/* Dots decoration */}
            <div className="mt-4 flex gap-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-2 w-2 rounded-full bg-amber-200" />
              ))}
            </div>
            <p className="mt-2 text-[10px] text-amber-600 font-semibold">Powered by HimaVolt</p>
          </div>
        </motion.div>

        {/* Actions & info */}
        <div className="space-y-4">
          {/* Feature highlights */}
          <div className="rounded-2xl bg-white ring-1 ring-gray-100 p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <h3 className="text-[14px] font-bold text-gray-900">What guests see</h3>
            </div>
            {[
              "All rooms with photos, bed types, amenities",
              "Real-time availability for selected dates",
              "Price per night with advance payment info",
              "One-tap booking with eSewa / Khalti / Cash",
              "Instant booking confirmation page",
            ].map((item) => (
              <div key={item} className="flex items-start gap-2">
                <div className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Check className="h-2.5 w-2.5 text-emerald-600" />
                </div>
                <p className="text-[12px] text-gray-600">{item}</p>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="space-y-2.5">
            <button
              onClick={handleDownload}
              disabled={!slug}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 py-3.5 text-[13px] font-bold text-white shadow-sm hover:from-amber-400 hover:to-orange-400 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {downloaded ? (
                <><Check className="h-4 w-4" /> Downloaded!</>
              ) : (
                <><Download className="h-4 w-4" /> Download QR Card (PNG)</>
              )}
            </button>

            <button
              onClick={handleCopy}
              disabled={!slug}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white ring-1 ring-gray-200 py-3.5 text-[13px] font-bold text-gray-700 hover:bg-gray-50 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {copied ? (
                <><Check className="h-4 w-4 text-emerald-500" /> Link Copied!</>
              ) : (
                <><Copy className="h-4 w-4" /> Copy Hotel Link</>
              )}
            </button>

            <a
              href={hotelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-50 ring-1 ring-blue-100 py-3.5 text-[13px] font-bold text-blue-700 hover:bg-blue-100 active:scale-[0.98] transition-all"
            >
              <ExternalLink className="h-4 w-4" />
              Preview Guest Page
            </a>
          </div>

          {/* Hotel URL display */}
          <div className="rounded-2xl bg-gray-50 ring-1 ring-gray-100 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1.5">Direct Link</p>
            <div className="flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              <p className="text-[12px] font-medium text-gray-700 break-all">{hotelUrl}</p>
            </div>
            <p className="mt-2 text-[11px] text-gray-400">
              Share this link via WhatsApp, SMS, or print the QR card for your front desk.
            </p>
          </div>
        </div>
      </div>

      {/* Hidden canvas for download */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

/* ── Canvas roundRect helper ─────────────────────────────────── */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number | { tl: number; tr: number; bl: number; br: number },
) {
  const radii = typeof r === "number" ? { tl: r, tr: r, bl: r, br: r } : r;
  ctx.beginPath();
  ctx.moveTo(x + radii.tl, y);
  ctx.lineTo(x + w - radii.tr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radii.tr);
  ctx.lineTo(x + w, y + h - radii.br);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radii.br, y + h);
  ctx.lineTo(x + radii.bl, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radii.bl);
  ctx.lineTo(x, y + radii.tl);
  ctx.quadraticCurveTo(x, y, x + radii.tl, y);
  ctx.closePath();
}
