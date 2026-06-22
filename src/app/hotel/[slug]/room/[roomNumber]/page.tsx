"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  BedDouble,
  Users,
  MapPin,
  Phone,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ArrowLeft,
  Mountain,
  Wifi,
  Tv,
  Wind,
  Bath,
  Car,
  Dumbbell,
  UtensilsCrossed,
  Shield,
  Coffee,
  Sparkles,
  CreditCard,
  CheckCircle,
  XCircle,
  Building2,
  Clock,
  Volume2,
  PlayCircle,
  ChefHat,
  ChevronDown,
  Maximize2,
  X,
} from "lucide-react";
import { formatPrice } from "@/lib/currency";

interface Room {
  id: string;
  roomNumber: string;
  name: string | null;
  type: string;
  floor: number;
  price: number;
  maxGuests: number;
  bedType: string | null;
  bedCount: number;
  description: string | null;
  amenities: string[];
  imageUrls: string[];
  videoUrl: string | null;
  isAvailable: boolean;
}

interface Hotel {
  id: string;
  name: string;
  slug: string;
  type: string;
  address: string;
  city: string;
  phone: string;
  imageUrl: string | null;
  coverUrl: string | null;
  currency: string;
  openingTime: string;
  closingTime: string;
  hotelAdvanceType: string;
  hotelAdvanceValue: number;
  wifiName: string | null;
  wifiPassword: string | null;
}

interface LiveBooking {
  until: string;
  status: string;
}

const AMENITY_ICONS: Record<string, typeof Wifi> = {
  WiFi: Wifi,
  "Wi-Fi": Wifi,
  TV: Tv,
  AC: Wind,
  "Air Conditioning": Wind,
  Bathroom: Bath,
  "Private Bathroom": Bath,
  Parking: Car,
  Gym: Dumbbell,
  Restaurant: UtensilsCrossed,
  Security: Shield,
  "24/7 Reception": Clock,
};

const TYPE_TINTS: Record<string, string> = {
  STANDARD: "bg-[var(--surface)] text-[var(--text-2)] ring-[var(--border)]",
  DELUXE: "bg-[var(--accent-muted)] text-[var(--accent-text)] ring-[var(--accent-border)]",
  SUITE:
    "bg-[var(--accent-muted)] text-[var(--accent-text)] ring-[var(--accent)] ring-2",
  DORMITORY: "bg-[var(--accent-muted)] text-[var(--accent-text)] ring-[var(--accent-border)]",
};

function ImageGallery({ images, alt }: { images: string[]; alt: string }) {
  const [idx, setIdx] = useState(0);
  const [zoom, setZoom] = useState(false);
  const multi = images.length > 1;
  const go = useCallback(
    (dir: number) =>
      setIdx((i) => (i + dir + images.length) % images.length),
    [images.length],
  );

  // Lock body scroll while the fullscreen lightbox is open + Esc to close.
  useEffect(() => {
    if (!zoom) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoom(false);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [zoom, go]);

  if (!images.length) {
    return (
      <div className="flex h-56 w-full items-center justify-center bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] sm:h-72 lg:h-96">
        <BedDouble className="h-16 w-16 text-white/60" />
      </div>
    );
  }

  const dots = multi && (
    <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
      {images.map((_, i) => (
        <span
          key={i}
          className={`h-1.5 rounded-full transition-all ${
            i === idx ? "w-5 bg-white" : "w-1.5 bg-white/60"
          }`}
        />
      ))}
    </div>
  );

  return (
    <>
      <div className="relative h-56 w-full overflow-hidden bg-black sm:h-72 lg:h-96">
        <AnimatePresence mode="wait" initial={false}>
          <motion.img
            key={idx}
            src={images[idx]}
            alt={alt}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            // Swipe on touch; tap to open fullscreen.
            drag={multi ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            onDragEnd={(_e, info) => {
              if (info.offset.x < -60) go(1);
              else if (info.offset.x > 60) go(-1);
            }}
            onClick={() => setZoom(true)}
            className="absolute inset-0 h-full w-full cursor-zoom-in object-cover"
            draggable={false}
          />
        </AnimatePresence>

        {multi && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              className="absolute left-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition-all hover:bg-black/60 sm:flex"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="absolute right-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition-all hover:bg-black/60 sm:flex"
              aria-label="Next image"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
        {dots}
        <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur">
          <Maximize2 className="h-3 w-3" />
          {idx + 1} / {images.length}
        </span>
      </div>

      {/* Fullscreen lightbox — Airbnb-style swipeable viewer */}
      <AnimatePresence>
        {zoom && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setZoom(false)}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black"
          >
            <button
              type="button"
              onClick={() => setZoom(false)}
              className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition-all hover:bg-white/25"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <AnimatePresence mode="wait" initial={false}>
              <motion.img
                key={idx}
                src={images[idx]}
                alt={alt}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                drag={multi ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={(_e, info) => {
                  if (info.offset.x < -60) go(1);
                  else if (info.offset.x > 60) go(-1);
                }}
                onClick={(e) => e.stopPropagation()}
                className="max-h-[88vh] max-w-[94vw] object-contain"
                draggable={false}
              />
            </AnimatePresence>
            {multi && (
              <>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); go(-1); }}
                  className="absolute left-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25 sm:flex"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); go(1); }}
                  className="absolute right-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25 sm:flex"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <span className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/15 px-3 py-1 text-[12px] font-bold text-white backdrop-blur">
                  {idx + 1} / {images.length}
                </span>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function AmenityChip({ label }: { label: string }) {
  const Icon = AMENITY_ICONS[label] ?? Coffee;
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-[var(--canvas-sub)] px-3 py-1.5 text-[12px] font-medium text-[var(--text-2)] ring-1 ring-[var(--border-soft)]">
      <Icon className="h-3.5 w-3.5 text-[var(--accent)]" />
      {label}
    </span>
  );
}

function StatPill({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BedDouble;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-[var(--canvas-sub)] p-3 ring-1 ring-[var(--border-soft)]">
      <div className="mb-1 flex items-center gap-1.5">
        <Icon className="h-3 w-3 text-[var(--accent)]" />
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-3)]">
          {label}
        </p>
      </div>
      <p className="text-[13px] font-bold text-[var(--text-1)]">{value}</p>
    </div>
  );
}

