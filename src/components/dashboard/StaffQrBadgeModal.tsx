"use client";

import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import QRCode from "qrcode";
import { X, Download, RefreshCw, Loader2, ScanLine } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { useRestaurant } from "@/context/RestaurantContext";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  staffId: string;
  staffName: string;
  restaurantId: string;
  qrToken: string | null;
}

// Scan-to-login badge: the QR encodes a URL that /staff-login silently
// consumes on load — no in-app scanner needed, any phone camera works.
export default function StaffQrBadgeModal({ open, onOpenChange, staffId, staffName, restaurantId, qrToken }: Props) {
  const { fetchRestaurants } = useRestaurant();
  const [dataUrl, setDataUrl] = useState("");
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    if (!open || !qrToken) {
      setDataUrl("");
      return;
    }
    const badgeUrl = `${window.location.origin}/staff-login?qr=${qrToken}`;
    QRCode.toDataURL(badgeUrl, { width: 400, margin: 2, color: { dark: "#111827", light: "#ffffff" } }).then(setDataUrl);
  }, [open, qrToken]);

  const handleDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${staffName.replace(/\s+/g, "-").toLowerCase()}-badge.png`;
    a.click();
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      await apiFetch(`/api/restaurants/${restaurantId}/staff/${staffId}`, {
        method: "PATCH",
        body: { regenerateQr: true },
      });
      await fetchRestaurants();
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[3px]"
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 6 }}
                className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-xs -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-[var(--canvas)] p-6 text-center shadow-2xl ring-1 ring-[var(--border)]/60 focus:outline-none"
              >
                <Dialog.Close asChild>
                  <button className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-lg text-[var(--text-3)] hover:bg-[var(--surface)]">
                    <X className="h-4 w-4" />
                  </button>
                </Dialog.Close>

                <div className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-muted)] text-[var(--accent)]">
                  <ScanLine className="h-4.5 w-4.5" />
                </div>
                <Dialog.Title className="text-sm font-bold text-[var(--text-1)]">{staffName}&apos;s Badge</Dialog.Title>
                <Dialog.Description className="mt-1 text-[11px] text-[var(--text-3)]">
                  Scan with any phone camera to log in instantly — no PIN needed.
                </Dialog.Description>

                <div className="mx-auto mt-4 flex h-52 w-52 items-center justify-center rounded-xl bg-white p-3 ring-1 ring-[var(--border)]/70">
                  {dataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={dataUrl} alt="Staff login QR badge" className="h-full w-full" />
                  ) : (
                    <Loader2 className="h-6 w-6 animate-spin text-[var(--text-3)]" />
                  )}
                </div>

                <div className="mt-4 flex items-center justify-center gap-2.5">
                  <button
                    onClick={handleDownload}
                    disabled={!dataUrl}
                    className="flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 py-2 text-[12px] font-bold text-white hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </button>
                  <button
                    onClick={handleRegenerate}
                    disabled={regenerating}
                    title="Invalidates the previous badge"
                    className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-4 py-2 text-[12px] font-bold text-[var(--text-2)] hover:bg-[var(--canvas-sub)] disabled:opacity-50 transition-colors"
                  >
                    {regenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    Regenerate
                  </button>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
