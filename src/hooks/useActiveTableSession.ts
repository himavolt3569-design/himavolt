"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "hh_active_table_session";
const EVENT_NAME = "hh_table_session_change";

export interface ActiveTableSession {
  restaurantSlug: string;
  tableNo: number;
  restaurantId: string;
}

export function setActiveTableSession(data: ActiveTableSession) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch {
    /* ignore */
  }
}

export function clearActiveTableSession() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch {
    /* ignore */
  }
}

function readSession(): ActiveTableSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ActiveTableSession;
  } catch {
    return null;
  }
}

export function useActiveTableSession() {
  const [session, setSession] = useState<ActiveTableSession | null>(null);

  const sync = useCallback(() => {
    setSession(readSession());
  }, []);

  useEffect(() => {
    // Read on mount
    sync();

    // Listen for changes from other tabs
    window.addEventListener("storage", sync);
    // Listen for same-tab changes
    window.addEventListener(EVENT_NAME, sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(EVENT_NAME, sync);
    };
  }, [sync]);

  return session;
}
