"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import QRCode from "react-qr-code";
import { Download, Printer, Share2, Check, Plus, Minus, Infinity, Palette } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { useRestaurant } from "@/context/RestaurantContext";
import gsap from "gsap";

// ─── Card style definitions ───────────────────────────────────────────────────

export type CardStyle = "classic" | "modern" | "minimal";

interface StyleConfig {
  label: string;
  bg: string;
  headerBg: string;
  headerText: string;
  accent: string;
  qrFg: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  cornerAccent: boolean;
  roundedHeader: boolean;
}

const STYLES: Record<CardStyle, StyleConfig> = {
  classic: {
    label: "Classic",
    bg: "#FFFDF7",
    headerBg: "#3e1e0c",
    headerText: "#FFFFFF",
    accent: "#eaa94d",
    qrFg: "#3e1e0c",
    textPrimary: "#3e1e0c",
    textSecondary: "#5a7a72",
    border: "#3e1e0c",
    cornerAccent: true,
    roundedHeader: false,
  },
  modern: {
    label: "Modern",
    bg: "#111827",
    headerBg: "#eaa94d",
    headerText: "#111827",
    accent: "#eaa94d",
    qrFg: "#F9FAFB",
    textPrimary: "#F9FAFB",
    textSecondary: "#9CA3AF",
    border: "#374151",
    cornerAccent: false,
    roundedHeader: true,
  },
  minimal: {
    label: "Minimal",
    bg: "#FFFFFF",
    headerBg: "#FFFFFF",
    headerText: "#111827",
    accent: "#111827",
    qrFg: "#111827",
    textPrimary: "#111827",
    textSecondary: "#6B7280",
    border: "#E5E7EB",
    cornerAccent: false,
    roundedHeader: false,
  },
};

// ─── buildQRCanvas ────────────────────────────────────────────────────────────
// Produces a beautifully branded print card using only Canvas 2D API.
// No html2canvas → no CSS color parsing → no lab() errors.

