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
  CheckSquare,
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
  PENDING:     "bg-[var(--accent-muted)] text-[var(--accent-text)]",
  CONFIRMED:   "bg-[var(--accent-muted)] text-[var(--accent-text)]",
  CHECKED_IN:  "bg-blue-100 text-blue-700",
  CHECKED_OUT: "bg-[var(--surface)] text-[var(--text-2)]",
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

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

  const handleBulkDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/bookings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (res.ok) {
        setBookings((prev) => prev.filter((b) => !selectedIds.has(b.id)));
        setSelectedIds(new Set());
      }
    } catch {
      // silent
    } finally {
      setDeleting(false);
      setBulkDeleteOpen(false);
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

  const allSelected = filtered.length > 0 && filtered.every((b) => selectedIds.has(b.id));

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

  if (loading) return null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-black text-[var(--text-1)]">All Hotel Bookings</h2>
          <p className="text-[12px] text-[var(--text-2)]">System-wide room reservations</p>
        </div>
        <button
          onClick={() => fetchBookings(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 rounded-xl bg-[var(--accent-muted)] px-3 py-2 text-[12px] font-semibold text-[var(--accent-text)] hover:bg-[var(--accent-muted)] transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

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

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-3)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search guest, hotel, room..."
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] pl-9 pr-4 py-2.5 text-[13px] text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:border-[var(--accent)] focus:outline-none focus:bg-[var(--canvas)] transition-all"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          {["ALL", "PENDING", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-bold transition-all ${
                statusFilter === s ? "bg-[var(--accent)] text-white" : "bg-[var(--surface)] text-[var(--text-2)] hover:bg-[var(--surface-alt)]"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-2.5">
          <CheckSquare className="h-4 w-4 text-red-500 shrink-0" />
          <span className="text-sm font-semibold text-red-600">{selectedIds.size} selected</span>
          <button onClick={() => setSelectedIds(new Set())} className="text-xs text-red-400 hover:text-red-600">Clear</button>
          <button
            onClick={() => setBulkDeleteOpen(true)}
            className="ml-auto flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600 transition-all"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete {selectedIds.size}
          </button>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <BedDouble className="mx-auto h-12 w-12 text-[var(--text-3)] mb-3" />
          <p className="text-[14px] font-medium text-[var(--text-3)]">No bookings found</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-[var(--canvas)] ring-1 ring-[var(--border)] shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead className="border-b border-[var(--border-soft)] bg-[var(--canvas-sub)]">
                <tr>
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={() => setSelectedIds(allSelected ? new Set() : new Set(filtered.map((b) => b.id)))}
                      className="h-3.5 w-3.5 rounded accent-[var(--accent)]"
                    />
                  </th>
                  {["Guest", "Hotel / Room", "Dates", "Guests", "Total", "Advance", "Status", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-[var(--text-2)]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.map((b, i) => {
                  const StatusIcon = STATUS_ICONS[b.status] ?? Clock;
                  return (
                    <motion.tr
                      key={b.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className={`hover:bg-[var(--surface)]/50 transition-colors ${selectedIds.has(b.id) ? "bg-red-50/30" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(b.id)}
                          onChange={() => setSelectedIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(b.id)) next.delete(b.id); else next.add(b.id);
                            return next;
                          })}
                          className="h-3.5 w-3.5 rounded accent-[var(--accent)]"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-[var(--text-1)]">{b.guestName}</p>
                        {b.guestPhone && <p className="text-[var(--text-3)]">{b.guestPhone}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-[var(--accent)] shrink-0" />
                          <div>
                            <p className="font-semibold text-[var(--text-2)]">{b.restaurant.name}</p>
                            <p className="text-[var(--text-3)]">Room {b.room.roomNumber} · {b.room.type}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[var(--text-2)]">{fmtDate(b.checkIn)} → {fmtDate(b.checkOut)}</p>
                        <p className="text-[var(--text-3)]">{b.nights}N</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-[var(--text-2)]">
                          <Users className="h-3 w-3" />
                          {b.adults + b.children}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-[var(--text-1)]">
                        {b.restaurant.currency} {b.totalPrice.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <CreditCard className={`h-3 w-3 ${b.advancePaid ? "text-[var(--accent-hover)]" : "text-[var(--accent)]"}`} />
                          <span className={b.advancePaid ? "text-[var(--accent-text)] font-semibold" : "text-[var(--accent)]"}>
                            {b.advancePaid ? "Paid" : "Unpaid"}
                          </span>
                        </div>
                        <p className="text-[var(--text-3)]">{b.restaurant.currency} {b.advanceAmount.toLocaleString()}</p>
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
      <DeleteConfirmDialog
        open={bulkDeleteOpen}
        title={`Delete ${selectedIds.size} booking${selectedIds.size > 1 ? "s" : ""}?`}
        description={`This will permanently delete ${selectedIds.size} booking${selectedIds.size > 1 ? "s" : ""}. This cannot be undone.`}
        loading={deleting}
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkDeleteOpen(false)}
      />
    </div>
  );
}
