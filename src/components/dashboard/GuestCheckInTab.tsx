"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BedDouble,
  Plus,
  X,
  Loader2,
  Phone,
  IdCard,
  Check,
  LogIn,
  LogOut,
  QrCode,
  Download,
  Search,
  Users,
  Calendar,
  Camera,
  Eye,
  Sparkles,
  Mail,
  MapPin,
} from "lucide-react";
import QRCode from "qrcode";
import { createWorker } from "tesseract.js";
import { useRestaurant } from "@/context/RestaurantContext";
import { useToast } from "@/context/ToastContext";
import { apiFetch, peekApiCache } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { uploadFile } from "@/lib/upload";
import { formatPrice } from "@/lib/currency";
import { useRealtimeSignal } from "@/hooks/useRealtimeSignal";
import { restaurantBookingsTopic } from "@/lib/realtime-topics";
import { ScrollableRow } from "@/components/shared/ScrollableRow";
import NumberInput from "@/components/shared/NumberInput";
import { parseIdText, ID_TYPES, type ParsedIdFields } from "@/lib/id-ocr";

// ── types ─────────────────────────────────────────────────────────────────

interface Room {
  id: string;
  roomNumber: string;
  name: string | null;
  type: string;
  isAvailable: boolean;
  price: number;
}

interface Booking {
  id: string;
  guestName: string;
  guestPhone: string | null;
  guestEmail: string | null;
  guestAddress: string | null;
  guestIdType: string | null;
  guestIdNumber: string | null;
  guestIdImageUrl: string | null;
  adults: number;
  children: number;
  checkIn: string;
  checkOut: string;
  nights: number;
  totalPrice: number;
  notes: string | null;
  status: string; // this tab only ever sees CONFIRMED (arrival) or CHECKED_IN (in-house)
  room: { id: string; roomNumber: string; name: string | null; type: string };
}

type ViewFilter = "ARRIVALS" | "IN_HOUSE" | "DEPARTURES" | "ALL";
type Stage = "ARRIVAL" | "DEPARTURE" | "IN_HOUSE";

// ── date helpers ──────────────────────────────────────────────────────────

function endOfToday(): number {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

/** Due to arrive today, or overdue from an earlier date. */
function isDueToArrive(checkInIso: string): boolean {
  return new Date(checkInIso).getTime() <= endOfToday();
}

function isDueToday(iso: string): boolean {
  const target = new Date(iso);
  const now = new Date();
  return (
    target.getFullYear() === now.getFullYear() &&
    target.getMonth() === now.getMonth() &&
    target.getDate() === now.getDate()
  );
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function guestStage(b: Booking): Stage {
  if (b.status === "CONFIRMED") return "ARRIVAL";
  if (isDueToday(b.checkOut)) return "DEPARTURE";
  return "IN_HOUSE";
}

const STAGE_META: Record<Stage, { label: string; badge: string; border: string }> = {
  ARRIVAL: { label: "Arriving", badge: "bg-[var(--status-info-bg)] text-[var(--status-info-text)]", border: "border-l-blue-400" },
  DEPARTURE: { label: "Departing Today", badge: "bg-amber-100 text-amber-800", border: "border-l-amber-400" },
  IN_HOUSE: { label: "In House", badge: "bg-[var(--accent-muted)] text-[var(--accent-text)]", border: "border-l-[var(--accent)]" },
};

// ── shared ID capture (upload + OCR autofill) ────────────────────────────
// Both the walk-in form and the guest detail editor need "take a photo of the
// ID, upload it, try to read the fields off it" — centralized once here so
// the two modals can't drift into two slightly-different implementations.

function useIdCapture(initialUrl = "") {
  const { showToast } = useToast();
  const [imageUrl, setImageUrl] = useState(initialUrl);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);

  const capture = async (file: File): Promise<ParsedIdFields | null> => {
    setUploading(true);
    try {
      const url = await uploadFile(file, "guest-ids");
      setImageUrl(url);
      setExtracting(true);
      try {
        const worker = await createWorker("eng");
        const { data: { text } } = await worker.recognize(file);
        await worker.terminate();
        return parseIdText(text);
      } catch {
        return null; // OCR failure is non-fatal — the photo still uploaded
      } finally {
        setExtracting(false);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "ID upload failed", "error");
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { imageUrl, setImageUrl, uploading, extracting, capture };
}

function IdCaptureField({
  imageUrl,
  uploading,
  extracting,
  onFile,
  onClear,
}: {
  imageUrl: string;
  uploading: boolean;
  extracting: boolean;
  onFile: (file: File) => void;
  onClear: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
        }}
      />
      {imageUrl ? (
        <div className="relative rounded-xl border border-[var(--border)] overflow-hidden">
          <img src={imageUrl} alt="Guest ID" className="w-full h-32 object-cover" />
          {extracting && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 backdrop-blur-[2px]">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
              <p className="text-xs font-semibold text-white flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-[var(--accent)]" />
                Reading ID...
              </p>
            </div>
          )}
          <button
            onClick={onClear}
            className="absolute top-2 right-2 rounded-full bg-[var(--canvas)]/90 p-1.5 text-[var(--text-2)] hover:bg-[var(--status-error-bg)] hover:text-[var(--status-error-text)] shadow-sm"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--border)] py-6 text-[var(--text-3)] hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/5 transition-all disabled:opacity-50"
        >
          {uploading ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-xs font-semibold">Uploading...</span>
            </>
          ) : (
            <>
              <Camera className="h-6 w-6" />
              <span className="text-xs font-semibold">Take photo or upload ID</span>
              <span className="text-[10px] text-[var(--accent-text)] flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Fields will auto-fill
              </span>
            </>
          )}
        </button>
      )}
    </div>
  );
}

