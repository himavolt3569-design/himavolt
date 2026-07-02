"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import {
  BedDouble,
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  RefreshCw,
  Filter,
  Search,
  ChevronDown,
  Phone,
  Mail,
  CreditCard,
  Check,
  X,
  LogIn,
  LogOut,
  Eye,
  Settings,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRestaurant } from "@/context/RestaurantContext";
import { AnchoredMenu } from "@/components/shared/AnchoredMenu";
import { apiFetch } from "@/lib/api-client";
import { formatPrice } from "@/lib/currency";
import { useRealtimeSignal } from "@/hooks/useRealtimeSignal";
import { restaurantBookingsTopic } from "@/lib/realtime-topics";

interface Booking {
  id: string;
  guestName: string;
  guestPhone: string | null;
  guestEmail: string | null;
  adults: number;
  children: number;
  checkIn: string;
  checkOut: string;
  nights: number;
  totalPrice: number;
  advanceAmount: number;
  advancePaid: boolean;
  paymentStatus: string;
  paymentMethod: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  receiptUrl?: string | null;
  cancelReason?: string | null;
  cancelRequestedAt?: string | null;
  cancelledBy?: string | null;
  refundStatus?: string | null;
  roomServiceSelected?: boolean;
  room: {
    roomNumber: string;
    name: string | null;
    type: string;
    floor: number;
    bedType: string | null;
    bedCount: number;
  };
}

interface HotelConfig {
  hotelAdvanceType: string;
  hotelAdvanceValue: number;
  currency: string;
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-[var(--accent-muted)] text-[var(--accent-text)] ring-[var(--accent-border)]",
  CONFIRMED: "bg-[var(--accent-muted)] text-[var(--accent-text)] ring-[var(--accent)]/30",
  CHECKED_IN: "bg-[var(--status-info-bg)] text-[var(--status-info-text)] ring-[var(--status-info-border)]",
  CHECKED_OUT: "bg-[var(--surface)] text-[var(--text-2)] ring-[var(--border)]",
  CANCELLED: "bg-[var(--status-error-bg)] text-[var(--status-error-text)] ring-[var(--status-error-bg)]",
};

const PAY_STATUS_STYLES: Record<string, string> = {
  UNPAID: "bg-[var(--accent-muted)] text-[var(--accent-text)]",
  PAID: "bg-[var(--status-success-bg)] text-[var(--status-success-text)]",
  FAILED: "bg-[var(--status-error-bg)] text-[var(--status-error-text)]",
};

const ACTION_COLOR_STYLES: Record<string, string> = {
  emerald: "hover:bg-emerald-50 text-emerald-700",
  rose: "hover:bg-rose-50 text-rose-700",
  blue: "hover:bg-blue-50 text-blue-700",
  gray: "hover:bg-gray-50 text-gray-700",
};

const STAT_COLOR_STYLES: Record<string, { tile: string; value: string; label: string }> = {
  amber: { tile: "bg-amber-50 ring-amber-100", value: "text-amber-700", label: "text-amber-600" },
  emerald: { tile: "bg-emerald-50 ring-emerald-100", value: "text-emerald-700", label: "text-emerald-600" },
  blue: { tile: "bg-blue-50 ring-blue-100", value: "text-blue-700", label: "text-blue-600" },
  gray: { tile: "bg-gray-50 ring-gray-100", value: "text-gray-700", label: "text-gray-600" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-800",
    CONFIRMED: "bg-[var(--status-info-bg)] text-[var(--status-info-text)]",
    CHECKED_IN: "bg-green-100 text-green-800",
    CHECKED_OUT: "bg-[var(--canvas-sub)] text-[var(--text-3)]",
    CANCELLED: "bg-rose-100 text-rose-800",
  };
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-black uppercase shrink-0", cfg[status] ?? cfg.PENDING)}>
      {status.replace("_", " ")}
    </span>
  );
}

function InfoTile({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn("rounded-xl bg-[var(--canvas)] ring-1 ring-[var(--border)] p-3", className)}>
      <p className="text-[10px] font-black uppercase tracking-wider text-[var(--text-3)] mb-0.5">{label}</p>
      <p className="text-[13px] font-semibold text-[var(--text-1)] break-all">{value}</p>
    </div>
  );
}

