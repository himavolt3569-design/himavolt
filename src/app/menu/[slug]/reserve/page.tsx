"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  Users,
  CheckCircle,
  Loader2,
  ArrowLeft,
  Phone,
  Mail,
  User as UserIcon,
} from "lucide-react";
import Link from "next/link";
import { apiFetch } from "@/lib/api-client";

const TIME_SLOTS = [
  "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
  "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00",
];

export default function ReservePage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({
    guestName: "",
    phone: "",
    email: "",
    partySize: 2,
    date: today,
    timeSlot: "19:00",
    tablePreference: "",
    specialRequests: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState<null | { id: string; date: string; timeSlot: string }>(null);
  const [error, setError] = useState<string | null>(null);
  const [bookedSlots, setBookedSlots] = useState<Record<string, number>>({});
  const [tableCount, setTableCount] = useState<number>(10);

  useEffect(() => {
    if (!slug || !form.date) return;
    apiFetch<{ bookedSlots: Record<string, number>; tableCount: number }>(
      `/api/public/restaurants/${slug}/reservations?date=${form.date}`,
    )
      .then((res) => {
        setBookedSlots(res.bookedSlots || {});
        setTableCount(res.tableCount || 10);
      })
      .catch(() => {});
  }, [slug, form.date]);

  const handleSubmit = async () => {
    if (!form.guestName.trim() || !form.phone.trim()) {
      setError("Name and phone are required");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch<{ id: string; date: string; timeSlot: string }>(
        `/api/public/restaurants/${slug}/reservations`,
        { method: "POST", body: form },
      );
      setConfirmed(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit reservation");
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmed) {
    return (
      <div className="min-h-screen bg-[var(--canvas)] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md rounded-2xl bg-[var(--canvas)] border border-[var(--border)] p-8 shadow-lg text-center"
        >
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-xl font-bold text-[var(--text-1)] mb-2">
            Reservation Requested
          </h1>
          <p className="text-sm text-[var(--text-2)] mb-6">
            We&apos;ve received your request for{" "}
            <span className="font-semibold">
              {new Date(confirmed.date).toLocaleDateString()}
            </span>{" "}
            at{" "}
            <span className="font-semibold">{confirmed.timeSlot}</span>. The
            restaurant will confirm shortly.
          </p>
          <Link
            href={`/menu/${slug}`}
            className="inline-block w-full rounded-xl bg-[var(--accent)] py-3 text-sm font-bold text-white hover:bg-[var(--accent-hover)] transition-colors"
          >
            Back to Menu
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--canvas)] pb-10">
      <header className="sticky top-0 z-20 bg-[var(--canvas)]/95 backdrop-blur border-b border-[var(--border-soft)]">
        <div className="mx-auto max-w-2xl px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="rounded-lg p-2 hover:bg-[var(--canvas-sub)]"
          >
            <ArrowLeft className="h-5 w-5 text-[var(--text-1)]" />
          </button>
          <h1 className="text-base font-bold text-[var(--text-1)]">
            Reserve a Table
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 space-y-5">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--canvas)] p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-[var(--text-2)] mb-1.5 flex items-center gap-1.5">
              <UserIcon className="h-3.5 w-3.5" />
              Your Name
            </label>
            <input
              type="text"
              value={form.guestName}
              onChange={(e) => setForm({ ...form, guestName: e.target.value })}
              placeholder="Full name"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] px-4 py-3 text-sm text-[var(--text-1)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[var(--text-2)] mb-1.5 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                Phone
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) =>
                  setForm({
                    ...form,
                    phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                  })
                }
                required
                maxLength={10}
                minLength={10}
                pattern="\d{10}"
                inputMode="numeric"
                title="Enter exactly 10 digits"
                placeholder="98XXXXXXXX"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] px-4 py-3 text-sm text-[var(--text-1)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--text-2)] mb-1.5 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                Email (optional)
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] px-4 py-3 text-sm text-[var(--text-1)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[var(--text-2)] mb-1.5 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Date
              </label>
              <input
                type="date"
                min={today}
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] px-4 py-3 text-sm text-[var(--text-1)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--text-2)] mb-1.5 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Party Size
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={form.partySize}
                onChange={(e) =>
                  setForm({ ...form, partySize: parseInt(e.target.value, 10) || 1 })
                }
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] px-4 py-3 text-sm text-[var(--text-1)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--text-2)] mb-2 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Time Slot
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {TIME_SLOTS.map((slot) => {
                const booked = bookedSlots[slot] || 0;
                const full = booked >= tableCount;
                const active = form.timeSlot === slot;
                return (
                  <button
                    key={slot}
                    onClick={() => !full && setForm({ ...form, timeSlot: slot })}
                    disabled={full}
                    className={`rounded-xl border px-2 py-2 text-xs font-semibold transition-all ${
                      active
                        ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                        : full
                          ? "bg-[var(--canvas-sub)] text-[var(--text-3)] border-[var(--border-soft)] cursor-not-allowed line-through"
                          : "bg-[var(--canvas-sub)] text-[var(--text-1)] border-[var(--border)] hover:border-[var(--accent)]"
                    }`}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--text-2)] mb-1.5 block">
              Special Requests (optional)
            </label>
            <textarea
              value={form.specialRequests}
              onChange={(e) =>
                setForm({ ...form, specialRequests: e.target.value })
              }
              placeholder="Dietary needs, occasion, seating preference..."
              rows={3}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] px-4 py-3 text-sm text-[var(--text-1)] focus:outline-none focus:border-[var(--accent)] resize-none"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] py-4 text-sm font-bold text-white hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Request Reservation"
            )}
          </button>
        </div>
      </main>
    </div>
  );
}
