"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle,
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
} from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";

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

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  PENDING: { label: "Awaiting Confirmation", color: "amber", icon: Clock },
  CONFIRMED: { label: "Booking Confirmed", color: "emerald", icon: CheckCircle },
  CHECKED_IN: { label: "Checked In", color: "blue", icon: CheckCircle },
  CHECKED_OUT: { label: "Checked Out", color: "gray", icon: CheckCircle },
  CANCELLED: { label: "Cancelled", color: "red", icon: XCircle },
};

export default function BookingConfirmationPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const searchParams = useSearchParams();
  const paymentResult = searchParams.get("payment");

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/public/hotel/booking/${bookingId}`)
      .then((r) => r.json())
      .then((d) => {
        setBooking(d.booking ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [bookingId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--accent)]" />
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
  const StatusIcon = statusCfg.icon;

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

        <div className={`rounded-3xl p-6 text-center bg-${statusCfg.color}-50 ring-1 ring-${statusCfg.color}-100`}>
          <div className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-${statusCfg.color}-100`}>
            <StatusIcon className={`h-7 w-7 text-${statusCfg.color}-600`} />
          </div>
          <p className={`text-[16px] font-bold text-${statusCfg.color}-700`}>{statusCfg.label}</p>
          <p className="mt-1 text-[11px] text-[var(--text-2)]">Booking #{bookingId.slice(-8).toUpperCase()}</p>
        </div>

        <div className="rounded-2xl bg-[var(--canvas)] ring-1 ring-[var(--border)] overflow-hidden shadow-sm">
          {booking.room.imageUrls[0] && (
            <img src={booking.room.imageUrls[0]} alt="Room" className="h-44 w-full object-cover" />
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
                { icon: Calendar, label: "Check-in", value: new Date(booking.checkIn).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) },
                { icon: Calendar, label: "Check-out", value: new Date(booking.checkOut).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) },
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
      </main>
    </div>
  );
}
