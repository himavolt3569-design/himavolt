"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import { useRestaurant } from "@/context/RestaurantContext";
import { formatPrice } from "@/lib/currency";

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

// Full literal class strings per action color (Tailwind v4 can't see interpolated names)
const ACTION_COLOR_STYLES: Record<string, string> = {
  emerald: "hover:bg-emerald-50 text-emerald-700",
  rose: "hover:bg-rose-50 text-rose-700",
  blue: "hover:bg-blue-50 text-blue-700",
  gray: "hover:bg-gray-50 text-gray-700",
};

// Full literal class strings per stat-tile color
const STAT_COLOR_STYLES: Record<string, { tile: string; value: string; label: string }> = {
  amber: { tile: "bg-amber-50 ring-amber-100", value: "text-amber-700", label: "text-amber-600" },
  emerald: { tile: "bg-emerald-50 ring-emerald-100", value: "text-emerald-700", label: "text-emerald-600" },
  blue: { tile: "bg-blue-50 ring-blue-100", value: "text-blue-700", label: "text-blue-600" },
  gray: { tile: "bg-gray-50 ring-gray-100", value: "text-gray-700", label: "text-gray-600" },
};

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
      className="rounded-2xl bg-[var(--canvas)] ring-1 ring-[var(--border)] shadow-sm overflow-hidden"
    >
      <div className="flex items-center gap-3 p-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-muted)] ring-1 ring-[var(--accent-border)]">
          <BedDouble className="h-5 w-5 text-[var(--accent)]" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[14px] font-bold text-[var(--text-1)] truncate">{booking.guestName}</p>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${STATUS_STYLES[booking.status]}`}>
              {booking.status.replace("_", " ")}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-[11px] text-[var(--text-2)]">
              Room {booking.room.roomNumber} · {booking.room.type}
            </span>
            <span className="text-[11px] text-[var(--text-3)]">
              {fmtDate(booking.checkIn)} → {fmtDate(booking.checkOut)} ({booking.nights}N)
            </span>
          </div>
        </div>

        {/* Price & pay status */}
        <div className="text-right shrink-0">
          <p className="text-[13px] font-bold text-[var(--text-1)]">{formatPrice(booking.totalPrice, currency)}</p>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${PAY_STATUS_STYLES[booking.paymentStatus]}`}>
            Adv: {booking.paymentStatus === "PAID" ? "Paid" : booking.paymentStatus === "FAILED" ? "Failed" : "Unpaid"}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => onView(booking)}
            className="rounded-lg p-1.5 hover:bg-[var(--surface)] transition-colors"
            title="View details"
          >
            <Eye className="h-3.5 w-3.5 text-[var(--text-3)]" />
          </button>
          {actions.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setOpen((o) => !o)}
                className="flex items-center gap-1 rounded-lg bg-[var(--canvas-sub)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--text-2)] hover:bg-[var(--surface)] transition-colors"
              >
                Actions <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {open && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="absolute right-0 top-full mt-1 z-10 min-w-[120px] rounded-xl bg-[var(--canvas)] ring-1 ring-[var(--border)] shadow-lg overflow-hidden"
                  >
                    {actions.map((a) => {
                      const Icon = a.icon;
                      return (
                        <button
                          key={a.status}
                          onClick={() => { onStatusChange(booking.id, a.status); setOpen(false); }}
                          className={`flex w-full items-center gap-2 px-3 py-2.5 text-[12px] font-semibold transition-colors ${ACTION_COLOR_STYLES[a.color]}`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {a.label}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
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
    new Date(d).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

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
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl bg-[var(--canvas)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--border-soft)] bg-[var(--canvas)]/95 px-5 py-4">
          <h3 className="text-[15px] font-bold text-[var(--text-1)]">Booking Details</h3>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-[var(--surface)] transition-colors">
            <X className="h-4 w-4 text-[var(--text-2)]" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          <div className={`flex items-center gap-2 rounded-2xl p-3 ring-1 ${STATUS_STYLES[booking.status]}`}>
            <div className="h-2 w-2 rounded-full bg-current" />
            <span className="text-[13px] font-bold">{booking.status.replace("_", " ")}</span>
            <span className="ml-auto text-[11px] opacity-70">#{booking.id.slice(-8).toUpperCase()}</span>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-3)]">Guest</p>
            <p className="text-[15px] font-bold text-[var(--text-1)]">{booking.guestName}</p>
            {booking.guestPhone && (
              <a href={`tel:${booking.guestPhone}`} className="flex items-center gap-2 text-[12px] text-[var(--text-2)] hover:text-[var(--accent-text)] transition-colors">
                <Phone className="h-3.5 w-3.5 text-[var(--accent)]" />
                {booking.guestPhone}
              </a>
            )}
            {booking.guestEmail && (
              <div className="flex items-center gap-2 text-[12px] text-[var(--text-2)]">
                <Mail className="h-3.5 w-3.5 text-[var(--accent)]" />
                {booking.guestEmail}
              </div>
            )}
            <div className="flex items-center gap-2 text-[12px] text-[var(--text-2)]">
              <Users className="h-3.5 w-3.5 text-[var(--accent)]" />
              {booking.adults} adults{booking.children > 0 ? `, ${booking.children} children` : ""}
            </div>
          </div>

          {/* Room & dates */}
          <div className="rounded-xl bg-[var(--canvas-sub)] p-3 space-y-2">
            <div className="flex items-center gap-2">
              <BedDouble className="h-4 w-4 text-[var(--accent)]" />
              <span className="text-[13px] font-semibold text-[var(--text-1)]">
                {booking.room.name || `Room ${booking.room.roomNumber}`}
              </span>
              <span className="ml-auto text-[11px] text-[var(--text-2)]">{booking.room.type}</span>
            </div>
            {booking.room.bedType && (
              <p className="text-[11px] text-[var(--text-2)] pl-6">
                {booking.room.bedCount}x {booking.room.bedType} · Floor {booking.room.floor}
              </p>
            )}
            <div className="flex items-center gap-2 pl-6">
              <Calendar className="h-3.5 w-3.5 text-[var(--text-3)]" />
              <span className="text-[12px] text-[var(--text-2)]">
                {fmtDate(booking.checkIn)} → {fmtDate(booking.checkOut)}
                <span className="ml-1 text-[var(--text-3)]">({booking.nights} night{booking.nights > 1 ? "s" : ""})</span>
              </span>
            </div>
          </div>

          <div className="rounded-xl bg-[var(--accent-muted)] ring-1 ring-[var(--accent-border)] p-3 space-y-1.5">
            <div className="flex justify-between text-[12px]">
              <span className="text-[var(--text-2)]">Total stay</span>
              <span className="font-bold text-[var(--text-1)]">{formatPrice(booking.totalPrice, currency)}</span>
            </div>
            <div className="flex justify-between text-[12px] border-t border-[var(--accent-border)] pt-1.5">
              <span className="text-[var(--accent-text)] font-semibold">Advance required</span>
              <span className="font-bold text-[var(--accent-text)]">{formatPrice(booking.advanceAmount, currency)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px]">
                <CreditCard className="h-3 w-3 text-[var(--text-3)]" />
                <span className="text-[var(--text-2)]">
                  {booking.paymentMethod || "Not set"} · {booking.paymentStatus}
                </span>
              </div>
              {!booking.advancePaid && booking.status !== "CANCELLED" && (
                <button
                  onClick={() => onStatusChange(booking.id, booking.status, true)}
                  className="rounded-lg bg-[var(--accent-muted)] px-2.5 py-1 text-[11px] font-bold text-[var(--accent-text)] hover:bg-[#fde9ba] transition-colors"
                >
                  Mark Paid
                </button>
              )}
              {booking.advancePaid && (
                <span className="flex items-center gap-1 text-[11px] text-[var(--accent-text)] font-semibold">
                  <CheckCircle className="h-3 w-3" /> Paid
                </span>
              )}
            </div>
          </div>

          {booking.roomServiceSelected && (
            <div className="flex items-center gap-2 rounded-xl bg-[var(--canvas-sub)] px-3 py-2 text-[12px] text-[var(--text-2)]">
              <CheckCircle className="h-3.5 w-3.5 text-[var(--accent)]" />
              Room service add-on included
            </div>
          )}

          {/* Guest-uploaded payment receipt */}
          {booking.receiptUrl && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-3)]">Payment Receipt</p>
              <a href={booking.receiptUrl} target="_blank" rel="noopener noreferrer" className="block">
                <img
                  src={booking.receiptUrl}
                  alt="Payment receipt"
                  className="max-h-48 w-full rounded-xl object-contain ring-1 ring-[var(--border)] bg-[var(--canvas-sub)]"
                />
              </a>
            </div>
          )}

          {/* Customer cancellation request — hotel accepts or ignores */}
          {booking.cancelReason && booking.status !== "CANCELLED" && (
            <div className="rounded-xl bg-[var(--status-error-bg)] ring-1 ring-[var(--status-error-bg)] p-3 space-y-2">
              <p className="text-[11px] font-bold text-[var(--status-error-text)]">
                Cancellation requested{booking.cancelledBy === "CUSTOMER" ? " by guest" : ""}
              </p>
              <p className="text-[12px] text-[var(--status-error-text)]">{booking.cancelReason}</p>
              <button
                onClick={() => { onStatusChange(booking.id, "CANCELLED"); onClose(); }}
                className="rounded-lg bg-[var(--status-error-text)] px-3 py-1.5 text-[11px] font-bold text-white hover:brightness-110 transition-all"
              >
                Accept &amp; cancel booking
              </button>
            </div>
          )}

          {/* Refund workflow once a paid booking is cancelled */}
          {booking.status === "CANCELLED" && booking.refundStatus && booking.refundStatus !== "NONE" && (
            <div className="flex items-center justify-between rounded-xl bg-[var(--canvas-sub)] ring-1 ring-[var(--border)] p-3">
              <span className="text-[12px] font-semibold text-[var(--text-2)]">
                Refund: {booking.refundStatus === "REFUNDED" ? "Completed" : "Pending"}
              </span>
              {booking.refundStatus === "REQUESTED" && (
                <button
                  onClick={() => { onRefund(booking.id); onClose(); }}
                  className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[var(--accent-hover)] transition-colors"
                >
                  Mark refunded
                </button>
              )}
            </div>
          )}

          {booking.notes && (
            <div className="rounded-xl bg-[var(--status-info-bg)] ring-1 ring-[var(--status-info-border)] p-3">
              <p className="text-[11px] font-semibold text-[var(--status-info-text)] mb-1">Notes</p>
              <p className="text-[12px] text-[var(--status-info-text)]">{booking.notes}</p>
            </div>
          )}

          {["PENDING", "CONFIRMED", "CHECKED_IN"].includes(booking.status) && (
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-3)]">Update Status</p>
              <div className="grid grid-cols-2 gap-2">
                {booking.status === "PENDING" && (
                  <>
                    <button
                      onClick={() => { onStatusChange(booking.id, "CONFIRMED"); onClose(); }}
                      className="rounded-xl bg-[var(--accent)] py-2.5 text-[12px] font-bold text-white hover:bg-[var(--accent)] transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Check className="h-3.5 w-3.5" /> Confirm
                    </button>
                    <button
                      onClick={() => { onStatusChange(booking.id, "CANCELLED"); onClose(); }}
                      className="rounded-xl bg-[var(--status-error-bg)] py-2.5 text-[12px] font-bold text-[var(--status-error-text)] hover:brightness-110 transition-all flex items-center justify-center gap-1.5"
                    >
                      <X className="h-3.5 w-3.5" /> Cancel
                    </button>
                  </>
                )}
                {booking.status === "CONFIRMED" && (
                  <>
                    <button
                      onClick={() => { onStatusChange(booking.id, "CHECKED_IN"); onClose(); }}
                      className="rounded-xl bg-[var(--accent)] py-2.5 text-[12px] font-bold text-white hover:bg-[var(--accent-hover)] transition-colors flex items-center justify-center gap-1.5 col-span-2"
                    >
                      <LogIn className="h-3.5 w-3.5" /> Check In Guest
                    </button>
                  </>
                )}
                {booking.status === "CHECKED_IN" && (
                  <button
                    onClick={() => { onStatusChange(booking.id, "CHECKED_OUT"); onClose(); }}
                    className="rounded-xl bg-[var(--surface-alt)] py-2.5 text-[12px] font-bold text-[var(--text-2)] hover:bg-[var(--border)] transition-colors flex items-center justify-center gap-1.5 col-span-2"
                  >
                    <LogOut className="h-3.5 w-3.5" /> Check Out Guest
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
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
          <h3 className="text-[15px] font-bold text-[var(--text-1)]">Advance Booking Config</h3>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-[var(--surface)] transition-colors">
            <X className="h-4 w-4 text-[var(--text-2)]" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-2)] mb-2">Type</label>
            <div className="grid grid-cols-2 gap-2">
              {(["PERCENTAGE", "FIXED"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`rounded-xl border-2 py-2.5 text-[12px] font-bold transition-all ${
                    type === t ? "border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--accent-text)]" : "border-[var(--border)] text-[var(--text-2)]"
                  }`}
                >
                  {t === "PERCENTAGE" ? "Percentage %" : "Fixed Amount"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-2)] mb-1.5">
              {type === "PERCENTAGE" ? "Percentage (0–100)" : `Fixed Amount (${config.currency})`}
            </label>
            <input
              type="number"
              value={value}
              min="0"
              max={type === "PERCENTAGE" ? "100" : undefined}
              onChange={(e) => setValue(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] px-3 py-2.5 text-[14px] font-semibold text-[var(--text-1)] focus:border-[var(--accent)] focus:outline-none focus:bg-[var(--canvas)] transition-all"
            />
            <p className="mt-1.5 text-[11px] text-[var(--text-3)]">
              {type === "PERCENTAGE"
                ? `Customer pays ${value}% of total room cost as advance`
                : `Customer pays ${config.currency} ${value} fixed advance`}
            </p>
          </div>
          {error && <p className="text-[12px] text-[var(--status-error-text)]">{error}</p>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-xl bg-[var(--accent)] py-3 text-[13px] font-bold text-white hover:bg-[var(--accent)] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
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
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [viewBooking, setViewBooking] = useState<Booking | null>(null);
  const [config, setConfig] = useState<HotelConfig | null>(null);
  const [showConfig, setShowConfig] = useState(false);

  const restaurantId = selectedRestaurant?.id;
  const currency = selectedRestaurant?.currency ?? "NPR";

  const fetchBookings = useCallback(async (showRefreshing = false) => {
    if (!restaurantId) return;
    if (showRefreshing) setRefreshing(true); else setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      const res = await fetch(`/api/restaurants/${restaurantId}/bookings?${params}`);
      const data = await res.json();
      setBookings(data.bookings ?? []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [restaurantId, statusFilter]);

  const fetchConfig = useCallback(async () => {
    if (!restaurantId) return;
    const res = await fetch(`/api/restaurants/${restaurantId}/hotel-config`);
    const data = await res.json();
    if (!data.error) setConfig(data);
  }, [restaurantId]);

  useEffect(() => {
    fetchBookings();
    fetchConfig();
  }, [fetchBookings, fetchConfig]);

  const handleStatusChange = async (id: string, status: string, advancePaid?: boolean) => {
    if (!restaurantId) return;
    const body: Record<string, unknown> = { status };
    if (advancePaid !== undefined) body.advancePaid = advancePaid;
    await fetch(`/api/restaurants/${restaurantId}/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    fetchBookings(true);
    setViewBooking(null);
  };

  const handleRefund = async (id: string) => {
    if (!restaurantId) return;
    await fetch(`/api/restaurants/${restaurantId}/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refundStatus: "REFUNDED" }),
    });
    fetchBookings(true);
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

  // No skeleton — paint nothing until the first list resolves (near-instant).
  if (loading && bookings.length === 0) return null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-black text-[var(--text-1)]">Hotel Bookings</h2>
          <p className="text-[12px] text-[var(--text-2)] mt-0.5">Manage room reservations and guest check-ins</p>
        </div>
        <div className="flex items-center gap-2">
          {config && (
            <button
              onClick={() => setShowConfig(true)}
              className="flex items-center gap-1.5 rounded-xl bg-[var(--surface)] px-3 py-2 text-[12px] font-semibold text-[var(--text-2)] hover:bg-[var(--surface-alt)] transition-colors"
            >
              <Settings className="h-3.5 w-3.5" />
              Config
            </button>
          )}
          <button
            onClick={() => fetchBookings(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-xl bg-[var(--accent-muted)] px-3 py-2 text-[12px] font-semibold text-[var(--accent-text)] hover:bg-[var(--accent-muted)] transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Pending", value: stats.pending, color: "amber" },
          { label: "Confirmed", value: stats.confirmed, color: "emerald" },
          { label: "Checked In", value: stats.checkedIn, color: "blue" },
          { label: "Total", value: stats.total, color: "gray" },
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl ring-1 p-4 ${STAT_COLOR_STYLES[s.color].tile}`}>
            <p className={`text-[22px] font-black ${STAT_COLOR_STYLES[s.color].value}`}>{s.value}</p>
            <p className={`text-[11px] font-semibold ${STAT_COLOR_STYLES[s.color].label}`}>{s.label}</p>
          </div>
        ))}
      </div>

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
            className="ml-auto text-[11px] font-bold text-[var(--accent-text)] hover:text-[var(--accent)] transition-colors"
          >
            Change
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-3)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search guest, room..."
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] pl-9 pr-4 py-2.5 text-[13px] text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:border-[var(--accent)] focus:outline-none focus:bg-[var(--canvas)] transition-all"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-bold transition-all ${
                statusFilter === s
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--surface)] text-[var(--text-2)] hover:bg-[var(--surface-alt)]"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <BedDouble className="mx-auto h-12 w-12 text-[var(--text-3)] mb-3" />
          <p className="text-[14px] font-medium text-[var(--text-3)]">No bookings found</p>
          {statusFilter !== "ALL" && (
            <button onClick={() => setStatusFilter("ALL")} className="mt-2 text-[12px] text-[var(--accent-text)] hover:underline">
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
            onSaved={(c) => setConfig(c)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
