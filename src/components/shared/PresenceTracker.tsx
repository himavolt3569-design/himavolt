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
const FIRST_PING_DELAY_MS = 15_000;

export default function PresenceTracker() {
  useEffect(() => {
    let cancelled = false;
    let firstPingTimer: ReturnType<typeof setTimeout> | null = null;

    const ping = () => {
      if (cancelled) return;
      if (document.visibilityState !== "visible") return;
      // credentials:"include" so cookies (master/admin/staff/Supabase) ride
      // along — the server reads them to determine scope. The pathname lets the
      // master-admin live view show which page each person is on (query stripped
      // server-side so nothing sensitive is stored).
      fetch("/api/presence/ping", {
        method: "POST",
        credentials: "include",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: window.location.pathname }),
      }).catch(() => {
        // network blip — next interval tick will retry.
      });
    };

    firstPingTimer = setTimeout(ping, FIRST_PING_DELAY_MS);
    const intervalId = setInterval(ping, PING_INTERVAL_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible") ping();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      if (firstPingTimer) clearTimeout(firstPingTimer);
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return null;
}