// ── guest card ────────────────────────────────────────────────────────────

function GuestCard({
  booking,
  onCheckIn,
  onCheckOut,
  onView,
  onRoomQR,
  busy,
}: {
  booking: Booking;
  onCheckIn: (b: Booking) => void;
  onCheckOut: (b: Booking) => void;
  onView: (b: Booking) => void;
  onRoomQR: (b: Booking) => void;
  busy: boolean;
}) {
  const stage = guestStage(booking);
  const meta = STAGE_META[stage];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-2xl bg-[var(--canvas)] ring-1 ring-[var(--border)] shadow-sm hover:shadow-md transition-all overflow-hidden border-l-[3px]",
        meta.border,
      )}
    >
      <div className="flex items-center gap-3 px-3.5 pt-3.5 pb-2.5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[13px] font-black bg-[var(--canvas-sub)] text-[var(--text-2)] ring-1 ring-[var(--border)]">
          {booking.room.roomNumber}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-[var(--text-1)] truncate leading-tight">{booking.guestName}</p>
          <p className="text-[10px] text-[var(--text-3)] mt-0.5 flex items-center gap-1">
            <Users className="h-3 w-3" />
            {booking.adults}A{booking.children > 0 ? ` · ${booking.children}C` : ""}
          </p>
        </div>
        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-black shrink-0", meta.badge)}>
          {meta.label}
        </span>
      </div>

      <div className="px-3.5 pb-3 space-y-1.5">
        {booking.guestPhone && (
          <p className="text-[11px] text-[var(--text-2)] flex items-center gap-1.5">
            <Phone className="h-3 w-3 text-[var(--text-3)] shrink-0" />
            {booking.guestPhone}
          </p>
        )}
        <p className="text-[10px] text-[var(--text-3)] flex items-center gap-1.5">
          <Calendar className="h-3 w-3 shrink-0" />
          {stage === "ARRIVAL"
            ? `Expected ${fmtDate(booking.checkIn)}`
            : `Departs ${fmtDate(booking.checkOut)}`}
        </p>
      </div>

      <div className="flex gap-1.5 px-3 pb-3 pt-2 border-t border-[var(--border-soft)]">
        <button
          onClick={() => onView(booking)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[var(--canvas-sub)] py-1.5 text-[11px] font-bold text-[var(--text-2)] hover:text-[var(--text-1)] transition-all"
        >
          <Eye className="h-3 w-3" />
          View
        </button>
        <button
          onClick={() => onRoomQR(booking)}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--canvas-sub)] text-[var(--text-3)] hover:text-[var(--accent-text)] transition-all"
          title="Room QR"
        >
          <QrCode className="h-3.5 w-3.5" />
        </button>
        {stage === "ARRIVAL" ? (
          <button
            onClick={() => onCheckIn(booking)}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-all"
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <LogIn className="h-3 w-3" />}
            Check In
          </button>
        ) : (
          <button
            onClick={() => onCheckOut(booking)}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-1.5 text-[11px] font-bold text-rose-600 hover:bg-rose-100 disabled:opacity-50 transition-all"
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <LogOut className="h-3 w-3" />}
            Check Out
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ── walk-in check-in modal ────────────────────────────────────────────────

