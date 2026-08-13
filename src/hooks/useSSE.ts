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

export function useSSE<T = unknown>(url: string | null): UseSSEResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<SSEStatus>("disconnected");

  const esRef = useRef<EventSource | null>(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const urlRef = useRef(url);
  // Holds the latest `connect` so the retry timer can re-enter it without
  // referencing the binding before it is initialised.
  const connectRef = useRef<() => void>(() => {});

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
      retryCountRef.current = 0;
      setStatus("connected");
      try {
        setData(JSON.parse(event.data) as T);
      } catch {}
    };

    es.onerror = () => {
      if (!mountedRef.current) return;
      es.close();
      esRef.current = null;
      setStatus("error");

      const jitter = Math.random() * 1000 - 500;
      const delay = Math.min(
        BASE_BACKOFF_MS * 2 ** retryCountRef.current + jitter,
        MAX_BACKOFF_MS,
      );
      retryCountRef.current += 1;

      retryTimerRef.current = setTimeout(() => {
        if (mountedRef.current && urlRef.current) connectRef.current();
      }, delay);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Keep the refs in step with the current props before (re)connecting;
    // `connect` and the retry timer both read them.
    urlRef.current = url;
    connectRef.current = connect;
    mountedRef.current = true;
    retryCountRef.current = 0;
    if (url) {
      // Subscribing to an external system (EventSource) is exactly what effects
      // are for; `connect` sets "connecting" status as part of opening the
      // stream. Not a cascading-render case.
      // eslint-disable-next-line react-hooks/set-state-in-effect
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

  // Removed visibilitychange listener: The user requested the SSE connection to remain
  // alive in the background while switching tabs to avoid "Connecting" states.

  const reconnect = useCallback(() => {
    retryCountRef.current = 0;
    connect();
  }, [connect]);

  return { data, status, reconnect };
}
