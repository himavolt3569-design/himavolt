"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export type SSEStatus = "connecting" | "connected" | "disconnected" | "error";

interface UseSSEResult<T> {
  data: T | null;
  status: SSEStatus;
  reconnect: () => void;
}

const BASE_BACKOFF_MS = 2000;
const MAX_BACKOFF_MS = 30000;

/**
 * Generic SSE hook with exponential backoff and clean lifecycle management.
 * Pass `url = null` to disconnect.
 */
export function useSSE<T = unknown>(url: string | null): UseSSEResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<SSEStatus>("disconnected");

  const esRef = useRef<EventSource | null>(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  // Store current url in a ref so the retry closure always sees the latest value
  const urlRef = useRef(url);
  urlRef.current = url;

  const clearRetryTimer = () => {
    if (retryTimerRef.current !== null) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  };

  const closeES = () => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    clearRetryTimer();
  };

  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    const currentUrl = urlRef.current;
    if (!currentUrl) {
      closeES();
      setStatus("disconnected");
      return;
    }

    closeES();
    setStatus("connecting");

    const es = new EventSource(currentUrl, { withCredentials: true });
    esRef.current = es;

    es.onmessage = (event) => {
      if (!mountedRef.current) return;
      retryCountRef.current = 0; // reset backoff on success
      setStatus("connected");
      try {
        setData(JSON.parse(event.data) as T);
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      if (!mountedRef.current) return;
      es.close();
      esRef.current = null;
      setStatus("error");

      // Exponential backoff with ±500ms jitter
      const jitter = Math.random() * 1000 - 500;
      const delay = Math.min(BASE_BACKOFF_MS * 2 ** retryCountRef.current + jitter, MAX_BACKOFF_MS);
      retryCountRef.current += 1;

      retryTimerRef.current = setTimeout(() => {
        if (mountedRef.current && urlRef.current) connect();
      }, delay);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reconnect when url changes
  useEffect(() => {
    mountedRef.current = true;
    retryCountRef.current = 0;
    if (url) {
      connect();
    } else {
      closeES();
      setStatus("disconnected");
      setData(null);
    }
    return () => {
      mountedRef.current = false;
      closeES();
    };
  }, [url]); // eslint-disable-line react-hooks/exhaustive-deps

  const reconnect = useCallback(() => {
    retryCountRef.current = 0;
    connect();
  }, [connect]);

  return { data, status, reconnect };
}