function tomorrowDateInput(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

const EMPTY_BOOKINGS: Booking[] = [];

const BLANK_WALKIN = {
  roomId: "",
  guestName: "",
  phone: "",
  idType: "",
  idNumber: "",
  address: "",
  adults: 1,
  children: 0,
  checkOut: tomorrowDateInput(),
  notes: "",
};

function WalkInModal({
  rooms,
  submitting,
  onSubmit,
  onClose,
}: {
  rooms: Room[];
  submitting: boolean;
  onSubmit: (payload: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState(BLANK_WALKIN);
  const id = useIdCapture();
  const availableRooms = rooms.filter((r) => r.isAvailable);

  const handleSubmit = () => {
    if (!form.roomId || !form.guestName.trim() || !form.checkOut) return;
    onSubmit({
      roomId: form.roomId,
      guestName: form.guestName.trim(),
      guestPhone: form.phone.trim() || undefined,
      guestIdType: form.idType || undefined,
      guestIdNumber: form.idNumber.trim() || undefined,
      guestIdImageUrl: id.imageUrl || undefined,
      guestAddress: form.address.trim() || undefined,
      adults: form.adults,
      children: form.children,
      checkIn: new Date().toISOString(),
      checkOut: new Date(`${form.checkOut}T12:00:00`).toISOString(),
      notes: form.notes.trim() || undefined,
      status: "CHECKED_IN",
    });
  };

  const applyExtracted = (fields: ParsedIdFields) => {
    setForm((f) => ({
      ...f,
      guestName: fields.fullName || f.guestName,
      idNumber: fields.idNumber || f.idNumber,
      address: fields.address || f.address,
      idType: fields.idType || f.idType,
    }));
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", damping: 25 }}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[95%] max-w-lg rounded-2xl bg-[var(--canvas)] shadow-2xl overflow-y-auto max-h-[90vh]"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-soft)] sticky top-0 bg-[var(--canvas)] z-10">
          <div className="flex items-center gap-2">
            <LogIn className="h-5 w-5 text-[var(--accent)]" />
            <h3 className="text-base font-bold text-[var(--text-1)]">Walk-In Check-In</h3>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-[var(--text-3)] hover:bg-[var(--surface)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider block mb-1.5">
              Room <span className="text-rose-500">*</span>
            </label>
            <select
              value={form.roomId}
              onChange={(e) => setForm((f) => ({ ...f, roomId: e.target.value }))}
              className="w-full rounded-xl bg-[var(--canvas-sub)] px-3.5 py-2.5 text-[13px] font-semibold text-[var(--text-1)] outline-none ring-1 ring-[var(--border)] focus:ring-[var(--accent)] transition-all"
            >
              <option value="">Select an available room</option>
              {availableRooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.roomNumber}{r.name ? ` — ${r.name}` : ""} ({r.type})
                </option>
              ))}
            </select>
            {availableRooms.length === 0 && (
              <p className="mt-1.5 text-[11px] text-[var(--status-error-text)]">No rooms are currently available.</p>
            )}
          </div>

          <div>
            <label className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider block mb-1.5">
              Guest Name <span className="text-rose-500">*</span>
            </label>
            <input
              value={form.guestName}
              onChange={(e) => setForm((f) => ({ ...f, guestName: e.target.value }))}
              placeholder="Full name as per ID"
              className="w-full rounded-xl bg-[var(--canvas-sub)] px-3.5 py-2.5 text-[13px] font-semibold text-[var(--text-1)] outline-none ring-1 ring-[var(--border)] focus:ring-[var(--accent)] transition-all placeholder:text-[var(--text-3)] placeholder:font-normal"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider block mb-1.5">Phone</label>
            <input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="+977 98XX-XXXXXX"
              className="w-full rounded-xl bg-[var(--canvas-sub)] px-3.5 py-2.5 text-[13px] font-semibold text-[var(--text-1)] outline-none ring-1 ring-[var(--border)] focus:ring-[var(--accent)] transition-all placeholder:text-[var(--text-3)] placeholder:font-normal"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider block mb-1.5">Adults</label>
              <NumberInput
                min={1}
                value={form.adults}
                onChange={(n) => setForm((f) => ({ ...f, adults: n }))}
                className="w-full rounded-xl bg-[var(--canvas-sub)] px-3.5 py-2.5 text-[13px] font-semibold text-[var(--text-1)] outline-none ring-1 ring-[var(--border)] focus:ring-[var(--accent)] transition-all text-center"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider block mb-1.5">Children</label>
              <NumberInput
                min={0}
                value={form.children}
                onChange={(n) => setForm((f) => ({ ...f, children: n }))}
                className="w-full rounded-xl bg-[var(--canvas-sub)] px-3.5 py-2.5 text-[13px] font-semibold text-[var(--text-1)] outline-none ring-1 ring-[var(--border)] focus:ring-[var(--accent)] transition-all text-center"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider block mb-1.5">
                Until <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={form.checkOut}
                min={tomorrowDateInput()}
                onChange={(e) => setForm((f) => ({ ...f, checkOut: e.target.value }))}
                className="w-full rounded-xl bg-[var(--canvas-sub)] px-2 py-2.5 text-[12px] font-semibold text-[var(--text-1)] outline-none ring-1 ring-[var(--border)] focus:ring-[var(--accent)] transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider block mb-1.5">ID Type</label>
              <select
                value={form.idType}
                onChange={(e) => setForm((f) => ({ ...f, idType: e.target.value }))}
                className="w-full rounded-xl bg-[var(--canvas-sub)] px-3.5 py-2.5 text-[13px] font-semibold text-[var(--text-1)] outline-none ring-1 ring-[var(--border)] focus:ring-[var(--accent)] transition-all"
              >
                <option value="">Select type</option>
                {ID_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider block mb-1.5">ID Number</label>
              <input
                value={form.idNumber}
                onChange={(e) => setForm((f) => ({ ...f, idNumber: e.target.value }))}
                placeholder="ID number"
                className="w-full rounded-xl bg-[var(--canvas-sub)] px-3.5 py-2.5 text-[13px] font-semibold text-[var(--text-1)] outline-none ring-1 ring-[var(--border)] focus:ring-[var(--accent)] transition-all placeholder:text-[var(--text-3)] placeholder:font-normal"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <label className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider">ID Document</label>
              <span className="flex items-center gap-1 text-[10px] font-semibold text-[var(--accent-text)]">
                <Sparkles className="h-3 w-3" />
                AI auto-fill
              </span>
            </div>
            <IdCaptureField
              imageUrl={id.imageUrl}
              uploading={id.uploading}
              extracting={id.extracting}
              onFile={async (file) => {
                const extracted = await id.capture(file);
                if (extracted) applyExtracted(extracted);
              }}
              onClear={() => id.setImageUrl("")}
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider block mb-1.5">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Special requests, vehicle number, etc."
              rows={2}
              className="w-full rounded-xl bg-[var(--canvas-sub)] px-3.5 py-2.5 text-[13px] font-semibold text-[var(--text-1)] outline-none ring-1 ring-[var(--border)] focus:ring-[var(--accent)] transition-all resize-none placeholder:text-[var(--text-3)] placeholder:font-normal"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!form.roomId || !form.guestName.trim() || submitting}
            className="w-full rounded-xl bg-[var(--accent)] py-3.5 text-[14px] font-black text-white shadow-md hover:bg-[var(--accent-hover)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {submitting ? "Checking In..." : "Complete Check-In"}
          </button>
        </div>
      </motion.div>
    </>
  );
}

