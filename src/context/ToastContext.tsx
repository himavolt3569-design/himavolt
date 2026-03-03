"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, XCircle, Info } from "lucide-react";

export type ToastType = "success" | "error" | "info";

interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

let toastIdCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback(
    (message: string, type: ToastType = "success") => {
      const id = ++toastIdCounter;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3000); // 3s dismissal as requested
    },
    [],
  );

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-200 flex flex-col items-center gap-2 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <motion.div
              layout
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", damping: 25, stiffness: 400 }}
              className={`flex items-center gap-3 rounded-full px-5 py-3 text-sm font-medium shadow-xl pointer-events-auto border ${
                t.type === "success"
                  ? "bg-[#0A4D3C] text-white border-[#0A4D3C]/20"
                  : t.type === "error"
                    ? "bg-red-500 text-white border-red-500/20"
                    : "bg-white text-charcoal-slate border-snow-white/20"
              }`}
            >
              <div className="shrink-0">
                {t.type === "success" && (
                  <Check className="h-5 w-5 text-[#FF9933]" />
                )}
                {t.type === "error" && (
                  <XCircle className="h-5 w-5 text-white" />
                )}
                {t.type === "info" && (
                  <Info className="h-5 w-5 text-[#FF9933]" />
                )}
              </div>
              <p className="grow">{t.message}</p>
              <button
                onClick={() => removeToast(t.id)}
                className="shrink-0 ml-2 opacity-70 hover:opacity-100 transition-opacity"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
