"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Send, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { rememberIntendedRole } from "@/lib/intended-role";

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string | Date;
  user: {
    name: string | null;
    email: string;
    imageUrl: string | null;
  };
};

function StarRow({
  value,
  onChange,
  readonly = false,
  size = "md",
}: {
  value: number;
  onChange?: (v: number) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const [hovered, setHovered] = useState(0);
  const sz = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-7 w-7" : "h-5 w-5";

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(s)}
          onMouseEnter={() => !readonly && setHovered(s)}
          onMouseLeave={() => !readonly && setHovered(0)}
          className={cn("transition-transform", !readonly && "hover:scale-110 cursor-pointer", readonly && "cursor-default")}
        >
          <Star
            className={cn(sz, "transition-colors")}
            fill={(hovered || value) >= s ? "#eaa94d" : "none"}
            stroke={(hovered || value) >= s ? "#eaa94d" : "#d4c4b0"}
            strokeWidth={1.5}
          />
        </button>
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const name = review.user.name || review.user.email?.split("@")[0] || "Guest";
  const avatar = review.user.imageUrl;
  const date = new Date(review.createdAt).toLocaleDateString("en-US", {
    month: "short", year: "numeric",
  });
  const initials = name.slice(0, 2).toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <div className="flex items-start gap-3">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt={name} className="h-10 w-10 rounded-full object-cover shrink-0" />
        ) : (
          <div className="h-10 w-10 rounded-full bg-[var(--accent)]/20 flex items-center justify-center shrink-0">
            <span className="text-xs font-black text-[var(--accent-text)]">{initials}</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="font-semibold text-sm text-[var(--text-1)]">{name}</span>
            <span className="text-xs text-[var(--text-3)]">{date}</span>
          </div>
          <StarRow value={review.rating} readonly size="sm" />
        </div>
      </div>
      {review.comment && (
        <p className="text-sm text-[var(--text-2)] leading-relaxed pl-13">
          {review.comment}
        </p>
      )}
    </motion.div>
  );
}

export function ReviewSection({
  restaurantId,
  initialReviews,
  isSignedIn,
  currentUserId,
}: {
  restaurantId: string;
  initialReviews: Review[];
  isSignedIn: boolean;
  currentUserId?: string;
}) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userReview = currentUserId
    ? reviews.find((r) => r.user.email && currentUserId)
    : null;

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) { setError("Please select a star rating."); return; }
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId, rating, comment }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to submit review."); return; }

      // Update local list
      setReviews((prev) => {
        const without = prev.filter((r) => r.id !== data.review.id);
        return [data.review, ...without];
      });
      setSubmitted(true);
      setRating(0);
      setComment("");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="space-y-8">
      {/* Summary */}
      {reviews.length > 0 && (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Star className="h-6 w-6 fill-[var(--accent)] text-[var(--accent)]" />
            <span className="font-fraunces text-2xl font-bold text-[var(--text-1)]">
              {avgRating.toFixed(1)}
            </span>
          </div>
          <span className="text-[var(--text-3)] text-sm">
            {reviews.length} review{reviews.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Write a review */}
      {isSignedIn ? (
        <div className="bg-[var(--surface-alt)] rounded-3xl p-6 border border-[var(--border)]">
          <AnimatePresence mode="wait">
            {submitted ? (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-3 py-4 text-center"
              >
                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                <p className="font-semibold text-[var(--text-1)]">Thank you for your review!</p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="text-sm text-[var(--accent)] font-semibold hover:underline"
                >
                  Edit review
                </button>
              </motion.div>
            ) : (
              <motion.form key="form" onSubmit={handleSubmit} className="space-y-4">
                <h4 className="font-fraunces text-lg font-bold text-[var(--text-1)]">
                  {userReview ? "Edit your review" : "Leave a review"}
                </h4>

                <div className="space-y-1">
                  <span className="text-sm font-semibold text-[var(--text-2)]">Your rating</span>
                  <StarRow value={rating} onChange={setRating} size="lg" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-[var(--text-2)]">
                    Comment <span className="font-normal text-[var(--text-3)]">(optional)</span>
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Share your experience…"
                    rows={3}
                    maxLength={1000}
                    className="w-full p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] outline-none transition-all resize-none text-sm font-poppins"
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-600 font-medium">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting || rating === 0}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[var(--accent)] text-white rounded-xl font-semibold text-sm hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-all"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {submitting ? "Submitting…" : "Submit review"}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <div className="bg-[var(--surface-alt)] rounded-3xl p-6 border border-[var(--border)] text-center">
          <p className="text-sm text-[var(--text-2)] mb-3">Sign in to leave a review</p>
          <a
            href="/sign-in"
            onClick={() => rememberIntendedRole("CUSTOMER")}
            className="inline-flex items-center gap-2 px-5 py-2 bg-[var(--accent)] text-white rounded-xl font-semibold text-sm hover:bg-[var(--accent-hover)] transition-all"
          >
            <Star className="h-4 w-4" /> Sign in to review
          </a>
        </div>
      )}

      {/* Reviews list */}
      {reviews.length === 0 ? (
        <p className="text-[var(--text-3)] text-sm">No reviews yet. Be the first!</p>
      ) : (
        <div className="space-y-6 divide-y divide-[var(--border-soft)]">
          {reviews.map((r, i) => (
            <div key={r.id} className={i > 0 ? "pt-6" : ""}>
              <ReviewCard review={r} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
