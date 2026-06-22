"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BedDouble,
  Users,
  MapPin,
  Phone,
  Star,
  Wifi,
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle,
  Loader2,
  Mountain,
  ArrowLeft,
  ArrowRight,
  Coffee,
  Tv,
  Wind,
  Bath,
  Car,
  Dumbbell,
  UtensilsCrossed,
  Shield,
  Clock,
  CreditCard,
  Building2,
  QrCode,
  Check,
  Minus,
  Plus,
  User,
  Mail,
  Home,
  FileText,
  Sparkles,
  ScanLine,
} from "lucide-react";
import QRCode from "react-qr-code";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { uploadFile } from "@/lib/upload";

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
  offerings: string[];
  locationNote: string | null;
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
  rating: number;
  openingTime: string;
  closingTime: string;
  hotelAdvanceType: string;
  hotelAdvanceValue: number;
  roomServiceEnabled?: boolean;
  roomServiceCharge?: number;
  heroSlides: { id: string; imageUrl: string; title?: string; subtitle?: string }[];
}

const AMENITY_ICONS: Record<string, typeof Wifi> = {
  WiFi: Wifi,
  TV: Tv,
  AC: Wind,
  Bathroom: Bath,
  Parking: Car,
  Gym: Dumbbell,
  Restaurant: UtensilsCrossed,
  Security: Shield,
  "24/7 Reception": Clock,
};

const TYPE_COLORS: Record<string, string> = {
  STANDARD: "bg-[var(--surface)] text-[var(--text-2)]",
  DELUXE: "bg-[var(--accent-muted)] text-[var(--accent-text)]",
  SUITE: "bg-[var(--accent-muted)] text-[var(--accent-text)] ring-1 ring-[var(--accent-border)]",
  DORMITORY: "bg-[var(--accent-muted)] text-[var(--accent-text)]",
};

