"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X } from "lucide-react";
import { usePwaInstall } from "@/context/PwaInstallContext";

export default function PWAInstallPrompt() {
  const { canInstall, promptInstall } = usePwaInstall();
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (!canInstall) {
      setShowPrompt(false);
      return;
    }
    // The deferred prompt is available (from PwaInstallProvider). Only surface
    // the floating nudge if the user hasn't dismissed it within the last 30
    // days — older dismissals lapse so we re-nudge eventually.
    const dismissedAt = localStorage.getItem("pwaPromptDismissed");
    if (dismissedAt) {
      const ts = Number(dismissedAt);
      const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
      if (Number.isFinite(ts) && Date.now() - ts < THIRTY_DAYS) return;
    }
    setShowPrompt(true);
  }, [canInstall]);

  const handleInstallClick = async () => {
    const outcome = await promptInstall();
    setShowPrompt(false);
    if (outcome !== "accepted") {
      localStorage.setItem("pwaPromptDismissed", String(Date.now()));
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("pwaPromptDismissed", String(Date.now()));
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
          className="fixed bottom-24 md:bottom-auto md:top-24 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 bg-[var(--canvas)] rounded-2xl p-4 shadow-2xl border border-snow-white/20"
        >
          <div className="flex items-start gap-4">
            <div className="shrink-0 w-12 h-12 bg-[var(--accent-muted)] rounded-xl flex items-center justify-center">
              <Download className="w-6 h-6 text-[var(--accent)]" />
            </div>

            <div className="grow">
              <h3 className="font-semibold text-charcoal-slate mb-1">
                Install HimaVolt
              </h3>
              <p className="text-sm text-charcoal-slate/70 mb-3">
                Add to your home screen for faster ordering and a better
                experience.
              </p>

              <div className="flex gap-2">
                <button
                  onClick={handleInstallClick}
                  className="flex-1 bg-[var(--accent)] text-white text-sm font-medium py-2 rounded-lg hover:bg-[var(--accent)]/90 transition-colors"
                >
                  Add to Home Screen
                </button>
              </div>
            </div>

            <button
              onClick={handleDismiss}
              className="shrink-0 text-charcoal-slate/40 hover:text-charcoal-slate/70 transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