function BookingRow({
  booking,
  currency,
  onStatusChange,
  onView,
}: {
  booking: Booking;
  currency: string;
  onStatusChange: (id: string, status: string) => void;
  onView: (booking: Booking) => void;
}) {
  const [open, setOpen] = useState(false);
  const actionsRef = useRef<HTMLButtonElement>(null);

  const NEXT_ACTIONS: Record<string, { label: string; status: string; icon: typeof Check; color: string }[]> = {
    PENDING: [
      { label: "Confirm", status: "CONFIRMED", icon: Check, color: "emerald" },
      { label: "Cancel", status: "CANCELLED", icon: X, color: "rose" },
    ],
    CONFIRMED: [
      { label: "Check In", status: "CHECKED_IN", icon: LogIn, color: "blue" },
      { label: "Cancel", status: "CANCELLED", icon: X, color: "rose" },
    ],
    CHECKED_IN: [
      { label: "Check Out", status: "CHECKED_OUT", icon: LogOut, color: "gray" },
    ],
    CHECKED_OUT: [],
    CANCELLED: [],
  };

  const actions = NEXT_ACTIONS[booking.status] ?? [];
  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });

  return (
    <motion.div
      layout
      className={cn(
        "group rounded-2xl border-l-[3px] bg-[var(--canvas)] ring-1 ring-[var(--border)] shadow-sm hover:shadow-md hover:ring-[var(--border-soft)] transition-all overflow-hidden",
        booking.status === "CHECKED_IN" ? "border-l-[var(--accent)]" :
        booking.status === "CONFIRMED" ? "border-l-blue-400" :
        booking.status === "PENDING" ? "border-l-amber-400" :
        booking.status === "CANCELLED" ? "border-l-rose-400" : "border-l-[var(--border)]"
      )}
    >
      <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[15px] font-black",
          booking.status === "CHECKED_IN" ? "bg-[var(--accent-muted)] text-[var(--accent-text)]" :
          booking.status === "CONFIRMED" ? "bg-[var(--status-info-bg)] text-[var(--status-info-text)]" :
          "bg-[var(--canvas-sub)] text-[var(--text-2)]"
        )}>
          {booking.guestName?.[0]?.toUpperCase() ?? "?"}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-[14px] text-[var(--text-1)] truncate">{booking.guestName}</p>
            <StatusBadge status={booking.status} />
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[12px] text-[var(--text-3)]">
            <span className="font-bold text-[var(--text-2)]">Room {booking.room.roomNumber}</span>
            <span>·</span>
            <span>{fmtDate(booking.checkIn)} → {fmtDate(booking.checkOut)}</span>
            <span>·</span>
            <span className="font-semibold">{booking.nights} night{booking.nights !== 1 ? "s" : ""}</span>
            {booking.guestPhone && <><span>·</span><span>{booking.guestPhone}</span></>}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="text-right">
            <p className="text-[14px] font-black text-[var(--accent-text)]">{formatPrice(booking.totalPrice, currency)}</p>
            {booking.advanceAmount > 0 && (
              <p className="text-[10px] text-[var(--text-3)]">
                Adv: {formatPrice(booking.advanceAmount, currency)}
                {booking.advancePaid ? " ✓" : " ○"}
              </p>
            )}
          </div>

          <button
            onClick={() => onView(booking)}
            className="rounded-lg p-1.5 hover:bg-[var(--canvas-sub)] transition-colors"
            title="View details"
          >
            <Eye className="h-3.5 w-3.5 text-[var(--text-3)]" />
          </button>

          {actions.length > 0 && (
            <div className="relative">
              <button
                ref={actionsRef}
                onClick={() => setOpen((o) => !o)}
                className="flex items-center gap-1 rounded-lg bg-[var(--canvas-sub)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--text-2)] hover:bg-[var(--surface)] ring-1 ring-[var(--border)] transition-colors"
              >
                Actions <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
              </button>
              <AnchoredMenu
                anchorRef={actionsRef}
                open={open}
                onClose={() => setOpen(false)}
                align="right"
                width={140}
                className="rounded-xl bg-[var(--canvas)] ring-1 ring-[var(--border)] shadow-lg overflow-hidden"
              >
                {actions.map((a) => {
                  const Icon = a.icon;
                  return (
                    <button
                      key={a.status}
                      onClick={() => { onStatusChange(booking.id, a.status); setOpen(false); }}
                      className={cn("flex w-full items-center gap-2 px-3 py-2.5 text-[12px] font-semibold transition-colors", ACTION_COLOR_STYLES[a.color])}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {a.label}
                    </button>
                  );
                })}
              </AnchoredMenu>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function BookingDetailModal({
  booking,
  currency,
  onClose,
  onStatusChange,
  onRefund,
}: {
  booking: Booking;
  currency: string;
  onClose: () => void;
  onStatusChange: (id: string, status: string, advancePaid?: boolean) => void;
  onRefund: (id: string) => void;
}) {
  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex justify-end"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="relative z-10 flex h-full w-full max-w-md flex-col bg-[var(--canvas)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)] shrink-0">
          <div className="min-w-0">
            <h2 className="text-[17px] font-black text-[var(--text-1)] truncate">{booking.guestName}</h2>
            <p className="text-[12px] text-[var(--text-3)]">
              Room {booking.room.roomNumber} · {booking.room.name || booking.room.type}
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-3 shrink-0 rounded-xl h-9 w-9 flex items-center justify-center bg-[var(--canvas-sub)] hover:bg-[var(--border)] transition-colors"
          >
            <X className="h-4 w-4 text-[var(--text-2)]" />
          </button>
        </div>

        {/* Status bar */}
        <div className={cn(
          "px-5 py-3 flex items-center justify-between gap-3 shrink-0",
          booking.status === "CONFIRMED" ? "bg-[var(--status-info-bg)]" :
          booking.status === "CHECKED_IN" ? "bg-green-50" :
          booking.status === "PENDING" ? "bg-amber-50" : "bg-[var(--canvas-sub)]"
        )}>
          <StatusBadge status={booking.status} />
          <span className="text-[11px] text-[var(--text-3)]">#{booking.id.slice(-8).toUpperCase()}</span>
        </div>

        {/* Scrollable body */}
        <div className="p-5 space-y-4 flex-1 overflow-y-auto">

          {/* Dates timeline */}
          <div className="rounded-2xl bg-[var(--canvas-sub)] p-4 flex items-center gap-3">
            <div className="text-center min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wider text-[var(--text-3)]">Check-in</p>
              <p className="text-[14px] font-black text-[var(--text-1)]">{fmtDate(booking.checkIn)}</p>
            </div>
            <div className="flex-1 flex items-center gap-1">
              <div className="h-px flex-1 bg-[var(--border)]" />
              <span className="text-[11px] font-bold text-[var(--text-3)] bg-[var(--canvas)] px-2 py-0.5 rounded-full ring-1 ring-[var(--border)] shrink-0">
                {booking.nights}n
              </span>
              <div className="h-px flex-1 bg-[var(--border)]" />
            </div>
            <div className="text-center min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wider text-[var(--text-3)]">Check-out</p>
              <p className="text-[14px] font-black text-[var(--text-1)]">{fmtDate(booking.checkOut)}</p>
            </div>
          </div>

          {/* Guest details grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {booking.guestPhone && (
              <InfoTile label="Phone" value={booking.guestPhone} />
            )}
            {booking.guestEmail && (
              <InfoTile label="Email" value={booking.guestEmail} />
            )}
            <InfoTile
              label="Guests"
              value={`${booking.adults} adults${booking.children > 0 ? `, ${booking.children} children` : ""}`}
            />
            <InfoTile label="Room" value={`${booking.room.name || booking.room.type} · Fl. ${booking.room.floor}`} />
            {booking.room.bedType && (
              <InfoTile label="Bed" value={`${booking.room.bedCount}× ${booking.room.bedType}`} />
            )}
            {booking.paymentMethod && (
              <InfoTile label="Payment" value={booking.paymentMethod} />
            )}
          </div>

          {/* Price breakdown */}
          <div className="rounded-2xl bg-[var(--canvas-sub)] ring-1 ring-[var(--border)] p-4 space-y-2">
            <div className="flex justify-between text-[13px]">
              <span className="text-[var(--text-3)]">{booking.nights} night{booking.nights > 1 ? "s" : ""}</span>
              <span className="font-bold text-[var(--text-1)]">{formatPrice(booking.totalPrice, currency)}</span>
            </div>
            {booking.advanceAmount > 0 && (
              <div className="flex items-center justify-between text-[13px] border-t border-[var(--border)] pt-2">
                <span className="text-[var(--text-3)]">Advance required</span>
                <div className="flex items-center gap-2">
                  <span className={cn("font-bold", booking.advancePaid ? "text-green-600" : "text-amber-600")}>
                    {formatPrice(booking.advanceAmount, currency)}
                  </span>
                  {!booking.advancePaid && booking.status !== "CANCELLED" && (
                    <button
                      onClick={() => onStatusChange(booking.id, booking.status, true)}
                      className="rounded-lg bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-200 transition-colors"
                    >
                      Mark Paid
                    </button>
                  )}
                  {booking.advancePaid && (
                    <span className="flex items-center gap-1 text-[11px] text-green-700 font-bold">
                      <CheckCircle className="h-3 w-3" /> Paid
                    </span>
                  )}
                </div>
              </div>
            )}
            <div className="border-t border-[var(--border)] pt-2 flex justify-between">
              <span className="font-black text-[var(--text-1)]">Total</span>
              <span className="font-black text-[var(--accent-text)] text-[16px]">{formatPrice(booking.totalPrice, currency)}</span>
            </div>
          </div>

          {/* Room service add-on */}
          {booking.roomServiceSelected && (
            <div className="flex items-center gap-2 rounded-xl bg-[var(--canvas-sub)] px-3 py-2.5 text-[12px] text-[var(--text-2)] ring-1 ring-[var(--border)]">
              <CheckCircle className="h-3.5 w-3.5 text-[var(--accent)] shrink-0" />
              Room service add-on included
            </div>
          )}

          {/* Guest-uploaded payment receipt */}
          {booking.receiptUrl && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-black uppercase tracking-widest text-[var(--text-3)]">Payment Receipt</p>
              <a href={booking.receiptUrl} target="_blank" rel="noopener noreferrer" className="block">
                <img
                  src={booking.receiptUrl}
                  alt="Payment receipt"
                  className="max-h-48 w-full rounded-xl object-contain ring-1 ring-[var(--border)] bg-[var(--canvas-sub)]"
                />
              </a>
            </div>
          )}

          {/* Customer cancellation request */}
          {booking.cancelReason && booking.status !== "CANCELLED" && (
            <div className="rounded-xl bg-[var(--status-error-bg)] ring-1 ring-[var(--status-error-bg)] p-4 space-y-2">
              <p className="text-[11px] font-black uppercase tracking-widest text-[var(--status-error-text)]">
                Cancellation requested{booking.cancelledBy === "CUSTOMER" ? " by guest" : ""}
              </p>
              <p className="text-[12px] text-[var(--status-error-text)]">{booking.cancelReason}</p>
              <button
                onClick={() => { onStatusChange(booking.id, "CANCELLED"); onClose(); }}
                className="rounded-xl bg-[var(--status-error-text)] px-4 py-2 text-[12px] font-bold text-white hover:brightness-110 transition-all"
              >
                Accept &amp; cancel booking
              </button>
            </div>
          )}

          {/* Refund workflow */}
          {booking.status === "CANCELLED" && booking.refundStatus && booking.refundStatus !== "NONE" && (
            <div className="flex items-center justify-between rounded-xl bg-[var(--canvas-sub)] ring-1 ring-[var(--border)] p-4">
              <span className="text-[13px] font-semibold text-[var(--text-2)]">
                Refund: {booking.refundStatus === "REFUNDED" ? "Completed" : "Pending"}
              </span>
              {booking.refundStatus === "REQUESTED" && (
                <button
                  onClick={() => { onRefund(booking.id); onClose(); }}
                  className="rounded-xl bg-[var(--accent)] px-4 py-2 text-[12px] font-bold text-white hover:bg-[var(--accent-hover)] transition-colors"
                >
                  Mark refunded
                </button>
              )}
            </div>
          )}

          {/* Notes */}
          {booking.notes && (
            <div className="rounded-xl bg-[var(--status-info-bg)] ring-1 ring-[var(--status-info-border)] p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--status-info-text)] mb-1.5">Notes</p>
              <p className="text-[13px] text-[var(--status-info-text)]">{booking.notes}</p>
            </div>
          )}
        </div>

        {/* Footer status actions */}
        {["PENDING", "CONFIRMED", "CHECKED_IN"].includes(booking.status) && (
          <div className="p-5 border-t border-[var(--border)] space-y-2 shrink-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-3)] mb-3">Update Status</p>
            <div className="grid grid-cols-2 gap-2">
              {booking.status === "PENDING" && (
                <>
                  <button
                    onClick={() => { onStatusChange(booking.id, "CONFIRMED"); onClose(); }}
                    className="rounded-xl bg-[var(--status-info-bg)] py-3 text-[13px] font-black text-[var(--status-info-text)] hover:brightness-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Check className="h-4 w-4" /> Confirm
                  </button>
                  <button
                    onClick={() => { onStatusChange(booking.id, "CANCELLED"); onClose(); }}
                    className="rounded-xl bg-rose-50 py-3 text-[13px] font-black text-rose-700 hover:bg-rose-100 transition-all flex items-center justify-center gap-2"
                  >
                    <X className="h-4 w-4" /> Cancel
                  </button>
                </>
              )}
              {booking.status === "CONFIRMED" && (
                <button
                  onClick={() => { onStatusChange(booking.id, "CHECKED_IN"); onClose(); }}
                  className="col-span-2 rounded-xl bg-[var(--accent)] py-3 text-[13px] font-black text-white hover:bg-[var(--accent-hover)] transition-all flex items-center justify-center gap-2 shadow-md"
                >
                  <LogIn className="h-4 w-4" /> Check In Guest
                </button>
              )}
              {booking.status === "CHECKED_IN" && (
                <button
                  onClick={() => { onStatusChange(booking.id, "CHECKED_OUT"); onClose(); }}
                  className="col-span-2 rounded-xl bg-[var(--canvas-sub)] ring-1 ring-[var(--border)] py-3 text-[13px] font-black text-[var(--text-2)] hover:bg-[var(--border)] transition-all flex items-center justify-center gap-2"
                >
                  <LogOut className="h-4 w-4" /> Check Out Guest
                </button>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function AdvanceConfigModal({
  config,
  restaurantId,
  onClose,
  onSaved,
}: {
  config: HotelConfig;
  restaurantId: string;
  onClose: () => void;
  onSaved: (c: HotelConfig) => void;
}) {
  const [type, setType] = useState(config.hotelAdvanceType);
  const [value, setValue] = useState(config.hotelAdvanceValue.toString());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    const numVal = parseFloat(value);
    if (isNaN(numVal) || numVal < 0) {
      setError("Please enter a valid amount");
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/restaurants/${restaurantId}/hotel-config`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hotelAdvanceType: type, hotelAdvanceValue: numVal }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error || "Save failed"); return; }
    onSaved(data);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-sm rounded-3xl bg-[var(--canvas)] shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-[16px] font-black text-[var(--text-1)]">Advance Config</h3>
            <p className="text-[12px] text-[var(--text-3)]">Set required advance booking amount</p>
          </div>
          <button onClick={onClose} className="rounded-xl h-9 w-9 flex items-center justify-center bg-[var(--canvas-sub)] hover:bg-[var(--border)] transition-colors">
            <X className="h-4 w-4 text-[var(--text-2)]" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-black uppercase tracking-widest text-[var(--text-3)] mb-2">Type</label>
            <div className="grid grid-cols-2 gap-2">
              {(["PERCENTAGE", "FIXED"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={cn(
                    "rounded-xl border-2 py-3 text-[12px] font-bold transition-all",
                    type === t
                      ? "border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--accent-text)]"
                      : "border-[var(--border)] bg-[var(--canvas-sub)] text-[var(--text-2)] hover:border-[var(--border-soft)]"
                  )}
                >
                  {t === "PERCENTAGE" ? "Percentage %" : "Fixed Amount"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase tracking-widest text-[var(--text-3)] mb-2">
              {type === "PERCENTAGE" ? "Percentage (0–100)" : `Fixed Amount (${config.currency})`}
            </label>
            <input
              type="number"
              value={value}
              min="0"
              max={type === "PERCENTAGE" ? "100" : undefined}
              onChange={(e) => setValue(e.target.value)}
              className="w-full rounded-xl bg-[var(--canvas-sub)] px-3.5 py-3 text-[15px] font-black text-[var(--text-1)] outline-none ring-1 ring-[var(--border)] focus:ring-[var(--accent)] transition-all"
            />
            <p className="mt-2 text-[11px] text-[var(--text-3)]">
              {type === "PERCENTAGE"
                ? `Customer pays ${value}% of total room cost as advance`
                : `Customer pays ${config.currency} ${value} fixed advance`}
            </p>
          </div>

          {error && (
            <p className="text-[12px] font-semibold text-[var(--status-error-text)] bg-[var(--status-error-bg)] px-3 py-2 rounded-xl">{error}</p>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-xl bg-[var(--accent)] py-3.5 text-[14px] font-black text-white shadow-md hover:bg-[var(--accent-hover)] active:scale-[0.98] disabled:opacity-60 transition-all flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Save Config
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

const STATUSES = ["ALL", "PENDING", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED"];

export default function HotelBookingsTab() {
  const { selectedRestaurant } = useRestaurant();
  const restaurantId = selectedRestaurant?.id;
  const currency = selectedRestaurant?.currency ?? "NPR";
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [viewBooking, setViewBooking] = useState<Booking | null>(null);
  const [showConfig, setShowConfig] = useState(false);

  const bookingsQueryKey = ["hotel-bookings", restaurantId, statusFilter] as const;
  const bookingsQuery = useQuery({
    queryKey: bookingsQueryKey,
    queryFn: () => {
      const params = new URLSearchParams({ limit: "100" });
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      return apiFetch<{ bookings?: Booking[] }>(
        `/api/restaurants/${restaurantId}/bookings?${params}`,
      );
    },
    enabled: !!restaurantId,
    placeholderData: keepPreviousData,
  });
  const bookings = bookingsQuery.data?.bookings ?? [];
  const loading = bookingsQuery.isLoading;
  const refreshing = bookingsQuery.isFetching;

  const configQuery = useQuery({
    queryKey: ["hotel-config", restaurantId],
    queryFn: async () => {
      const res = await fetch(`/api/restaurants/${restaurantId}/hotel-config`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data as HotelConfig;
    },
    enabled: !!restaurantId,
  });
  const config = configQuery.data ?? null;

  const refreshBookings = () =>
    queryClient.invalidateQueries({ queryKey: ["hotel-bookings", restaurantId] });

  useRealtimeSignal(
    restaurantId ? restaurantBookingsTopic(restaurantId) : null,
    refreshBookings,
  );

  // Patches the booking in the currently-viewed filter's cache immediately —
  // if the new status no longer matches an active status filter (e.g.
  // confirming a booking while viewing "Pending"), it drops out of the list
  // right away instead of waiting on a network round-trip. Rolled back on
  // failure; other filters' caches reconcile via the background invalidate.
  const updateBookingMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Record<string, unknown> }) => {
      if (!restaurantId) return;
      await fetch(`/api/restaurants/${restaurantId}/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    },
    onMutate: async ({ id, body }) => {
      await queryClient.cancelQueries({ queryKey: bookingsQueryKey, exact: true });
      const previous = queryClient.getQueryData<{ bookings?: Booking[] }>(bookingsQueryKey);
      queryClient.setQueryData<{ bookings?: Booking[] }>(bookingsQueryKey, (prev) => {
        const list = prev?.bookings ?? [];
        const nextStatus = body.status as string | undefined;
        if (nextStatus && statusFilter !== "ALL" && nextStatus !== statusFilter) {
          return { bookings: list.filter((b) => b.id !== id) };
        }
        return { bookings: list.map((b) => (b.id === id ? { ...b, ...body } : b)) };
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(bookingsQueryKey, context.previous);
    },
    onSettled: refreshBookings,
  });

  const handleStatusChange = (id: string, status: string, advancePaid?: boolean) => {
    if (!restaurantId) return;
    const body: Record<string, unknown> = { status };
    if (advancePaid !== undefined) body.advancePaid = advancePaid;
    updateBookingMutation.mutate({ id, body });
    setViewBooking(null);
  };

  const handleRefund = (id: string) => {
    if (!restaurantId) return;
    updateBookingMutation.mutate({ id, body: { refundStatus: "REFUNDED" } });
    setViewBooking(null);
  };

  const filtered = bookings.filter((b) => {
    if (search) {
      const q = search.toLowerCase();
      return (
        b.guestName.toLowerCase().includes(q) ||
        b.room.roomNumber.toLowerCase().includes(q) ||
        b.guestPhone?.includes(q)
      );
    }
    return true;
  });

  const stats = {
    pending: bookings.filter((b) => b.status === "PENDING").length,
    confirmed: bookings.filter((b) => b.status === "CONFIRMED").length,
    checkedIn: bookings.filter((b) => b.status === "CHECKED_IN").length,
    total: bookings.length,
  };

  if (loading) return null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-black text-[var(--text-1)]">Reservations</h2>
          <p className="text-[12px] text-[var(--text-3)] mt-0.5">Manage room bookings and guest check-ins</p>
        </div>
        <div className="flex items-center gap-2">
          {config && (
            <button
              onClick={() => setShowConfig(true)}
              className="flex items-center gap-1.5 rounded-xl bg-[var(--canvas-sub)] ring-1 ring-[var(--border)] px-3 py-2 text-[12px] font-semibold text-[var(--text-2)] hover:bg-[var(--border)] transition-colors"
            >
              <Settings className="h-3.5 w-3.5" />
              Config
            </button>
          )}
          <button
            onClick={refreshBookings}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-xl bg-[var(--accent-muted)] px-3 py-2 text-[12px] font-semibold text-[var(--accent-text)] hover:brightness-95 transition-colors disabled:opacity-60"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {[
          { label: "Total", value: stats.total, color: "gray" },
          { label: "Pending", value: stats.pending, color: "amber" },
          { label: "Confirmed", value: stats.confirmed, color: "blue" },
          { label: "Checked In", value: stats.checkedIn, color: "emerald" },
        ].map(({ label, value, color }) => (
          <div key={label} className={cn("rounded-2xl p-4 ring-1", STAT_COLOR_STYLES[color].tile)}>
            <p className={cn("text-[10px] font-black uppercase tracking-widest mb-1", STAT_COLOR_STYLES[color].label)}>{label}</p>
            <p className={cn("text-[28px] font-black leading-none", STAT_COLOR_STYLES[color].value)}>{value}</p>
          </div>
        ))}
      </div>

      {/* Advance config banner */}
      {config && (
        <div className="flex items-center gap-3 rounded-2xl bg-[var(--accent-muted)] ring-1 ring-[var(--accent-border)] px-4 py-3">
          <AlertCircle className="h-4 w-4 text-[var(--accent-text)] shrink-0" />
          <p className="text-[12px] text-[var(--accent-text)]">
            Advance required:{" "}
            <strong>
              {config.hotelAdvanceType === "PERCENTAGE"
                ? `${config.hotelAdvanceValue}% of total`
                : `${config.currency} ${config.hotelAdvanceValue} fixed`}
            </strong>
          </p>
          <button
            onClick={() => setShowConfig(true)}
            className="ml-auto text-[11px] font-bold text-[var(--accent-text)] hover:underline transition-colors"
          >
            Change
          </button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-3)]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by guest name, room, phone…"
          className="w-full rounded-xl bg-[var(--canvas-sub)] pl-9 pr-3.5 py-2.5 text-[13px] font-semibold text-[var(--text-1)] outline-none ring-1 ring-[var(--border)] focus:ring-[var(--accent)] transition-all placeholder:text-[var(--text-3)] placeholder:font-normal"
        />
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-bold transition-all whitespace-nowrap",
              statusFilter === s
                ? "bg-[var(--accent)] text-white shadow-sm"
                : "bg-[var(--canvas-sub)] text-[var(--text-3)] ring-1 ring-[var(--border)] hover:text-[var(--text-1)]"
            )}
          >
            {s === "ALL" ? "All Bookings" : s.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Booking list */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <BedDouble className="mx-auto h-12 w-12 text-[var(--border)] mb-3" />
          <p className="text-[14px] font-bold text-[var(--text-3)]">No bookings found</p>
          {statusFilter !== "ALL" && (
            <button
              onClick={() => setStatusFilter("ALL")}
              className="mt-2 text-[12px] text-[var(--accent-text)] hover:underline"
            >
              Clear filter
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {filtered.map((b) => (
              <BookingRow
                key={b.id}
                booking={b}
                currency={currency}
                onStatusChange={handleStatusChange}
                onView={setViewBooking}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {viewBooking && (
          <BookingDetailModal
            booking={viewBooking}
            currency={currency}
            onClose={() => setViewBooking(null)}
            onStatusChange={handleStatusChange}
            onRefund={handleRefund}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showConfig && config && restaurantId && (
          <AdvanceConfigModal
            config={config}
            restaurantId={restaurantId}
            onClose={() => setShowConfig(false)}
            onSaved={(c) => queryClient.setQueryData(["hotel-config", restaurantId], c)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
