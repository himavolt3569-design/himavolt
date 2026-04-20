"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  QrCode,
  Download,
  BedDouble,
  Loader2,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import QRCode from "react-qr-code";
import { useRestaurant } from "@/context/RestaurantContext";
import { apiFetch } from "@/lib/api-client";
import { formatPrice } from "@/lib/currency";

const APP_URL =
  typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL || "";

interface Room {
  id: string;
  roomNumber: string;
  name: string;
  type: string;
  floor: number;
  price: number;
  bedType: string | null;
  bedCount: number;
  imageUrls: string[];
  isAvailable: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  STANDARD: "bg-[var(--surface)] text-[var(--text-2)]",
  DELUXE: "bg-[var(--accent-muted)] text-[var(--accent-text)]",
  SUITE: "bg-[var(--accent-muted)] text-[var(--accent-text)] ring-1 ring-[var(--accent-border)]",
  DORMITORY: "bg-[var(--accent-muted)] text-[var(--accent-text)]",
};

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

function RoomQRCard({
  room,
  hotelName,
  slug,
  currency,
}: {
  room: Room;
  hotelName: string;
  slug: string;
  currency: string;
}) {
  const [downloaded, setDownloaded] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const roomUrl = `${APP_URL}/hotel/${slug}?room=${room.id}`;
  const roomLabel = room.name || `Room ${room.roomNumber}`;

  const handleDownload = async () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    const CARD_W = 360;
    const CARD_H = 480;
    canvas.width = CARD_W;
    canvas.height = CARD_H;

    ctx.fillStyle = "#FFFBF0";
    roundRect(ctx, 0, 0, CARD_W, CARD_H, 20);
    ctx.fill();

    // Header gradient
    const grad = ctx.createLinearGradient(0, 0, CARD_W, 0);
    grad.addColorStop(0, "#f59e0b");
    grad.addColorStop(1, "#ea580c");
    ctx.fillStyle = grad;
    roundRect(ctx, 0, 0, CARD_W, 64, { tl: 20, tr: 20, bl: 0, br: 0 });
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 14px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(hotelName, CARD_W / 2, 24);

    ctx.font = "bold 18px system-ui, sans-serif";
    ctx.fillText(roomLabel, CARD_W / 2, 46);

    ctx.font = "11px system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fillText(`Room #${room.roomNumber} · Floor ${room.floor} · ${room.type}`, CARD_W / 2, 60);

    // QR
    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgData);
    });
    const QR_SIZE = 190;
    const qrX = (CARD_W - QR_SIZE) / 2;
    ctx.fillStyle = "#ffffff";
    roundRect(ctx, qrX - 14, 76, QR_SIZE + 28, QR_SIZE + 28, 14);
    ctx.fill();
    ctx.drawImage(img, qrX, 90, QR_SIZE, QR_SIZE);

    // Room details
    ctx.fillStyle = "#92400e";
    ctx.font = "bold 11px system-ui, sans-serif";
    ctx.textAlign = "center";
    const details: string[] = [];
    if (room.bedType) details.push(`${room.bedCount > 1 ? `${room.bedCount}x ` : ""}${room.bedType}`);
    details.push(`Up to guests`);
    if (details.length) ctx.fillText(details.join(" · "), CARD_W / 2, 336);
    ctx.fillText(formatPrice(room.price, currency) + "/night", CARD_W / 2, 354);

    ctx.strokeStyle = "#fde68a";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(36, 370);
    ctx.lineTo(CARD_W - 36, 370);
    ctx.stroke();

    ctx.fillStyle = "#d97706";
    ctx.font = "bold 10px system-ui, sans-serif";
    ctx.fillText("Powered by HimaVolt", CARD_W / 2, 390);
    ctx.fillStyle = "#a16207";
    ctx.font = "10px system-ui, sans-serif";
    ctx.fillText("Scan to book this room online", CARD_W / 2, 406);

    const link = document.createElement("a");
    link.download = `room-${room.roomNumber}-qr.png`;
    link.href = canvas.toDataURL("image/png", 1.0);
    link.click();
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-2xl bg-[var(--canvas)] ring-1 ring-[var(--border)] shadow-sm hover:shadow-md transition-all"
    >
      {/* Room image or placeholder */}
      <div className="relative h-28 overflow-hidden bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)]">
        {room.imageUrls?.length > 0 ? (
          <img src={room.imageUrls[0]} alt={roomLabel} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <BedDouble className="h-10 w-10 text-[var(--accent)]" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="absolute bottom-2 left-3 flex gap-1.5">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${TYPE_COLORS[room.type] || "bg-[var(--surface)] text-[var(--text-2)]"}`}>
            {room.type}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${room.isAvailable ? "bg-[var(--accent-muted)] text-[var(--accent-text)]" : "bg-[var(--status-error-bg)] text-[var(--status-error-text)]"}`}>
            {room.isAvailable ? "Available" : "Occupied"}
          </span>
        </div>
      </div>

      <div className="p-3">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-[13px] font-bold text-[var(--text-1)]">{roomLabel}</p>
            <p className="text-[10px] text-[var(--text-3)]">#{room.roomNumber} · Floor {room.floor}</p>
          </div>
          <p className="text-[13px] font-black text-[var(--accent-text)]">{formatPrice(room.price, currency)}<span className="text-[9px] font-normal text-[var(--text-3)]">/night</span></p>
        </div>

        {/* QR Code */}
        <div ref={qrRef} className="flex justify-center py-2">
          <div className="rounded-xl bg-[var(--accent-muted)] p-2 ring-1 ring-[var(--accent-border)]">
            <QRCode value={roomUrl} size={110} level="M" />
          </div>
        </div>

        <button
          onClick={handleDownload}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] py-2 text-[12px] font-bold text-white hover:from-[var(--accent)] hover:to-[var(--accent-hover)] active:scale-[0.97] transition-all"
        >
          {downloaded ? (
            <><Check className="h-3.5 w-3.5" /> Downloaded!</>
          ) : (
            <><Download className="h-3.5 w-3.5" /> Download QR</>
          )}
        </button>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </motion.div>
  );
}

