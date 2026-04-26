"use client";

import { useEffect } from "react";

/**
 * Heartbeat to /api/presence/ping every 60 seconds while this component is
 * mounted. The server uses the request's auth cookies to decide which scope
 * to credit (CUSTOMER / OWNER / STAFF / ADMIN) — the client just signals
 * "I'm still here". When the tab returns from background we ping immediately
 * so the count reflects the user's return.
 */
const PING_INTERVAL_MS = 60_000;

export default function PresenceTracker() {
  useEffect(() => {
    let cancelled = false;

    const ping = () => {
      if (cancelled) return;
      // credentials:"include" so cookies (master/admin/staff/Supabase) ride
      // along — the server reads them to determine scope.
      fetch("/api/presence/ping", {
        method: "POST",
        credentials: "include",
        keepalive: true,
      }).catch(() => {
        // network blip — next interval tick will retry.
      });
    };

    ping();
    const intervalId = setInterval(ping, PING_INTERVAL_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible") ping();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return null;
}