export default function RoomLandingPage() {
  const router = useRouter();
  const { slug, roomNumber } = useParams<{ slug: string; roomNumber: string }>();

  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [liveBooking, setLiveBooking] = useState<LiveBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoom = useCallback(async () => {
    if (!slug || !roomNumber) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/public/hotel/${slug}/room/${encodeURIComponent(roomNumber)}`,
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Room not found");
        return;
      }
      setHotel(data.hotel);
      setRoom(data.room);
      setLiveBooking(data.liveBooking ?? null);
      setError(null);
    } catch {
      setError("Failed to load room");
    } finally {
      setLoading(false);
    }
  }, [slug, roomNumber]);

  useEffect(() => {
    fetchRoom();
  }, [fetchRoom]);

  if (loading) {
    // Instant calm shell — no spinner flash while the room loads.
    return (
      <div className="min-h-screen bg-[var(--canvas-sub)] flex flex-col items-center justify-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent)] shadow-lg shadow-[var(--accent)]/30">
          <Building2 className="h-6 w-6 text-white" strokeWidth={2.5} />
        </div>
        <span className="text-[15px] font-bold text-[var(--text-1)]">
          Hima<span className="text-[var(--accent)]">Volt</span>
        </span>
      </div>
    );
  }

  if (error || !room || !hotel) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[var(--canvas-sub)] p-6 text-center">
        <Building2 className="h-12 w-12 text-[var(--text-3)]" />
        <p className="text-[15px] font-semibold text-[var(--text-2)]">
          {error || "Room not found"}
        </p>
        <Link
          href="/"
          className="text-[13px] font-bold text-[var(--accent)] hover:underline"
        >
          Back to home
        </Link>
      </div>
    );
  }

  const roomLabel = room.name || `Room ${room.roomNumber}`;
  const advanceLabel =
    hotel.hotelAdvanceType === "PERCENTAGE"
      ? `${hotel.hotelAdvanceValue}% advance`
      : `${formatPrice(hotel.hotelAdvanceValue, hotel.currency)} advance`;
  const checkOutDate = liveBooking?.until
    ? new Date(liveBooking.until)
    : null;

  return (
    <div className="min-h-screen bg-[var(--canvas-sub)] font-sans pb-32">
      {/* ── Top bar ───────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 flex items-center justify-between border-b border-[var(--border)]/50 bg-[var(--canvas)]/85 backdrop-blur-xl px-4 py-3 shadow-sm">
        <Link
          href={`/hotel/${slug}`}
          className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--text-2)] hover:text-[var(--accent-text)] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {hotel.name}
        </Link>
        <Link href="/" className="flex items-center gap-1.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent)]">
            <Mountain className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-[14px] font-bold text-[var(--text-1)]">
            Hima<span className="text-[var(--accent)]">Volt</span>
          </span>
        </Link>
      </nav>

      {/* ── Hero gallery ───────────────────────────────────────── */}
      <div className="relative">
        <ImageGallery images={room.imageUrls} alt={roomLabel} />

        {/* Type chip + status */}
        <div className="absolute left-4 top-4 flex flex-col gap-2">
          <span
            className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ring-1 ${
              TYPE_TINTS[room.type] ||
              "bg-[var(--canvas)]/90 text-[var(--text-2)] ring-[var(--border)]"
            }`}
          >
            {room.type}
          </span>
          {room.isAvailable ? (
            <span className="inline-flex w-fit items-center gap-1 rounded-full bg-[var(--accent-muted)] px-3 py-1 text-[11px] font-bold text-[var(--accent-text)] ring-1 ring-[var(--accent-border)]">
              <CheckCircle className="h-3 w-3" />
              Available
            </span>
          ) : (
            <span className="inline-flex w-fit items-center gap-1 rounded-full bg-[var(--status-error-bg)] px-3 py-1 text-[11px] font-bold text-[var(--status-error-text)] ring-1 ring-[var(--status-error-bg)]">
              <XCircle className="h-3 w-3" />
              Currently occupied
            </span>
          )}
        </div>
      </div>

      <main className="mx-auto max-w-2xl px-4 -mt-8 sm:-mt-10">
        {/* ── Title card ─────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl bg-[var(--canvas)] p-5 ring-1 ring-[var(--border-soft)] shadow-lg"
        >
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--accent)]">
            {hotel.type.replace("_", " ")}
          </p>
          <h1 className="text-[26px] font-black leading-tight text-[var(--text-1)]">
            {roomLabel}
          </h1>
          <p className="mt-0.5 text-[13px] text-[var(--text-2)]">
            #{room.roomNumber} · Floor {room.floor} · {hotel.name}
          </p>

          <div className="mt-4 flex items-end justify-between">
            <div>
              <p className="text-[28px] font-black text-[var(--accent-text)]">
                {formatPrice(room.price, hotel.currency)}
                <span className="ml-1 text-[12px] font-medium text-[var(--text-3)]">
                  / night
                </span>
              </p>
              <p className="mt-1 text-[11px] font-semibold text-[var(--text-2)]">
                {advanceLabel} to confirm · pay rest at check-in
              </p>
            </div>
          </div>
        </motion.div>

        {/* ── Live status banner ─────────────────────────────── */}
        {!room.isAvailable && checkOutDate && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex items-start gap-3 rounded-2xl bg-[var(--status-info-bg)] p-4 ring-1 ring-[var(--status-info-border)]"
          >
            <Clock className="h-5 w-5 shrink-0 text-[var(--status-info-text)]" />
            <div className="text-[12px] text-[var(--status-info-text)]">
              <p className="font-bold">Currently checked in</p>
              <p>
                Free again on{" "}
                {checkOutDate.toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}{" "}
                — you can pre-book for any later date.
              </p>
            </div>
          </motion.div>
        )}

        {/* ── Quick stats ───────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4"
        >
          <StatPill
            icon={Users}
            label="Sleeps"
            value={`${room.maxGuests} guest${room.maxGuests === 1 ? "" : "s"}`}
          />
          <StatPill
            icon={BedDouble}
            label="Bed"
            value={
              room.bedType
                ? `${room.bedCount > 1 ? `${room.bedCount}× ` : ""}${room.bedType}`
                : `${room.bedCount} bed${room.bedCount === 1 ? "" : "s"}`
            }
          />
          <StatPill icon={Building2} label="Floor" value={`Floor ${room.floor}`} />
          <StatPill icon={Sparkles} label="Type" value={room.type} />
        </motion.div>

        {/* ── Description ───────────────────────────────────── */}
        {room.description && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-5 rounded-2xl bg-[var(--canvas)] p-5 ring-1 ring-[var(--border-soft)]"
          >
            <h2 className="mb-2 text-[14px] font-bold text-[var(--text-1)]">
              About this room
            </h2>
            <p className="whitespace-pre-line text-[13px] leading-relaxed text-[var(--text-2)]">
              {room.description}
            </p>
          </motion.div>
        )}

        {/* ── Amenities ─────────────────────────────────────── */}
        {room.amenities.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="mt-5 rounded-2xl bg-[var(--canvas)] p-5 ring-1 ring-[var(--border-soft)]"
          >
            <h2 className="mb-3 text-[14px] font-bold text-[var(--text-1)]">
              In-room amenities
            </h2>
            <div className="flex flex-wrap gap-2">
              {room.amenities.map((a) => (
                <AmenityChip key={a} label={a} />
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Video tour ────────────────────────────────────── */}
        {room.videoUrl && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14 }}
            className="mt-5 overflow-hidden rounded-2xl bg-black ring-1 ring-[var(--border-soft)]"
          >
            <div className="flex items-center gap-2 bg-[var(--canvas)] px-5 py-3">
              <PlayCircle className="h-4 w-4 text-[var(--accent)]" />
              <h2 className="text-[14px] font-bold text-[var(--text-1)]">
                Room tour
              </h2>
            </div>
            <video
              src={room.videoUrl}
              controls
              playsInline
              className="aspect-video w-full"
            >
              Sorry, your browser doesn&apos;t support embedded video.
            </video>
          </motion.div>
        )}

        {/* ── In-stay services ──────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
          className="mt-5 rounded-2xl bg-[var(--canvas)] p-5 ring-1 ring-[var(--border-soft)]"
        >
          <h2 className="mb-3 text-[14px] font-bold text-[var(--text-1)]">
            Already staying here?
          </h2>
          <p className="mb-4 text-[12px] text-[var(--text-2)]">
            Order food, drinks, or call reception — all charged to your room.
          </p>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <Link
              href={`/menu/${slug}?room=${encodeURIComponent(room.roomNumber)}`}
              className="flex items-center gap-3 rounded-xl bg-[var(--accent-muted)] p-3.5 ring-1 ring-[var(--accent-border)] transition-all hover:bg-[var(--accent-muted)]/80 active:scale-[0.98]"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent)] text-white">
                <ChefHat className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-[var(--accent-text)]">
                  Order food
                </p>
                <p className="text-[11px] text-[var(--accent-text)]/80">
                  Browse the kitchen menu
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-[var(--accent-text)]" />
            </Link>
            <a
              href={`tel:${hotel.phone}`}
              className="flex items-center gap-3 rounded-xl bg-[var(--canvas-sub)] p-3.5 ring-1 ring-[var(--border)] transition-all hover:bg-[var(--surface)] active:scale-[0.98]"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--text-1)] text-white">
                <Phone className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-[var(--text-1)]">
                  Call reception
                </p>
                <p className="truncate text-[11px] text-[var(--text-3)]">
                  {hotel.phone}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-[var(--text-3)]" />
            </a>
          </div>

          {/* WiFi card if hotel has WiFi configured */}
          {hotel.wifiName && (
            <div className="mt-3 rounded-xl bg-[var(--canvas-sub)] p-3.5 ring-1 ring-[var(--border-soft)]">
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                    <Wifi className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold text-[var(--text-1)]">
                      Hotel WiFi
                    </p>
                    <p className="truncate text-[11px] text-[var(--text-3)]">
                      Tap to view network details
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-[var(--text-3)] transition-transform group-open:rotate-180" />
                </summary>
                <div className="mt-3 grid grid-cols-2 gap-2.5 pt-3 ring-t ring-[var(--border-soft)]">
                  <div className="rounded-lg bg-[var(--canvas)] p-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-3)]">
                      Network
                    </p>
                    <p className="font-mono text-[12px] font-bold text-[var(--text-1)]">
                      {hotel.wifiName}
                    </p>
                  </div>
                  {hotel.wifiPassword && (
                    <div className="rounded-lg bg-[var(--canvas)] p-2.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-3)]">
                        Password
                      </p>
                      <p className="font-mono text-[12px] font-bold text-[var(--text-1)]">
                        {hotel.wifiPassword}
                      </p>
                    </div>
                  )}
                </div>
              </details>
            </div>
          )}
        </motion.div>

        {/* ── Hotel info ────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="mt-5 rounded-2xl bg-[var(--canvas)] p-5 ring-1 ring-[var(--border-soft)]"
        >
          <h2 className="mb-3 text-[14px] font-bold text-[var(--text-1)]">
            About {hotel.name}
          </h2>
          <div className="space-y-2.5 text-[12px] text-[var(--text-2)]">
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
              <span>
                {hotel.address}
                {hotel.city ? `, ${hotel.city}` : ""}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-[var(--accent)]" />
              <span>
                Reception {hotel.openingTime} – {hotel.closingTime}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CreditCard className="h-3.5 w-3.5 text-[var(--accent)]" />
              <span>{advanceLabel} on booking</span>
            </div>
          </div>
        </motion.div>
      </main>

      {/* ── Sticky bottom CTA: Book this room ───────────────── */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--border-soft)] bg-[var(--canvas)]/95 px-4 py-3 backdrop-blur-xl shadow-[0_-4px_20px_rgba(0,0,0,0.04)]">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-3)]">
              From
            </p>
            <p className="text-[16px] font-black text-[var(--accent-text)]">
              {formatPrice(room.price, hotel.currency)}
              <span className="ml-1 text-[11px] font-medium text-[var(--text-3)]">
                / night
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              router.push(`/hotel/${slug}?roomId=${encodeURIComponent(room.id)}`)
            }
            className="flex shrink-0 items-center gap-2 rounded-2xl bg-[var(--accent)] px-5 py-3.5 text-[13px] font-bold text-white shadow-md hover:bg-[var(--accent-hover)] active:scale-[0.98] transition-all"
          >
            <Calendar className="h-4 w-4" />
            Book this room
          </button>
        </div>
      </div>

      {/* Sound name (decorative; keeps spacing parity with main menu shell) */}
      <Volume2 className="hidden" aria-hidden="true" />
    </div>
  );
}