// ── guest detail / edit modal ─────────────────────────────────────────────

function GuestDetailModal({
  booking,
  currency,
  saving,
  onSave,
  onCheckIn,
  onCheckOut,
  onClose,
}: {
  booking: Booking;
  currency: string;
  saving: boolean;
  onSave: (id: string, body: Record<string, unknown>) => void;
  onCheckIn: (b: Booking) => void;
  onCheckOut: (b: Booking) => void;
  onClose: () => void;
}) {
  const stage = guestStage(booking);
  const [edit, setEdit] = useState({
    guestName: booking.guestName,
    guestPhone: booking.guestPhone ?? "",
    guestEmail: booking.guestEmail ?? "",
    guestAddress: booking.guestAddress ?? "",
    guestIdType: booking.guestIdType ?? "",
    guestIdNumber: booking.guestIdNumber ?? "",
    notes: booking.notes ?? "",
  });
  const id = useIdCapture(booking.guestIdImageUrl ?? "");

  const applyExtracted = (fields: ParsedIdFields) => {
    setEdit((f) => ({
      ...f,
      guestName: fields.fullName || f.guestName,
      guestIdNumber: fields.idNumber || f.guestIdNumber,
      guestAddress: fields.address || f.guestAddress,
      guestIdType: fields.idType || f.guestIdType,
    }));
  };

  const handleSave = () => {
    onSave(booking.id, {
      guestName: edit.guestName.trim(),
      guestPhone: edit.guestPhone.trim() || null,
      guestEmail: edit.guestEmail.trim() || null,
      guestAddress: edit.guestAddress.trim() || null,
      guestIdType: edit.guestIdType || null,
      guestIdNumber: edit.guestIdNumber.trim() || null,
      guestIdImageUrl: id.imageUrl || null,
      notes: edit.notes.trim() || null,
    });
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[95%] max-w-md rounded-2xl bg-[var(--canvas)] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-soft)] shrink-0">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-[var(--text-1)] truncate">{booking.guestName}</h3>
            <p className="text-[11px] text-[var(--text-3)]">
              Room {booking.room.roomNumber} · {STAGE_META[stage].label}
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-[var(--text-3)] hover:bg-[var(--surface)] shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <div className="rounded-2xl bg-[var(--canvas-sub)] p-3.5 flex items-center justify-between gap-3">
            <div className="text-center">
              <p className="text-[9px] font-black uppercase tracking-wider text-[var(--text-3)]">Check-in</p>
              <p className="text-[13px] font-bold text-[var(--text-1)]">{fmtDate(booking.checkIn)}</p>
            </div>
            <div className="h-px flex-1 bg-[var(--border)]" />
            <div className="text-center">
              <p className="text-[9px] font-black uppercase tracking-wider text-[var(--text-3)]">Check-out</p>
              <p className="text-[13px] font-bold text-[var(--text-1)]">{fmtDate(booking.checkOut)}</p>
            </div>
            <div className="h-px flex-1 bg-[var(--border)]" />
            <div className="text-center">
              <p className="text-[9px] font-black uppercase tracking-wider text-[var(--text-3)]">Total</p>
              <p className="text-[13px] font-bold text-[var(--accent-text)]">{formatPrice(booking.totalPrice, currency)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider block mb-1.5">Guest Name</label>
              <input
                value={edit.guestName}
                onChange={(e) => setEdit((f) => ({ ...f, guestName: e.target.value }))}
                className="w-full rounded-xl bg-[var(--canvas-sub)] px-3 py-2 text-[12px] font-semibold text-[var(--text-1)] outline-none ring-1 ring-[var(--border)] focus:ring-[var(--accent)] transition-all"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider block mb-1.5 flex items-center gap-1"><Phone className="h-2.5 w-2.5" />Phone</label>
              <input
                value={edit.guestPhone}
                onChange={(e) => setEdit((f) => ({ ...f, guestPhone: e.target.value }))}
                className="w-full rounded-xl bg-[var(--canvas-sub)] px-3 py-2 text-[12px] font-semibold text-[var(--text-1)] outline-none ring-1 ring-[var(--border)] focus:ring-[var(--accent)] transition-all"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider block mb-1.5 flex items-center gap-1"><Mail className="h-2.5 w-2.5" />Email</label>
              <input
                value={edit.guestEmail}
                onChange={(e) => setEdit((f) => ({ ...f, guestEmail: e.target.value }))}
                className="w-full rounded-xl bg-[var(--canvas-sub)] px-3 py-2 text-[12px] font-semibold text-[var(--text-1)] outline-none ring-1 ring-[var(--border)] focus:ring-[var(--accent)] transition-all"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider block mb-1.5 flex items-center gap-1"><MapPin className="h-2.5 w-2.5" />Address</label>
              <input
                value={edit.guestAddress}
                onChange={(e) => setEdit((f) => ({ ...f, guestAddress: e.target.value }))}
                className="w-full rounded-xl bg-[var(--canvas-sub)] px-3 py-2 text-[12px] font-semibold text-[var(--text-1)] outline-none ring-1 ring-[var(--border)] focus:ring-[var(--accent)] transition-all"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider block mb-1.5">ID Type</label>
              <select
                value={edit.guestIdType}
                onChange={(e) => setEdit((f) => ({ ...f, guestIdType: e.target.value }))}
                className="w-full rounded-xl bg-[var(--canvas-sub)] px-3 py-2 text-[12px] font-semibold text-[var(--text-1)] outline-none ring-1 ring-[var(--border)] focus:ring-[var(--accent)] transition-all"
              >
                <option value="">—</option>
                {ID_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider block mb-1.5 flex items-center gap-1"><IdCard className="h-2.5 w-2.5" />ID Number</label>
              <input
                value={edit.guestIdNumber}
                onChange={(e) => setEdit((f) => ({ ...f, guestIdNumber: e.target.value }))}
                className="w-full rounded-xl bg-[var(--canvas-sub)] px-3 py-2 text-[12px] font-semibold text-[var(--text-1)] outline-none ring-1 ring-[var(--border)] focus:ring-[var(--accent)] transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <label className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider">ID Document</label>
              <span className="flex items-center gap-1 text-[10px] font-semibold text-[var(--accent-text)]">
                <Sparkles className="h-3 w-3" />
                AI auto-fill
              </span>
            </div>
            <IdCaptureField
              imageUrl={id.imageUrl}
              uploading={id.uploading}
              extracting={id.extracting}
              onFile={async (file) => {
                const extracted = await id.capture(file);
                if (extracted) applyExtracted(extracted);
              }}
              onClear={() => id.setImageUrl("")}
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider block mb-1.5">Notes</label>
            <textarea
              value={edit.notes}
              onChange={(e) => setEdit((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="w-full rounded-xl bg-[var(--canvas-sub)] px-3.5 py-2.5 text-[12px] font-semibold text-[var(--text-1)] outline-none ring-1 ring-[var(--border)] focus:ring-[var(--accent)] transition-all resize-none"
            />
          </div>
        </div>

        <div className="p-5 pt-3 border-t border-[var(--border-soft)] shrink-0 space-y-2">
          <button
            onClick={handleSave}
            disabled={saving || !edit.guestName.trim()}
            className="w-full rounded-xl bg-[var(--canvas-sub)] ring-1 ring-[var(--border)] py-3 text-[13px] font-bold text-[var(--text-2)] hover:bg-[var(--surface)] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Save Details
          </button>
          {stage === "ARRIVAL" ? (
            <button
              onClick={() => onCheckIn(booking)}
              className="w-full rounded-xl bg-[var(--accent)] py-3 text-[13px] font-black text-white hover:bg-[var(--accent-hover)] transition-all flex items-center justify-center gap-2"
            >
              <LogIn className="h-4 w-4" /> Check In
            </button>
          ) : (
            <button
              onClick={() => onCheckOut(booking)}
              className="w-full rounded-xl bg-rose-50 py-3 text-[13px] font-black text-rose-600 hover:bg-rose-100 transition-all flex items-center justify-center gap-2"
            >
              <LogOut className="h-4 w-4" /> Check Out
            </button>
          )}
        </div>
      </motion.div>
    </>
  );
}

// ── room QR modal ─────────────────────────────────────────────────────────

function RoomQRModal({
  roomNumber,
  slug,
  onClose,
}: {
  roomNumber: string;
  slug: string;
  onClose: () => void;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    const menuUrl = `${window.location.origin}/menu/${slug}?room=${encodeURIComponent(roomNumber)}`;
    QRCode.toDataURL(menuUrl, { width: 400, margin: 2, color: { dark: "#3e1e0c", light: "#ffffff" } }).then(setDataUrl);
  }, [roomNumber, slug]);

  const handleDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `room-${roomNumber}-qr.png`;
    a.click();
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", damping: 25 }}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[95%] max-w-sm rounded-2xl bg-[var(--canvas)] shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-soft)]">
          <h3 className="text-base font-bold text-[var(--text-1)]">Room {roomNumber} QR Code</h3>
          <button onClick={onClose} className="rounded-full p-2 text-[var(--text-3)] hover:bg-[var(--surface)]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {dataUrl ? (
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-2xl border border-[var(--border)] p-4 bg-[var(--canvas)]">
                <img src={dataUrl} alt={`Room ${roomNumber} QR`} className="w-48 h-48" />
              </div>
              <p className="text-xs text-[var(--text-2)] text-center">
                Scan to order food &amp; drinks to Room {roomNumber}
              </p>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-[13px] font-bold text-white shadow-md hover:bg-[var(--accent-hover)] active:scale-[0.97] transition-all"
              >
                <Download className="h-4 w-4" />
                Download QR
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--text-3)]" />
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}

