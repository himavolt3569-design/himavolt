"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import QRCode from "react-qr-code";
import { Download, Printer, Share2, Check, Palette, TableProperties } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { useRestaurant } from "@/context/RestaurantContext";
import { STYLES, buildQRCanvas, type CardStyle } from "@/components/dashboard/qr/qrCanvas";
import gsap from "gsap";


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


function QRCard({
  tableNo,
  qrToken,
  label,
  slug,
  restaurantName,
  cardStyle,
}: {
  tableNo: number;
  qrToken?: string | null;
  label: string | null;
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

  const displayName = label?.trim() || `Table ${tableNo}`;
  // Encode the unguessable QR token so the table can't be spoofed via the URL.
  const tableUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/menu/${slug}?${qrToken ? `t=${qrToken}` : `table=${tableNo}`}`;

  const handleShare = useCallback(
    (e: React.MouseEvent) => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setConfettiOrigin({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
      setConfetti(true);
      showToast(`${displayName} link copied!`);
      if (shareRef.current) {
        gsap.fromTo(shareRef.current, { scale: 1 }, { scale: 1.25, yoyo: true, repeat: 1, duration: 0.15, ease: "power1.inOut" });
      }
      navigator.clipboard.writeText(tableUrl);
      setTimeout(() => setConfetti(false), 800);
    },
    [displayName, tableUrl, showToast],
  );

  const handleDownload = async () => {
    if (!qrRef.current) return;
    try {
      const canvas = await buildQRCanvas(qrRef.current, tableNo, restaurantName, slug, cardStyle, 3, label);
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `${slug}-table-${tableNo}-qr.png`;
      link.click();
      showToast(`QR for ${displayName} downloaded!`);
      if (downloadRef.current) {
        gsap.fromTo(downloadRef.current, { scale: 1.2, color: "#eaa94d" }, { scale: 1, color: "", duration: 0.3, ease: "back.out(2)" });
      }
    } catch (error) {
      console.error(error);
      showToast(`Failed to download QR code for ${displayName}`);
    }
  };

  const handlePrint = async () => {
    if (!qrRef.current) return;
    try {
      showToast(`Preparing print for ${displayName}...`);
      const canvas = await buildQRCanvas(qrRef.current, tableNo, restaurantName, slug, cardStyle, 4, label);
      const image = canvas.toDataURL("image/png");
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>${displayName} QR Code</title>
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
      showToast(`Failed to print QR code for ${displayName}`);
    }
  };

  return (
    <>
      <ConfettiBurst active={confetti} origin={confettiOrigin} />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="group relative flex flex-col items-center rounded-3xl border border-[var(--border-soft)]/60 bg-[var(--canvas)]/80 backdrop-blur-md p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)] transition-all hover:-translate-y-1"
      >
        <div ref={qrRef} id={`qr-printable-${tableNo}`} className="w-full flex flex-col items-center bg-[var(--canvas)] pb-4 rounded-xl">
          <div className="mb-4 flex w-full items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--text-1)]/10 text-xs font-bold text-[var(--text-1)]">
                {tableNo}
              </span>
              <span className="truncate text-sm font-bold text-[var(--text-1)]" title={displayName}>{displayName}</span>
            </div>
            <span className="shrink-0 rounded-full bg-[var(--accent-muted)] px-2 py-0.5 text-[10px] font-bold text-[var(--accent-text)]">Active</span>
          </div>

          <div className="relative w-[180px] h-[180px] max-w-full flex items-center justify-center rounded-xl bg-[var(--canvas)] p-4 mb-4 border border-[var(--border-soft)] shadow-sm">
            <QRCode value={tableUrl} size={256} style={{ height: "100%", maxWidth: "100%", width: "100%" }} fgColor="#3e1e0c" bgColor="transparent" level="M" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="rounded-sm bg-[var(--canvas)] flex items-center justify-center border border-[var(--border-soft)] px-1.5 py-1 shadow-sm">
                <span className="text-[9px] font-black text-[var(--accent)] leading-none">
                  {restaurantName.split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 3)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex w-full gap-2 mt-auto">
          <button
            ref={downloadRef}
            onClick={handleDownload}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[var(--text-1)] py-2.5 text-xs font-bold text-white hover:bg-[#2d1508] transition-all active:scale-[0.97]"
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </button>
          <button
            onClick={handlePrint}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--surface)] text-[var(--text-2)] hover:bg-[var(--surface-alt)] transition-colors"
            title="Print"
          >
            <Printer className="h-3.5 w-3.5" />
          </button>
          <button
            ref={shareRef}
            onClick={handleShare}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-muted)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-all"
            title="Copy link"
          >
            <Share2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </motion.div>
    </>
  );
}


interface TableRecord {
  id: string;
  tableNo: number;
  qrToken?: string | null;
  label: string | null;
  capacity: number;
  isActive: boolean;
}

export default function QRCodesTab() {
  const { showToast } = useToast();
  const { selectedRestaurant, restaurants } = useRestaurant();
  const restaurant = selectedRestaurant ?? restaurants[0];
  const restaurantName = restaurant?.name ?? "HimaVolt";
  const [downloading, setDownloading] = useState(false);
  const [cardStyle, setCardStyle] = useState<CardStyle>("classic");
  const [tables, setTables] = useState<TableRecord[]>([]);
  const [loadingTables, setLoadingTables] = useState(true);

  // Fetch actual table records instead of relying on tableCount
  useEffect(() => {
    if (!restaurant?.id) return;
    setLoadingTables(true);
    fetch(`/api/restaurants/${restaurant.id}/tables`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        const tableList: TableRecord[] = data.tables ?? (Array.isArray(data) ? data : []);
        setTables(tableList.filter((t) => t.isActive).sort((a, b) => a.tableNo - b.tableNo));
      })
      .catch(() => setTables([]))
      .finally(() => setLoadingTables(false));
  }, [restaurant?.id]);

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
      const cardH = cardW * (480 / 340);
      const rowSpacing = 8;
      const rowsPerPage = Math.floor((pageH - margin * 2) / (cardH + rowSpacing));

      let col = 0;
      let row = 0;

      for (let i = 0; i < tables.length; i++) {
        const tableNo = tables[i].tableNo;
        const el = document.getElementById(`qr-printable-${tableNo}`);
        if (!el) continue;

        if (i > 0 && row >= rowsPerPage) {
          pdf.addPage();
          col = 0;
          row = 0;
        }

        const canvas = await buildQRCanvas(el, tableNo, restaurantName, restaurant?.slug ?? "", cardStyle, 2, tables[i].label);
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
      showToast(`All ${tables.length} QR codes downloaded as PDF!`);
    } catch (error) {
      console.error(error);
      showToast("Failed to generate PDF");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-[var(--text-1)]">QR Codes</h2>
          <p className="text-sm font-medium text-[var(--text-2)] mt-1.5">Unlimited smart QR codes to scan to order instantly.</p>
        </div>
        <button
          onClick={handleDownloadAll}
          disabled={downloading}
          className={`flex items-center gap-2 rounded-xl px-6 py-3 text-[13px] font-bold transition-all ${
            downloading
              ? "bg-[var(--surface)] text-[var(--text-3)] cursor-not-allowed"
              : "bg-[var(--text-1)] text-white hover:bg-[var(--text-2)] shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.97]"
          }`}
        >
          {downloading ? (
            <>
              <div className="h-4 w-4 rounded-full border-2 border-[var(--border)] border-t-gray-500 animate-spin" />
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

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 flex items-start gap-3 rounded-2xl bg-[var(--accent-muted)] backdrop-blur-sm border border-[var(--accent-border)]/50 px-5 py-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)]">
          <Check className="h-5 w-5 text-[var(--accent-text)] mt-0.5 shrink-0" />
          <p className="text-sm font-medium text-[var(--accent-text)]/80 leading-relaxed">
            Each QR links to your menu with the table pre-selected. Customers scan and order instantly — <strong className="font-bold text-[var(--accent-text)]">no app needed.</strong>
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-[var(--canvas)]/70 backdrop-blur-md border border-[var(--border-soft)]/50 px-4 py-3 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] shrink-0">
          <Palette className="h-5 w-5 text-[var(--accent)]" />
          <span className="text-xs font-bold uppercase tracking-wide text-[var(--text-2)]">Style</span>
          <div className="flex gap-1.5 p-1 bg-[var(--surface)] rounded-xl border border-black/5">
            {(Object.keys(STYLES) as CardStyle[]).map((s) => (
              <button
                key={s}
                onClick={() => setCardStyle(s)}
                className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all ${
                  cardStyle === s
                    ? "bg-[var(--canvas)] text-[var(--text-1)] shadow-sm border border-[var(--border)]/50"
                    : "text-[var(--text-2)] hover:text-[var(--text-2)] hover:bg-[var(--canvas)]/50"
                }`}
              >
                {STYLES[s].label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-[var(--canvas)] border border-[var(--border)] px-3 py-2 shadow-sm shrink-0">
          <TableProperties className="h-4 w-4 text-[var(--accent)]" />
          <span className="text-xs font-bold text-[var(--text-2)]">
            {loadingTables ? "Loading..." : `${tables.length} table${tables.length !== 1 ? "s" : ""}`}
          </span>
          <span className="text-[10px] text-[var(--text-3)]">· manage in Tables tab</span>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-[var(--text-3)]">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--text-1)]" />
        <span>
          <span className="font-semibold text-[var(--text-1)]">{STYLES[cardStyle].label}</span> style selected — this affects how downloaded &amp; printed cards look.
        </span>
      </div>

      {!loadingTables && tables.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <TableProperties className="h-10 w-10 text-[var(--text-3)]" />
          <p className="text-sm font-semibold text-[var(--text-2)]">No tables configured</p>
          <p className="text-xs text-[var(--text-3)]">Add tables in the <strong>Tables</strong> tab and QR codes will appear here automatically.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {tables.map((t) => (
            <QRCard
              key={t.id}
              tableNo={t.tableNo}
              qrToken={t.qrToken}
              label={t.label}
              slug={restaurant?.slug ?? ""}
              restaurantName={restaurantName}
              cardStyle={cardStyle}
            />
          ))}
        </div>
      )}
    </div>
  );
}
