"use client";

import { useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TouchpadOff } from "lucide-react";

interface Props {
  idleSeconds?: number;
  isIdle: boolean;
  onIdle: () => void;
  onActive: () => void;
  onReset: () => void;
}

export function useIdleDetection(timeoutMs: number, onIdle: () => void) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(onIdle, timeoutMs);
  }, [timeoutMs, onIdle]);

  useEffect(() => {
    const events = ["mousedown", "mousemove", "keydown", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, resetTimer));
    resetTimer();
    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [resetTimer]);

  return resetTimer;
}

export default function KioskIdleOverlay({ isIdle, onReset }: Props) {
  return (
    <AnimatePresence>
      {isIdle && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gray-950/90 backdrop-blur-md cursor-pointer"
          onClick={onReset}
        >
          <motion.div
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
            className="flex flex-col items-center"
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 border border-white/10 mb-8">
              <TouchpadOff className="h-10 w-10 text-white/60" />
            </div>
            <h2 className="text-3xl font-black text-white mb-2">Session Paused</h2>
            <p className="text-base text-white/40">Touch anywhere to continue</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
