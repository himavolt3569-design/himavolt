"use client";

import { useEffect, useRef } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { REALTIME_EVENT } from "@/lib/realtime-topics";

/**
 * Subscribe to a Supabase Realtime (WebSocket) broadcast topic and run `onSignal`
 * whenever the server broadcasts a change on it.
 *
 * This is intentionally a *notify* channel — it carries no row data. On a signal
 * the caller re-fetches through its normal access-checked API, so realtime adds
 * instant push without changing the app's security model. Pass `topic = null` to
 * stay disconnected (e.g. before an id is known). No-ops gracefully if Supabase
 * env vars are missing, leaving any SSE fallback untouched.
 */
export function useRealtimeSignal(
  topic: string | null,
  onSignal: () => void,
): void {
  const cbRef = useRef(onSignal);
  // Keep the latest callback without re-subscribing the channel on every render.
  useEffect(() => {
    cbRef.current = onSignal;
  });

  useEffect(() => {
    if (!topic) return;

    let client;
    try {
      client = getSupabaseBrowserClient();
    } catch {
      // Supabase not configured — silently skip; SSE fallback stays in charge.
      return;
    }

    const channel = client
      .channel(topic)
      .on("broadcast", { event: REALTIME_EVENT }, () => cbRef.current())
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [topic]);
}
