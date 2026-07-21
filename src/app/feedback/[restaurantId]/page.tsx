"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star, Send, Check, Loader2, EyeOff, Eye, User, MessageSquare,
  ChevronLeft, CornerDownRight, Clock,
} from "lucide-react";
import Link from "next/link";


interface Restaurant {
  id: string;
  name: string;
  imageUrl: string | null;
  slug: string;
}

interface ExistingFeedback {
  rating: number | null;
  comment: string | null;
  name: string | null;
  isAnonymous: boolean;
  createdAt: string;
  reply: string | null;
  repliedAt: string | null;
  repliedBy: string | null;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-NP", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const STAR_LABELS = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];
const STAR_COLORS = ["", "text-red-400", "text-[var(--accent)]", "text-[var(--accent)]", "text-lime-500", "text-[var(--accent-hover)]"];


function ReviewDisplay({
  restaurant,
  fb,
}: {
  restaurant: Restaurant;
  fb: ExistingFeedback;
}) {
  const who = fb.repliedBy || restaurant.name;
  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--accent)]0/40 to-white flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-md mb-6">
        <Link
          href={`/menu/${restaurant.slug}`}
          className="flex items-center gap-1.5 text-sm text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors"
        >
          <ChevronLeft className="h-4 w-4" /> Back to menu
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-3xl bg-[var(--canvas)] shadow-2xl shadow-black/5 border border-[var(--border-soft)] overflow-hidden"
      >
        <div className="bg-gradient-to-br from-[#3e1e0c] to-[#5a3118] px-6 py-8 text-white text-center">
          {restaurant.imageUrl && (
            <img
              src={restaurant.imageUrl}
              alt={restaurant.name}
              className="h-16 w-16 rounded-2xl object-cover mx-auto mb-3 ring-2 ring-white/20"
            />
          )}
          <h1 className="text-xl font-extrabold">{restaurant.name}</h1>
          <p className="text-sm text-[var(--accent)]/80 mt-1">Your review</p>
        </div>

        <div className="p-6 space-y-5">
          <div className="text-center">
            <div className="flex justify-center gap-1.5 mb-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`h-7 w-7 ${
                    fb.rating && s <= fb.rating
                      ? "text-[var(--accent)] fill-current"
                      : "text-[var(--text-3)] fill-current"
                  }`}
                />
              ))}
            </div>
            {fb.rating != null && (
              <p className="text-sm font-bold text-[var(--text-2)]">
                {STAR_LABELS[fb.rating]}
              </p>
            )}
            <p className="text-[11px] text-[var(--text-3)] mt-1">
              Submitted {fmtDate(fb.createdAt)}
              {!fb.isAnonymous && fb.name ? ` · ${fb.name}` : ""}
            </p>
          </div>

          {fb.comment && (
            <div className="rounded-2xl bg-[var(--canvas-sub)] border border-[var(--border-soft)] p-4">
              <p className="text-[13px] leading-relaxed text-[var(--text-2)] italic">
                &ldquo;{fb.comment}&rdquo;
              </p>
            </div>
          )}

          {fb.reply ? (
            <div className="rounded-2xl border border-[var(--accent-border)] bg-[var(--accent-muted)] p-4">
              <div className="flex items-center gap-1.5 mb-1.5">
                <CornerDownRight className="h-3.5 w-3.5 text-[var(--accent-text)]" />
                <span className="text-[12px] font-bold text-[var(--accent-text)]">
                  {who} replied
                </span>
                {fb.repliedAt && (
                  <span className="text-[11px] text-[var(--accent-text)]/70">
                    · {fmtDate(fb.repliedAt)}
                  </span>
                )}
              </div>
              <p className="text-[13px] leading-relaxed text-[var(--text-1)]">
                {fb.reply}
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--border)] py-3 text-[12px] text-[var(--text-3)]">
              <Clock className="h-3.5 w-3.5" />
              The team hasn&rsquo;t replied yet. Check back soon.
            </div>
          )}

          <Link
            href={`/menu/${restaurant.slug}`}
            className="block w-full rounded-xl bg-[var(--text-1)] py-3 text-center text-sm font-bold text-white hover:bg-[#2d1508] transition-colors"
          >
            Back to Menu
          </Link>
        </div>
      </motion.div>

      <p className="mt-6 text-xs text-[var(--text-3)]">Powered by HimaVolt</p>
    </div>
  );
}

export default function FeedbackPage() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const searchParams    = useSearchParams();
  const orderId         = searchParams.get("order") ?? undefined;

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loadingR,   setLoadingR]   = useState(true);
  const [existing,   setExisting]   = useState<ExistingFeedback | null>(null);
  const [checkingFb, setCheckingFb] = useState(!!orderId);

  const [step,        setStep]        = useState<"name" | "review" | "done">("name");
  const [name,        setName]        = useState("");
  const [isAnon,      setIsAnon]      = useState(false);
  const [rating,      setRating]      = useState(0);
  const [hovered,     setHovered]     = useState(0);
  const [comment,     setComment]     = useState("");
  const [submitting,  setSubmitting]  = useState(false);

  useEffect(() => {
    fetch(`/api/public/restaurant/${restaurantId}`)
      .then((r) => r.json())
      .then((d) => setRestaurant(d.restaurant ?? null))
      .catch(() => {})
      .finally(() => setLoadingR(false));
  }, [restaurantId]);

  // If this visit is tied to an order, see whether it was already reviewed —
  // if so we show that review (and any reply) instead of the form.
  useEffect(() => {
    if (!orderId) return;
    fetch(`/api/public/feedback/${orderId}`)
      .then((r) => r.json())
      .then((d) => setExisting(d.feedback ?? null))
      .catch(() => {})
      .finally(() => setCheckingFb(false));
  }, [orderId]);

  const handleSubmit = useCallback(async () => {
    if (rating === 0 && !comment.trim()) return;
    setSubmitting(true);
    try {
      await fetch(`/api/restaurants/${restaurantId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: rating || undefined,
          comment: comment.trim() || undefined,
          name: isAnon ? undefined : (name.trim() || undefined),
          isAnonymous: isAnon,
          orderId,
        }),
      });
      setStep("done");
    } catch { /* ignore */ }
    setSubmitting(false);
  }, [rating, comment, isAnon, name, restaurantId, orderId]);

  if (loadingR || checkingFb) return null;

  if (!restaurant) return (
    <div className="min-h-screen flex items-center justify-center text-[var(--text-3)] text-sm">Restaurant not found.</div>
  );

  // Already reviewed (e.g. guest re-scanning the bill QR) — show their review
  // and the venue's reply instead of letting them submit again.
  if (existing) return <ReviewDisplay restaurant={restaurant} fb={existing} />;

  const displayStar = hovered || rating;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--accent)]0/40 to-white flex flex-col items-center px-4 py-10">

      <div className="w-full max-w-md mb-6">
        <Link href={`/menu/${restaurant.slug}`} className="flex items-center gap-1.5 text-sm text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors">
          <ChevronLeft className="h-4 w-4" /> Back to menu
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-3xl bg-[var(--canvas)] shadow-2xl shadow-black/5 border border-[var(--border-soft)] overflow-hidden"
      >
        <div className="bg-gradient-to-br from-[#3e1e0c] to-[#5a3118] px-6 py-8 text-white text-center">
          {restaurant.imageUrl && (
            <img src={restaurant.imageUrl} alt={restaurant.name} className="h-16 w-16 rounded-2xl object-cover mx-auto mb-3 ring-2 ring-white/20" />
          )}
          <h1 className="text-xl font-extrabold">{restaurant.name}</h1>
          <p className="text-sm text-[var(--accent)]/80 mt-1">Share your experience</p>
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">

            {/* ── Step 1: Name / Skip ─────────────────────────────── */}
            {step === "name" && (
              <motion.div key="name" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div className="text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-muted)] mx-auto mb-3">
                    <User className="h-6 w-6 text-[var(--accent-text)]" />
                  </div>
                  <h2 className="text-base font-extrabold text-[var(--text-1)]">Who are you?</h2>
                  <p className="text-xs text-[var(--text-3)] mt-1">Optional, you can stay anonymous</p>
                </div>

                <button
                  onClick={() => setIsAnon(!isAnon)}
                  className={`w-full flex items-center justify-between rounded-2xl border-2 px-4 py-3 transition-all ${isAnon ? "border-[var(--border)] bg-[var(--canvas-sub)]" : "border-[var(--border-soft)] bg-[var(--canvas)] hover:border-[var(--border)]"}`}
                >
                  <div className="flex items-center gap-2.5">
                    {isAnon ? <EyeOff className="h-4 w-4 text-[var(--text-2)]" /> : <Eye className="h-4 w-4 text-[var(--text-3)]" />}
                    <div className="text-left">
                      <p className="text-sm font-bold text-[var(--text-2)]">Submit Anonymously</p>
                      <p className="text-[11px] text-[var(--text-3)]">{isAnon ? "Your name won't be stored" : "Your name will be shown to staff"}</p>
                    </div>
                  </div>
                  <div className={`h-5 w-9 rounded-full transition-colors ${isAnon ? "bg-[var(--text-3)]" : "bg-[var(--surface-alt)]"} relative`}>
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-[var(--canvas)] shadow transition-transform ${isAnon ? "translate-x-4" : "translate-x-0.5"}`} />
                  </div>
                </button>

                {!isAnon && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name..."
                      className="w-full rounded-xl border border-[var(--border)] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)]"
                    />
                  </motion.div>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setStep("review")}
                    className="flex-1 rounded-xl border border-[var(--border)] py-3 text-sm font-bold text-[var(--text-2)] hover:bg-[var(--canvas-sub)] transition-colors"
                  >
                    Skip
                  </button>
                  <button
                    onClick={() => setStep("review")}
                    className="flex-1 rounded-xl bg-[var(--text-1)] py-3 text-sm font-bold text-white hover:bg-[#2d1508] transition-colors"
                  >
                    Continue
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── Step 2: Rating + Comment ────────────────────────── */}
            {step === "review" && (
              <motion.div key="review" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                <div className="text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-muted)] mx-auto mb-3">
                    <Star className="h-6 w-6 text-[var(--accent-text)]" />
                  </div>
                  {isAnon ? (
                    <p className="text-xs text-[var(--text-3)]">Submitting anonymously</p>
                  ) : name.trim() ? (
                    <p className="text-xs text-[var(--text-3)]">Hi, <span className="font-bold text-[var(--text-2)]">{name.trim()}</span>!</p>
                  ) : (
                    <p className="text-xs text-[var(--text-3)]">Reviewing as Guest</p>
                  )}
                  <h2 className="text-base font-extrabold text-[var(--text-1)] mt-1">How was your experience?</h2>
                </div>

                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      onMouseEnter={() => setHovered(s)}
                      onMouseLeave={() => setHovered(0)}
                      onClick={() => setRating(s)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`h-9 w-9 transition-colors ${s <= displayStar ? `${STAR_COLORS[displayStar]} fill-current` : "text-[var(--text-3)] fill-current"}`}
                      />
                    </button>
                  ))}
                </div>

                {displayStar > 0 && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`text-center text-sm font-bold ${STAR_COLORS[displayStar]}`}>
                    {STAR_LABELS[displayStar]}
                  </motion.p>
                )}

                <div className="relative">
                  <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-[var(--text-3)]" />
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Tell us about your experience... (optional)"
                    rows={3}
                    className="w-full rounded-xl border border-[var(--border)] pl-9 pr-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)]"
                  />
                </div>

                <div className="flex gap-2">
                  <button onClick={() => setStep("name")} className="rounded-xl border border-[var(--border)] px-4 py-3 text-sm font-bold text-[var(--text-2)] hover:bg-[var(--canvas-sub)] transition-colors">
                    Back
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || (rating === 0 && !comment.trim())}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] py-3 text-sm font-bold text-white hover:bg-[var(--accent-hover)] disabled:opacity-40 transition-colors shadow-sm"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {submitting ? "Sending…" : "Submit Feedback"}
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── Step 3: Done ────────────────────────────────────── */}
            {step === "done" && (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4 py-6 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-muted)]">
                  <Check className="h-8 w-8 text-[var(--accent-text)]" />
                </div>
                <h2 className="text-lg font-extrabold text-[var(--text-1)]">Thank you!</h2>
                <p className="text-sm text-[var(--text-2)] max-w-xs">
                  Your feedback helps us improve. We appreciate you taking the time.
                </p>
                <Link
                  href={`/menu/${restaurant.slug}`}
                  className="mt-2 rounded-xl bg-[var(--text-1)] px-6 py-3 text-sm font-bold text-white hover:bg-[#2d1508] transition-colors"
                >
                  Back to Menu
                </Link>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>

      <p className="mt-6 text-xs text-[var(--text-3)]">Powered by HimaVolt</p>
    </div>
  );
}
