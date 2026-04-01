"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BedDouble,
  Calendar,
  Search,
  Loader2,
  RefreshCw,
  Users,
  CheckCircle,
  Clock,
  XCircle,
  LogIn,
  CreditCard,
  Building2,
  Trash2,
} from "lucide-react";
import DeleteConfirmDialog from "@/components/admin/DeleteConfirmDialog";

interface AdminBooking {
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
  createdAt: string;
  room: {
    roomNumber: string;
    name: string | null;
    type: string;
  };
  restaurant: {
    id: string;
    name: string;
    slug: string;
    currency: string;
  };
}

const STATUS_COLORS: Record<string, string> = {
  PENDING:     "bg-amber-100 text-amber-700",
  CONFIRMED:   "bg-emerald-100 text-emerald-700",
  CHECKED_IN:  "bg-blue-100 text-blue-700",
  CHECKED_OUT: "bg-gray-100 text-gray-600",
  CANCELLED:   "bg-rose-100 text-rose-600",
};

const STATUS_ICONS: Record<string, typeof CheckCircle> = {
  PENDING:     Clock,
  CONFIRMED:   CheckCircle,
  CHECKED_IN:  LogIn,
  CHECKED_OUT: CheckCircle,
  CANCELLED:   XCircle,
};

export default function AllBookingsTab() {
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [deleteTarget, setDeleteTarget] = useState<AdminBooking | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchBookings = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true); else setLoading(true);
    try {
      const res = await fetch("/api/admin/bookings?limit=200");
      const data = await res.json();
      setBookings(Array.isArray(data.bookings) ? data.bookings : []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/bookings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: deleteTarget.id }),
      });
      if (res.ok) {
        setBookings((prev) => prev.filter((b) => b.id !== deleteTarget.id));
      }
    } catch {
      // silent
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  useEffect(() => { fetchBookings(); }, []);

  const filtered = bookings.filter((b) => {
    const matchStatus = statusFilter === "ALL" || b.status === statusFilter;
    if (!matchStatus) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      b.guestName.toLowerCase().includes(q) ||
      b.restaurant.name.toLowerCase().includes(q) ||
      b.room.roomNumber.toLowerCase().includes(q) ||
      b.guestPhone?.includes(q)
    );
  });

  const stats = {
    total: bookings.length,
    pending: bookings.filter((b) => b.status === "PENDING").length,
    active: bookings.filter((b) => b.status === "CHECKED_IN").length,
    revenue: bookings
      .filter((b) => b.advancePaid)
      .reduce((s, b) => s + b.advanceAmount, 0),
  };

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-black text-gray-900">All Hotel Bookings</h2>
          <p className="text-[12px] text-gray-500">System-wide room reservations</p>
        </div>
        <button
          onClick={() => fetchBookings(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-[12px] font-semibold text-amber-700 hover:bg-amber-100 transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, color: "gray" },
          { label: "Pending", value: stats.pending, color: "amber" },
          { label: "Checked In", value: stats.active, color: "blue" },
          { label: "Advance Collected", value: `NPR ${stats.revenue.toLocaleString()}`, color: "emerald", isText: true },
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl bg-${s.color}-50 ring-1 ring-${s.color}-100 p-4`}>
            <p className={`text-[${s.isText ? "14" : "22"}px] font-black text-${s.color}-700`}>{s.value}</p>
            <p className={`text-[11px] font-semibold text-${s.color}-600`}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search guest, hotel, room..."
            className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-4 py-2.5 text-[13px] text-gray-800 placeholder:text-gray-400 focus:border-amber-400 focus:outline-none focus:bg-white transition-all"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          {["ALL", "PENDING", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-bold transition-all ${
                statusFilter === s ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <BedDouble className="mx-auto h-12 w-12 text-gray-200 mb-3" />
          <p className="text-[14px] font-medium text-gray-400">No bookings found</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-gray-100 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  {["Guest", "Hotel / Room", "Dates", "Guests", "Total", "Advance", "Status", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-gray-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((b, i) => {
                  const StatusIcon = STATUS_ICONS[b.status] ?? Clock;
                  return (
                    <motion.tr
                      key={b.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-800">{b.guestName}</p>
                        {b.guestPhone && <p className="text-gray-400">{b.guestPhone}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          <div>
                            <p className="font-semibold text-gray-700">{b.restaurant.name}</p>
                            <p className="text-gray-400">Room {b.room.roomNumber} · {b.room.type}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-gray-700">{fmtDate(b.checkIn)} → {fmtDate(b.checkOut)}</p>
                        <p className="text-gray-400">{b.nights}N</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-gray-600">
                          <Users className="h-3 w-3" />
                          {b.adults + b.children}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-800">
                        {b.restaurant.currency} {b.totalPrice.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <CreditCard className={`h-3 w-3 ${b.advancePaid ? "text-emerald-500" : "text-orange-400"}`} />
                          <span className={b.advancePaid ? "text-emerald-600 font-semibold" : "text-orange-600"}>
                            {b.advancePaid ? "Paid" : "Unpaid"}
                          </span>
                        </div>
                        <p className="text-gray-400">{b.restaurant.currency} {b.advanceAmount.toLocaleString()}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold w-fit ${STATUS_COLORS[b.status]}`}>
                          <StatusIcon className="h-3 w-3" />
                          {b.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setDeleteTarget(b)}
                          className="flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-[11px] font-medium text-red-500 hover:bg-red-100 transition-all"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <DeleteConfirmDialog
        open={!!deleteTarget}
        title={`Delete booking for "${deleteTarget?.guestName}"?`}
        description={`This will permanently delete the booking for Room ${deleteTarget?.room.roomNumber} at ${deleteTarget?.restaurant.name}. This cannot be undone.`}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
