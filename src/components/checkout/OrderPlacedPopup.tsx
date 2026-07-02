"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, ChefHat, ArrowRight, X } from "lucide-react";
import { useRouter } from "next/navigation";

/**
 * Instant "Order Received" confirmation shown the moment an order is placed —
 * no spinner, no waiting. The guest can keep browsing (the running bill stays
 * open for more rounds) or jump to live order tracking.
 */
export default function OrderPlacedPopup({
  open,
  onClose,
  onTrack,
  trackToken,
}: {
  open: boolean;
  onClose: () => void;
  onTrack: () => void;
  /** When provided, "Track Order" navigates to /order-track/[trackToken] instead of the in-page overlay. */
  trackToken?: string | null;
}) {
  const router = useRouter();
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="op-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-[3px]"
          />
          <motion.div
            key="op-card"
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: "spring", damping: 26, stiffness: 320, mass: 0.7 }}
            className="fixed left-1/2 top-1/2 z-[60] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl bg-[var(--canvas)] p-7 text-center shadow-2xl"
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-3)] hover:bg-[var(--canvas-sub)] hover:text-[var(--text-2)] transition-all"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 14, stiffness: 260, delay: 0.05 }}
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent-muted)]"
            >
              <CheckCircle2 className="h-9 w-9 text-[var(--accent)]" strokeWidth={2.25} />
            </motion.div>

            <h3 className="text-xl font-extrabold text-[var(--text-1)]">
              Order Received!
            </h3>
            <p className="mt-1.5 flex items-center justify-center gap-1.5 text-sm text-[var(--text-2)]">
              <ChefHat className="h-4 w-4 text-[var(--accent)]" />
              Your food is being prepared
            </p>
            <p className="mt-2 text-[13px] text-[var(--text-3)]">
              Track it live any time, or keep browsing to add more — it all goes
              on one bill.
            </p>

            <div className="mt-6 flex flex-col gap-2.5">
              <button
                onClick={() => {
                  if (trackToken) {
                    onClose();
                    router.push(`/order-track/${encodeURIComponent(trackToken)}`);
                  } else {
                    onTrack();
                  }
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--text-1)] px-6 py-3 text-sm font-bold text-white hover:bg-[#2d1508] active:scale-[0.97] transition-all"
              >
                Track Order
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={onClose}
                className="w-full rounded-xl px-6 py-3 text-sm font-bold text-[var(--text-2)] hover:bg-[var(--canvas-sub)] transition-all"
              >
                Keep browsing
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
