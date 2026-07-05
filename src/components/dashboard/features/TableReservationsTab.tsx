"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays,
  Clock,
  Users,
  Phone,
  CheckCircle2,
  XCircle,
  Loader2,
  MessageSquare,
  Armchair,
  Sparkles,
  Search,
} from "lucide-react";
import { useRestaurant } from "@/context/RestaurantContext";
import { apiFetch, peekApiCache } from "@/lib/api-client";

interface Reservation {
  id: string;
  guestName: string;
  phone: string;
  email: string | null;
  partySize: number;
  date: string;
  timeSlot: string;
  tablePreference: string | null;
  tableNumber: string | null;
  specialRequests: string | null;
  status: string;
  createdAt: string;
}

const STATUS_CONFIG: Record<
  string,
  { bg: string; text: string; border: string; pulse?: boolean }
> = {
  PENDING: {
    bg: "bg-[var(--status-pending-bg)]",
    text: "text-[var(--status-pending-text)]",
    border: "border-[var(--status-pending-text)]/25",
    pulse: true,
  },
  CONFIRMED: {
    bg: "bg-[var(--status-success-bg)]",
    text: "text-[var(--status-success-text)]",
    border: "border-[var(--status-success-text)]/25",
  },
  SEATED: {
    bg: "bg-[var(--status-info-bg)]",
    text: "text-[var(--status-info-text)]",
    border: "border-[var(--status-info-text)]/25",
  },
  COMPLETED: {
    bg: "bg-[var(--status-done-bg)]",
    text: "text-[var(--status-done-text)]",
    border: "border-[var(--status-done-text)]/25",
  },
  CANCELLED: {
    bg: "bg-[var(--status-error-bg)]",
    text: "text-[var(--status-error-text)]",
    border: "border-[var(--status-error-text)]/25",
  },
  NO_SHOW: {
    bg: "bg-[var(--status-error-bg)]",
    text: "text-[var(--status-error-text)]",
    border: "border-[var(--status-error-text)]/25",
  },
};

const STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["SEATED", "NO_SHOW", "CANCELLED"],
  SEATED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

const ACTION_STYLES: Record<string, string> = {
  CONFIRMED:
    "bg-[var(--status-success-bg)] text-[var(--status-success-text)] border-[var(--status-success-text)]/25 hover:brightness-95",
  SEATED:
    "bg-[var(--status-info-bg)] text-[var(--status-info-text)] border-[var(--status-info-text)]/25 hover:brightness-95",
  COMPLETED:
    "bg-[var(--status-done-bg)] text-[var(--status-done-text)] border-[var(--status-done-text)]/25 hover:brightness-95",
  CANCELLED:
    "bg-[var(--status-error-bg)] text-[var(--status-error-text)] border-[var(--status-error-text)]/20 hover:brightness-95",
  NO_SHOW:
    "bg-[var(--status-error-bg)] text-[var(--status-error-text)] border-[var(--status-error-text)]/20 hover:brightness-95",
};

