"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Menu as MenuIcon,
  Users,
  CreditCard,
  Zap,
  Check,
  Rocket,
} from "lucide-react";

interface Props {
  restaurantName: string;
  onDismiss: () => void;
  onActivatePOS: () => void;
  onSkipPOS: () => void;
}

const TOUR_STEPS = [
  {
    id: "welcome",
    icon: Sparkles,
    title: "Welcome aboard",
    body: "Your restaurant is live on HimaVolt. Here’s a quick 4-step tour to get you taking orders today.",
    tone: "amber" as const,
  },
  {
    id: "menu",
    icon: MenuIcon,
    title: "Build your menu",
    body: "Add categories and items from Dashboard → Menu. You can upload photos, set prices, sizes, and add-ons.",
    tone: "blue" as const,
  },
  {
    id: "staff",
    icon: Users,
    title: "Invite your staff",
    body: "Add cashiers, chefs, and waiters from Dashboard → Staff. Each gets a PIN to sign in at the terminal.",
    tone: "green" as const,
  },
  {
    id: "payments",
    icon: CreditCard,
    title: "Accept payments",
    body: "Enable eSewa, Khalti, bank transfer, or cash from Dashboard → Payment Settings. You can always add more later.",
    tone: "purple" as const,
  },
];

const TONE_CLASSES = {
  amber: "bg-amber-500/10 text-amber-600 ring-amber-500/30",
  blue: "bg-blue-500/10 text-blue-600 ring-blue-500/30",
  green: "bg-green-500/10 text-green-600 ring-green-500/30",
  purple: "bg-purple-500/10 text-purple-600 ring-purple-500/30",
};

export default function POSWelcomeTour({
  restaurantName,
  onDismiss,
  onActivatePOS,
  onSkipPOS,
}: Props) {
  const [idx, setIdx] = useState(0);
  const [decisionMode, setDecisionMode] = useState(false);

  if (typeof document === "undefined") return null;

  const step = TOUR_STEPS[idx];
  const isLast = idx === TOUR_STEPS.length - 1;

  function next() {
    if (isLast) {
      setDecisionMode(true);
      return;
    }
    setIdx((i) => i + 1);
  }

  function back() {
    setIdx((i) => Math.max(0, i - 1));
  }

  const content = (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onDismiss();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.22 }}
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--canvas)] shadow-2xl"
      >
        <button
          onClick={onDismiss}
          className="absolute right-4 top-4 z-10 rounded-full p-1.5 text-[var(--text-3)] transition-colors hover:bg-[var(--canvas-sub)] hover:text-[var(--text-1)]"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <AnimatePresence mode="wait">
          {!decisionMode ? (
            <motion.div
              key="tour"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-7 pt-8"
            >
              <div className="mb-5 text-center">
                <div
                  className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl ring-2 ${TONE_CLASSES[step.tone]}`}
                >
                  <step.icon className="h-8 w-8" strokeWidth={2} />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-3)]">
                  {idx === 0 ? restaurantName : `Step ${idx + 1} of ${TOUR_STEPS.length}`}
                </p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-[var(--text-1)]">
                  {step.title}
                </h2>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[var(--text-2)]">
                  {step.body}
                </p>
              </div>

              <div className="mb-6 flex justify-center gap-1.5">
                {TOUR_STEPS.map((s, i) => (
                  <div
                    key={s.id}
                    className={`h-1.5 rounded-full transition-all ${
                      i === idx
                        ? "w-6 bg-[var(--accent)]"
                        : i < idx
                        ? "w-1.5 bg-[var(--accent)]/60"
                        : "w-1.5 bg-[var(--border)]"
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={idx === 0 ? onDismiss : back}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-[var(--text-2)] transition-colors hover:bg-[var(--canvas-sub)]"
                >
                  <ChevronLeft className="h-4 w-4" />
                  {idx === 0 ? "Skip tour" : "Back"}
                </button>
                <button
                  onClick={next}
                  className="flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-[var(--accent)]/25 transition-all hover:bg-[var(--accent-hover)] active:scale-[0.98]"
                >
                  {isLast ? "Continue" : "Next"}
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="decide"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.22 }}
              className="p-7 pt-8"
            >
              <div className="text-center">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent)] shadow-lg shadow-[var(--accent)]/30">
                  <Rocket className="h-8 w-8 text-white" strokeWidth={2} />
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-[var(--text-1)]">
                  One more thing —
                </h2>
                <h3 className="text-2xl font-bold tracking-tight text-[var(--accent)]">
                  turn on your POS?
                </h3>
                <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-[var(--text-2)]">
                  A full kiosk-style terminal your staff can use to take
                  orders, split bills, show payment QRs, and even hand to
                  customers for self-browsing.
                </p>
              </div>

              <ul className="my-6 space-y-2 rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] p-4 text-sm">
                {POS_BENEFITS.map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                    <span className="text-[var(--text-2)]">{b}</span>
                  </li>
                ))}
              </ul>

              <div className="space-y-2">
                <button
                  onClick={onActivatePOS}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-bold text-white shadow-sm shadow-[var(--accent)]/25 transition-colors hover:bg-[var(--accent-hover)]"
                >
                  <Zap className="h-4 w-4" />
                  Yes, activate POS
                </button>
                <button
                  onClick={onSkipPOS}
                  className="w-full rounded-xl border border-[var(--border)] px-4 py-3 text-sm font-semibold text-[var(--text-2)] transition-colors hover:bg-[var(--canvas-sub)]"
                >
                  Maybe later
                </button>
              </div>

              <p className="mt-4 text-center text-[11px] text-[var(--text-3)]">
                You can activate the POS anytime from the dashboard.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );

  return createPortal(content, document.body);
}

const POS_BENEFITS = [
  "Take dine-in, takeaway & delivery orders in seconds",
  "Live order board, split bills, discounts, held orders",
  "Show payment QR on screen when customers ask",
  "Customer mode: hand the screen to browse in 3D",
  "Daily cash reconciliation & shift reports",
];
