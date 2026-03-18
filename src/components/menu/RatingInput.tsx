"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, MessageSquare, Loader2, AlertCircle, Check } from "lucide-react";

interface RatingInputProps {
  menuItemId: string;
  restaurantId: string;
  currentRating?: number;
  onRated?: (avg: number) => void;
}

export default function RatingInput({
  menuItemId,
  restaurantId,
  currentRating,
  onRated,
}: RatingInputProps) {
  const [hoveredStar, setHoveredStar] = useState(0);
  const [selectedRating, setSelectedRating] = useState(currentRating || 0);
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const displayRating = hoveredStar || selectedRating;

  const handleSubmit = async () => {
    if (selectedRating === 0) return;
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch(
        `/api/restaurants/${restaurantId}/menu/${menuItemId}/ratings`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rating: selectedRating,
            comment: comment.trim() || undefined,
          }),
        }
      );

      if (res.status === 403) {
        setError("Order this item first to rate it");
        return;
      }

      if (res.status === 401) {
        setError("Please sign in to rate this item");
        return;
      }

      if (!res.ok) {
        setError("Something went wrong. Please try again.");
        return;
      }

      const data = await res.json();
      setSuccess(true);
      onRated?.(data.averageRating);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const ratingLabels = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-[13px] font-bold text-[#3e1e0c]">
          Rate this dish
        </span>
        {selectedRating > 0 && (
          <motion.span
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-[11px] font-semibold text-amber-600"
          >
            {ratingLabels[selectedRating]}
          </motion.span>
        )}
      </div>

      {/* Star selector */}
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <motion.button
            key={star}
            type="button"
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
            onMouseEnter={() => setHoveredStar(star)}
            onMouseLeave={() => setHoveredStar(0)}
            onClick={() => {
              setSelectedRating(star);
              setSuccess(false);
              setError(null);
            }}
            className="p-0.5 transition-colors focus:outline-none"
            disabled={loading}
          >
            <motion.div
              animate={{
                rotate: star <= displayRating ? [0, -12, 12, 0] : 0,
              }}
              transition={{ duration: 0.3 }}
            >
              <Star
                className={`h-7 w-7 transition-all duration-200 ${
                  star <= displayRating
                    ? "fill-amber-400 text-amber-400 drop-shadow-sm"
                    : "text-gray-300 hover:text-amber-200"
                }`}
              />
            </motion.div>
          </motion.button>
        ))}
      </div>

      {/* Comment toggle & textarea */}
      <AnimatePresence>
        {selectedRating > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2.5 overflow-hidden"
          >
            {!showComment ? (
              <button
                type="button"
                onClick={() => setShowComment(true)}
                className="flex items-center gap-1.5 text-[12px] font-semibold text-gray-400 hover:text-amber-600 transition-colors"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Add a comment (optional)
              </button>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="What did you think of this dish?"
                  rows={2}
                  maxLength={500}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2.5 text-[13px] text-gray-700 placeholder:text-gray-400 focus:border-amber-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-100 transition-all resize-none"
                  disabled={loading}
                />
              </motion.div>
            )}

            {/* Submit button */}
            <motion.button
              type="button"
              onClick={handleSubmit}
              disabled={loading || selectedRating === 0}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2.5 text-[13px] font-bold text-white shadow-md shadow-amber-200/50 hover:shadow-lg hover:shadow-amber-300/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : success ? (
                <>
                  <Check className="h-4 w-4" />
                  Rating submitted!
                </>
              ) : (
                <>
                  <Star className="h-4 w-4 fill-white" />
                  Submit Rating
                </>
              )}
            </motion.button>

            {/* Error message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-100 px-3 py-2"
                >
                  <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                  <span className="text-[12px] font-medium text-red-600">
                    {error}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Success message */}
            <AnimatePresence>
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-100 px-3 py-2"
                >
                  <Check className="h-4 w-4 text-green-500 shrink-0" />
                  <span className="text-[12px] font-medium text-green-600">
                    Thanks for your rating!
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
