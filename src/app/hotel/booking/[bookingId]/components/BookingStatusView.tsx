"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  Clock,
  BedDouble,
  Calendar,
  Users,
  Phone,
  MapPin,
  Copy,
  ArrowRight,
  Banknote,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/design-system/primitives/Button";
import { cn } from "@/lib/utils";
import { rememberIntendedRole } from "@/lib/intended-role";

type Booking = {
  id: string;
  guestName: string;
  guestEmail: string | null;
  guestPhone: string | null;
  adults: number;
  checkIn: Date;
  checkOut: Date;
  nights: number;
  totalPrice: number;
  advanceAmount: number;
  advancePaid: boolean;
  paymentMethod: string | null;
  paymentStatus: string;
  status: string;
  notes: string | null;
  transactionId: string | null;
  room: {
    name: string | null;
    roomNumber: string;
    type: string;
    imageUrls: string[];
    bedType: string | null;
  };
  restaurant: {
    name: string;
    slug: string;
    phone: string | null;
    address: string;
    currency: string;
    openingTime: string;
    closingTime: string;
  };
};

function fmt(date: Date) {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    CONFIRMED:   { label: "Confirmed",   color: "bg-emerald-100 text-emerald-700" },
    PENDING:     { label: "Pending",     color: "bg-amber-100 text-amber-700" },
    CANCELLED:   { label: "Cancelled",   color: "bg-red-100 text-red-700" },
    CHECKED_IN:  { label: "Checked In",  color: "bg-blue-100 text-blue-700" },
    CHECKED_OUT: { label: "Checked Out", color: "bg-slate-100 text-slate-600" },
  };
  const s = map[status] ?? { label: status, color: "bg-slate-100 text-slate-600" };
  return (
    <span className={cn("inline-flex items-center px-3 py-1 rounded-full text-xs font-bold", s.color)}>
      {s.label}
    </span>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = React.useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={copy}
      className="p-1.5 rounded-lg hover:bg-[var(--surface-alt)] transition-colors text-[var(--text-3)] hover:text-[var(--text-1)]"
      title="Copy"
    >
      <Copy className={cn("h-4 w-4", copied && "text-emerald-600")} />
    </button>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3.5 border-b border-[var(--border-soft)] last:border-0">
      <span className="text-sm text-[var(--text-3)] font-medium shrink-0">{label}</span>
      <span className="text-sm text-[var(--text-1)] font-semibold text-right">{value}</span>
    </div>
  );
}