async function buildQRCanvas(
  container: HTMLElement,
  tableNo: number,
  restaurantName: string,
  slug: string,
  style: CardStyle,
  scale = 3,
): Promise<HTMLCanvasElement> {
  const svg = container.querySelector("svg");
  if (!svg) throw new Error("SVG not found");

  const cfg = STYLES[style];

  // Card dimensions (logical px before scale)
  const W = 340;
  const H = 480;
  const cW = W * scale;
  const cH = H * scale;

  const qrSize = 170;
  const qrX = (W - qrSize) / 2;
  const qrY = 120;

  // Load QR SVG as image
  const cloned = svg.cloneNode(true) as SVGElement;
  cloned.setAttribute("width", String(qrSize));
  cloned.setAttribute("height", String(qrSize));
  // Replace QR foreground color to match style
  cloned.querySelectorAll("path, rect").forEach((el) => {
    const fill = el.getAttribute("fill");
    if (fill && fill !== "none" && fill !== "transparent" && fill !== "#ffffff" && fill !== "white") {
      el.setAttribute("fill", cfg.qrFg);
    }
  });

  const qrBlobUrl = URL.createObjectURL(
    new Blob([new XMLSerializer().serializeToString(cloned)], {
      type: "image/svg+xml;charset=utf-8",
    }),
  );

  const qrImg = await new Promise<HTMLImageElement>((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = qrBlobUrl;
  });
  URL.revokeObjectURL(qrBlobUrl);

  // Build canvas
  const canvas = document.createElement("canvas");
  canvas.width = cW;
  canvas.height = cH;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);

  // ── Background ──────────────────────────────
  if (style === "modern") {
    // Dark gradient background
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#1a2537");
    grad.addColorStop(1, "#0d1117");
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = cfg.bg;
  }
  ctx.fillRect(0, 0, W, H);

  // ── Outer border ────────────────────────────
  if (style === "classic" || style === "minimal") {
    ctx.strokeStyle = cfg.border;
    ctx.lineWidth = style === "classic" ? 2.5 : 1;
    const bInset = style === "classic" ? 5 : 0;
    ctx.strokeRect(bInset, bInset, W - bInset * 2, H - bInset * 2);
  }

  // ── Corner accents (classic only) ───────────
  if (cfg.cornerAccent) {
    const cornerLen = 18;
    const cornerInset = 10;
    ctx.strokeStyle = cfg.accent;
    ctx.lineWidth = 3;
    const corners = [
      // top-left
      [[cornerInset, cornerInset + cornerLen], [cornerInset, cornerInset], [cornerInset + cornerLen, cornerInset]],
      // top-right
      [[W - cornerInset - cornerLen, cornerInset], [W - cornerInset, cornerInset], [W - cornerInset, cornerInset + cornerLen]],
      // bottom-left
      [[cornerInset, H - cornerInset - cornerLen], [cornerInset, H - cornerInset], [cornerInset + cornerLen, H - cornerInset]],
      // bottom-right
      [[W - cornerInset - cornerLen, H - cornerInset], [W - cornerInset, H - cornerInset], [W - cornerInset, H - cornerInset - cornerLen]],
    ] as [number, number][][];
    for (const pts of corners) {
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      ctx.lineTo(pts[1][0], pts[1][1]);
      ctx.lineTo(pts[2][0], pts[2][1]);
      ctx.stroke();
    }
  }

  // ── Header block ────────────────────────────
  const headerH = 72;
  if (cfg.roundedHeader) {
    // Pill-style header for Modern
    const r = 14;
    const hx = 16, hy = 16, hw = W - 32, hh = headerH - 8;
    ctx.fillStyle = cfg.headerBg;
    ctx.beginPath();
    ctx.moveTo(hx + r, hy);
    ctx.lineTo(hx + hw - r, hy);
    ctx.arcTo(hx + hw, hy, hx + hw, hy + r, r);
    ctx.lineTo(hx + hw, hy + hh - r);
    ctx.arcTo(hx + hw, hy + hh, hx + hw - r, hy + hh, r);
    ctx.lineTo(hx + r, hy + hh);
    ctx.arcTo(hx, hy + hh, hx, hy + hh - r, r);
    ctx.lineTo(hx, hy + r);
    ctx.arcTo(hx, hy, hx + r, hy, r);
    ctx.closePath();
    ctx.fill();
  } else if (style === "classic") {
    ctx.fillStyle = cfg.headerBg;
    ctx.fillRect(5, 5, W - 10, headerH);
  }
  // Minimal has no header block — just text

  // ── Restaurant name in header ────────────────
  ctx.textAlign = "center";
  ctx.fillStyle = style === "minimal" ? cfg.textSecondary : cfg.headerText;
  ctx.font = `bold ${style === "minimal" ? 11 : 12}px sans-serif`;
  const nameY = style === "modern" ? 54 : style === "minimal" ? 28 : 34;
  ctx.fillText(restaurantName.toUpperCase(), W / 2, nameY);

  // Restaurant initials badge in header
  if (style !== "minimal") {
    const initials = restaurantName.split(/\s+/).map(w => w[0]).join("").toUpperCase().slice(0, 3);
    const badgeW = Math.max(24, initials.length * 9 + 10);
    const badgeX = W / 2 - badgeW / 2;
    const badgeY = (style === "modern" ? 22 : 10);
    const br = 3;
    ctx.fillStyle = cfg.accent;
    ctx.beginPath();
    ctx.moveTo(badgeX + br, badgeY);
    ctx.lineTo(badgeX + badgeW - br, badgeY);
    ctx.arcTo(badgeX + badgeW, badgeY, badgeX + badgeW, badgeY + br, br);
    ctx.lineTo(badgeX + badgeW, badgeY + 14 - br);
    ctx.arcTo(badgeX + badgeW, badgeY + 14, badgeX + badgeW - br, badgeY + 14, br);
    ctx.lineTo(badgeX + br, badgeY + 14);
    ctx.arcTo(badgeX, badgeY + 14, badgeX, badgeY + 14 - br, br);
    ctx.lineTo(badgeX, badgeY + br);
    ctx.arcTo(badgeX, badgeY, badgeX + br, badgeY, br);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = style === "modern" ? "#111827" : "#ffffff";
    ctx.font = `bold 8px sans-serif`;
    ctx.fillText(initials, W / 2, badgeY + 10);
  }

  // ── Separator line ───────────────────────────
  if (style === "classic") {
    ctx.strokeStyle = cfg.accent;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(30, headerH + 5 + 5);
    ctx.lineTo(W - 30, headerH + 5 + 5);
    ctx.stroke();
  }

  // ── "TABLE" label ────────────────────────────
  const tableLabelY = style === "minimal" ? 50 : style === "modern" ? 115 : 100;
  ctx.fillStyle = cfg.textSecondary;
  ctx.font = `600 10px sans-serif`;
  ctx.textAlign = "center";
  ctx.letterSpacing = "3px";
  ctx.fillText("TABLE", W / 2, tableLabelY);
  ctx.letterSpacing = "0px";

  // ── Big table number ─────────────────────────
  ctx.fillStyle = style === "modern" ? cfg.accent : cfg.textPrimary;
  ctx.font = `900 56px sans-serif`;
  ctx.fillText(String(tableNo), W / 2, tableLabelY + 60);

  // ── QR code ──────────────────────────────────
  // Draw background behind QR for contrast
  if (style === "modern") {
    const bx = qrX - 10, by = qrY - 10, bw = qrSize + 20, bh = qrSize + 20, br = 12;
    ctx.fillStyle = "#1a2537";
    ctx.beginPath();
    ctx.moveTo(bx + br, by);
    ctx.lineTo(bx + bw - br, by);
    ctx.arcTo(bx + bw, by, bx + bw, by + br, br);
    ctx.lineTo(bx + bw, by + bh - br);
    ctx.arcTo(bx + bw, by + bh, bx + bw - br, by + bh, br);
    ctx.lineTo(bx + br, by + bh);
    ctx.arcTo(bx, by + bh, bx, by + bh - br, br);
    ctx.lineTo(bx, by + br);
    ctx.arcTo(bx, by, bx + br, by, br);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillStyle = cfg.bg;
    ctx.fillRect(qrX - 6, qrY - 6, qrSize + 12, qrSize + 12);
  }
  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

  // ── Scan to order text ───────────────────────
  ctx.fillStyle = style === "modern" ? cfg.accent : cfg.textPrimary;
  ctx.font = `bold 13px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("Scan to Order", W / 2, qrY + qrSize + 28);

  ctx.fillStyle = cfg.textSecondary;
  ctx.font = `11px sans-serif`;
  ctx.fillText("No app needed — just scan & order!", W / 2, qrY + qrSize + 46);

  // ── Powered by line at bottom ────────────────
  ctx.fillStyle = cfg.textSecondary;
  ctx.font = `9px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("Powered by HimaVolt", W / 2, H - 20);

  // ── Bottom accent bar (Classic / Modern) ─────
  if (style === "classic") {
    ctx.fillStyle = cfg.accent;
    ctx.fillRect(5, H - 9, W - 10, 4);
  } else if (style === "modern") {
    ctx.fillStyle = cfg.accent;
    ctx.fillRect(W / 2 - 30, H - 12, 60, 3);
  }

  return canvas;
}

