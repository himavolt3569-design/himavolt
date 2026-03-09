"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if already dismissed in this session
    if (sessionStorage.getItem("pwaPromptDismissed")) {
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Update UI notify the user they can install the PWA
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;

    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem("pwaPromptDismissed", "true");
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-24 md:bottom-auto md:top-24 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 bg-white rounded-2xl p-4 shadow-2xl border border-snow-white/20"
        >
          <div className="flex items-start gap-4">
            <div className="shrink-0 w-12 h-12 bg-saffron-flame/10 rounded-xl flex items-center justify-center">
              <Download className="w-6 h-6 text-saffron-flame" />
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
                  className="flex-1 bg-saffron-flame text-white text-sm font-medium py-2 rounded-lg hover:bg-saffron-flame/90 transition-colors"
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
