"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star, Send, Check, Loader2, EyeOff, Eye, User, MessageSquare,
  ChevronLeft,
} from "lucide-react";
import Link from "next/link";

/* ── Types ───────────────────────────────────────────────────────── */

interface Restaurant {
  id: string;
  name: string;
  imageUrl: string | null;
  slug: string;
}

const STAR_LABELS = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];
const STAR_COLORS = ["", "text-red-400", "text-orange-400", "text-amber-400", "text-lime-500", "text-emerald-500"];

/* ── Component ───────────────────────────────────────────────────── */

export default function FeedbackPage() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const searchParams    = useSearchParams();
  const orderId         = searchParams.get("order") ?? undefined;

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loadingR,   setLoadingR]   = useState(true);

  const [step,        setStep]        = useState<"name" | "review" | "done">("name");
  const [name,        setName]        = useState("");
  const [isAnon,      setIsAnon]      = useState(false);
  const [rating,      setRating]      = useState(0);
  const [hovered,     setHovered]     = useState(0);
  const [comment,     setComment]     = useState("");
  const [submitting,  setSubmitting]  = useState(false);

  // Load restaurant info
  useEffect(() => {
    fetch(`/api/public/restaurant/${restaurantId}`)
      .then((r) => r.json())
      .then((d) => setRestaurant(d.restaurant ?? null))
      .catch(() => {})
      .finally(() => setLoadingR(false));
  }, [restaurantId]);

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

  if (loadingR) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white">
      <Loader2 className="h-7 w-7 animate-spin text-[#eaa94d]" />
    </div>
  );

  if (!restaurant) return (
    <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">Restaurant not found.</div>
  );

  const displayStar = hovered || rating;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/40 to-white flex flex-col items-center px-4 py-10">

      {/* Back */}
      <div className="w-full max-w-md mb-6">
        <Link href={`/menu/${restaurant.slug}`} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#3e1e0c] transition-colors">
          <ChevronLeft className="h-4 w-4" /> Back to menu
        </Link>
      </div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-3xl bg-white shadow-2xl shadow-black/5 border border-gray-100 overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-[#3e1e0c] to-[#5a3118] px-6 py-8 text-white text-center">
          {restaurant.imageUrl && (
            <img src={restaurant.imageUrl} alt={restaurant.name} className="h-16 w-16 rounded-2xl object-cover mx-auto mb-3 ring-2 ring-white/20" />
          )}
          <h1 className="text-xl font-extrabold">{restaurant.name}</h1>
          <p className="text-sm text-amber-200/80 mt-1">Share your experience</p>
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">

            {/* ── Step 1: Name / Skip ─────────────────────────────── */}
            {step === "name" && (
              <motion.div key="name" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div className="text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 mx-auto mb-3">
                    <User className="h-6 w-6 text-amber-600" />
                  </div>
                  <h2 className="text-base font-extrabold text-[#3e1e0c]">Who are you?</h2>
                  <p className="text-xs text-gray-400 mt-1">Optional — you can stay anonymous</p>
                </div>

                {/* Anonymous toggle */}
                <button
                  onClick={() => setIsAnon(!isAnon)}
                  className={`w-full flex items-center justify-between rounded-2xl border-2 px-4 py-3 transition-all ${isAnon ? "border-gray-300 bg-gray-50" : "border-gray-100 bg-white hover:border-gray-200"}`}
                >
                  <div className="flex items-center gap-2.5">
                    {isAnon ? <EyeOff className="h-4 w-4 text-gray-500" /> : <Eye className="h-4 w-4 text-gray-400" />}
                    <div className="text-left">
                      <p className="text-sm font-bold text-gray-700">Submit Anonymously</p>
                      <p className="text-[11px] text-gray-400">{isAnon ? "Your name won't be stored" : "Your name will be shown to staff"}</p>
                    </div>
                  </div>
                  <div className={`h-5 w-9 rounded-full transition-colors ${isAnon ? "bg-gray-400" : "bg-gray-200"} relative`}>
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${isAnon ? "translate-x-4" : "translate-x-0.5"}`} />
                  </div>
                </button>

                {!isAnon && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name..."
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                    />
                  </motion.div>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setStep("review")}
                    className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-bold text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    Skip
                  </button>
                  <button
                    onClick={() => setStep("review")}
                    className="flex-1 rounded-xl bg-[#3e1e0c] py-3 text-sm font-bold text-white hover:bg-[#2d1508] transition-colors"
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
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 mx-auto mb-3">
                    <Star className="h-6 w-6 text-amber-600" />
                  </div>
                  {isAnon ? (
                    <p className="text-xs text-gray-400">Submitting anonymously</p>
                  ) : name.trim() ? (
                    <p className="text-xs text-gray-400">Hi, <span className="font-bold text-gray-600">{name.trim()}</span>!</p>
                  ) : (
                    <p className="text-xs text-gray-400">Reviewing as Guest</p>
                  )}
                  <h2 className="text-base font-extrabold text-[#3e1e0c] mt-1">How was your experience?</h2>
                </div>

                {/* Stars */}
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
                        className={`h-9 w-9 transition-colors ${s <= displayStar ? `${STAR_COLORS[displayStar]} fill-current` : "text-gray-200 fill-current"}`}
                      />
                    </button>
                  ))}
                </div>

                {displayStar > 0 && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`text-center text-sm font-bold ${STAR_COLORS[displayStar]}`}>
                    {STAR_LABELS[displayStar]}
                  </motion.p>
                )}

                {/* Comment */}
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Tell us about your experience... (optional)"
                    rows={3}
                    className="w-full rounded-xl border border-gray-200 pl-9 pr-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-300"
                  />
                </div>

                <div className="flex gap-2">
                  <button onClick={() => setStep("name")} className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-500 hover:bg-gray-50 transition-colors">
                    Back
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || (rating === 0 && !comment.trim())}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#eaa94d] py-3 text-sm font-bold text-white hover:bg-[#d67620] disabled:opacity-40 transition-colors shadow-sm"
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
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                  <Check className="h-8 w-8 text-emerald-600" />
                </div>
                <h2 className="text-lg font-extrabold text-[#3e1e0c]">Thank you!</h2>
                <p className="text-sm text-gray-500 max-w-xs">
                  Your feedback helps us improve. We appreciate you taking the time.
                </p>
                <Link
                  href={`/menu/${restaurant.slug}`}
                  className="mt-2 rounded-xl bg-[#3e1e0c] px-6 py-3 text-sm font-bold text-white hover:bg-[#2d1508] transition-colors"
                >
                  Back to Menu
                </Link>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>

      <p className="mt-6 text-xs text-gray-400">Powered by HimaVolt</p>
    </div>
  );
}
