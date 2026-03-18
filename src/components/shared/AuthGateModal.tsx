"use client";

import { motion, AnimatePresence } from "framer-motion";
import { LogIn, X, Mountain } from "lucide-react";
import Link from "next/link";

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
            className="fixed left-1/2 top-1/2 z-[101] -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
          >
            <button
              onClick={onClose}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50">
                <Mountain className="h-7 w-7 text-brand-400" strokeWidth={2} />
              </div>

              <h3 className="text-lg font-bold text-brand-950 mb-1.5">
                {title}
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed mb-6">
                {message}
              </p>

              <div className="space-y-2.5">
                <Link
                  href="/sign-in"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-400 py-3 text-sm font-bold text-white shadow-md shadow-brand-400/20 transition-all hover:bg-brand-500 active:scale-[0.98]"
                >
                  <LogIn className="h-4 w-4" />
                  Sign In
                </Link>
                <Link
                  href="/sign-up"
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 py-3 text-sm font-bold text-brand-950 transition-all hover:bg-brand-50 active:scale-[0.98]"
                >
                  Create Account
                </Link>
              </div>

              <button
                onClick={onClose}
                className="mt-3 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
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
