"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
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

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-500/10 text-amber-300 border-amber-500/30",
  CONFIRMED: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  SEATED: "bg-blue-500/10 text-blue-300 border-blue-500/30",
  COMPLETED: "bg-zinc-500/10 text-zinc-300 border-zinc-500/30",
  CANCELLED: "bg-red-500/10 text-red-300 border-red-500/30",
  NO_SHOW: "bg-red-500/10 text-red-300 border-red-500/30",
};

const STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["SEATED", "NO_SHOW", "CANCELLED"],
  SEATED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

export default function TableReservationsTab() {
  const { selectedRestaurant } = useRestaurant();
  const restaurantId = selectedRestaurant?.id ?? null;

  // Seed from the warm GET cache so re-opening paints instantly — no loader.
  const resvPath = restaurantId ? `/api/restaurants/${restaurantId}/reservations` : "";
  const [reservations, setReservations] = useState<Reservation[]>(
    () => peekApiCache<{ reservations: Reservation[] }>(resvPath)?.reservations ?? [],
  );
  const [loading, setLoading] = useState(() => !!resvPath && !peekApiCache(resvPath));
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const fetchReservations = async () => {
    if (!restaurantId) return;
    if (!peekApiCache(`/api/restaurants/${restaurantId}/reservations`)) setLoading(true);
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
      const updated = await apiFetch<Reservation>(
        `/api/restaurants/${restaurantId}/reservations/${res.id}`,
        { method: "PATCH", body: { status: newStatus } },
      );
      setReservations((prev) =>
        prev.map((r) => (r.id === res.id ? updated : r)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    }
  };

  const filtered =
    statusFilter === "ALL"
      ? reservations
      : reservations.filter((r) => r.status === statusFilter);

  if (!restaurantId) {
    return (
      <div className="text-zinc-400 p-4">No restaurant selected</div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-brand-400" />
          Table Reservations
        </h3>
        <div className="flex gap-2">
          {["ALL", "PENDING", "CONFIRMED", "SEATED"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === s
                  ? "bg-brand-600 text-white"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {loading && reservations.length === 0 && (
        <div className="flex items-center justify-center py-8 text-[var(--text-3)]">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Loading reservations...
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center text-[var(--text-3)]">
          <CalendarDays className="w-10 h-10 mb-3 opacity-40" />
          <p className="text-sm font-medium">No reservations yet</p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((r, i) => {
          const transitions = STATUS_TRANSITIONS[r.status] || [];
          return (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="bg-zinc-800/80 rounded-xl p-4 border border-zinc-700/50"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-white font-semibold">{r.guestName}</h4>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border ${
                        STATUS_STYLES[r.status] || STATUS_STYLES.PENDING
                      }`}
                    >
                      {r.status.replace("_", " ")}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="w-3 h-3" />
                      {new Date(r.date).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {r.timeSlot}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {r.partySize}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {r.phone}
                    </span>
                    {r.tableNumber && (
                      <span className="flex items-center gap-1 text-emerald-400">
                        <Armchair className="w-3 h-3" />
                        Table {r.tableNumber}
                      </span>
                    )}
                  </div>
                  {r.specialRequests && (
                    <p className="mt-2 text-xs text-zinc-500 flex items-start gap-1.5">
                      <MessageSquare className="w-3 h-3 mt-0.5 shrink-0" />
                      {r.specialRequests}
                    </p>
                  )}
                </div>
              </div>

              {transitions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {transitions.map((t) => (
                    <button
                      key={t}
                      onClick={() => updateStatus(r, t)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                        t === "CONFIRMED" || t === "SEATED" || t === "COMPLETED"
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                          : "bg-zinc-700 hover:bg-zinc-600 text-zinc-200"
                      }`}
                    >
                      {t === "CONFIRMED" && <CheckCircle2 className="w-3 h-3" />}
                      {(t === "CANCELLED" || t === "NO_SHOW") && (
                        <XCircle className="w-3 h-3" />
                      )}
                      {t.replace("_", " ")}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })}

        {!loading && filtered.length === 0 && (
          <div className="text-zinc-500 text-sm text-center py-8 bg-zinc-800/40 rounded-xl border border-zinc-700/50">
            No reservations yet.
          </div>
        )}
      </div>
    </div>
  );
}
