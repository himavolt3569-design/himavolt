"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * Polling hook with exponential backoff on failure.
 * On success: resets to `baseMs`.
 * On failure: doubles the interval up to `maxMs`.
 */
export function usePollWithBackoff(
  fn: () => Promise<void>,
  baseMs: number,
  maxMs: number = 5 * 60 * 1000,
): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const delayRef = useRef(baseMs);
  const mountedRef = useRef(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const schedule = useCallback(() => {
    if (!mountedRef.current) return;
    timerRef.current = setTimeout(async () => {
      if (!mountedRef.current) return;
      try {
        await fnRef.current();
        delayRef.current = baseMs; // reset on success
      } catch {
        delayRef.current = Math.min(delayRef.current * 2, maxMs); // double on failure
      }
      schedule();
    }, delayRef.current);
  }, [baseMs, maxMs]);

  useEffect(() => {
    mountedRef.current = true;
    delayRef.current = baseMs;
    // Run immediately, then schedule
    fnRef.current().catch(() => {});
    schedule();

    return () => {
      mountedRef.current = false;
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, [schedule, baseMs]);
}
