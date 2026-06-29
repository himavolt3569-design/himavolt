"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { apiFetch } from "@/lib/api-client";
import { clearActiveTableSession } from "@/hooks/useActiveTableSession";

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  menuItemId: string | null;
}

interface SessionOrder {
  id: string;
  orderNo: string;
  tableNo: number | null;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  items: OrderItem[];
  payment: { method: string; status: string; amount: number } | null;
  bill: { billNo: string; total: number } | null;
}

interface TableSession {
  id: string;
  tableNo: number;
  sessionToken: string;
  isActive: boolean;
  orderId: string | null;
  order: SessionOrder | null;
}

function storageKey(restaurantId: string, key: string | number) {
  return `hh_session_${restaurantId}_${key}`;
}

export function useTableSession(
  restaurantId: string | null,
  tableNo: number | null,
  qrToken?: string | null,
) {
  const [session, setSession] = useState<TableSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [isRestored, setIsRestored] = useState(false);
  // Prevents duplicate concurrent POSTs from the same hook instance
  // (e.g. React Strict Mode double-effect in dev, rapid re-renders)
  const initInflight = useRef(false);

  // Identity key for localStorage: prefer the secure QR token, else the table no.
  const idKey = qrToken ? `tok_${qrToken}` : tableNo;

  const initSession = useCallback(async () => {
    if (!restaurantId || (!tableNo && !qrToken)) return;
    if (initInflight.current) return;
    initInflight.current = true;

    setLoading(true);
    try {
      // Check localStorage for existing session token
      const savedToken =
        typeof window !== "undefined" && idKey != null
          ? localStorage.getItem(storageKey(restaurantId, idKey))
          : null;

      const data = await apiFetch<{ session: TableSession; restored: boolean }>(
        `/api/restaurants/${restaurantId}/table-session`,
        {
          method: "POST",
          // Send the QR token when we have it — the server resolves the table
          // from it so the table number can't be spoofed. Falls back to tableNo
          // for legacy (pre-token) QR codes.
          body: qrToken
            ? { qrToken, sessionToken: savedToken }
            : { tableNo, sessionToken: savedToken },
        }
      );

      setSession(data.session);
      setIsRestored(data.restored);

      if (typeof window !== "undefined" && idKey != null && data.session?.sessionToken) {
        localStorage.setItem(
          storageKey(restaurantId, idKey),
          data.session.sessionToken
        );
      }
    } catch {
      // Silent failure — user can still browse
    } finally {
      setLoading(false);
      initInflight.current = false;
    }
  }, [restaurantId, tableNo, qrToken, idKey]);

  useEffect(() => {
    initSession();
  }, [initSession]);

  // Clear browsing session if user closes the tab before placing an order
  useEffect(() => {
    if (!session?.sessionToken || session.orderId || !restaurantId) return;

    const handleUnload = () => {
      // Send a beacon to the server to delete the browsing session
      navigator.sendBeacon(
        `/api/restaurants/${restaurantId}/table-session/browse/clear`,
        JSON.stringify({ sessionToken: session.sessionToken })
      );
    };

    window.addEventListener("pagehide", handleUnload);
    window.addEventListener("beforeunload", handleUnload);
    return () => {
      window.removeEventListener("pagehide", handleUnload);
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [session?.sessionToken, session?.orderId, restaurantId]);

  const refreshSession = useCallback(async () => {
    const effectiveTableNo = session?.tableNo ?? tableNo;
    if (!restaurantId || !effectiveTableNo) return;
    try {
      const savedToken =
        typeof window !== "undefined" && idKey != null
          ? localStorage.getItem(storageKey(restaurantId, idKey))
          : null;
      const data = await apiFetch<{ session: TableSession | null }>(
        `/api/restaurants/${restaurantId}/table-session?tableNo=${effectiveTableNo}${savedToken ? `&token=${savedToken}` : ""}`
      );
      if (data.session) {
        setSession(data.session);
      }
    } catch {
      // silent
    }
  }, [restaurantId, tableNo, idKey, session?.tableNo]);

  const getBill = useCallback(async () => {
    if (!restaurantId || !session) return null;
    try {
      const data = await apiFetch<{ bill: unknown; message: string }>(
        `/api/restaurants/${restaurantId}/table-session/bill`,
        {
          method: "POST",
          body: { sessionToken: session.sessionToken, tableNo: session.tableNo },
        }
      );

      if (typeof window !== "undefined") {
        if (idKey != null) localStorage.removeItem(storageKey(restaurantId, idKey));
        localStorage.removeItem(`hh_cart_${restaurantId}`);
        localStorage.removeItem(`hh_order_${restaurantId}_${session.tableNo}`);
        clearActiveTableSession();
      }

      setSession(null);
      return data;
    } catch {
      return null;
    }
  }, [restaurantId, session, idKey]);

  return {
    session,
    loading,
    isRestored,
    order: session?.order ?? null,
    hasActiveOrder: !!session?.order && session.order.status !== "ACCEPTED" && session.order.status !== "REJECTED",
    getBill,
    refreshSession,
  };
}
