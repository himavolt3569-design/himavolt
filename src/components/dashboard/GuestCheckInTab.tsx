"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BedDouble,
  Plus,
  X,
  Loader2,
  Phone,
  Mail,
  User,
  IdCard,
  Check,
  LogOut,
  QrCode,
  Download,
  Search,
  Users,
  Calendar,
  ClipboardList,
  Camera,
  Upload,
  Eye,
  Sparkles,
} from "lucide-react";
import { useRestaurant } from "@/context/RestaurantContext";
import { useToast } from "@/context/ToastContext";
import { apiFetch } from "@/lib/api-client";
import QRCode from "qrcode";
import { createWorker } from "tesseract.js";
import { uploadFile } from "@/lib/upload";

interface GuestCheckIn {
  id: string;
  guestName: string;
  phone: string | null;
  email: string | null;
  idType: string | null;
  idNumber: string | null;
  idImageUrl: string | null;
  address: string | null;
  dob: string | null;
  nationality: string;
  roomNo: string;
  adults: number;
  children: number;
  checkInAt: string;
  checkOutAt: string | null;
  notes: string | null;
  status: string;
}

const ID_TYPES = ["Citizenship", "Passport", "Driving License", "Voter ID", "PAN Card", "Other"];

const BLANK_FORM = {
  guestName: "",
  phone: "",
  email: "",
  idType: "",
  idNumber: "",
  address: "",
  dob: "",
  nationality: "Nepali",
  roomNo: "",
  adults: 1,
  children: 0,
  notes: "",
  idImageUrl: "",
};

