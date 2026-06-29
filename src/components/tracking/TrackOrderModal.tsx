"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Loader2, X, Receipt } from "lucide-react";
import { useRouter } from "next/navigation";

interface TrackOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TrackOrderModal({ isOpen, onClose }: TrackOrderModalProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/track/lookup?q=${encodeURIComponent(query)}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to find order");
      }

      if (data.trackToken) {
        router.push(`/order-track/${data.trackToken}`);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || "Order not found. Please check your tracking number.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
          />
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-sm overflow-hidden rounded-3xl bg-[var(--canvas)] shadow-2xl ring-1 ring-black/5 pointer-events-auto"
            >
              <div className="relative border-b border-[var(--border-soft)] p-5 text-center">
                <button
                  onClick={onClose}
                  className="absolute right-4 top-4 rounded-full p-2 text-[var(--text-3)] hover:bg-[var(--surface-alt)] hover:text-[var(--text-1)] transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent)]/10 text-[var(--accent)]">
                  <Receipt className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-black text-[var(--text-1)] tracking-tight">Track Your Order</h3>
                <p className="mt-1 text-sm text-[var(--text-3)]">
                  Enter your Order ID to see live status
                </p>
              </div>

              <div className="p-5">
                <form onSubmit={handleTrack} className="space-y-4">
                  <div>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Search className="h-5 w-5 text-[var(--text-3)]" />
                      </div>
                      <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="e.g. HH-ABCXYZ12"
                        className="block w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-3.5 pl-10 pr-4 text-sm font-bold text-[var(--text-1)] placeholder:text-[var(--text-3)] placeholder:font-medium focus:border-[var(--accent)] focus:outline-none focus:ring-4 focus:ring-[var(--accent)]/10 transition-all"
                        autoFocus
                      />
                    </div>
                    {error && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mt-2 text-[13px] font-semibold text-red-500 text-center"
                      >
                        {error}
                      </motion.p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !query.trim()}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--text-1)] py-3.5 text-[15px] font-bold text-white shadow-md hover:bg-[#2d1508] disabled:opacity-50 transition-all active:scale-[0.98]"
                  >
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      "Track Now"
                    )}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