export default function TableReservationsTab() {
  const { selectedRestaurant } = useRestaurant();
  const restaurantId = selectedRestaurant?.id ?? null;

  const resvPath = restaurantId
    ? `/api/restaurants/${restaurantId}/reservations`
    : "";
  const [reservations, setReservations] = useState<Reservation[]>(
    () =>
      peekApiCache<{ reservations: Reservation[] }>(resvPath)?.reservations ??
      [],
  );
  const [loading, setLoading] = useState(
    () => !!resvPath && !peekApiCache(resvPath),
  );
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchReservations = async () => {
    if (!restaurantId) return;
    if (!peekApiCache(`/api/restaurants/${restaurantId}/reservations`))
      setLoading(true);
    try {
      const res = await apiFetch<{ reservations: Reservation[] }>(
        `/api/restaurants/${restaurantId}/reservations`,
      );
      setReservations(res.reservations);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  const updateStatus = async (res: Reservation, newStatus: string) => {
    if (!restaurantId) return;
    try {
      // Optimistic update
      setReservations((prev) =>
        prev.map((r) => (r.id === res.id ? { ...r, status: newStatus } : r)),
      );
      const updated = await apiFetch<Reservation>(
        `/api/restaurants/${restaurantId}/reservations/${res.id}`,
        { method: "PATCH", body: { status: newStatus } },
      );
      setReservations((prev) =>
        prev.map((r) => (r.id === res.id ? updated : r)),
      );
    } catch (err) {
      // Revert on error
      fetchReservations();
      setError(err instanceof Error ? err.message : "Failed to update");
    }
  };

  const filtered = useMemo(() => {
    return reservations
      .filter((r) => statusFilter === "ALL" || r.status === statusFilter)
      .filter(
        (r) =>
          !searchQuery ||
          r.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.phone.includes(searchQuery) ||
          r.tableNumber?.includes(searchQuery),
      )
      .sort((a, b) => {
        // Sort by date then time
        const dateCompare =
          new Date(a.date).getTime() - new Date(b.date).getTime();
        if (dateCompare !== 0) return dateCompare;
        return a.timeSlot.localeCompare(b.timeSlot);
      });
  }, [reservations, statusFilter, searchQuery]);

  if (!restaurantId) {
    return <div className="text-[var(--text-3)] p-4">No restaurant selected</div>;
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header Section */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
        <div>
          <h3 className="text-3xl font-extrabold text-[var(--text-1)] flex items-center gap-3">
            <CalendarDays className="w-8 h-8 text-[var(--accent)]" />
            Table Reservations
          </h3>
          <p className="text-[var(--text-2)] mt-2 max-w-md leading-relaxed">
            Manage your table bookings, assign tables, and streamline the guest
            experience from arrival to departure.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-[var(--text-3)]" />
            </div>
            <input
              type="text"
              placeholder="Search guests or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64 bg-[var(--canvas-sub)] ring-1 ring-[var(--border)] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 transition-all"
            />
          </div>

          {/* Filters */}
          <div className="flex bg-[var(--canvas-sub)] p-1 rounded-xl ring-1 ring-[var(--border)] overflow-x-auto scrollbar-hide">
            {["ALL", "PENDING", "CONFIRMED", "SEATED"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`relative px-4 py-2 text-sm font-semibold transition-colors rounded-lg z-10 whitespace-nowrap ${
                  statusFilter === s
                    ? "text-[var(--accent-text)]"
                    : "text-[var(--text-3)] hover:text-[var(--text-1)]"
                }`}
              >
                {statusFilter === s && (
                  <motion.div
                    layoutId="resvFilter"
                    className="absolute inset-0 bg-[var(--canvas)] shadow-sm rounded-lg -z-10"
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 35,
                    }}
                  />
                )}
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-[var(--status-error-bg)] border border-[var(--status-error-text)]/20 p-4 text-sm text-[var(--status-error-text)] flex items-center gap-3"
        >
          <XCircle className="w-5 h-5 shrink-0" />
          {error}
        </motion.div>
      )}

      {loading && reservations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-[var(--accent)]">
          <Loader2 className="w-10 h-10 animate-spin mb-4" />
          <p className="text-[var(--text-2)] font-medium">Loading reservations...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center justify-center py-24 text-center"
              >
                <div className="relative w-24 h-24 mb-6">
                  <div className="absolute inset-0 bg-[var(--accent)]/15 blur-2xl rounded-full animate-pulse" />
                  <div className="relative flex items-center justify-center w-full h-full bg-[var(--surface)] border border-[var(--border)] rounded-3xl">
                    <CalendarDays className="w-10 h-10 text-[var(--accent)]" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-[var(--text-1)] mb-2">
                  No Reservations Found
                </h3>
                <p className="text-[var(--text-3)] max-w-sm">
                  {searchQuery
                    ? "No reservations match your search criteria."
                    : "You don't have any reservations matching this status yet."}
                </p>
              </motion.div>
            ) : (
              filtered.map((r, i) => {
                const transitions = STATUS_TRANSITIONS[r.status] || [];
                const config = STATUS_CONFIG[r.status] || STATUS_CONFIG.PENDING;

                return (
                  <motion.div
                    layout
                    key={r.id}
                    initial={{ opacity: 0, scale: 0.98, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{
                      delay: Math.min(i * 0.05, 0.3),
                      type: "spring",
                      stiffness: 400,
                      damping: 30,
                    }}
                    className="group relative bg-[var(--surface)] rounded-2xl p-5 md:p-6 border border-[var(--border)] hover:border-[var(--accent-border)] hover:shadow-md transition-all duration-300 shadow-sm overflow-hidden"
                  >
                    {/* Ambient Hover Glow */}
                    <div className="absolute -inset-32 bg-gradient-to-br from-[var(--accent)]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

                    <div className="relative flex flex-col md:flex-row gap-6 md:gap-8">
                      {/* Left: Time & Date Slot */}
                      <div className="flex flex-row md:flex-col items-center md:justify-center gap-4 md:gap-0 min-w-[120px] p-4 rounded-xl bg-[var(--canvas-sub)] border border-[var(--border)] shrink-0">
                        <Clock className="hidden md:block w-6 h-6 text-[var(--accent)] mb-3" />
                        <span className="text-2xl font-black text-[var(--text-1)] tracking-tight">
                          {r.timeSlot}
                        </span>
                        <div className="h-4 w-[1px] md:h-px md:w-8 bg-[var(--border)] my-0 md:my-2" />
                        <span className="text-xs text-[var(--accent-text)] uppercase font-bold tracking-widest">
                          {new Date(r.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>

                      {/* Middle: Core Details */}
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <div className="flex flex-wrap items-center gap-3 mb-3">
                          <h4 className="text-2xl font-bold text-[var(--text-1)] truncate">
                            {r.guestName}
                          </h4>
                          <div
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${config.bg} ${config.text} ${config.border}`}
                          >
                            {config.pulse && (
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
                              </span>
                            )}
                            {r.status.replace("_", " ")}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-[var(--text-2)] font-medium">
                          <div className="flex items-center gap-2.5">
                            <div className="p-1.5 rounded-md bg-[var(--canvas-sub)]">
                              <Users className="w-4 h-4 text-[var(--text-3)]" />
                            </div>
                            <span className="text-[var(--text-1)]">
                              {r.partySize} Guests
                            </span>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <div className="p-1.5 rounded-md bg-[var(--canvas-sub)]">
                              <Phone className="w-4 h-4 text-[var(--text-3)]" />
                            </div>
                            <span className="text-[var(--text-1)]">{r.phone}</span>
                          </div>
                          {r.tableNumber && (
                            <div className="flex items-center gap-2.5 text-[var(--status-success-text)] bg-[var(--status-success-bg)] px-3 py-1 rounded-lg border border-[var(--status-success-text)]/20">
                              <Armchair className="w-4 h-4" />
                              <span className="font-bold">
                                Table {r.tableNumber}
                              </span>
                            </div>
                          )}
                        </div>

                        {r.specialRequests && (
                          <div className="mt-4 p-4 rounded-xl bg-[var(--canvas-sub)] border border-[var(--border)] text-sm text-[var(--text-2)] flex items-start gap-3">
                            <MessageSquare className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
                            <p className="leading-relaxed italic text-[var(--text-3)]">
                              "{r.specialRequests}"
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Right: Actions */}
                      {transitions.length > 0 && (
                        <div className="flex flex-row md:flex-col justify-end gap-3 shrink-0 md:w-[150px]">
                          {transitions.map((t) => {
                            const actionStyle =
                              ACTION_STYLES[t] ||
                              "bg-[var(--canvas-sub)] hover:bg-[var(--surface-alt)] text-[var(--text-1)] border-[var(--border)]";
                            return (
                              <button
                                key={t}
                                onClick={() => updateStatus(r, t)}
                                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 active:scale-95 border ${actionStyle}`}
                              >
                                {t === "CONFIRMED" && (
                                  <CheckCircle2 className="w-4 h-4" />
                                )}
                                {t === "SEATED" && (
                                  <Armchair className="w-4 h-4" />
                                )}
                                {t === "COMPLETED" && (
                                  <Sparkles className="w-4 h-4" />
                                )}
                                {(t === "CANCELLED" || t === "NO_SHOW") && (
                                  <XCircle className="w-4 h-4" />
                                )}
                                {t.replace("_", " ")}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
