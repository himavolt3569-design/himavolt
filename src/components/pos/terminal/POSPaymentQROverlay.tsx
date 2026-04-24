"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, QrCode, Loader2, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";

interface PaymentQR {
  id: string;
  label: string;
  imageUrl: string;
}

interface Props {
  open: boolean;
  restaurantId: string;
  restaurantName: string;
  amount?: number | null;
  currency?: string;
  onClose: () => void;
}

export default function POSPaymentQROverlay({
  open,
  restaurantId,
  restaurantName,
  amount,
  currency = "NPR",
  onClose,
}: Props) {
  const [qrs, setQrs] = useState<PaymentQR[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/restaurants/${restaurantId}/payment-qrs`,
          { credentials: "include" },
        );
        if (!res.ok) throw new Error("Could not load QR codes");
        const data = await res.json();
        if (cancelled) return;
        const list = Array.isArray(data)
          ? data
              .filter((q: PaymentQR & { isActive?: boolean }) => q.isActive !== false)
              .map((q: PaymentQR) => ({
                id: q.id,
                label: q.label,
                imageUrl: q.imageUrl,
              }))
          : [];
        setQrs(list);
        setActiveIdx(0);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load QR");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [open, restaurantId]);

  // Esc closes; ←/→ switches; Enter closes
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowRight") {
        setActiveIdx((i) => (qrs.length ? (i + 1) % qrs.length : 0));
      } else if (e.key === "ArrowLeft") {
        setActiveIdx((i) => (qrs.length ? (i - 1 + qrs.length) % qrs.length : 0));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, qrs.length]);

  const active = qrs[activeIdx];

  const amountLabel = useMemo(() => {
    if (amount == null || !Number.isFinite(amount) || amount <= 0) return null;
    return `${currency} ${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  }, [amount, currency]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-6 backdrop-blur-md"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <button
            onClick={onClose}
            className="absolute right-5 top-5 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>

          <motion.div
            key="panel"
            initial={{ scale: 0.94, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="flex w-full max-w-[640px] flex-col items-center gap-4 text-center text-white"
          >
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-amber-400">
                Scan to pay
              </p>
              <h2 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">
                {restaurantName}
              </h2>
              {amountLabel && (
                <p className="mt-2 text-lg font-bold text-amber-300">
                  {amountLabel}
                </p>
              )}
            </div>

            <div className="relative flex aspect-square w-full max-w-[420px] items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-white p-6 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.5)]">
              {loading && (
                <div className="flex flex-col items-center gap-3 text-black/60">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <p className="text-sm font-semibold">Loading QR codes…</p>
                </div>
              )}

              {!loading && error && (
                <div className="flex max-w-[80%] flex-col items-center gap-3 text-center text-red-600">
                  <AlertCircle className="h-10 w-10" />
                  <p className="text-sm font-semibold">{error}</p>
                </div>
              )}

              {!loading && !error && qrs.length === 0 && (
                <div className="flex max-w-[80%] flex-col items-center gap-3 text-center text-black/60">
                  <QrCode className="h-12 w-12" />
                  <p className="text-sm font-semibold">
                    No payment QRs configured yet.
                  </p>
                  <p className="text-xs">
                    The owner can add them from Dashboard → Payment QR.
                  </p>
                </div>
              )}

              {!loading && !error && active && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  key={active.id}
                  src={active.imageUrl}
                  alt={active.label}
                  className="h-full w-full object-contain"
                  draggable={false}
                />
              )}

              {qrs.length > 1 && !loading && !error && (
                <>
                  <button
                    onClick={() =>
                      setActiveIdx(
                        (i) => (i - 1 + qrs.length) % qrs.length,
                      )
                    }
                    className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/75 p-2 text-white transition-colors hover:bg-black"
                    aria-label="Previous QR"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() =>
                      setActiveIdx((i) => (i + 1) % qrs.length)
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/75 p-2 text-white transition-colors hover:bg-black"
                    aria-label="Next QR"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>

            {qrs.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-2">
                {qrs.map((q, i) => (
                  <button
                    key={q.id}
                    onClick={() => setActiveIdx(i)}
                    className={`rounded-full px-4 py-1.5 text-[12px] font-bold transition-colors ${
                      i === activeIdx
                        ? "bg-amber-400 text-black shadow-sm shadow-amber-400/30"
                        : "bg-white/5 text-white/70 ring-1 ring-white/10 hover:bg-white/10"
                    }`}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            )}

            <p className="mt-2 text-[11px] text-white/50">
              Press <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-white/80">Esc</kbd>{" "}
              to close · <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-white/80">←</kbd>/<kbd className="rounded bg-white/10 px-1.5 py-0.5 text-white/80">→</kbd>{" "}
              to switch
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
