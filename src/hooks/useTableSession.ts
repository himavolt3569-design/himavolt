"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api-client";

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

function storageKey(restaurantId: string, tableNo: number) {
  return `hh_session_${restaurantId}_${tableNo}`;
}

export function useTableSession(restaurantId: string | null, tableNo: number | null) {
  const [session, setSession] = useState<TableSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [isRestored, setIsRestored] = useState(false);

  const initSession = useCallback(async () => {
    if (!restaurantId || !tableNo) return;

    setLoading(true);
    try {
      // Check localStorage for existing session token
      const savedToken =
        typeof window !== "undefined"
          ? localStorage.getItem(storageKey(restaurantId, tableNo))
          : null;

      const data = await apiFetch<{ session: TableSession; restored: boolean }>(
        `/api/restaurants/${restaurantId}/table-session`,
        {
          method: "POST",
          body: { tableNo, sessionToken: savedToken },
        }
      );

      setSession(data.session);
      setIsRestored(data.restored);

      // Save session token
      if (typeof window !== "undefined" && data.session?.sessionToken) {
        localStorage.setItem(
          storageKey(restaurantId, tableNo),
          data.session.sessionToken
        );
      }
    } catch {
      // Silent failure — user can still browse
    } finally {
      setLoading(false);
    }
  }, [restaurantId, tableNo]);

  useEffect(() => {
    initSession();
  }, [initSession]);

  const refreshSession = useCallback(async () => {
    if (!restaurantId || !tableNo) return;
    try {
      const savedToken =
        typeof window !== "undefined"
          ? localStorage.getItem(storageKey(restaurantId, tableNo))
          : null;
      const data = await apiFetch<{ session: TableSession | null }>(
        `/api/restaurants/${restaurantId}/table-session?tableNo=${tableNo}${savedToken ? `&token=${savedToken}` : ""}`
      );
      if (data.session) {
        setSession(data.session);
      }
    } catch {
      // silent
    }
  }, [restaurantId, tableNo]);

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

      // Clear local storage
      if (typeof window !== "undefined") {
        localStorage.removeItem(storageKey(restaurantId, session.tableNo));
        localStorage.removeItem(`hh_cart_${restaurantId}`);
        localStorage.removeItem(`hh_order_${restaurantId}_${session.tableNo}`);
      }

      setSession(null);
      return data;
    } catch {
      return null;
    }
  }, [restaurantId, session]);

  return {
    session,
    loading,
    isRestored,
    order: session?.order ?? null,
    hasActiveOrder: !!session?.order && session.order.status !== "DELIVERED" && session.order.status !== "CANCELLED",
    getBill,
    refreshSession,
  };
}