function AmenityChip({ label }: { label: string }) {
  const Icon = AMENITY_ICONS[label] ?? Coffee;
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-[var(--accent-muted)] px-3 py-1 text-[12px] font-medium text-[var(--accent-text)] ring-1 ring-[var(--accent-border)]">
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

function ImageCarousel({ images, name }: { images: string[]; name: string }) {
  const [idx, setIdx] = useState(0);
  const multi = images.length > 1;
  const go = (dir: number) =>
    setIdx((i) => (i + dir + images.length) % images.length);
  if (!images.length) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)]">
        <BedDouble className="h-12 w-12 text-white/60" />
      </div>
    );
  }
  return (
    <div className="relative h-full w-full group overflow-hidden">
      <AnimatePresence mode="wait" initial={false}>
        <motion.img
          key={idx}
          src={images[idx]}
          alt={name}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          // Touch swipe on mobile (arrows are hover-only on desktop).
          drag={multi ? "x" : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.18}
          onDragEnd={(_e, info) => {
            if (info.offset.x < -50) go(1);
            else if (info.offset.x > 50) go(-1);
          }}
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />
      </AnimatePresence>
      {multi && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); go(-1); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronLeft className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); go(1); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronRight className="h-3 w-3" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-1.5 rounded-full transition-all ${i === idx ? "bg-white w-4" : "bg-white/50"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Step indicator ─────────────────────────────────────────────── */
type StepId = "dates" | "room" | "guest" | "payment";

const STEPS: { id: StepId; label: string; icon: typeof Calendar }[] = [
  { id: "dates", label: "Dates", icon: Calendar },
  { id: "room", label: "Room", icon: BedDouble },
  { id: "guest", label: "Guest", icon: User },
  { id: "payment", label: "Payment", icon: CreditCard },
];

function StepBar({ current }: { current: StepId }) {
  const currentIdx = STEPS.findIndex((s) => s.id === current);
  return (
    <div className="w-full">
      <div className="flex items-center">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const done = i < currentIdx;
          const active = i === currentIdx;
          return (
            <div key={step.id} className="flex items-center flex-1 last:flex-none">
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full transition-all ring-2 ${
                    active
                      ? "bg-[var(--accent)] text-white ring-[var(--accent-border)] shadow-md"
                      : done
                      ? "bg-[var(--accent-muted)] text-[var(--accent-text)] ring-[var(--accent-border)]"
                      : "bg-[var(--canvas-sub)] text-[var(--text-3)] ring-[var(--border-soft)]"
                  }`}
                >
                  {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <span
                  className={`hidden sm:inline text-[12px] font-semibold ${
                    active ? "text-[var(--text-1)]" : done ? "text-[var(--accent-text)]" : "text-[var(--text-3)]"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`mx-3 h-0.5 flex-1 rounded-full transition-all ${
                    i < currentIdx ? "bg-[var(--accent)]" : "bg-[var(--border-soft)]"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Step 1: Dates & Guests ─────────────────────────────────────── */
function DatesStep({
  checkIn,
  checkOut,
  adults,
  kids,
  onChange,
  onNext,
}: {
  checkIn: string;
  checkOut: string;
  adults: number;
  kids: number;
  onChange: (v: Partial<{ checkIn: string; checkOut: string; adults: number; kids: number }>) => void;
  onNext: () => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  const nights = Math.max(
    1,
    Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000),
  );
  const valid = checkIn && checkOut && new Date(checkOut) > new Date(checkIn);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-[22px] font-black text-[var(--text-1)]">When are you staying?</h2>
        <p className="mt-1 text-[13px] text-[var(--text-2)]">Pick your dates and how many guests are coming.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-2)] mb-1.5">Check-in</label>
          <div className="relative">
            <Calendar className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--accent)]" />
            <input
              type="date"
              value={checkIn}
              min={today}
              onChange={(e) => onChange({ checkIn: e.target.value })}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] pl-10 pr-3 py-3 text-[13px] font-semibold text-[var(--text-1)] focus:border-[var(--accent)] focus:outline-none focus:bg-[var(--canvas)] transition-all"
            />
          </div>
        </div>
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-2)] mb-1.5">Check-out</label>
          <div className="relative">
            <Calendar className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--accent)]" />
            <input
              type="date"
              value={checkOut}
              min={checkIn || today}
              onChange={(e) => onChange({ checkOut: e.target.value })}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] pl-10 pr-3 py-3 text-[13px] font-semibold text-[var(--text-1)] focus:border-[var(--accent)] focus:outline-none focus:bg-[var(--canvas)] transition-all"
            />
          </div>
        </div>
      </div>

      {valid && (
        <div className="rounded-2xl bg-[var(--accent-muted)] p-4 ring-1 ring-[var(--accent-border)] flex items-center gap-3">
          <Sparkles className="h-4 w-4 text-[var(--accent-text)]" />
          <p className="text-[12px] font-semibold text-[var(--accent-text)]">
            {nights} night{nights > 1 ? "s" : ""} — we&apos;ll show rooms that are free for your dates.
          </p>
        </div>
      )}

      <div className="space-y-3">
        <CounterField
          label="Adults"
          icon={User}
          value={adults}
          min={1}
          max={10}
          onChange={(v) => onChange({ adults: v })}
        />
        <CounterField
          label="Children"
          icon={Users}
          value={kids}
          min={0}
          max={8}
          onChange={(v) => onChange({ kids: v })}
        />
      </div>

      <button
        onClick={onNext}
        disabled={!valid}
        className="w-full rounded-2xl bg-[var(--accent)] py-4 text-[14px] font-bold text-white shadow-md hover:bg-[var(--accent-hover)] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        See available rooms
        <ArrowRight className="h-4 w-4" />
      </button>
    </motion.div>
  );
}

function CounterField({
  label,
  icon: Icon,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  icon: typeof Users;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-[var(--canvas-sub)] border border-[var(--border-soft)] px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent-muted)]">
          <Icon className="h-4 w-4 text-[var(--accent-text)]" />
        </div>
        <span className="text-[13px] font-semibold text-[var(--text-1)]">{label}</span>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--canvas)] ring-1 ring-[var(--border)] text-[var(--text-2)] disabled:opacity-30 active:scale-95 transition-all"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="w-5 text-center text-[14px] font-bold text-[var(--text-1)] tabular-nums">
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--canvas)] ring-1 ring-[var(--border)] text-[var(--text-2)] disabled:opacity-30 active:scale-95 transition-all"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ── Step 2: Room selection ────────────────────────────────────── */
function RoomStep({
  rooms,
  grouped,
  currency,
  selectedId,
  onSelect,
  nights,
  adults,
  kids,
  onBack,
  onNext,
  refreshing,
}: {
  rooms: Room[];
  grouped: Record<string, Room[]>;
  currency: string;
  selectedId: string | null;
  onSelect: (room: Room) => void;
  nights: number;
  adults: number;
  kids: number;
  onBack: () => void;
  onNext: () => void;
  refreshing: boolean;
}) {
  const [activeType, setActiveType] = useState<string>("ALL");
  const cur = currency === "USD" ? "$" : currency === "INR" ? "₹" : "Rs.";
  const roomTypes = ["ALL", ...Object.keys(grouped)];
  const guests = adults + kids;
  const displayed = (activeType === "ALL" ? rooms : grouped[activeType] ?? []).filter(
    (r) => r.maxGuests >= guests,
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-5"
    >
      <div>
        <h2 className="text-[22px] font-black text-[var(--text-1)]">Choose your room</h2>
        <p className="mt-1 text-[13px] text-[var(--text-2)]">
          Showing rooms that fit {guests} guest{guests > 1 ? "s" : ""} for {nights} night{nights > 1 ? "s" : ""}.
        </p>
      </div>

      {refreshing && (
        <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-muted)] px-3 py-1 text-[11px] font-semibold text-[var(--accent-text)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
          Updating availability
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
        {roomTypes.map((type) => (
          <button
            key={type}
            onClick={() => setActiveType(type)}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-[12px] font-semibold transition-all ${
              activeType === type
                ? "bg-[var(--accent)] text-white shadow-sm"
                : "bg-[var(--surface)] text-[var(--text-2)] hover:bg-[var(--surface-alt)]"
            }`}
          >
            {type === "ALL" ? `All (${rooms.length})` : `${type} (${grouped[type]?.length ?? 0})`}
          </button>
        ))}
      </div>

      {displayed.length === 0 ? (
        <div className="py-16 text-center">
          <BedDouble className="mx-auto h-12 w-12 text-[var(--text-3)] mb-3" />
          <p className="text-[14px] font-medium text-[var(--text-2)]">
            No rooms available for your dates and guests.
          </p>
          <button
            onClick={onBack}
            className="mt-4 text-[12px] font-semibold text-[var(--accent-text)] hover:underline"
          >
            Change dates
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {displayed.map((room) => {
            const selected = selectedId === room.id;
            const total = room.price * nights;
            return (
              <button
                key={room.id}
                type="button"
                onClick={() => room.isAvailable && onSelect(room)}
                disabled={!room.isAvailable}
                className={`text-left overflow-hidden rounded-2xl bg-[var(--canvas)] ring-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  selected
                    ? "ring-2 ring-[var(--accent)] shadow-lg scale-[1.01]"
                    : "ring-[var(--border)] hover:shadow-md hover:ring-[var(--accent-border)]"
                }`}
              >
                <div className="relative h-40 overflow-hidden bg-[var(--canvas-sub)]">
                  <ImageCarousel images={room.imageUrls} name={room.name || `Room ${room.roomNumber}`} />
                  {!room.isAvailable && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                      <span className="rounded-full bg-[var(--canvas)]/95 px-4 py-1.5 text-[11px] font-bold text-[var(--text-1)]">
                        Booked for these dates
                      </span>
                    </div>
                  )}
                  <div className="absolute top-3 left-3 flex gap-1.5">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${TYPE_COLORS[room.type] || "bg-[var(--canvas)]/90 text-[var(--text-2)]"}`}>
                      {room.type}
                    </span>
                  </div>
                  {selected && (
                    <div className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-lg">
                      <Check className="h-4 w-4" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0">
                      <h3 className="text-[15px] font-bold text-[var(--text-1)] truncate">
                        {room.name || `Room ${room.roomNumber}`}
                      </h3>
                      <p className="text-[11px] text-[var(--text-3)]">#{room.roomNumber} · Floor {room.floor}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[16px] font-black text-[var(--accent-text)]">{cur}{room.price.toLocaleString()}</p>
                      <p className="text-[9px] text-[var(--text-3)] uppercase tracking-wide">/ night</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mb-3 text-[11px] text-[var(--text-2)]">
                    {room.bedType && (
                      <span className="flex items-center gap-1">
                        <BedDouble className="h-3 w-3 text-[var(--accent)]" />
                        {room.bedCount > 1 ? `${room.bedCount}x ` : ""}{room.bedType}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3 text-[var(--accent)]" />
                      {room.maxGuests} max
                    </span>
                  </div>

                  {room.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {room.amenities.slice(0, 4).map((a) => (
                        <AmenityChip key={a} label={a} />
                      ))}
                      {room.amenities.length > 4 && (
                        <span className="rounded-full bg-[var(--surface)] px-2 py-0.5 text-[10px] text-[var(--text-2)]">
                          +{room.amenities.length - 4}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-[var(--border-soft)]">
                    <span className="text-[11px] text-[var(--text-3)]">Total for {nights} night{nights > 1 ? "s" : ""}</span>
                    <span className="text-[13px] font-bold text-[var(--text-1)]">{cur}{total.toLocaleString()}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={onBack}
          className="rounded-2xl bg-[var(--canvas-sub)] px-5 py-3.5 text-[13px] font-semibold text-[var(--text-2)] ring-1 ring-[var(--border-soft)] hover:bg-[var(--surface)] active:scale-[0.98] transition-all flex items-center gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!selectedId}
          className="flex-1 rounded-2xl bg-[var(--accent)] py-3.5 text-[13px] font-bold text-white shadow-md hover:bg-[var(--accent-hover)] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          Continue to guest details
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}

/* ── Step 3: Guest details ─────────────────────────────────────── */
function GuestStep({
  form,
  onChange,
  onBack,
  onNext,
}: {
  form: {
    guestName: string;
    guestPhone: string;
    guestEmail: string;
    guestAddress: string;
    guestIdType: string;
    guestIdNumber: string;
    guestIdImageUrl: string;
    notes: string;
  };
  onChange: (v: Partial<typeof form>) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const valid = form.guestName.trim().length >= 2 && form.guestPhone.trim().length >= 6;
  const [idUploading, setIdUploading] = useState(false);
  const [idOcrRunning, setIdOcrRunning] = useState(false);
  const [idMsg, setIdMsg] = useState("");
  const idInputRef = useRef<HTMLInputElement>(null);

  const handleIdUpload = async (file: File | null) => {
    if (!file) return;
    setIdMsg("");
    setIdUploading(true);
    let url = "";
    try {
      url = await uploadFile(file, "booking-ids");
      onChange({ guestIdImageUrl: url });
    } catch {
      setIdMsg("Upload failed — you can still type your details manually.");
      setIdUploading(false);
      return;
    }
    setIdUploading(false);

    // Best-effort client-side OCR autofill — never blocks; all fields stay editable.
    setIdOcrRunning(true);
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng");
      const { data } = await worker.recognize(file);
      await worker.terminate();
      const text = data.text || "";
      const patch: Partial<typeof form> = {};
      const idMatch = text.match(/([A-Z0-9][A-Z0-9\-/]{5,})/i);
      if (idMatch && !form.guestIdNumber.trim()) patch.guestIdNumber = idMatch[1];
      const nameMatch = text.match(/name[\s:]+([A-Za-z][A-Za-z .]{2,40})/i);
      if (nameMatch && !form.guestName.trim()) patch.guestName = nameMatch[1].trim();
      if (Object.keys(patch).length) onChange(patch);
      setIdMsg(
        Object.keys(patch).length
          ? "Details auto-filled from your ID — please verify them."
          : "ID uploaded. Couldn't read the details — please type them in.",
      );
    } catch {
      setIdMsg("ID uploaded. Couldn't read the details — please type them in.");
    } finally {
      setIdOcrRunning(false);
    }
  };

  const fields: {
    key: keyof typeof form;
    label: string;
    placeholder: string;
    icon: typeof User;
    required?: boolean;
    type?: string;
  }[] = [
    { key: "guestName", label: "Full Name", icon: User, placeholder: "Your full name", required: true },
    { key: "guestPhone", label: "Phone", icon: Phone, placeholder: "+977 98XXXXXXXX", required: true },
    { key: "guestEmail", label: "Email", icon: Mail, placeholder: "you@example.com", type: "email" },
    { key: "guestAddress", label: "Address", icon: Home, placeholder: "City, Country" },
    { key: "guestIdNumber", label: "ID Number (optional)", icon: FileText, placeholder: "Citizenship / Passport" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-5"
    >
      <div>
        <h2 className="text-[22px] font-black text-[var(--text-1)]">Who&apos;s staying?</h2>
        <p className="mt-1 text-[13px] text-[var(--text-2)]">We need the lead guest&apos;s details to confirm the reservation.</p>
      </div>

      <div className="space-y-3">
        {fields.map(({ key, label, placeholder, icon: Icon, required, type }) => (
          <div key={key}>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-2)] mb-1.5">
              {label}
              {required && <span className="text-[var(--accent-text)]"> *</span>}
            </label>
            <div className="relative">
              <Icon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--accent)]" />
              <input
                type={type || "text"}
                value={form[key]}
                onChange={(e) => onChange({ [key]: e.target.value } as Partial<typeof form>)}
                placeholder={placeholder}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] pl-10 pr-3 py-3 text-[13px] text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:border-[var(--accent)] focus:outline-none focus:bg-[var(--canvas)] transition-all"
              />
            </div>
          </div>
        ))}

        {/* ID proof upload with best-effort OCR autofill */}
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-2)] mb-1.5">
            ID Proof (optional)
          </label>
          {form.guestIdImageUrl && (
            <img
              src={form.guestIdImageUrl}
              alt="ID proof"
              className="mb-2 max-h-32 w-full rounded-xl object-contain ring-1 ring-[var(--border)] bg-[var(--canvas-sub)]"
            />
          )}
          <button
            type="button"
            onClick={() => idInputRef.current?.click()}
            disabled={idUploading || idOcrRunning}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--accent-border)] bg-[var(--canvas-sub)] py-3 text-[13px] font-semibold text-[var(--accent-text)] hover:bg-[var(--accent-muted)] transition-colors disabled:opacity-50"
          >
            {idUploading || idOcrRunning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ScanLine className="h-4 w-4" />
            )}
            {idUploading
              ? "Uploading…"
              : idOcrRunning
                ? "Reading your ID…"
                : form.guestIdImageUrl
                  ? "Replace ID photo"
                  : "Scan / upload ID photo"}
          </button>
          <input
            ref={idInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleIdUpload(e.target.files?.[0] ?? null)}
          />
          {idMsg && <p className="mt-1.5 text-[11px] text-[var(--text-3)]">{idMsg}</p>}
        </div>

        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-2)] mb-1.5">
            Special Requests
          </label>
          <textarea
            value={form.notes}
            onChange={(e) => onChange({ notes: e.target.value })}
            placeholder="Early check-in, extra bed, dietary preferences..."
            rows={3}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] px-3 py-3 text-[13px] text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:border-[var(--accent)] focus:outline-none focus:bg-[var(--canvas)] transition-all resize-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={onBack}
          className="rounded-2xl bg-[var(--canvas-sub)] px-5 py-3.5 text-[13px] font-semibold text-[var(--text-2)] ring-1 ring-[var(--border-soft)] hover:bg-[var(--surface)] active:scale-[0.98] transition-all flex items-center gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!valid}
          className="flex-1 rounded-2xl bg-[var(--accent)] py-3.5 text-[13px] font-bold text-white shadow-md hover:bg-[var(--accent-hover)] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          Continue to payment
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}

/* ── Step 4: Payment + review ──────────────────────────────────── */
function PaymentStep({
  hotel,
  room,
  nights,
  adults,
  kids,
  checkIn,
  checkOut,
  guest,
  payMethod,
  onPayMethod,
  roomServiceSelected,
  onToggleRoomService,
  onBack,
  onConfirm,
  loading,
  error,
  esewaFormRef,
  esewaData,
}: {
  hotel: Hotel;
  room: Room;
  nights: number;
  adults: number;
  kids: number;
  checkIn: string;
  checkOut: string;
  guest: { guestName: string; guestPhone: string; guestEmail: string };
  payMethod: "ESEWA" | "KHALTI" | "CASH";
  onPayMethod: (m: "ESEWA" | "KHALTI" | "CASH") => void;
  roomServiceSelected: boolean;
  onToggleRoomService: (v: boolean) => void;
  onBack: () => void;
  onConfirm: () => void;
  loading: boolean;
  error: string;
  esewaFormRef: React.RefObject<HTMLFormElement | null>;
  esewaData: Record<string, string> | null;
}) {
  const cur = hotel.currency === "USD" ? "$" : hotel.currency === "INR" ? "₹" : "Rs.";
  const roomServiceAvailable = !!hotel.roomServiceEnabled && (hotel.roomServiceCharge ?? 0) > 0;
  const roomServiceFee = roomServiceAvailable && roomServiceSelected ? hotel.roomServiceCharge ?? 0 : 0;
  const total = room.price * nights + roomServiceFee;
  const advance =
    hotel.hotelAdvanceType === "PERCENTAGE"
      ? Math.round((total * hotel.hotelAdvanceValue) / 100)
      : hotel.hotelAdvanceValue;
  const remaining = total - advance;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-5"
    >
      <div>
        <h2 className="text-[22px] font-black text-[var(--text-1)]">Confirm and pay advance</h2>
        <p className="mt-1 text-[13px] text-[var(--text-2)]">You only pay the advance now — the rest is due at check-in.</p>
      </div>

      {/* Review card */}
      <div className="rounded-2xl bg-[var(--canvas)] ring-1 ring-[var(--border)] overflow-hidden shadow-sm">
        {room.imageUrls[0] && (
          <img src={room.imageUrls[0]} alt="" className="h-32 w-full object-cover" />
        )}
        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-[15px] font-bold text-[var(--text-1)]">
                {room.name || `Room ${room.roomNumber}`}
              </h3>
              <p className="text-[11px] text-[var(--text-3)]">#{room.roomNumber} · {room.type}</p>
            </div>
            <span className="rounded-full bg-[var(--accent-muted)] px-2.5 py-1 text-[11px] font-semibold text-[var(--accent-text)]">
              {nights} night{nights > 1 ? "s" : ""}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <InfoCell label="Check-in" value={new Date(checkIn).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} />
            <InfoCell label="Check-out" value={new Date(checkOut).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} />
            <InfoCell label="Guests" value={`${adults} adult${adults > 1 ? "s" : ""}${kids ? ` · ${kids} child${kids > 1 ? "ren" : ""}` : ""}`} />
            <InfoCell label="Lead guest" value={guest.guestName} />
          </div>

          {/* Optional paid room-service add-on */}
          {roomServiceAvailable && (
            <label className="flex items-center justify-between gap-3 rounded-xl bg-[var(--canvas-sub)] p-3 cursor-pointer">
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-[var(--text-1)]">Add room service</span>
                <span className="block text-[11px] text-[var(--text-3)]">
                  In-room service add-on · {cur}{(hotel.roomServiceCharge ?? 0).toLocaleString()}
                </span>
              </span>
              <input
                type="checkbox"
                checked={roomServiceSelected}
                onChange={(e) => onToggleRoomService(e.target.checked)}
                className="h-5 w-5 accent-[var(--accent)]"
              />
            </label>
          )}

          <div className="rounded-xl bg-[var(--canvas-sub)] p-3 space-y-1.5 text-[12px]">
            <div className="flex justify-between text-[var(--text-2)]">
              <span>{cur}{room.price.toLocaleString()} × {nights} night{nights > 1 ? "s" : ""}</span>
              <span>{cur}{(room.price * nights).toLocaleString()}</span>
            </div>
            {roomServiceFee > 0 && (
              <div className="flex justify-between text-[var(--text-2)]">
                <span>Room service</span>
                <span>{cur}{roomServiceFee.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-[var(--text-1)] border-t border-[var(--border-soft)] pt-1.5">
              <span>Total</span>
              <span>{cur}{total.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-[var(--accent-text)] font-bold">
              <span>Advance now ({hotel.hotelAdvanceType === "PERCENTAGE" ? `${hotel.hotelAdvanceValue}%` : "Fixed"})</span>
              <span>{cur}{advance.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-[var(--text-2)]">
              <span>Remaining at check-in</span>
              <span>{cur}{remaining.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment method */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-2)] mb-2">Pay advance via</p>
        <div className="grid grid-cols-3 gap-2">
          {(["ESEWA", "KHALTI", "CASH"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onPayMethod(m)}
              className={`rounded-2xl border-2 py-3 text-[12px] font-bold transition-all ${
                payMethod === m
                  ? "border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--accent-text)] shadow-sm"
                  : "border-[var(--border)] bg-[var(--canvas)] text-[var(--text-2)] hover:border-[var(--accent-border)]"
              }`}
            >
              {m === "ESEWA" ? "eSewa" : m === "KHALTI" ? "Khalti" : "Cash"}
            </button>
          ))}
        </div>
        {payMethod === "CASH" && (
          <p className="mt-2 text-[11px] text-[var(--text-2)]">
            Pay the advance at the hotel front desk — booking stays as pending until staff confirms.
          </p>
        )}
      </div>

      {error && (
        <p className="rounded-xl bg-[var(--status-error-bg)] px-4 py-3 text-[12px] font-medium text-[var(--status-error-text)] ring-1 ring-[var(--status-error-bg)]">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={onBack}
          disabled={loading}
          className="rounded-2xl bg-[var(--canvas-sub)] px-5 py-3.5 text-[13px] font-semibold text-[var(--text-2)] ring-1 ring-[var(--border-soft)] hover:bg-[var(--surface)] active:scale-[0.98] transition-all flex items-center gap-1.5 disabled:opacity-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="flex-1 rounded-2xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] py-3.5 text-[13px] font-bold text-white shadow-md hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing…
            </>
          ) : (
            <>
              Confirm &amp; pay {cur}{advance.toLocaleString()}
              <CreditCard className="h-4 w-4" />
            </>
          )}
        </button>
      </div>

      {esewaData && (
        <form ref={esewaFormRef} method="POST" action="https://rc-epay.esewa.com.np/api/epay/main/v2/form" className="hidden">
          {Object.entries(esewaData).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
        </form>
      )}
    </motion.div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[var(--canvas-sub)] border border-[var(--border-soft)] p-2.5">
      <p className="text-[9px] font-semibold uppercase tracking-wide text-[var(--text-3)] mb-0.5">{label}</p>
      <p className="text-[12px] font-semibold text-[var(--text-1)] truncate">{value}</p>
    </div>
  );
}

/* ── Room card for browse view ─────────────────────────────────── */
function BrowseRoomCard({
  room,
  currency,
  onBook,
  menuSlug,
}: {
  room: Room;
  currency: string;
  onBook: () => void;
  menuSlug: string;
}) {
  const cur = currency === "USD" ? "$" : currency === "INR" ? "₹" : "Rs.";
  const [showQR, setShowQR] = useState(false);
  const menuUrl = typeof window !== "undefined"
    ? `${window.location.origin}/menu/${menuSlug}?room=${encodeURIComponent(room.roomNumber)}`
    : `/menu/${menuSlug}?room=${encodeURIComponent(room.roomNumber)}`;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-2xl bg-[var(--canvas)] ring-1 ring-[var(--border)] shadow-sm hover:shadow-md transition-all"
    >
      <div className="relative h-48 overflow-hidden bg-[var(--canvas-sub)]">
        <ImageCarousel images={room.imageUrls} name={room.name || `Room ${room.roomNumber}`} />
        {!room.isAvailable && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="rounded-full bg-[var(--canvas)]/95 px-4 py-1.5 text-[12px] font-bold text-[var(--text-1)]">
              Not Available
            </span>
          </div>
        )}
        <div className="absolute top-3 left-3 flex gap-1.5">
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${TYPE_COLORS[room.type] || "bg-[var(--canvas)]/90 text-[var(--text-2)]"}`}>
            {room.type}
          </span>
          <span className="rounded-full bg-[var(--canvas)]/90 px-2.5 py-1 text-[10px] font-semibold text-[var(--text-2)]">
            Floor {room.floor}
          </span>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="text-[15px] font-bold text-[var(--text-1)]">
              {room.name || `Room ${room.roomNumber}`}
            </h3>
            <p className="text-[11px] text-[var(--text-2)]">Room #{room.roomNumber}</p>
          </div>
          <div className="text-right">
            <p className="text-[17px] font-black text-[var(--accent-text)]">{cur}{room.price.toLocaleString()}</p>
            <p className="text-[10px] text-[var(--text-3)]">per night</p>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-3">
          {room.bedType && (
            <span className="flex items-center gap-1 text-[12px] text-[var(--text-2)]">
              <BedDouble className="h-3.5 w-3.5 text-[var(--accent)]" />
              {room.bedCount > 1 ? `${room.bedCount}x ` : ""}{room.bedType}
            </span>
          )}
          <span className="flex items-center gap-1 text-[12px] text-[var(--text-2)]">
            <Users className="h-3.5 w-3.5 text-[var(--accent)]" />
            Up to {room.maxGuests} guests
          </span>
        </div>

        {room.locationNote && (
          <p className="flex items-center gap-1 text-[11px] text-[var(--text-3)] mb-1.5">
            <MapPin className="h-3 w-3 text-[var(--accent)] shrink-0" />
            {room.locationNote}
          </p>
        )}

        {room.description && (
          <p className="text-[12px] text-[var(--text-2)] mb-3 line-clamp-2">{room.description}</p>
        )}

        {room.offerings.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2.5">
            {room.offerings.slice(0, 4).map((o) => (
              <span key={o} className="rounded-full bg-[var(--accent-muted)] px-2.5 py-1 text-[11px] font-semibold text-[var(--accent-text)]">
                {o}
              </span>
            ))}
          </div>
        )}

        {room.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {room.amenities.slice(0, 5).map((a) => (
              <AmenityChip key={a} label={a} />
            ))}
            {room.amenities.length > 5 && (
              <span className="rounded-full bg-[var(--surface)] px-2.5 py-1 text-[11px] text-[var(--text-2)]">
                +{room.amenities.length - 5} more
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={onBook}
            disabled={!room.isAvailable}
            className="flex-1 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] py-3 text-[13px] font-bold text-white shadow-sm hover:brightness-105 active:scale-[0.97] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {room.isAvailable ? "Pre-book" : "Not Available"}
          </button>
          <button
            onClick={() => setShowQR(true)}
            aria-label="Show room QR code"
            className="shrink-0 rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] p-3 text-[var(--text-2)] hover:bg-[var(--surface)] active:scale-[0.97] transition-all"
            title="Scan to order from this room"
          >
            <QrCode className="h-4 w-4" />
          </button>
        </div>

        <AnimatePresence>
          {showQR && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowQR(false)}
              className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-6"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-xs rounded-2xl bg-[var(--canvas)] p-6 shadow-2xl"
              >
                <div className="mb-4 text-center">
                  <h4 className="text-base font-bold text-[var(--text-1)]">Scan to order</h4>
                  <p className="text-[11px] text-[var(--text-3)]">Room #{room.roomNumber}</p>
                </div>
                <div className="rounded-xl bg-white p-4 flex items-center justify-center">
                  <QRCode value={menuUrl} size={200} />
                </div>
                <button
                  onClick={() => setShowQR(false)}
                  className="mt-4 w-full rounded-xl bg-[var(--accent)] py-2.5 text-[12px] font-bold text-white hover:bg-[var(--accent-hover)] transition-colors"
                >
                  Close
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ── Main page ─────────────────────────────────────────────────── */
type View = "browse" | "booking";

export default function HotelPublicPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Deep-link from a Room QR / room landing page: ?roomId=<cuid> preselects
  // that room and skips the room-selection step in the wizard.
  const deepRoomId = searchParams.get("roomId");
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [grouped, setGrouped] = useState<Record<string, Room[]>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [activeType, setActiveType] = useState<string>("ALL");
  const [heroIdx, setHeroIdx] = useState(0);

  // view: browse rooms OR pre-booking wizard
  const [view, setView] = useState<View>("browse");
  const [step, setStep] = useState<StepId>("dates");

  // wizard state — dates populate on mount (avoids impure-render lint rule)
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  useEffect(() => {
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 86400000);
    setCheckIn(today.toISOString().split("T")[0]);
    setCheckOut(tomorrow.toISOString().split("T")[0]);
  }, []);
  const [adults, setAdults] = useState(2);
  const [kids, setKids] = useState(0);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [guest, setGuest] = useState({
    guestName: "",
    guestPhone: "",
    guestEmail: "",
    guestAddress: "",
    guestIdType: "",
    guestIdNumber: "",
    guestIdImageUrl: "",
    notes: "",
  });
  const [payMethod, setPayMethod] = useState<"ESEWA" | "KHALTI" | "CASH">("ESEWA");
  const [roomServiceSelected, setRoomServiceSelected] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const esewaFormRef = useRef<HTMLFormElement>(null);
  const [esewaData, setEsewaData] = useState<Record<string, string> | null>(null);

  const nights = Math.max(
    1,
    Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000),
  );

  /* Load hotel + rooms (no date filter on first load) */
  useEffect(() => {
    fetch(`/api/public/hotel/${slug}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); setLoading(false); return; }
        setHotel(d.hotel);
        setRooms(d.rooms);
        setGrouped(d.grouped);
        setLoading(false);
      })
      .catch(() => { setError("Failed to load hotel"); setLoading(false); });
  }, [slug]);

  /* Re-fetch rooms with date filter when wizard enters step=room */
  useEffect(() => {
    if (view !== "booking" || step !== "room" || !hotel) return;
    let cancelled = false;
    (async () => {
      setRefreshing(true);
      try {
        const qs = new URLSearchParams({ checkIn, checkOut }).toString();
        const r = await fetch(`/api/public/hotel/${slug}?${qs}`);
        const d = await r.json();
        if (!cancelled && !d.error) {
          setRooms(d.rooms);
          setGrouped(d.grouped);
        }
      } finally {
        if (!cancelled) setRefreshing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [view, step, checkIn, checkOut, slug, hotel]);

  /* Auto-rotate hero slides */
  useEffect(() => {
    if (!hotel?.heroSlides?.length) return;
    const t = setInterval(() => setHeroIdx((i) => (i + 1) % hotel.heroSlides.length), 4000);
    return () => clearInterval(t);
  }, [hotel?.heroSlides?.length]);

  /* Deep-link from a Room QR — preselect the room and jump into the wizard.
     Runs once after rooms are loaded; ignores stale roomIds. */
  useEffect(() => {
    if (!deepRoomId || !rooms.length) return;
    const match = rooms.find((r) => r.id === deepRoomId);
    if (!match) return;
    setSelectedRoom(match);
    setView("booking");
    setStep("dates");
  }, [deepRoomId, rooms]);

  /* Auto-submit eSewa form when data arrives */
  useEffect(() => {
    if (esewaData && esewaFormRef.current) esewaFormRef.current.submit();
  }, [esewaData]);

  // True when the user arrived from a Room QR (or a "Book this room" deep link).
  // We skip the room-selection step but still let the user open it via "Change room".
  const isDeepLinkedRoom =
    !!deepRoomId && !!selectedRoom && selectedRoom.id === deepRoomId;

  const startBooking = (room?: Room) => {
    if (room) setSelectedRoom(room);
    setView("booking");
    setStep("dates");
    setSubmitError("");
  };

  const cancelBooking = () => {
    setView("browse");
    setStep("dates");
    setSelectedRoom(null);
    setSubmitError("");
  };

  const handleConfirm = async () => {
    if (!selectedRoom || !hotel) return;
    setSubmitError("");
    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/hotel/${hotel.slug}/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: selectedRoom.id,
          guestName: guest.guestName.trim(),
          guestPhone: guest.guestPhone.trim(),
          guestEmail: guest.guestEmail.trim() || undefined,
          guestAddress: guest.guestAddress.trim() || undefined,
          guestIdNumber: guest.guestIdNumber.trim() || undefined,
          guestIdImageUrl: guest.guestIdImageUrl || undefined,
          adults,
          children: kids,
          checkIn,
          checkOut,
          roomServiceSelected,
          notes: guest.notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || "Booking failed");
        setSubmitting(false);
        return;
      }
      const bookingId = data.booking.id;

      if (payMethod === "CASH") {
        await fetch("/api/payments/room-booking/initiate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId, method: "CASH" }),
        });
        router.push(`/hotel/booking/${bookingId}?payment=pending`);
        return;
      }

      const payRes = await fetch("/api/payments/room-booking/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, method: payMethod }),
      });
      const payData = await payRes.json();
      if (!payRes.ok) {
        setSubmitError(payData.error || "Payment initiation failed");
        setSubmitting(false);
        return;
      }

      if (payMethod === "KHALTI" && payData.paymentUrl) {
        window.location.href = payData.paymentUrl;
        return;
      }
      if (payMethod === "ESEWA" && payData.gateway) {
        setEsewaData(payData.gateway.formData);
        return;
      }
    } catch {
      setSubmitError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  if (loading) {
    // Instant calm shell — no spinner/"Loading hotel..." flash.
    return (
      <div className="min-h-screen bg-[var(--canvas-sub)] flex flex-col items-center justify-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent)] shadow-lg shadow-[var(--accent)]/30">
          <Mountain className="h-6 w-6 text-white" strokeWidth={2.5} />
        </div>
        <span className="text-[15px] font-bold text-[var(--text-1)]">
          Hima<span className="text-[var(--accent)]">Volt</span>
        </span>
      </div>
    );
  }

  if (error || !hotel) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--canvas-sub)]">
        <div className="text-center">
          <Building2 className="mx-auto h-12 w-12 text-[var(--text-3)] mb-3" />
          <p className="text-[15px] font-semibold text-[var(--text-2)]">{error || "Hotel not found"}</p>
          <Link href="/" className="mt-4 inline-block text-[13px] text-[var(--accent-text)] hover:underline">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  const roomTypes = ["ALL", ...Object.keys(grouped)];
  const displayedRooms = activeType === "ALL" ? rooms : grouped[activeType] ?? [];
  const cur = hotel.currency === "USD" ? "$" : hotel.currency === "INR" ? "₹" : "Rs.";

  return (
    <div className="min-h-screen bg-[var(--canvas-sub)] font-sans">
      <nav className="sticky top-0 z-40 flex items-center justify-between border-b border-[var(--border)]/50 bg-[var(--canvas)]/80 backdrop-blur-xl px-5 py-3.5 shadow-sm">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent)]">
            <Mountain className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-[15px] font-bold text-[var(--text-1)]">
            Hima<span className="text-[var(--accent)]">Volt</span>
          </span>
        </Link>
        <div className="flex items-center gap-1.5 text-[12px] text-[var(--text-2)]">
          <MapPin className="h-3 w-3" />
          {hotel.city}
        </div>
      </nav>

      {/* Hero */}
      <div className="relative h-64 sm:h-80 md:h-96 overflow-hidden bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)]">
        {hotel.heroSlides.length > 0 ? (
          <img
            src={hotel.heroSlides[heroIdx].imageUrl}
            alt={hotel.name}
            className="h-full w-full object-cover opacity-80 transition-all duration-700"
          />
        ) : hotel.coverUrl ? (
          <img src={hotel.coverUrl} alt={hotel.name} className="h-full w-full object-cover opacity-80" />
        ) : hotel.imageUrl ? (
          <img src={hotel.imageUrl} alt={hotel.name} className="h-full w-full object-cover opacity-80" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Building2 className="h-24 w-24 text-white/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-6 left-5 right-5">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-[var(--accent)]">
            {hotel.type.replace("_", " ")}
          </p>
          <h1 className="text-[28px] sm:text-[36px] font-black text-white leading-tight drop-shadow-lg">
            {hotel.name}
          </h1>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <span className="flex items-center gap-1 text-[12px] text-white/90">
              <MapPin className="h-3 w-3" />
              {hotel.address}, {hotel.city}
            </span>
            {hotel.rating > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-[var(--accent)]/30 px-2.5 py-0.5 text-[11px] font-bold text-white">
                <Star className="h-2.5 w-2.5 fill-white" />
                {hotel.rating.toFixed(1)}
              </span>
            )}
          </div>
          {view === "browse" && (
            <button
              onClick={() => startBooking()}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-white text-[var(--accent-text)] px-5 py-2.5 text-[13px] font-bold shadow-lg hover:shadow-xl active:scale-[0.98] transition-all"
            >
              <Calendar className="h-4 w-4" />
              Start pre-booking
            </button>
          )}
        </div>
      </div>

      {/* Quick info bar */}
      <div className="bg-[var(--canvas)] border-b border-[var(--border-soft)] px-5 py-3 flex items-center gap-6 overflow-x-auto scrollbar-hide">
        <span className="flex items-center gap-1.5 text-[12px] text-[var(--text-2)] whitespace-nowrap">
          <Phone className="h-3.5 w-3.5 text-[var(--accent)]" />
          {hotel.phone}
        </span>
        <span className="flex items-center gap-1.5 text-[12px] text-[var(--text-2)] whitespace-nowrap">
          <Clock className="h-3.5 w-3.5 text-[var(--accent)]" />
          {hotel.openingTime} – {hotel.closingTime}
        </span>
        <span className="flex items-center gap-1.5 text-[12px] text-[var(--accent-text)] font-semibold whitespace-nowrap">
          <CreditCard className="h-3.5 w-3.5" />
          {hotel.hotelAdvanceType === "PERCENTAGE"
            ? `${hotel.hotelAdvanceValue}% advance`
            : `${cur}${hotel.hotelAdvanceValue} advance`}
        </span>
        <span className="flex items-center gap-1 text-[12px] text-[var(--accent-text)] font-medium whitespace-nowrap">
          <CheckCircle className="h-3.5 w-3.5" />
          {rooms.filter((r) => r.isAvailable).length} rooms available
        </span>
      </div>

      {/* Body: either browse or wizard */}
      <AnimatePresence mode="wait">
        {view === "browse" ? (
          <motion.div
            key="browse"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="sticky top-[57px] z-30 bg-[var(--canvas)]/90 backdrop-blur-sm border-b border-[var(--border-soft)] px-5 py-3">
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                {roomTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => setActiveType(type)}
                    className={`whitespace-nowrap rounded-full px-4 py-1.5 text-[12px] font-semibold transition-all ${
                      activeType === type
                        ? "bg-[var(--accent)] text-white shadow-sm"
                        : "bg-[var(--surface)] text-[var(--text-2)] hover:bg-[var(--surface-alt)]"
                    }`}
                  >
                    {type === "ALL" ? `All Rooms (${rooms.length})` : `${type} (${grouped[type]?.length ?? 0})`}
                  </button>
                ))}
              </div>
            </div>

            <main className="mx-auto max-w-6xl px-4 py-8">
              {displayedRooms.length === 0 ? (
                <div className="py-20 text-center">
                  <BedDouble className="mx-auto h-12 w-12 text-[var(--text-3)] mb-3" />
                  <p className="text-[14px] font-medium text-[var(--text-3)]">No rooms found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {displayedRooms.map((room, i) => (
                    <motion.div
                      key={room.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <BrowseRoomCard
                        room={room}
                        currency={hotel.currency}
                        onBook={() => startBooking(room)}
                        menuSlug={hotel.slug}
                      />
                    </motion.div>
                  ))}
                </div>
              )}
            </main>
          </motion.div>
        ) : (
          <motion.div
            key="wizard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="sticky top-[57px] z-30 bg-[var(--canvas)]/95 backdrop-blur-md border-b border-[var(--border-soft)] px-5 py-4">
              <div className="mx-auto max-w-3xl flex items-center gap-4">
                <button
                  onClick={cancelBooking}
                  className="shrink-0 rounded-full p-2 hover:bg-[var(--surface)] transition-colors text-[var(--text-2)]"
                  aria-label="Cancel"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="flex-1 min-w-0">
                  <StepBar current={step} />
                </div>
              </div>
            </div>

            <main className="mx-auto max-w-3xl px-4 py-8">
              <AnimatePresence mode="wait">
                {step === "dates" && (
                  <DatesStep
                    key="s-dates"
                    checkIn={checkIn}
                    checkOut={checkOut}
                    adults={adults}
                    kids={kids}
                    onChange={(v) => {
                      if (v.checkIn !== undefined) setCheckIn(v.checkIn);
                      if (v.checkOut !== undefined) setCheckOut(v.checkOut);
                      if (v.adults !== undefined) setAdults(v.adults);
                      if (v.kids !== undefined) setKids(v.kids);
                    }}
                    // Skip the room-selection step when a room was deep-linked
                    // (e.g. customer scanned that room's QR). They can still
                    // change rooms from the guest step's "Change room" link.
                    onNext={() => setStep(isDeepLinkedRoom ? "guest" : "room")}
                  />
                )}
                {step === "room" && (
                  <RoomStep
                    key="s-room"
                    rooms={rooms}
                    grouped={grouped}
                    currency={hotel.currency}
                    selectedId={selectedRoom?.id ?? null}
                    onSelect={setSelectedRoom}
                    nights={nights}
                    adults={adults}
                    kids={kids}
                    onBack={() => setStep("dates")}
                    onNext={() => setStep("guest")}
                    refreshing={refreshing}
                  />
                )}
                {step === "guest" && (
                  <GuestStep
                    key="s-guest"
                    form={guest}
                    onChange={(v) => setGuest((g) => ({ ...g, ...v }))}
                    // Mirror the forward skip on the way back.
                    onBack={() => setStep(isDeepLinkedRoom ? "dates" : "room")}
                    onNext={() => setStep("payment")}
                  />
                )}
                {step === "payment" && selectedRoom && (
                  <PaymentStep
                    key="s-pay"
                    hotel={hotel}
                    room={selectedRoom}
                    nights={nights}
                    adults={adults}
                    kids={kids}
                    checkIn={checkIn}
                    checkOut={checkOut}
                    guest={guest}
                    payMethod={payMethod}
                    onPayMethod={setPayMethod}
                    roomServiceSelected={roomServiceSelected}
                    onToggleRoomService={setRoomServiceSelected}
                    onBack={() => setStep("guest")}
                    onConfirm={handleConfirm}
                    loading={submitting}
                    error={submitError}
                    esewaFormRef={esewaFormRef}
                    esewaData={esewaData}
                  />
                )}
              </AnimatePresence>
            </main>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="border-t border-[var(--border-soft)] bg-[var(--canvas)] px-5 py-6 text-center">
        <p className="text-[11px] text-[var(--text-3)]">
          Powered by{" "}
          <Link href="/" className="font-bold text-[var(--accent)]">HimaVolt</Link>
        </p>
      </footer>
    </div>
  );
}
