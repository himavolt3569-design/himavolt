"use client";

import { useEffect, useCallback, useRef } from "react";
import type { POSOrderItem } from "@/hooks/usePOSOrders";

export type CFDMessage =
  | { type: "SYNC_CART"; payload: { items: POSOrderItem[]; subtotal: number; tax: number; total: number; currency: string } }
  | { type: "SHOW_QR"; payload: { amount: number; terminalName?: string; order?: any } }
  | { type: "HIDE_QR" }
  | { type: "CLEAR_CART" };

export function useCFDSync(onMessage?: (msg: CFDMessage) => void) {
  // Use a stable channel name for the whole POS
  const channelName = "himalhub-cfd";
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const broadcast = useCallback((msg: CFDMessage) => {
    if (typeof window === "undefined" || !window.BroadcastChannel) return;
    const channel = new BroadcastChannel(channelName);
    channel.postMessage(msg);
    channel.close();
  }, [channelName]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.BroadcastChannel) return;
    
    const channel = new BroadcastChannel(channelName);
    
    const handleMessage = (event: MessageEvent<CFDMessage>) => {
      onMessageRef.current?.(event.data);
    };

    channel.addEventListener("message", handleMessage);
    
    return () => {
      channel.removeEventListener("message", handleMessage);
      channel.close();
    };
  }, [channelName]);

  return { broadcast };
}
