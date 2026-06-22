"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle,
  Check,
  Clock,
  XCircle,
  BedDouble,
  Calendar,
  Users,
  MapPin,
  Phone,
  Mountain,
  Loader2,
  CreditCard,
  ArrowLeft,
  ArrowRight,
  Upload,
  Ban,
  LogIn,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { uploadFile } from "@/lib/upload";

interface BookingDetail {
  id: string;
  guestName: string;
  guestPhone: string | null;
  guestEmail: string | null;
  checkIn: string;
  checkOut: string;
  nights: number;
  totalPrice: number;
  advanceAmount: number;
  advancePaid: boolean;
  paymentStatus: string;
  paymentMethod: string | null;
  status: string;
  adults: number;
  children: number;
  notes: string | null;
  receiptUrl: string | null;
  cancelReason: string | null;
  cancelRequestedAt: string | null;
  cancelledBy: string | null;
  refundStatus: string | null;
  room: {
    roomNumber: string;
    name: string | null;
    type: string;
    floor: number;
    bedType: string | null;
    bedCount: number;
    imageUrls: string[];
  };
  restaurant: {
    name: string;
    slug: string;
    imageUrl: string | null;
    phone: string;
    address: string;
    city: string;
    currency: string;
  };
}

const STATUS_CONFIG: Record<
  string,
  { label: string; card: string; iconWrap: string; icon: string; labelColor: string; Icon: typeof CheckCircle }
> = {
  PENDING: {
    label: "Awaiting Confirmation",
    card: "bg-amber-50 ring-amber-100",
    iconWrap: "bg-amber-100",
    icon: "text-amber-600",
    labelColor: "text-amber-700",
    Icon: Clock,
  },
  CONFIRMED: {
    label: "Booking Confirmed",
    card: "bg-emerald-50 ring-emerald-100",
    iconWrap: "bg-emerald-100",
    icon: "text-emerald-600",
    labelColor: "text-emerald-700",
    Icon: CheckCircle,
  },
  CHECKED_IN: {
    label: "Checked In",
    card: "bg-blue-50 ring-blue-100",
    iconWrap: "bg-blue-100",
    icon: "text-blue-600",
    labelColor: "text-blue-700",
    Icon: CheckCircle,
  },
  CHECKED_OUT: {
    label: "Checked Out",
    card: "bg-gray-50 ring-gray-100",
    iconWrap: "bg-gray-100",
    icon: "text-gray-600",
    labelColor: "text-gray-700",
    Icon: CheckCircle,
  },
  CANCELLED: {
    label: "Cancelled",
    card: "bg-red-50 ring-red-100",
    iconWrap: "bg-red-100",
    icon: "text-red-600",
    labelColor: "text-red-700",
    Icon: XCircle,
  },
};

const PROGRESS_STEPS = ["Booked", "Confirmed", "Checked in", "Checked out"];
const STATUS_TO_STEP: Record<string, number> = {
  PENDING: 0,
  CONFIRMED: 1,
  CHECKED_IN: 2,
  CHECKED_OUT: 3,
};

