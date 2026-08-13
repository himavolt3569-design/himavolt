"use client";

import { useState, useRef } from "react";
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

    ctx.fillStyle = "#FFFBF0";
    roundRect(ctx, 0, 0, CARD_W, CARD_H, 24);
    ctx.fill();

    const grad = ctx.createLinearGradient(0, 0, CARD_W, 0);
    grad.addColorStop(0, "#f59e0b");
    grad.addColorStop(1, "#ea580c");
    ctx.fillStyle = grad;
    roundRect(ctx, 0, 0, CARD_W, 72, { tl: 24, tr: 24, bl: 0, br: 0 });
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 20px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(hotelName, CARD_W / 2, 38);

    ctx.font = "13px system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fillText("Scan to browse rooms & book", CARD_W / 2, 58);

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

    ctx.fillStyle = "#92400e";
    ctx.font = "bold 12px system-ui, sans-serif";
    ctx.fillText(hotelUrl.replace(/^https?:\/\//, ""), CARD_W / 2, 376);

    ctx.strokeStyle = "#fde68a";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, 392);
    ctx.lineTo(CARD_W - 40, 392);
    ctx.stroke();

    ctx.fillStyle = "#d97706";
    ctx.font = "bold 11px system-ui, sans-serif";
    ctx.fillText("Powered by HimaVolt", CARD_W / 2, 416);

    ctx.fillStyle = "#a16207";
    ctx.font = "11px system-ui, sans-serif";
    ctx.fillText("Browse all rooms, amenities & book online", CARD_W / 2, 436);

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
      <div>
        <h2 className="text-[20px] font-black text-[var(--text-1)]">Hotel QR Code</h2>
        <p className="text-[12px] text-[var(--text-2)] mt-0.5">
          Share this QR so guests can browse all rooms and book online
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] ring-1 ring-[var(--accent-border)] shadow-sm"
        >
          <div className="bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] px-6 py-4 text-center">
            <p className="text-[18px] font-black text-white">{hotelName}</p>
            <p className="text-[11px] text-[var(--accent)] mt-0.5">Scan to browse rooms &amp; book</p>
          </div>

          <div className="flex flex-col items-center py-8 px-6">
            <div ref={qrRef} className="rounded-2xl bg-[var(--canvas)] p-5 shadow-md ring-1 ring-[var(--accent-border)]">
              {slug ? (
                <QRCode value={hotelUrl} size={200} level="M" />
              ) : (
                <div className="flex h-[200px] w-[200px] items-center justify-center">
                  <QrCode className="h-16 w-16 text-[var(--text-3)]" />
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center gap-2 rounded-full bg-[var(--canvas)] ring-1 ring-[var(--accent-border)] px-4 py-2 max-w-full overflow-hidden">
              <span className="truncate text-[11px] font-medium text-[var(--accent-text)]">{hotelUrl.replace(/^https?:\/\//, "")}</span>
            </div>

            <div className="mt-4 flex gap-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-2 w-2 rounded-full bg-[var(--accent-muted)]" />
              ))}
            </div>
            <p className="mt-2 text-[10px] text-[var(--accent-text)] font-semibold">Powered by HimaVolt</p>
          </div>
        </motion.div>

        {/* Actions & info */}
        <div className="space-y-4">
          <div className="rounded-2xl bg-[var(--canvas)] ring-1 ring-[var(--border)] p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-[var(--accent)]" />
              <h3 className="text-[14px] font-bold text-[var(--text-1)]">What guests see</h3>
            </div>
            {[
              "All rooms with photos, bed types, amenities",
              "Real-time availability for selected dates",
              "Price per night with advance payment info",
              "One-tap booking with eSewa / Khalti / Cash",
              "Instant booking confirmation page",
            ].map((item) => (
              <div key={item} className="flex items-start gap-2">
                <div className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-[var(--accent-muted)] flex items-center justify-center">
                  <Check className="h-2.5 w-2.5 text-[var(--accent-text)]" />
                </div>
                <p className="text-[12px] text-[var(--text-2)]">{item}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2.5">
            <button
              onClick={handleDownload}
              disabled={!slug}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] py-3.5 text-[13px] font-bold text-white shadow-sm hover:from-[var(--accent)] hover:to-[var(--accent-hover)] active:scale-[0.98] transition-all disabled:opacity-50"
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
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--canvas)] ring-1 ring-[var(--border)] py-3.5 text-[13px] font-bold text-[var(--text-2)] hover:bg-[var(--canvas-sub)] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {copied ? (
                <><Check className="h-4 w-4 text-[var(--accent-hover)]" /> Link Copied!</>
              ) : (
                <><Copy className="h-4 w-4" /> Copy Hotel Link</>
              )}
            </button>

            <a
              href={hotelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--status-info-bg)] ring-1 ring-[var(--status-info-border)] py-3.5 text-[13px] font-bold text-[var(--status-info-text)] hover:brightness-110 active:scale-[0.98] transition-all"
            >
              <ExternalLink className="h-4 w-4" />
              Preview Guest Page
            </a>
          </div>

          <div className="rounded-2xl bg-[var(--canvas-sub)] ring-1 ring-[var(--border)] p-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-3)] mb-1.5">Direct Link</p>
            <div className="flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5 text-[var(--text-3)] shrink-0" />
              <p className="text-[12px] font-medium text-[var(--text-2)] break-all">{hotelUrl}</p>
            </div>
            <p className="mt-2 text-[11px] text-[var(--text-3)]">
              Share this link via WhatsApp, SMS, or print the QR card for your front desk.
            </p>
          </div>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

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