// ─── ConfettiBurst ────────────────────────────────────────────────────────────

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  angle: number;
  speed: number;
}

function ConfettiBurst({ active, origin }: { active: boolean; origin: { x: number; y: number } }) {
  const COLORS = ["#eaa94d", "#3e1e0c", "#4ECDC4", "#FFE66D", "#6C63FF", "#34d399"];
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
              animate={{ x: p.x + dx, y: p.y + dy, opacity: 0, scale: 0, rotate: Math.random() * 360 }}
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

// ─── QRCard ───────────────────────────────────────────────────────────────────

function QRCard({
  tableNo,
  slug,
  restaurantName,
  cardStyle,
}: {
  tableNo: number;
  slug: string;
  restaurantName: string;
  cardStyle: CardStyle;
}) {
  const { showToast } = useToast();
  const [confetti, setConfetti] = useState(false);
  const [confettiOrigin, setConfettiOrigin] = useState({ x: 0, y: 0 });
  const shareRef = useRef<HTMLButtonElement>(null);
  const downloadRef = useRef<HTMLButtonElement>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  const tableUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/menu/${slug}?table=${tableNo}`;

  const handleShare = useCallback(
    (e: React.MouseEvent) => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setConfettiOrigin({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
      setConfetti(true);
      showToast(`Table ${tableNo} link copied!`);
      if (shareRef.current) {
        gsap.fromTo(shareRef.current, { scale: 1 }, { scale: 1.25, yoyo: true, repeat: 1, duration: 0.15, ease: "power1.inOut" });
      }
      navigator.clipboard.writeText(tableUrl);
      setTimeout(() => setConfetti(false), 800);
    },
    [tableNo, tableUrl, showToast],
  );

  const handleDownload = async () => {
    if (!qrRef.current) return;
    try {
      const canvas = await buildQRCanvas(qrRef.current, tableNo, restaurantName, slug, cardStyle, 3);
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `${slug}-table-${tableNo}-qr.png`;
      link.click();
      showToast(`QR for Table ${tableNo} downloaded!`);
      if (downloadRef.current) {
        gsap.fromTo(downloadRef.current, { scale: 1.2, color: "#eaa94d" }, { scale: 1, color: "", duration: 0.3, ease: "back.out(2)" });
      }
    } catch (error) {
      console.error(error);
      showToast(`Failed to download QR code for Table ${tableNo}`);
    }
  };

  const handlePrint = async () => {
    if (!qrRef.current) return;
    try {
      showToast(`Preparing print for Table ${tableNo}...`);
      const canvas = await buildQRCanvas(qrRef.current, tableNo, restaurantName, slug, cardStyle, 4);
      const image = canvas.toDataURL("image/png");
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Table ${tableNo} QR Code</title>
              <style>
                @media print { @page { margin: 0; } body { margin: 0; } }
                body { margin:0; display:flex; align-items:center; justify-content:center; min-height:100vh; background:#f9fafb; }
                img { width: 340px; height: auto; box-shadow: 0 4px 24px rgba(0,0,0,0.12); }
              </style>
            </head>
            <body>
              <img src="${image}" onload="window.print();" />
            </body>
          </html>`);
        printWindow.document.close();
      }
    } catch (error) {
      console.error(error);
      showToast(`Failed to print QR code for Table ${tableNo}`);
    }
  };

  return (
    <>
      <ConfettiBurst active={confetti} origin={confettiOrigin} />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="group relative flex flex-col items-center rounded-3xl border border-gray-100/60 bg-white/80 backdrop-blur-md p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)] transition-all hover:-translate-y-1"
      >
        {/* Printable content captured by buildQRCanvas */}
        <div ref={qrRef} id={`qr-printable-${tableNo}`} className="w-full flex flex-col items-center bg-white pb-4 rounded-xl">
          <div className="mb-4 flex w-full items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#3e1e0c]/10 text-xs font-bold text-[#3e1e0c]">
                {tableNo}
              </span>
              <span className="text-sm font-bold text-[#3e1e0c]">Table {tableNo}</span>
            </div>
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-600">Active</span>
          </div>

          <div className="relative rounded-xl bg-gray-50 p-4 mb-4 border border-gray-100">
            <QRCode value={tableUrl} size={120} fgColor="#3e1e0c" bgColor="transparent" level="M" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="rounded-sm bg-white flex items-center justify-center border border-gray-100 px-1 py-0.5">
                <span className="text-[7px] font-black text-[#eaa94d] leading-none">
                  {restaurantName.split(/\s+/).map(w => w[0]).join("").toUpperCase().slice(0, 3)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex w-full gap-2 mt-auto">
          <button
            ref={downloadRef}
            onClick={handleDownload}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#3e1e0c] py-2.5 text-xs font-bold text-white hover:bg-[#2d1508] transition-all active:scale-[0.97]"
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </button>
          <button
            onClick={handlePrint}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
            title="Print"
          >
            <Printer className="h-3.5 w-3.5" />
          </button>
          <button
            ref={shareRef}
            onClick={handleShare}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eaa94d]/10 text-[#eaa94d] hover:bg-[#eaa94d] hover:text-white transition-all"
            title="Copy link"
          >
            <Share2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </motion.div>
    </>
  );
}

