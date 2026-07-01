"use client";

import { motion, AnimatePresence } from "framer-motion";
import { LogIn, X, Mountain } from "lucide-react";
import Link from "next/link";
import { rememberIntendedRole } from "@/lib/intended-role";

interface AuthGateModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
}

export default function AuthGateModal({
  open,
  onClose,
  title = "Sign in to continue",
  message = "Create an account or sign in to access this feature, save your favourites, and track your orders.",
}: AuthGateModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="fixed left-1/2 top-1/2 z-[101] -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-sm rounded-2xl bg-[var(--canvas)] p-6 shadow-2xl"
          >
            <button
              onClick={onClose}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-3)] hover:bg-[var(--surface)] hover:text-[var(--text-2)] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent-muted)]">
                <Mountain className="h-7 w-7 text-[var(--accent)]" strokeWidth={2} />
              </div>

              <h3 className="text-lg font-bold text-[var(--text-1)] mb-1.5">
                {title}
              </h3>
              <p className="text-sm text-[var(--text-2)] leading-relaxed mb-6">
                {message}
              </p>

              <div className="space-y-2.5">
                <Link
                  href="/sign-in"
                  onClick={() => rememberIntendedRole("CUSTOMER")}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] py-3 text-sm font-bold text-white shadow-md shadow-[var(--accent)]/20/20 transition-all hover:bg-[var(--accent)] active:scale-[0.98]"
                >
                  <LogIn className="h-4 w-4" />
                  Sign In
                </Link>
              </div>

              <button
                onClick={onClose}
                className="mt-3 text-xs font-medium text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors"
              >
                Maybe later
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
