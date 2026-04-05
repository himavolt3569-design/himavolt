"use client";

import { useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HandMetal } from "lucide-react";

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
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/80 backdrop-blur-md cursor-pointer"
          onClick={onReset}
        >
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="flex flex-col items-center"
          >
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/10 mb-8">
              <HandMetal className="h-12 w-12 text-white" />
            </div>
            <h2 className="text-3xl font-black text-white mb-3">Touch to Start</h2>
            <p className="text-lg text-white/60">Your previous session has ended</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
