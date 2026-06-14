"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star,
  MessageSquare,
  CornerDownRight,
  Trash2,
  Loader2,
  Send,
  X,
  Pencil,
  Clock,
  Hash,
  Utensils,
  Inbox,
  ShieldCheck,
} from "lucide-react";
import { useRestaurant } from "@/context/RestaurantContext";

interface Feedback {
  id: string;
  rating: number | null;
  comment: string | null;
  name: string | null;
  isAnonymous: boolean;
  createdAt: string;
  reply: string | null;
  repliedAt: string | null;
  repliedBy: string | null;
  order: { orderNo: string; tableNo: number | null; guestName: string | null } | null;
}

type Filter = "all" | "unreplied" | "replied";

async function staffFetch(url: string, opts?: RequestInit) {
  const res = await fetch(url, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts?.headers || {}) },
    credentials: "include",
  });
  if (!res.ok) throw new Error("Request failed");
  return res.json();
}

function timeAgo(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-NP", { month: "short", day: "numeric", year: "numeric" });
}

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          style={{ width: size, height: size }}
          className={
            s <= value
              ? "fill-[var(--accent)] text-[var(--accent)]"
              : "fill-[var(--border)] text-[var(--border)]"
          }
        />
      ))}
    </span>
  );
}

function initials(name: string | null, anon: boolean) {
  if (anon || !name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

/* ── Single feedback card with inline reply ──────────────────────── */

function FeedbackCard({
  fb,
  restaurantId,
  onReplied,
  onDeleted,
}: {
  fb: Feedback;
  restaurantId: string;
  onReplied: (updated: Feedback) => void;
  onDeleted: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(fb.reply ?? "");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const displayName = fb.isAnonymous || !fb.name ? "Anonymous guest" : fb.name;

  const saveReply = async () => {
    if (!draft.trim()) return;
    setBusy(true);
    try {
      const { feedback } = await staffFetch(
        `/api/restaurants/${restaurantId}/feedback/${fb.id}`,
        { method: "PATCH", body: JSON.stringify({ reply: draft.trim() }) },
      );
      onReplied(feedback);
      setEditing(false);
    } catch {
      /* surfaced by disabled state resetting */
    }
    setBusy(false);
  };

  const clearReply = async () => {
    setBusy(true);
    try {
      const { feedback } = await staffFetch(
        `/api/restaurants/${restaurantId}/feedback/${fb.id}`,
        { method: "PATCH", body: JSON.stringify({ reply: null }) },
      );
      onReplied(feedback);
      setDraft("");
      setEditing(false);
    } catch {
      /* ignore */
    }
    setBusy(false);
  };

  const remove = async () => {
    setBusy(true);
    try {
      await staffFetch(`/api/restaurants/${restaurantId}/feedback/${fb.id}`, {
        method: "DELETE",
      });
      onDeleted(fb.id);
    } catch {
      setBusy(false);
      setConfirmDelete(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="rounded-3xl border border-[var(--border-soft)] bg-[var(--canvas)] p-5 shadow-sm shadow-black/[0.02]"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-muted)] text-[13px] font-bold text-[var(--accent-text)]">
          {initials(fb.name, fb.isAnonymous)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-sm font-bold text-[var(--text-1)]">{displayName}</p>
            {fb.rating != null && <Stars value={fb.rating} />}
            <span className="flex items-center gap-1 text-[11px] text-[var(--text-3)]">
              <Clock className="h-3 w-3" /> {timeAgo(fb.createdAt)}
            </span>
          </div>

          {(fb.order || fb.isAnonymous) && (
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-[var(--text-3)]">
              {fb.order && (
                <span className="flex items-center gap-1">
                  <Hash className="h-3 w-3" /> {fb.order.orderNo}
                </span>
              )}
              {fb.order?.tableNo != null && (
                <span className="flex items-center gap-1">
                  <Utensils className="h-3 w-3" /> Table {fb.order.tableNo}
                </span>
              )}
            </div>
          )}

          {fb.comment && (
            <p className="mt-2 text-[13px] leading-relaxed text-[var(--text-2)]">
              {fb.comment}
            </p>
          )}
          {!fb.comment && fb.rating != null && (
            <p className="mt-2 text-[13px] italic text-[var(--text-3)]">
              Rated {fb.rating}/5 — no written comment
            </p>
          )}
        </div>

        {/* Delete */}
        {confirmDelete ? (
          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={remove}
              disabled={busy}
              className="rounded-lg bg-red-500 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-red-600 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Delete"}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="rounded-lg p-1.5 text-[var(--text-3)] hover:bg-[var(--canvas-sub)]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            title="Delete feedback"
            className="shrink-0 rounded-lg p-1.5 text-[var(--text-3)] hover:bg-red-50 hover:text-red-500 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Reply area ──────────────────────────────── */}
      <div className="mt-3 pl-[52px]">
        {fb.reply && !editing && (
          <div className="rounded-2xl border border-[var(--accent-border)] bg-[var(--accent-muted)] p-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--accent-text)]">
                <CornerDownRight className="h-3 w-3" />
                {fb.repliedBy ? `${fb.repliedBy} replied` : "Reply"}
                {fb.repliedAt && (
                  <span className="font-medium text-[var(--accent-text)]/70">
                    · {timeAgo(fb.repliedAt)}
                  </span>
                )}
              </span>
              <button
                onClick={() => {
                  setDraft(fb.reply ?? "");
                  setEditing(true);
                }}
                className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold text-[var(--accent-text)] hover:bg-[var(--canvas)]/60"
              >
                <Pencil className="h-3 w-3" /> Edit
              </button>
            </div>
            <p className="text-[13px] leading-relaxed text-[var(--text-2)]">{fb.reply}</p>
          </div>
        )}

        {!fb.reply && !editing && (
          <button
            onClick={() => {
              setDraft("");
              setEditing(true);
            }}
            className="flex items-center gap-2 rounded-xl border border-dashed border-[var(--border)] px-3 py-2 text-[12px] font-bold text-[var(--text-2)] hover:border-[var(--accent)]/40 hover:text-[var(--accent)] transition-colors"
          >
            <MessageSquare className="h-3.5 w-3.5" /> Reply to guest
          </button>
        )}

        {editing && (
          <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--canvas-sub)] p-3">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={2}
              autoFocus
              maxLength={1000}
              placeholder="Write a thoughtful reply…"
              className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--canvas)] px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)]"
            />
            <div className="mt-2 flex items-center justify-between">
              <div>
                {fb.reply && (
                  <button
                    onClick={clearReply}
                    disabled={busy}
                    className="rounded-lg px-2 py-1.5 text-[11px] font-bold text-red-500 hover:bg-red-50 disabled:opacity-50"
                  >
                    Remove reply
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditing(false)}
                  className="rounded-lg px-3 py-1.5 text-[12px] font-bold text-[var(--text-2)] hover:bg-[var(--canvas)]"
                >
                  Cancel
                </button>
                <button
                  onClick={saveReply}
                  disabled={busy || !draft.trim()}
                  className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-[12px] font-bold text-white hover:bg-[var(--accent-hover)] disabled:opacity-40"
                >
                  {busy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  {fb.reply ? "Update" : "Send reply"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ── Main tab ────────────────────────────────────────────────────── */

export default function FeedbackTab() {
  const { selectedRestaurant } = useRestaurant();
  const restaurantId = selectedRestaurant?.id;

  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [total, setTotal] = useState(0);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [starFilter, setStarFilter] = useState<number | null>(null);

  useEffect(() => {
    if (!restaurantId) return;
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const data = await staffFetch(
          `/api/restaurants/${restaurantId}/feedback?limit=100`,
        );
        if (!active) return;
        setFeedbacks(data.feedbacks ?? []);
        setTotal(data.total ?? 0);
        setAvgRating(data.avgRating ?? null);
      } catch {
        if (active) setFeedbacks([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [restaurantId]);

  const repliedCount = useMemo(
    () => feedbacks.filter((f) => f.reply).length,
    [feedbacks],
  );
  const responseRate = feedbacks.length
    ? Math.round((repliedCount / feedbacks.length) * 100)
    : 0;

  const distribution = useMemo(() => {
    const d = [0, 0, 0, 0, 0]; // index 0 → 1 star
    for (const f of feedbacks) if (f.rating) d[f.rating - 1]++;
    return d;
  }, [feedbacks]);
  const ratedCount = distribution.reduce((a, b) => a + b, 0);

  const visible = useMemo(() => {
    return feedbacks.filter((f) => {
      if (filter === "replied" && !f.reply) return false;
      if (filter === "unreplied" && f.reply) return false;
      if (starFilter && f.rating !== starFilter) return false;
      return true;
    });
  }, [feedbacks, filter, starFilter]);

  const applyUpdate = (updated: Feedback) =>
    setFeedbacks((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
  const applyDelete = (id: string) => {
    setFeedbacks((prev) => prev.filter((f) => f.id !== id));
    setTotal((t) => Math.max(0, t - 1));
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-28 rounded-3xl bg-[var(--surface)] animate-pulse" />
        <div className="h-32 rounded-3xl bg-[var(--surface)] animate-pulse" />
        <div className="h-32 rounded-3xl bg-[var(--surface)] animate-pulse opacity-60" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      {/* ── Header / stats ─────────────────────────── */}
      <div className="rounded-[2rem] border border-[var(--border-soft)] bg-[var(--canvas)] p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-4xl font-extrabold leading-none text-[var(--text-1)]">
                {avgRating != null ? avgRating.toFixed(1) : "—"}
              </p>
              <div className="mt-1.5 flex justify-center">
                <Stars value={Math.round(avgRating ?? 0)} size={15} />
              </div>
              <p className="mt-1 text-[11px] text-[var(--text-3)]">{total} total</p>
            </div>

            <div className="h-16 w-px bg-[var(--border)]" />

            {/* Distribution */}
            <div className="space-y-1">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = distribution[star - 1];
                const pct = ratedCount ? (count / ratedCount) * 100 : 0;
                return (
                  <button
                    key={star}
                    onClick={() => setStarFilter(starFilter === star ? null : star)}
                    className={`flex w-full items-center gap-2 rounded-md px-1 transition-colors ${
                      starFilter === star ? "bg-[var(--accent-muted)]" : "hover:bg-[var(--canvas-sub)]"
                    }`}
                  >
                    <span className="flex w-3 items-center text-[10px] font-bold text-[var(--text-3)]">
                      {star}
                    </span>
                    <Star className="h-2.5 w-2.5 fill-[var(--accent)] text-[var(--accent)]" />
                    <span className="h-1.5 w-24 overflow-hidden rounded-full bg-[var(--surface)]">
                      <span
                        className="block h-full rounded-full bg-[var(--accent)]"
                        style={{ width: `${pct}%` }}
                      />
                    </span>
                    <span className="w-5 text-right text-[10px] tabular-nums text-[var(--text-3)]">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-1 gap-3 sm:justify-end">
            <div className="rounded-2xl bg-[var(--canvas-sub)] px-4 py-3 text-center">
              <p className="text-2xl font-extrabold text-[var(--text-1)]">{repliedCount}</p>
              <p className="text-[11px] text-[var(--text-3)]">Replied</p>
            </div>
            <div className="rounded-2xl bg-[var(--canvas-sub)] px-4 py-3 text-center">
              <p className="flex items-center justify-center gap-1 text-2xl font-extrabold text-[var(--text-1)]">
                <ShieldCheck className="h-5 w-5 text-[var(--accent)]" />
                {responseRate}%
              </p>
              <p className="text-[11px] text-[var(--text-3)]">Response rate</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Filters ────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {([
          ["all", "All"],
          ["unreplied", "Needs reply"],
          ["replied", "Replied"],
        ] as [Filter, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className={`rounded-xl px-3.5 py-2 text-[12px] font-bold transition-colors ${
              filter === id
                ? "bg-[var(--accent)] text-white"
                : "border border-[var(--border)] text-[var(--text-2)] hover:bg-[var(--canvas-sub)]"
            }`}
          >
            {label}
            {id === "unreplied" && feedbacks.length - repliedCount > 0 && (
              <span className="ml-1.5 rounded-md bg-white/20 px-1.5 py-0.5 text-[10px]">
                {feedbacks.length - repliedCount}
              </span>
            )}
          </button>
        ))}
        {starFilter && (
          <button
            onClick={() => setStarFilter(null)}
            className="flex items-center gap-1 rounded-xl border border-[var(--accent-border)] bg-[var(--accent-muted)] px-3 py-2 text-[12px] font-bold text-[var(--accent-text)]"
          >
            {starFilter}★ only <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* ── List ───────────────────────────────────── */}
      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-[var(--border)] py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--canvas-sub)]">
            <Inbox className="h-7 w-7 text-[var(--text-3)]" />
          </div>
          <div>
            <p className="text-sm font-bold text-[var(--text-2)]">
              {feedbacks.length === 0 ? "No feedback yet" : "Nothing matches this filter"}
            </p>
            <p className="mt-1 max-w-xs text-xs text-[var(--text-3)]">
              {feedbacks.length === 0
                ? "Feedback from the printed bill QR will appear here as guests rate their visit."
                : "Try a different filter to see more."}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {visible.map((fb) => (
              <FeedbackCard
                key={fb.id}
                fb={fb}
                restaurantId={restaurantId!}
                onReplied={applyUpdate}
                onDeleted={applyDelete}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