function parseIdText(text: string): {
  fullName?: string;
  dob?: string;
  idNumber?: string;
  address?: string;
  nationality?: string;
  idType?: string;
} {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const upper = text.toUpperCase();

  let idType: string | undefined;
  if (upper.includes("PASSPORT")) idType = "PASSPORT";
  else if (upper.includes("DRIVING") || upper.includes("DRIVER")) idType = "DRIVING_LICENSE";
  else if (upper.includes("CITIZENSHIP") || upper.includes("CITIZEN")) idType = "CITIZENSHIP";
  else if (upper.includes("NATIONAL ID") || upper.includes("NATIONAL IDENTITY")) idType = "NATIONAL_ID";

  let fullName: string | undefined;
  for (const line of lines) {
    const m = line.match(/(?:name|full\s*name|surname)[\s:]+([A-Za-z\s]{3,50})/i);
    if (m) { fullName = m[1].trim(); break; }
  }

  const dobMatch =
    text.match(/(?:dob|date of birth|birth date|born)[\s:]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i) ||
    text.match(/(\d{4}[\/\-]\d{2}[\/\-]\d{2})/);
  const dob = dobMatch?.[1];

  const idMatch =
    text.match(/(?:no|number|id no|passport no|license no)[\s:.#]*([A-Z0-9]{6,15})/i) ||
    text.match(/\b([A-Z]{1,3}[0-9]{6,10})\b/) ||
    text.match(/\b([0-9]{8,12})\b/);
  const idNumber = idMatch?.[1];

  const natMatch = text.match(/(?:nationality|country)[\s:]+([A-Za-z\s]{3,20})/i);
  const nationality = natMatch?.[1].trim();

  const addrMatch = text.match(/(?:address|addr)[\s:]+([^\n]+)/i);
  const address = addrMatch?.[1].trim();

  return { fullName, dob, idNumber, address, nationality, idType };
}

export default function GuestCheckInTab() {
  const { selectedRestaurant, restaurants } = useRestaurant();
  const { showToast } = useToast();
  const restaurant = selectedRestaurant ?? restaurants[0];

  const [checkIns, setCheckIns] = useState<GuestCheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<"CHECKED_IN" | "CHECKED_OUT" | "ALL">("CHECKED_IN");
  const [search, setSearch] = useState("");
  const [qrRoom, setQrRoom] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState(false);
  const [extractingOcr, setExtractingOcr] = useState(false);
  const [viewGuest, setViewGuest] = useState<GuestCheckIn | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchCheckIns = useCallback(async () => {
    if (!restaurant) return;
    setLoading(true);
    try {
      const data = await apiFetch<GuestCheckIn[]>(
        `/api/restaurants/${restaurant.id}/guest-checkins`
      );
      setCheckIns(Array.isArray(data) ? data : []);
    } catch {
      showToast("Failed to load guest records", "error");
    } finally {
      setLoading(false);
    }
  }, [restaurant?.id]);

  useEffect(() => {
    fetchCheckIns();
  }, [fetchCheckIns]);

  const handleCheckIn = async () => {
    if (!restaurant || !form.guestName.trim() || !form.roomNo.trim()) return;
    setSubmitting(true);
    try {
      const newCheckIn = await apiFetch<GuestCheckIn>(
        `/api/restaurants/${restaurant.id}/guest-checkins`,
        { method: "POST", body: { ...form, adults: Number(form.adults), children: Number(form.children) } }
      );
      setCheckIns((prev) => [newCheckIn, ...prev]);
      setForm(BLANK_FORM);
      setShowForm(false);
      showToast(`${newCheckIn.guestName} checked in to Room ${newCheckIn.roomNo}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Check-in failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckOut = async (guest: GuestCheckIn) => {
    if (!restaurant) return;
    try {
      const updated = await apiFetch<GuestCheckIn>(
        `/api/restaurants/${restaurant.id}/guest-checkins/${guest.id}`,
        { method: "PATCH", body: { status: "CHECKED_OUT" } }
      );
      setCheckIns((prev) => prev.map((g) => (g.id === guest.id ? updated : g)));
      showToast(`${guest.guestName} checked out from Room ${guest.roomNo}`);
    } catch {
      showToast("Check-out failed", "error");
    }
  };

  const handleGenerateRoomQR = async (roomNo: string) => {
    if (!restaurant) return;
    setQrRoom(roomNo);
    const menuUrl = `${window.location.origin}/menu/${restaurant.slug}?room=${roomNo}`;
    const dataUrl = await QRCode.toDataURL(menuUrl, {
      width: 400,
      margin: 2,
      color: { dark: "#3e1e0c", light: "#ffffff" },
    });
    setQrDataUrl(dataUrl);
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl || !qrRoom) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `room-${qrRoom}-qr.png`;
    a.click();
  };

  const handleIdUpload = async (file: File) => {
    setUploadingId(true);
    try {
      const url = await uploadFile(file, "guest-ids");
      setForm((f) => ({ ...f, idImageUrl: url }));
      showToast("ID uploaded — extracting details...", "info");

      // Auto-extract fields via free client-side OCR (Tesseract.js)
      setExtractingOcr(true);
      try {
        const worker = await createWorker("eng");
        const { data: { text } } = await worker.recognize(file);
        await worker.terminate();
        const extracted = parseIdText(text);
        setForm((f) => ({
          ...f,
          guestName: extracted.fullName || f.guestName,
          dob: extracted.dob || f.dob,
          idNumber: extracted.idNumber || f.idNumber,
          address: extracted.address || f.address,
          nationality: extracted.nationality || f.nationality,
          idType: extracted.idType || f.idType,
        }));
        if (extracted.fullName || extracted.idNumber) {
          showToast("ID details auto-filled!", "success");
        }
      } catch {
        // OCR failure is non-fatal
      } finally {
        setExtractingOcr(false);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Upload failed", "error");
      setUploadingId(false);
    } finally {
      setUploadingId(false);
    }
  };

  const filtered = checkIns.filter((g) => {
    const matchStatus = filter === "ALL" || g.status === filter;
    const matchSearch =
      !search ||
      g.guestName.toLowerCase().includes(search.toLowerCase()) ||
      g.roomNo.includes(search) ||
      (g.phone && g.phone.includes(search));
    return matchStatus && matchSearch;
  });

  const occupiedRooms = checkIns.filter((g) => g.status === "CHECKED_IN").map((g) => g.roomNo);

  if (!restaurant) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[var(--text-3)]">
        <BedDouble className="h-10 w-10 mb-3" />
        <p className="text-sm font-medium">Select a restaurant first</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[var(--text-1)]">Guest Check-In</h2>
          <p className="text-sm text-[var(--text-3)]">
            {occupiedRooms.length} room{occupiedRooms.length !== 1 ? "s" : ""} occupied
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setQrRoom("select")}
            className="flex items-center gap-2 rounded-xl border border-[var(--accent-border)] bg-[var(--accent-muted)] px-4 py-2 text-sm font-bold text-[var(--accent-text)] hover:bg-[var(--accent-muted)] transition-all"
          >
            <QrCode className="h-4 w-4" />
            Room QR
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-xl bg-[var(--accent-hover)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--accent-hover)] shadow-md shadow-[var(--accent)]/20/20 transition-all"
          >
            <Plus className="h-4 w-4" />
            Check In Guest
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-3)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, room, phone..."
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)] focus:bg-[var(--canvas)] transition-all"
          />
        </div>
        <div className="flex gap-1">
          {(["CHECKED_IN", "CHECKED_OUT", "ALL"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                filter === s ? "bg-[var(--accent-hover)] text-white" : "bg-[var(--surface)] text-[var(--text-2)] hover:bg-[var(--surface-alt)]"
              }`}
            >
              {s === "CHECKED_IN" ? "In" : s === "CHECKED_OUT" ? "Out" : "All"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--text-3)]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-[var(--text-3)]">
          <BedDouble className="h-12 w-12 mb-3 opacity-40" />
          <p className="text-sm font-semibold text-[var(--text-2)]">No guests found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((guest) => (
            <motion.div
              key={guest.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-2xl border bg-[var(--canvas)] p-4 shadow-sm hover:shadow-md transition-all ${
                guest.status === "CHECKED_IN" ? "border-[var(--accent-border)]" : "border-[var(--border)]"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold ${
                    guest.status === "CHECKED_IN" ? "bg-[var(--accent-muted)] text-[#b25c1c]" : "bg-[var(--surface)] text-[var(--text-2)]"
                  }`}>
                    {guest.roomNo}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[var(--text-1)] leading-none">{guest.guestName}</p>
                    <p className="text-[10px] text-[var(--text-3)] mt-0.5">
                      <Users className="h-3 w-3 inline mr-0.5" />
                      {guest.adults}A {guest.children > 0 ? `+ ${guest.children}C` : ""}
                    </p>
                  </div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  guest.status === "CHECKED_IN" ? "bg-[var(--accent-muted)] text-[#b25c1c]" : "bg-[var(--surface)] text-[var(--text-2)]"
                }`}>
                  {guest.status === "CHECKED_IN" ? "In" : "Out"}
                </span>
              </div>

              <div className="space-y-1 mb-3">
                {guest.phone && (
                  <p className="text-xs text-[var(--text-2)] flex items-center gap-1.5">
                    <Phone className="h-3 w-3 text-[var(--text-3)]" />
                    {guest.phone}
                  </p>
                )}
                {guest.idType && guest.idNumber && (
                  <p className="text-xs text-[var(--text-2)] flex items-center gap-1.5">
                    <IdCard className="h-3 w-3 text-[var(--text-3)]" />
                    {guest.idType}: {guest.idNumber}
                  </p>
                )}
                <p className="text-xs text-[var(--text-3)] flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" />
                  {new Date(guest.checkInAt).toLocaleDateString("en-NP", {
                    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                  })}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setViewGuest(guest)}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-[var(--surface)] py-1.5 text-xs font-bold text-[var(--text-2)] hover:bg-[var(--surface-alt)] transition-colors"
                >
                  <Eye className="h-3 w-3" />
                  View
                </button>
                <button
                  onClick={() => handleGenerateRoomQR(guest.roomNo)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--accent-muted)] text-[var(--accent-text)] hover:bg-[var(--accent-muted)] transition-colors"
                  title="Room QR"
                >
                  <QrCode className="h-3.5 w-3.5" />
                </button>
                {guest.status === "CHECKED_IN" && (
                  <button
                    onClick={() => handleCheckOut(guest)}
                    className="flex items-center gap-1 rounded-xl bg-red-50 px-2 py-1.5 text-xs font-bold text-red-500 hover:bg-red-100 transition-colors"
                    title="Check Out"
                  >
                    <LogOut className="h-3 w-3" />
                    Out
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Check-In Form Modal */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowForm(false)}
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
                  <ClipboardList className="h-5 w-5 text-[#eaa94d]" />
                  <h3 className="text-base font-bold text-[var(--text-1)]">Guest Check-In</h3>
                </div>
                <button onClick={() => setShowForm(false)} className="rounded-full p-2 text-[var(--text-3)] hover:bg-[var(--surface)]">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <label className="text-xs font-bold text-[var(--text-2)] uppercase tracking-wider block mb-1.5">
                    Room Number <span className="text-red-400">*</span>
                  </label>
                  <input
                    value={form.roomNo}
                    onChange={(e) => setForm((f) => ({ ...f, roomNo: e.target.value }))}
                    placeholder="e.g. 101, A2, Deluxe-1"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)] focus:bg-[var(--canvas)] transition-all"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[var(--text-2)] uppercase tracking-wider block mb-1.5">
                    Guest Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    value={form.guestName}
                    onChange={(e) => setForm((f) => ({ ...f, guestName: e.target.value }))}
                    placeholder="Full name as per ID"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)] focus:bg-[var(--canvas)] transition-all"
                  />
                </div>

                {/* Phone + Adults */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-[var(--text-2)] uppercase tracking-wider block mb-1.5">Phone</label>
                    <input
                      value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                      placeholder="+977 98XX-XXXXXX"
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)] focus:bg-[var(--canvas)] transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[var(--text-2)] uppercase tracking-wider block mb-1.5">Guests</label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <input
                          type="number" min="1"
                          value={form.adults}
                          onChange={(e) => setForm((f) => ({ ...f, adults: Number(e.target.value) }))}
                          className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] px-3 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)] focus:bg-[var(--canvas)] transition-all"
                          title="Adults"
                        />
                        <p className="text-[9px] text-[var(--text-3)] text-center mt-0.5">Adults</p>
                      </div>
                      <div className="flex-1">
                        <input
                          type="number" min="0"
                          value={form.children}
                          onChange={(e) => setForm((f) => ({ ...f, children: Number(e.target.value) }))}
                          className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] px-3 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)] focus:bg-[var(--canvas)] transition-all"
                          title="Children"
                        />
                        <p className="text-[9px] text-[var(--text-3)] text-center mt-0.5">Children</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ID Type + Number */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-[var(--text-2)] uppercase tracking-wider block mb-1.5">ID Type</label>
                    <select
                      value={form.idType}
                      onChange={(e) => setForm((f) => ({ ...f, idType: e.target.value }))}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)] focus:bg-[var(--canvas)] transition-all"
                    >
                      <option value="">Select type</option>
                      {ID_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[var(--text-2)] uppercase tracking-wider block mb-1.5">ID Number</label>
                    <input
                      value={form.idNumber}
                      onChange={(e) => setForm((f) => ({ ...f, idNumber: e.target.value }))}
                      placeholder="ID number"
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)] focus:bg-[var(--canvas)] transition-all"
                    />
                  </div>
                </div>

                {/* Address + DOB */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-[var(--text-2)] uppercase tracking-wider block mb-1.5">Address</label>
                    <input
                      value={form.address}
                      onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                      placeholder="City / District"
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)] focus:bg-[var(--canvas)] transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[var(--text-2)] uppercase tracking-wider block mb-1.5">Date of Birth</label>
                    <input
                      type="date"
                      value={form.dob}
                      onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)] focus:bg-[var(--canvas)] transition-all"
                    />
                  </div>
                </div>

                {/* ID Image with OCR auto-fill */}
                <div>
                  <label className="text-xs font-bold text-[var(--text-2)] uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                    <Camera className="h-3.5 w-3.5" />
                    ID Document Photo
                    <span className="ml-auto flex items-center gap-1 text-[10px] font-semibold text-purple-500 normal-case tracking-normal">
                      <Sparkles className="h-3 w-3" />
                      AI auto-fill
                    </span>
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleIdUpload(file);
                    }}
                  />
                  {form.idImageUrl ? (
                    <div className="relative rounded-xl border border-[var(--border)] overflow-hidden">
                      <img src={form.idImageUrl} alt="ID" className="w-full h-32 object-cover" />
                      {extractingOcr && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 backdrop-blur-[2px]">
                          <Loader2 className="h-6 w-6 animate-spin text-white" />
                          <p className="text-xs font-semibold text-white flex items-center gap-1">
                            <Sparkles className="h-3.5 w-3.5 text-purple-300" />
                            Reading ID...
                          </p>
                        </div>
                      )}
                      <button
                        onClick={() => setForm((f) => ({ ...f, idImageUrl: "" }))}
                        className="absolute top-2 right-2 rounded-full bg-[var(--canvas)]/90 p-1.5 text-[var(--text-2)] hover:bg-red-50 hover:text-red-500 shadow-sm"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingId}
                      className="w-full flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--border)] py-6 text-[var(--text-3)] hover:border-[#eaa94d] hover:text-[#eaa94d] hover:bg-[#eaa94d]/5 transition-all disabled:opacity-50"
                    >
                      {uploadingId ? (
                        <>
                          <Loader2 className="h-6 w-6 animate-spin" />
                          <span className="text-xs font-semibold">Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Camera className="h-6 w-6" />
                          <span className="text-xs font-semibold">Take photo or upload ID</span>
                          <span className="text-[10px] text-purple-400 flex items-center gap-1">
                            <Sparkles className="h-3 w-3" />
                            Fields will auto-fill
                          </span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-[var(--text-2)] uppercase tracking-wider block mb-1.5">Notes</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Special requests, vehicle number, etc."
                    rows={2}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)] focus:bg-[var(--canvas)] transition-all"
                  />
                </div>

                <button
                  onClick={handleCheckIn}
                  disabled={!form.guestName.trim() || !form.roomNo.trim() || submitting}
                  className="w-full rounded-xl bg-[var(--accent-hover)] py-3 text-sm font-bold text-white hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {submitting ? "Checking In..." : "Complete Check-In"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {qrRoom && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setQrRoom(null); setQrDataUrl(null); }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[95%] max-w-sm rounded-2xl bg-[var(--canvas)] shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-soft)]">
                <h3 className="text-base font-bold text-[var(--text-1)]">
                  {qrRoom === "select" ? "Generate Room QR" : `Room ${qrRoom} QR Code`}
                </h3>
                <button onClick={() => { setQrRoom(null); setQrDataUrl(null); }} className="rounded-full p-2 text-[var(--text-3)] hover:bg-[var(--surface)]">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                {qrRoom === "select" ? (
                  <div>
                    <label className="text-xs font-bold text-[var(--text-2)] uppercase tracking-wider block mb-2">Room Number</label>
                    <div className="flex gap-2">
                      <input
                        placeholder="e.g. 101"
                        id="qr-room-input"
                        className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)] focus:bg-[var(--canvas)] transition-all"
                      />
                      <button
                        onClick={() => {
                          const input = document.getElementById("qr-room-input") as HTMLInputElement;
                          if (input.value.trim()) handleGenerateRoomQR(input.value.trim());
                        }}
                        className="rounded-xl bg-[var(--accent-hover)] px-4 py-2.5 text-sm font-bold text-white hover:bg-[var(--accent-hover)] transition-colors"
                      >
                        Generate
                      </button>
                    </div>
                    {occupiedRooms.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs text-[var(--text-3)] mb-2">Occupied rooms:</p>
                        <div className="flex flex-wrap gap-2">
                          {occupiedRooms.map((r) => (
                            <button
                              key={r}
                              onClick={() => handleGenerateRoomQR(r)}
                              className="rounded-lg border border-[var(--accent-border)] bg-[var(--accent-muted)] px-2.5 py-1 text-xs font-bold text-[var(--accent-text)] hover:bg-[var(--accent-muted)] transition-colors"
                            >
                              Room {r}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : qrDataUrl ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="rounded-2xl border border-[var(--border)] p-4 bg-[var(--canvas)]">
                      <img src={qrDataUrl} alt={`Room ${qrRoom} QR`} className="w-48 h-48" />
                    </div>
                    <p className="text-xs text-[var(--text-2)] text-center">
                      Scan to access Room {qrRoom} menu & service
                    </p>
                    <button
                      onClick={handleDownloadQR}
                      className="flex items-center gap-2 rounded-xl bg-[var(--accent-hover)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--accent-hover)] transition-colors"
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
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewGuest && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setViewGuest(null)}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[95%] max-w-sm rounded-2xl bg-[var(--canvas)] shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-soft)]">
                <h3 className="text-base font-bold text-[var(--text-1)]">Guest Details</h3>
                <button onClick={() => setViewGuest(null)} className="rounded-full p-2 text-[var(--text-3)] hover:bg-[var(--surface)]">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-5 space-y-3">
                <div className="flex items-center gap-3 pb-3 border-b border-[var(--border-soft)]">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-muted)] text-lg font-black text-[var(--accent-text)]">
                    {viewGuest.roomNo}
                  </div>
                  <div>
                    <p className="text-base font-bold text-[var(--text-1)]">{viewGuest.guestName}</p>
                    <p className="text-xs text-[var(--text-3)]">{viewGuest.nationality}</p>
                  </div>
                </div>
                {[
                  { label: "Phone", value: viewGuest.phone },
                  { label: "Email", value: viewGuest.email },
                  { label: "ID Type", value: viewGuest.idType },
                  { label: "ID Number", value: viewGuest.idNumber },
                  { label: "Address", value: viewGuest.address },
                  { label: "Date of Birth", value: viewGuest.dob },
                  { label: "Adults", value: String(viewGuest.adults) },
                  { label: "Children", value: viewGuest.children > 0 ? String(viewGuest.children) : null },
                  { label: "Check-In", value: new Date(viewGuest.checkInAt).toLocaleString("en-NP") },
                  { label: "Check-Out", value: viewGuest.checkOutAt ? new Date(viewGuest.checkOutAt).toLocaleString("en-NP") : null },
                  { label: "Notes", value: viewGuest.notes },
                ].filter((r) => r.value).map((row) => (
                  <div key={row.label} className="flex justify-between text-sm">
                    <span className="text-[var(--text-3)] text-xs font-semibold">{row.label}</span>
                    <span className="text-[var(--text-1)] font-medium text-xs text-right max-w-[60%]">{row.value}</span>
                  </div>
                ))}
                {viewGuest.idImageUrl && (
                  <div>
                    <p className="text-xs text-[var(--text-3)] font-semibold mb-2">ID Document</p>
                    <img src={viewGuest.idImageUrl} alt="ID" className="w-full rounded-xl border border-[var(--border)] object-cover" />
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