// ── main tab ──────────────────────────────────────────────────────────────

export default function GuestCheckInTab() {
  const { selectedRestaurant } = useRestaurant();
  const restaurantId = selectedRestaurant?.id;
  const currency = selectedRestaurant?.currency ?? "NPR";
  const slug = selectedRestaurant?.slug ?? "";
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const bookingsPath = restaurantId
    ? `/api/restaurants/${restaurantId}/bookings?status=CONFIRMED,CHECKED_IN&limit=100`
    : "";
  const bookingsQueryKey = ["front-desk-bookings", restaurantId] as const;
  const bookingsQuery = useQuery({
    queryKey: bookingsQueryKey,
    queryFn: () => apiFetch<{ bookings: Booking[] }>(bookingsPath),
    enabled: !!restaurantId,
    initialData: () =>
      restaurantId ? peekApiCache<{ bookings: Booking[] }>(bookingsPath) : undefined,
    initialDataUpdatedAt: 0,
  });
  const bookings = bookingsQuery.data?.bookings ?? EMPTY_BOOKINGS;

  // Rooms — same warm cache key other Hub tabs already prefetch, so the
  // walk-in room picker paints instantly instead of waiting on a fetch.
  const roomsPath = restaurantId ? `/api/restaurants/${restaurantId}/rooms` : "";
  const roomsQuery = useQuery({
    queryKey: ["rooms", restaurantId],
    queryFn: () => apiFetch<Room[]>(roomsPath),
    enabled: !!restaurantId,
    initialData: () => (restaurantId ? peekApiCache<Room[]>(roomsPath) : undefined),
    initialDataUpdatedAt: 0,
  });
  const rooms = roomsQuery.data ?? [];

  useRealtimeSignal(
    restaurantId ? restaurantBookingsTopic(restaurantId) : null,
    () => queryClient.invalidateQueries({ queryKey: bookingsQueryKey }),
  );

  const [filter, setFilter] = useState<ViewFilter>("ARRIVALS");
  const [search, setSearch] = useState("");
  const [showWalkIn, setShowWalkIn] = useState(false);
  const [viewBooking, setViewBooking] = useState<Booking | null>(null);
  const [qrRoom, setQrRoom] = useState<string | null>(null);

  const arrivals = useMemo(
    () => bookings.filter((b) => b.status === "CONFIRMED" && isDueToArrive(b.checkIn)),
    [bookings],
  );
  const inHouse = useMemo(() => bookings.filter((b) => b.status === "CHECKED_IN"), [bookings]);
  const departures = useMemo(() => inHouse.filter((b) => isDueToday(b.checkOut)), [inHouse]);

  const bySearch = (list: Booking[]) =>
    !search
      ? list
      : list.filter(
          (b) =>
            b.guestName.toLowerCase().includes(search.toLowerCase()) ||
            b.room.roomNumber.includes(search) ||
            (b.guestPhone && b.guestPhone.includes(search)),
        );

  const visible = bySearch(
    filter === "ARRIVALS" ? arrivals :
    filter === "IN_HOUSE" ? inHouse :
    filter === "DEPARTURES" ? departures :
    [...arrivals, ...inHouse],
  );

  // Every booking mutation flows through here — status transitions and guest
  // detail edits both PATCH the same endpoint, so one mutation covers both.
  const patchMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiFetch<Booking>(`/api/restaurants/${restaurantId}/bookings/${id}`, { method: "PATCH", body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: bookingsQueryKey }),
    onError: (err) => showToast(err instanceof Error ? err.message : "Update failed", "error"),
  });

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiFetch<Booking>(`/api/restaurants/${restaurantId}/bookings`, { method: "POST", body: payload }),
    onSuccess: (booking) => {
      queryClient.invalidateQueries({ queryKey: bookingsQueryKey });
      queryClient.invalidateQueries({ queryKey: ["rooms", restaurantId] });
      showToast(`${booking.guestName} checked in to Room ${booking.room.roomNumber}`);
      setShowWalkIn(false);
    },
    onError: (err) => showToast(err instanceof Error ? err.message : "Check-in failed", "error"),
  });

  const handleCheckIn = (b: Booking) => {
    patchMutation.mutate(
      { id: b.id, body: { status: "CHECKED_IN" } },
      { onSuccess: () => { showToast(`${b.guestName} checked in to Room ${b.room.roomNumber}`); setViewBooking(null); } },
    );
  };
  const handleCheckOut = (b: Booking) => {
    patchMutation.mutate(
      { id: b.id, body: { status: "CHECKED_OUT" } },
      {
        onSuccess: () => {
          showToast(`${b.guestName} checked out of Room ${b.room.roomNumber}`);
          queryClient.invalidateQueries({ queryKey: ["rooms", restaurantId] });
          setViewBooking(null);
        },
      },
    );
  };
  const handleSaveDetails = (id: string, body: Record<string, unknown>) => {
    patchMutation.mutate({ id, body }, { onSuccess: () => showToast("Guest details updated") });
  };

  const FILTERS: { id: ViewFilter; label: string; count: number }[] = [
    { id: "ARRIVALS", label: "Arrivals", count: arrivals.length },
    { id: "IN_HOUSE", label: "In House", count: inHouse.length },
    { id: "DEPARTURES", label: "Departures", count: departures.length },
    { id: "ALL", label: "All", count: arrivals.length + inHouse.length },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="grid grid-cols-3 gap-2 flex-1">
          <div className="rounded-xl bg-[var(--status-info-bg)] ring-1 ring-[var(--status-info-border)] px-3 py-2">
            <p className="text-[16px] font-black text-[var(--status-info-text)] leading-tight">{arrivals.length}</p>
            <p className="text-[9px] font-bold uppercase tracking-wide text-[var(--status-info-text)] opacity-80">Arriving</p>
          </div>
          <div className="rounded-xl bg-[var(--accent-muted)] ring-1 ring-[var(--accent-border)] px-3 py-2">
            <p className="text-[16px] font-black text-[var(--accent-text)] leading-tight">{inHouse.length}</p>
            <p className="text-[9px] font-bold uppercase tracking-wide text-[var(--accent-text)] opacity-80">In House</p>
          </div>
          <div className="rounded-xl bg-amber-50 ring-1 ring-amber-100 px-3 py-2">
            <p className="text-[16px] font-black text-amber-700 leading-tight">{departures.length}</p>
            <p className="text-[9px] font-bold uppercase tracking-wide text-amber-600 opacity-80">Departing</p>
          </div>
        </div>
        <button
          onClick={() => setShowWalkIn(true)}
          className="flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 py-2 text-[13px] font-bold text-white shadow-md shadow-[var(--accent)]/20 hover:bg-[var(--accent-hover)] active:scale-[0.97] transition-all shrink-0"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
          Walk-In
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-3)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, room, phone..."
            className="w-full rounded-xl bg-[var(--canvas-sub)] ring-1 ring-[var(--border)] pl-9 pr-4 py-2.5 text-[13px] placeholder:text-[var(--text-3)] focus:ring-[var(--accent)] focus:bg-[var(--canvas)] outline-none transition-all"
          />
        </div>
        <ScrollableRow className="shrink-0" innerClassName="flex gap-1 p-1 rounded-xl bg-[var(--canvas-sub)] ring-1 ring-[var(--border)]">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold whitespace-nowrap transition-all",
                filter === f.id ? "bg-[var(--canvas)] text-[var(--text-1)] shadow-sm" : "text-[var(--text-3)] hover:text-[var(--text-1)]",
              )}
            >
              {f.label}
              {f.count > 0 && (
                <span className={cn(
                  "rounded-full px-1.5 py-0.5 text-[9px] font-black",
                  filter === f.id ? "bg-[var(--accent-muted)] text-[var(--accent-text)]" : "bg-[var(--surface)] text-[var(--text-3)]",
                )}>
                  {f.count}
                </span>
              )}
            </button>
          ))}
        </ScrollableRow>
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-[var(--text-3)]">
          <BedDouble className="h-12 w-12 mb-3 opacity-40" />
          <p className="text-sm font-semibold text-[var(--text-2)]">
            {filter === "ARRIVALS" ? "No arrivals due" :
             filter === "IN_HOUSE" ? "No guests in house" :
             filter === "DEPARTURES" ? "No departures today" : "No guests found"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <AnimatePresence mode="popLayout">
            {visible.map((b) => (
              <GuestCard
                key={b.id}
                booking={b}
                busy={patchMutation.isPending && patchMutation.variables?.id === b.id}
                onCheckIn={handleCheckIn}
                onCheckOut={handleCheckOut}
                onView={setViewBooking}
                onRoomQR={(booking) => setQrRoom(booking.room.roomNumber)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {showWalkIn && (
          <WalkInModal
            rooms={rooms}
            submitting={createMutation.isPending}
            onSubmit={(payload) => createMutation.mutate(payload)}
            onClose={() => setShowWalkIn(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewBooking && (
          <GuestDetailModal
            booking={viewBooking}
            currency={currency}
            saving={patchMutation.isPending}
            onSave={handleSaveDetails}
            onCheckIn={handleCheckIn}
            onCheckOut={handleCheckOut}
            onClose={() => setViewBooking(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {qrRoom && <RoomQRModal roomNumber={qrRoom} slug={slug} onClose={() => setQrRoom(null)} />}
      </AnimatePresence>
    </div>
  );
}