/** Airbnb-style horizontal progress so the guest always sees where their stay is. */
function BookingProgress({ status }: { status: string }) {
  if (status === "CANCELLED") return null;
  const current = STATUS_TO_STEP[status] ?? 0;
  return (
    <div className="rounded-3xl bg-[var(--canvas)] ring-1 ring-[var(--border)] p-5 shadow-sm">
      <div className="flex items-start">
        {PROGRESS_STEPS.map((label, i) => {
          const done = i <= current;
          return (
            <div key={label} className="flex flex-1 items-start last:flex-none">
              <div className="flex flex-col items-center gap-1.5 w-12">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-bold transition-colors ${
                    done
                      ? "bg-[var(--accent)] text-white"
                      : "bg-[var(--canvas-sub)] text-[var(--text-3)] ring-1 ring-[var(--border)]"
                  }`}
                >
                  {done ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span
                  className={`text-[10px] font-semibold text-center leading-tight ${
                    done ? "text-[var(--text-1)]" : "text-[var(--text-3)]"
                  }`}
                >
                  {label}
                </span>
              </div>
              {i < PROGRESS_STEPS.length - 1 && (
                <div
                  className={`h-0.5 flex-1 mt-4 rounded-full ${
                    i < current ? "bg-[var(--accent)]" : "bg-[var(--border)]"
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

/** Prominent check-in / check-out hero — the clearest possible "when" for the guest. */
function StayDates({
  checkIn,
  checkOut,
  nights,
}: {
  checkIn: string;
  checkOut: string;
  nights: number;
}) {
  const fmt = (d: string) => {
    const date = new Date(d);
    return {
      weekday: date.toLocaleDateString("en-GB", { weekday: "short" }),
      date: date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    };
  };
  const ci = fmt(checkIn);
  const co = fmt(checkOut);
  return (
    <div className="rounded-3xl bg-[var(--canvas)] ring-1 ring-[var(--border)] p-5 shadow-sm">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div>
          <div className="flex items-center gap-1.5 text-[var(--accent-text)] mb-1">
            <LogIn className="h-3.5 w-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Check-in
            </span>
          </div>
          <p className="text-[18px] font-extrabold leading-none text-[var(--text-1)]">
            {ci.weekday}
          </p>
          <p className="text-[12px] text-[var(--text-2)] mt-0.5">{ci.date}</p>
        </div>

        <div className="flex flex-col items-center px-1">
          <span className="rounded-full bg-[var(--accent-muted)] px-2.5 py-0.5 text-[10px] font-bold text-[var(--accent-text)] whitespace-nowrap">
            {nights} night{nights > 1 ? "s" : ""}
          </span>
          <ArrowRight className="mt-1 h-4 w-4 text-[var(--text-3)]" />
        </div>

        <div className="text-right">
          <div className="flex items-center justify-end gap-1.5 text-[var(--accent-text)] mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Check-out
            </span>
            <LogOut className="h-3.5 w-3.5" />
          </div>
          <p className="text-[18px] font-extrabold leading-none text-[var(--text-1)]">
            {co.weekday}
          </p>
          <p className="text-[12px] text-[var(--text-2)] mt-0.5">{co.date}</p>
        </div>
      </div>
    </div>
  );
}

export default function BookingConfirmationPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const searchParams = useSearchParams();
  const paymentResult = searchParams.get("payment");

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [actionMsg, setActionMsg] = useState("");
  const receiptInputRef = useRef<HTMLInputElement>(null);

  const loadBooking = useCallback(async () => {
    try {
      const r = await fetch(`/api/public/hotel/booking/${bookingId}`);
      const d = await r.json();
      setBooking(d.booking ?? null);
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    loadBooking();
  }, [loadBooking]);

  const handleReceiptUpload = async (file: File | null) => {
    if (!file || uploadingReceipt) return;
    setUploadingReceipt(true);
    setActionMsg("");
    try {
      const url = await uploadFile(file, "booking-receipts");
      const res = await fetch(`/api/public/hotel/booking/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "receipt", receiptUrl: url }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || "Could not save receipt.");
      }
      await loadBooking();
      setActionMsg("Receipt uploaded — the hotel will verify your payment shortly.");
    } catch {
      setActionMsg("Could not upload receipt. Please try again.");
    } finally {
      setUploadingReceipt(false);
      if (receiptInputRef.current) receiptInputRef.current.value = "";
    }
  };

  const handleCancelRequest = async () => {
    if (!cancelReason.trim() || cancelling) return;
    setCancelling(true);
    setActionMsg("");
    try {
      const res = await fetch(`/api/public/hotel/booking/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel-request", reason: cancelReason.trim() }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || "Failed");
      }
      await loadBooking();
      setCancelOpen(false);
      setCancelReason("");
      setActionMsg("Cancellation requested — the hotel will review and respond.");
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : "Could not request cancellation.");
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    // No spinner/blank flash — paint the calm branded shell instantly while the
    // booking loads in the background.
    return (
      <div className="min-h-screen bg-[var(--canvas)] flex flex-col items-center justify-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent)] shadow-lg shadow-[var(--accent)]/30">
          <Mountain className="h-6 w-6 text-white" strokeWidth={2.5} />
        </div>
        <span className="text-[15px] font-bold text-[var(--text-1)]">
          Hima<span className="text-[var(--accent)]">Volt</span>
        </span>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <XCircle className="mx-auto h-12 w-12 text-[var(--text-3)] mb-3" />
          <p className="text-[var(--text-2)]">Booking not found</p>
        </div>
      </div>
    );
  }

  const cur = booking.restaurant.currency === "USD" ? "$" : booking.restaurant.currency === "INR" ? "₹" : "Rs.";
  const statusCfg = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.PENDING;
  const StatusIcon = statusCfg.Icon;

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <nav className="sticky top-0 z-40 flex items-center justify-between border-b border-[var(--border)]/50 bg-[var(--canvas)]/80 backdrop-blur-xl px-5 py-3.5 shadow-sm">
        <Link href={`/hotel/${booking.restaurant.slug}`} className="flex items-center gap-1.5 text-[13px] text-[var(--text-2)] hover:text-[var(--accent-text)] transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to {booking.restaurant.name}
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent)]">
            <Mountain className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-[15px] font-bold text-[var(--text-1)]">
            Hima<span className="text-[var(--accent)]">Volt</span>
          </span>
        </div>
      </nav>

      <main className="mx-auto max-w-lg px-4 py-8 space-y-4">
        {paymentResult === "success" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 rounded-2xl bg-[var(--accent-muted)] p-4 ring-1 ring-[var(--accent)]/30"
          >
            <CheckCircle className="h-5 w-5 text-[var(--accent-text)] shrink-0" />
            <div>
              <p className="text-[13px] font-bold text-[var(--accent-text)]">Payment Successful!</p>
              <p className="text-[11px] text-[var(--accent-text)]">Your advance payment has been received.</p>
            </div>
          </motion.div>
        )}
        {paymentResult === "failed" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 rounded-2xl bg-rose-50 p-4 ring-1 ring-rose-200"
          >
            <XCircle className="h-5 w-5 text-rose-600 shrink-0" />
            <div>
              <p className="text-[13px] font-bold text-rose-700">Payment Failed</p>
              <p className="text-[11px] text-rose-600">Your booking is pending. Please contact the hotel.</p>
            </div>
          </motion.div>
        )}

        <div className={`rounded-3xl p-6 text-center ring-1 ${statusCfg.card}`}>
          <div className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full ${statusCfg.iconWrap}`}>
            <StatusIcon className={`h-7 w-7 ${statusCfg.icon}`} />
          </div>
          <p className={`text-[16px] font-bold ${statusCfg.labelColor}`}>{statusCfg.label}</p>
          <p className="mt-1 text-[11px] text-[var(--text-2)]">Booking #{bookingId.slice(-8).toUpperCase()}</p>
        </div>

        <BookingProgress status={booking.status} />

        <StayDates
          checkIn={booking.checkIn}
          checkOut={booking.checkOut}
          nights={booking.nights}
        />

        <div className="rounded-2xl bg-[var(--canvas)] ring-1 ring-[var(--border)] overflow-hidden shadow-sm">
          {booking.room.imageUrls[0] && (
            <img src={booking.room.imageUrls[0]} alt="Room" className="h-36 w-full object-cover sm:h-44" />
          )}
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[16px] font-bold text-[var(--text-1)]">
                {booking.room.name || `Room ${booking.room.roomNumber}`}
              </h3>
              <span className="rounded-full bg-[var(--accent-muted)] px-2.5 py-1 text-[11px] font-semibold text-[var(--accent-text)]">
                {booking.room.type}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: BedDouble, label: "Bed", value: booking.room.bedType ? `${booking.room.bedCount}x ${booking.room.bedType}` : `Floor ${booking.room.floor}` },
                { icon: Users, label: "Guests", value: `${booking.adults} adults${booking.children > 0 ? `, ${booking.children} children` : ""}` },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-xl bg-[var(--canvas-sub)] p-3">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Icon className="h-3 w-3 text-[var(--accent)]" />
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-3)]">{label}</p>
                  </div>
                  <p className="text-[13px] font-semibold text-[var(--text-1)]">{value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-xl bg-[var(--accent-muted)] p-3 space-y-1.5">
              <div className="flex justify-between text-[12px] text-[var(--text-2)]">
                <span>{cur}{(booking.totalPrice / booking.nights).toLocaleString()} × {booking.nights} night{booking.nights > 1 ? "s" : ""}</span>
                <span className="font-semibold">{cur}{booking.totalPrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-[13px] font-bold text-[var(--accent-text)] border-t border-[var(--accent-border)] pt-1.5">
                <span>Advance {booking.advancePaid ? "Paid" : "Due"}</span>
                <span>{cur}{booking.advanceAmount.toLocaleString()}</span>
              </div>
              {booking.paymentMethod && (
                <div className="flex items-center gap-1 text-[11px] text-[var(--text-2)]">
                  <CreditCard className="h-3 w-3" />
                  via {booking.paymentMethod}
                  {booking.advancePaid && <CheckCircle className="h-3 w-3 text-[var(--accent-hover)] ml-1" />}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-[var(--canvas)] ring-1 ring-[var(--border)] p-5 shadow-sm">
          <h4 className="text-[13px] font-bold text-[var(--text-1)] mb-3">{booking.restaurant.name}</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[12px] text-[var(--text-2)]">
              <MapPin className="h-3.5 w-3.5 text-[var(--accent)] shrink-0" />
              {booking.restaurant.address}, {booking.restaurant.city}
            </div>
            <div className="flex items-center gap-2 text-[12px] text-[var(--text-2)]">
              <Phone className="h-3.5 w-3.5 text-[var(--accent)] shrink-0" />
              {booking.restaurant.phone}
            </div>
          </div>
        </div>

        {booking.notes && (
          <div className="rounded-2xl bg-blue-50 ring-1 ring-blue-100 p-4">
            <p className="text-[11px] font-semibold text-blue-600 mb-1">Special Requests</p>
            <p className="text-[12px] text-blue-800">{booking.notes}</p>
          </div>
        )}

        {actionMsg && (
          <div className="rounded-2xl bg-[var(--accent-muted)] ring-1 ring-[var(--accent)]/30 p-3 text-[12px] font-medium text-[var(--accent-text)]">
            {actionMsg}
          </div>
        )}

        {/* Payment receipt — send proof so the hotel can confirm your payment */}
        {!booking.advancePaid && booking.status !== "CANCELLED" && (
          <div className="rounded-2xl bg-[var(--canvas)] ring-1 ring-[var(--border)] p-5 shadow-sm space-y-3">
            <div>
              <h4 className="text-[13px] font-bold text-[var(--text-1)]">Payment receipt</h4>
              <p className="text-[11px] text-[var(--text-2)] mt-0.5">
                Paid by QR, eSewa or Khalti? Upload your receipt so the hotel can verify and confirm your booking.
              </p>
            </div>
            {booking.receiptUrl && (
              <a href={booking.receiptUrl} target="_blank" rel="noopener noreferrer">
                <img src={booking.receiptUrl} alt="Receipt" className="max-h-40 w-full rounded-xl object-contain ring-1 ring-[var(--border)] bg-[var(--canvas-sub)]" />
              </a>
            )}
            <button
              onClick={() => receiptInputRef.current?.click()}
              disabled={uploadingReceipt}
              className="flex items-center justify-center gap-2 w-full rounded-xl bg-[var(--accent)] py-2.5 text-[13px] font-bold text-white hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
            >
              {uploadingReceipt ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {booking.receiptUrl ? "Replace receipt" : "Upload receipt"}
            </button>
            <input
              ref={receiptInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleReceiptUpload(e.target.files?.[0] ?? null)}
            />
          </div>
        )}

        {/* Cancellation — request with a reason; the hotel reviews and accepts */}
        {["PENDING", "CONFIRMED"].includes(booking.status) && (
          <div className="rounded-2xl bg-[var(--canvas)] ring-1 ring-[var(--border)] p-5 shadow-sm">
            {booking.cancelReason && booking.cancelledBy === "CUSTOMER" ? (
              <p className="text-[12px] text-[var(--text-2)]">
                <span className="font-bold text-[var(--text-1)]">Cancellation requested.</span> The hotel will review your request and respond.
              </p>
            ) : !cancelOpen ? (
              <button
                onClick={() => setCancelOpen(true)}
                className="flex items-center gap-2 text-[13px] font-semibold text-rose-600 hover:text-rose-700 transition-colors"
              >
                <Ban className="h-4 w-4" />
                Request cancellation
              </button>
            ) : (
              <div className="space-y-2.5">
                <p className="text-[13px] font-bold text-[var(--text-1)]">Request cancellation</p>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Please tell the hotel why you need to cancel…"
                  rows={3}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] px-3.5 py-2.5 text-[13px] text-[var(--text-1)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15 resize-none"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCancelRequest}
                    disabled={!cancelReason.trim() || cancelling}
                    className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-[12px] font-bold text-white hover:bg-rose-700 transition-colors disabled:opacity-50"
                  >
                    {cancelling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Submit request
                  </button>
                  <button
                    onClick={() => { setCancelOpen(false); setCancelReason(""); }}
                    className="rounded-xl px-4 py-2 text-[12px] font-semibold text-[var(--text-2)] hover:bg-[var(--canvas-sub)] transition-colors"
                  >
                    Never mind
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