export default function RoomQRTab() {
  const { selectedRestaurant, restaurants } = useRestaurant();
  const restaurant = selectedRestaurant ?? restaurants[0];
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const PER_PAGE = 6;

  const fetchRooms = useCallback(async () => {
    if (!restaurant) return;
    try {
      const data = await apiFetch<Room[]>(`/api/restaurants/${restaurant.id}/rooms`);
      setRooms(Array.isArray(data) ? data : []);
    } catch {
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, [restaurant]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  if (!restaurant) return null;

  const slug = restaurant.slug ?? "";
  const totalPages = Math.ceil(rooms.length / PER_PAGE);
  const pageRooms = rooms.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[20px] font-black text-[var(--text-1)]">Room QR Codes</h2>
        <p className="text-[12px] text-[var(--text-2)] mt-0.5">
          Each QR links directly to that room on the hotel booking page. Print and place in rooms.
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--accent)] mb-3" />
          <p className="text-sm text-[var(--text-3)]">Loading rooms...</p>
        </div>
      ) : rooms.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <BedDouble className="h-12 w-12 text-[var(--text-3)] mb-3" />
          <p className="text-[14px] font-semibold text-[var(--text-2)]">No rooms added yet</p>
          <p className="text-[12px] text-[var(--text-3)] mt-1">
            Add rooms in the Room Bookings tab to generate QR codes.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {pageRooms.map((room) => (
                <RoomQRCard
                  key={room.id}
                  room={room}
                  hotelName={restaurant.name}
                  slug={slug}
                  currency={restaurant.currency}
                />
              ))}
            </AnimatePresence>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--canvas)] ring-1 ring-[var(--border)] text-[var(--text-2)] hover:bg-[var(--canvas-sub)] disabled:opacity-40 transition-all"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-[13px] font-semibold text-[var(--text-2)]">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page === totalPages - 1}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--canvas)] ring-1 ring-[var(--border)] text-[var(--text-2)] hover:bg-[var(--canvas-sub)] disabled:opacity-40 transition-all"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