// ─── QRCodesTab ───────────────────────────────────────────────────────────────

export default function QRCodesTab() {
  const { showToast } = useToast();
  const { selectedRestaurant, restaurants, updateRestaurant } = useRestaurant();
  const restaurant = selectedRestaurant ?? restaurants[0];
  const tableCount = restaurant?.tableCount ?? 12;
  const restaurantName = restaurant?.name ?? "HimaVolt";
  const [downloading, setDownloading] = useState(false);
  const [cardStyle, setCardStyle] = useState<CardStyle>("classic");

  const tables = Array.from({ length: tableCount }, (_, i) => i + 1);

  const handleDownloadAll = async () => {
    setDownloading(true);
    try {
      const { jsPDF } = await import("jspdf");

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      const margin = 12;
      const cols = 2;
      const colSpacing = 8;
      const contentW = pageW - margin * 2;
      const cardW = (contentW - colSpacing) / cols;
      // Card aspect ratio matches buildQRCanvas: W=340, H=480 → H/W ≈ 1.41
      const cardH = cardW * (480 / 340);
      const rowSpacing = 8;
      const rowsPerPage = Math.floor((pageH - margin * 2) / (cardH + rowSpacing));

      let col = 0;
      let row = 0;

      for (let i = 0; i < tables.length; i++) {
        const tableNo = tables[i];
        const el = document.getElementById(`qr-printable-${tableNo}`);
        if (!el) continue;

        if (i > 0 && row >= rowsPerPage) {
          pdf.addPage();
          col = 0;
          row = 0;
        }

        const canvas = await buildQRCanvas(el, tableNo, restaurantName, restaurant?.slug ?? "", cardStyle, 2);
        const imgData = canvas.toDataURL("image/png");
        const x = margin + col * (cardW + colSpacing);
        const y = margin + row * (cardH + rowSpacing);
        pdf.addImage(imgData, "PNG", x, y, cardW, cardH);

        col++;
        if (col >= cols) {
          col = 0;
          row++;
        }
      }

      pdf.save(`${restaurant?.slug ?? "restaurant"}-qrcodes.pdf`);
      showToast(`All ${tableCount} QR codes downloaded as PDF!`);
    } catch (error) {
      console.error(error);
      showToast("Failed to generate PDF");
    } finally {
      setDownloading(false);
    }
  };

  const adjustTables = async (delta: number) => {
    if (!restaurant) return;
    await updateRestaurant(restaurant.id, { tableCount: tableCount + delta });
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-gray-900">QR Codes</h2>
          <p className="text-sm font-medium text-gray-500 mt-1.5">Unlimited smart QR codes to scan to order instantly.</p>
        </div>
        <button
          onClick={handleDownloadAll}
          disabled={downloading}
          className={`flex items-center gap-2 rounded-xl px-6 py-3 text-[13px] font-bold transition-all ${
            downloading
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-gray-900 text-white hover:bg-gray-800 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.97]"
          }`}
        >
          {downloading ? (
            <>
              <div className="h-4 w-4 rounded-full border-2 border-gray-300 border-t-gray-500 animate-spin" />
              Generating PDF...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Download All QRs
            </>
          )}
        </button>
      </div>

      {/* Controls row */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Info banner */}
        <div className="flex-1 flex items-start gap-3 rounded-2xl bg-amber-50/80 backdrop-blur-sm border border-amber-100/50 px-5 py-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)]">
          <Check className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm font-medium text-amber-900/80 leading-relaxed">
            Each QR links to your menu with the table number pre-selected. Customers scan and order instantly — <strong className="font-bold text-amber-900">no app needed.</strong>
          </p>
        </div>

        {/* Style picker */}
        <div className="flex items-center gap-3 rounded-2xl bg-white/70 backdrop-blur-md border border-gray-100/50 px-4 py-3 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] shrink-0">
          <Palette className="h-5 w-5 text-amber-500" />
          <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Style</span>
          <div className="flex gap-1.5 p-1 bg-gray-100/50 rounded-xl border border-black/5">
            {(Object.keys(STYLES) as CardStyle[]).map((s) => (
              <button
                key={s}
                onClick={() => setCardStyle(s)}
                className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all ${
                  cardStyle === s
                    ? "bg-white text-gray-900 shadow-sm border border-gray-200/50"
                    : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
                }`}
              >
                {STYLES[s].label}
              </button>
            ))}
          </div>
        </div>

        {/* Table count */}
        <div className="flex items-center gap-2 rounded-xl bg-white border border-gray-200 px-3 py-2 shadow-sm shrink-0">
          <Infinity className="h-4 w-4 text-[#eaa94d]" />
          <span className="text-xs font-bold text-gray-500">Tables:</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => adjustTables(-1)}
              disabled={tableCount <= 1}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors disabled:opacity-30"
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="w-8 text-center text-sm font-extrabold text-[#3e1e0c]">{tableCount}</span>
            <button
              onClick={() => adjustTables(1)}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#3e1e0c]/10 text-[#3e1e0c] hover:bg-[#3e1e0c]/20 transition-colors"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Style preview hint */}
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#3e1e0c]" />
        <span>
          <span className="font-semibold text-[#3e1e0c]">{STYLES[cardStyle].label}</span> style selected — this affects how downloaded &amp; printed cards look.
        </span>
      </div>

      {/* QR grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {tables.map((t) => (
          <QRCard
            key={t}
            tableNo={t}
            slug={restaurant?.slug ?? ""}
            restaurantName={restaurantName}
            cardStyle={cardStyle}
          />
        ))}
      </div>
    </div>
  );
}