export function BookingStatusView({
  booking,
  paymentState,
}: {
  booking: Booking;
  paymentState: string | null;
}) {
  const refCode = `BKG-${booking.id.slice(-8).toUpperCase()}`;
  const isFailed = paymentState === "failed";
  const isSuccess = paymentState === "success" || booking.status === "CONFIRMED";
  const isBank = booking.paymentMethod === "BANK";
  const isCash = booking.paymentMethod === "CASH";

  return (
    <div className="space-y-8">

      {/* ── Hero status block ── */}
      {isFailed ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center text-center py-10 gap-4"
        >
          <div className="h-20 w-20 rounded-full bg-red-100 flex items-center justify-center">
            <XCircle className="h-10 w-10 text-red-500" />
          </div>
          <div>
            <h1 className="font-fraunces text-3xl font-bold text-[var(--text-1)] mb-2">
              Payment Failed
            </h1>
            <p className="text-[var(--text-2)] text-base max-w-md">
              Your payment could not be processed. Your reservation has been released —
              no charge was made.
            </p>
          </div>
          <Link href={`/hotels`}>
            <Button variant="secondary" className="mt-2 flex items-center gap-2">
              Try another room <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </motion.div>
      ) : isSuccess ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center text-center py-10 gap-4"
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
            className="h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center"
          >
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
          </motion.div>
          <div>
            <h1 className="font-fraunces text-3xl font-bold text-[var(--text-1)] mb-2">
              {isCash ? "You're all set!" : "Booking Confirmed!"}
            </h1>
            <p className="text-[var(--text-2)] text-base max-w-md">
              {isCash
                ? "Your reservation is confirmed. Simply pay when you arrive at the hotel."
                : "Your payment was successful and your stay is booked. See you there!"}
            </p>
          </div>
          <div className="flex items-center gap-2 bg-[var(--surface-alt)] px-4 py-2.5 rounded-2xl">
            <span className="text-sm text-[var(--text-3)] font-medium">Ref:</span>
            <span className="font-mono text-sm font-bold text-[var(--text-1)]">{refCode}</span>
            <CopyButton value={refCode} />
          </div>
        </motion.div>
      ) : isBank ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center text-center py-10 gap-4"
        >
          <div className="h-20 w-20 rounded-full bg-blue-100 flex items-center justify-center">
            <CreditCard className="h-10 w-10 text-blue-600" />
          </div>
          <div>
            <h1 className="font-fraunces text-3xl font-bold text-[var(--text-1)] mb-2">
              Reserved — Transfer Pending
            </h1>
            <p className="text-[var(--text-2)] text-base max-w-md">
              Your room is held for{" "}
              <strong className="text-[var(--text-1)]">24 hours</strong>. Please
              complete the bank transfer and contact the hotel with your receipt to confirm.
            </p>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center text-center py-10 gap-4"
        >
          <div className="h-20 w-20 rounded-full bg-amber-100 flex items-center justify-center">
            <Clock className="h-10 w-10 text-amber-600" />
          </div>
          <div>
            <h1 className="font-fraunces text-3xl font-bold text-[var(--text-1)] mb-2">
              Booking Pending
            </h1>
            <p className="text-[var(--text-2)] text-base max-w-md">
              Your reservation is under review. The hotel will confirm shortly.
            </p>
          </div>
        </motion.div>
      )}

      {/* ── Booking receipt card ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-white rounded-3xl border border-[var(--border)] shadow-sm overflow-hidden"
      >
        {/* Room photo strip */}
        {booking.room.imageUrls.length > 0 && (
          <div className="h-48 w-full overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={booking.room.imageUrls[0]}
              alt={booking.room.name ?? "Room"}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="p-6 space-y-1">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-3)] mb-1">
                {booking.restaurant.name}
              </p>
              <h2 className="font-fraunces text-xl font-bold text-[var(--text-1)]">
                {booking.room.name ?? `Room ${booking.room.roomNumber}`}
              </h2>
              <p className="text-sm text-[var(--text-3)] mt-0.5">
                {booking.room.type}
                {booking.room.bedType ? ` · ${booking.room.bedType}` : ""}
              </p>
            </div>
            <StatusBadge status={booking.status} />
          </div>

          <DetailRow
            label="Check-in"
            value={
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-[var(--accent)]" />
                {fmt(booking.checkIn)}
                <span className="text-[var(--text-3)] font-normal">
                  after {booking.restaurant.openingTime}
                </span>
              </span>
            }
          />
          <DetailRow
            label="Check-out"
            value={
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-[var(--text-3)]" />
                {fmt(booking.checkOut)}
                <span className="text-[var(--text-3)] font-normal">
                  before {booking.restaurant.closingTime}
                </span>
              </span>
            }
          />
          <DetailRow
            label="Duration"
            value={`${booking.nights} night${booking.nights > 1 ? "s" : ""}`}
          />
          <DetailRow
            label="Guests"
            value={
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-[var(--text-3)]" />
                {booking.adults} adult{booking.adults > 1 ? "s" : ""}
              </span>
            }
          />
          <DetailRow label="Guest name" value={booking.guestName} />
          {booking.guestPhone && (
            <DetailRow label="Phone" value={booking.guestPhone} />
          )}
          <DetailRow
            label="Total"
            value={
              <span className="text-lg font-black text-[var(--text-1)]">
                {booking.restaurant.currency} {booking.totalPrice.toLocaleString()}
              </span>
            }
          />
          <DetailRow
            label="Payment"
            value={
              <span className="flex items-center gap-1.5">
                {isCash ? (
                  <><Banknote className="h-4 w-4" /> Pay at Hotel</>
                ) : isBank ? (
                  <><CreditCard className="h-4 w-4" /> Bank Transfer</>
                ) : (
                  booking.paymentMethod
                )}
              </span>
            }
          />
          {booking.notes && (
            <DetailRow label="Notes" value={<span className="text-[var(--text-2)]">{booking.notes}</span>} />
          )}
        </div>
      </motion.div>

      {/* ── Hotel contact ── */}
      {(booking.restaurant.phone || booking.restaurant.address) && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white rounded-3xl border border-[var(--border)] shadow-sm p-6 space-y-4"
        >
          <h3 className="font-fraunces text-lg font-bold text-[var(--text-1)]">Hotel contact</h3>
          {booking.restaurant.phone && (
            <a
              href={`tel:${booking.restaurant.phone}`}
              className="flex items-center gap-3 text-[var(--text-2)] hover:text-[var(--accent)] transition-colors"
            >
              <Phone className="h-5 w-5 shrink-0" />
              <span className="font-medium">{booking.restaurant.phone}</span>
            </a>
          )}
          {booking.restaurant.address && (
            <div className="flex items-start gap-3 text-[var(--text-2)]">
              <MapPin className="h-5 w-5 shrink-0 mt-0.5" />
              <span>{booking.restaurant.address}</span>
            </div>
          )}
        </motion.div>
      )}

      {/* ── Bank transfer instructions ── */}
      {isBank && !isFailed && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-blue-50 border border-blue-200 rounded-3xl p-6 space-y-3"
        >
          <h3 className="font-semibold text-blue-900">Next steps for bank transfer</h3>
          <ol className="list-decimal pl-5 space-y-2 text-sm text-blue-800">
            <li>Transfer <strong>NPR {booking.totalPrice.toLocaleString()}</strong> to the hotel&apos;s bank account.</li>
            <li>Take a screenshot or photo of your payment receipt.</li>
            <li>Send it to the hotel via phone or email with your reference code <strong>{refCode}</strong>.</li>
            <li>The hotel will confirm your booking within 24 hours.</li>
          </ol>
        </motion.div>
      )}

      {/* ── Optional signup nudge — booked as a guest, no account required.
             "Maybe later" energy: a real perk (reward points, faster
             checkout), never a gate. ── */}
      {!isFailed && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-3xl border border-[var(--accent-border)] bg-[var(--accent-muted)] p-5"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent)]/15 text-2xl">
            🎁
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-[var(--accent-text)]">
              Booked as a guest — nice and quick!
            </p>
            <p className="text-sm text-[var(--text-2)] mt-0.5">
              Create a free account to skip re-entering your details next time and start earning reward points on future stays.
            </p>
          </div>
          <Link
            href="/sign-in"
            onClick={() => rememberIntendedRole("CUSTOMER")}
            className="shrink-0 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-bold text-white hover:bg-[var(--accent-hover)] transition-colors text-center whitespace-nowrap"
          >
            Create free account
          </Link>
        </motion.div>
      )}

      {/* ── CTA ── */}
      {!isFailed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="flex flex-col sm:flex-row gap-3 pb-8"
        >
          <Link href={`/hotels/${booking.restaurant.slug}`} className="flex-1">
            <Button variant="secondary" className="w-full">
              Back to hotel
            </Button>
          </Link>
          <Link href="/hotels" className="flex-1">
            <Button className="w-full flex items-center justify-center gap-2">
              Explore more stays <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </motion.div>
      )}
    </div>
  );
}
