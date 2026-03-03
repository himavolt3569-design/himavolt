"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { apiFetch } from "@/lib/api-client";

export type LiveOrderStatus =
  | "PENDING"
  | "ACCEPTED"
  | "PREPARING"
  | "READY"
  | "DELIVERED"
  | "CANCELLED"
  | "REJECTED";

export interface LiveOrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

export interface LiveOrderPayment {
  method: string;
  status: string;
  transactionId: string | null;
}

export interface LiveOrder {
  id: string;
  orderNo: string;
  tableNo: number | null;
  status: LiveOrderStatus;
  subtotal: number;
  tax: number;
  total: number;
  note: string | null;
  type: string;
  estimatedTime: number | null;
  createdAt: string;
  items: LiveOrderItem[];
  user?: { name: string; email: string } | null;
  payment?: LiveOrderPayment | null;
}

interface LiveOrdersContextType {
  orders: LiveOrder[];
  loading: boolean;
  restaurantId: string | null;
  setRestaurantId: (id: string | null) => void;
  acceptOrder: (id: string, estimatedTime?: number) => Promise<void>;
  rejectOrder: (id: string) => Promise<void>;
  markPreparing: (id: string) => Promise<void>;
  markReady: (id: string) => Promise<void>;
  markDelivered: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const LiveOrdersContext = createContext<LiveOrdersContextType | null>(null);

export function LiveOrdersProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<LiveOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const restIdRef = useRef(restaurantId);
  restIdRef.current = restaurantId;

  const fetchOrders = useCallback(async () => {
    const rid = restIdRef.current;
    if (!rid) return;
    try {
      const data = await apiFetch<{ orders: LiveOrder[] }>(
        `/api/restaurants/${rid}/orders?limit=50`,
      );
      setOrders(data.orders);
    } catch {
      /* ignore */
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchOrders();
    setLoading(false);
  }, [fetchOrders]);

  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (!restaurantId) {
      setOrders([]);
      return;
    }
    refresh();
    pollRef.current = setInterval(fetchOrders, 10000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [restaurantId]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateStatus = useCallback(
    async (orderId: string, status: string, extra?: Record<string, unknown>) => {
      if (!restaurantId) return;
      await apiFetch(`/api/restaurants/${restaurantId}/orders/${orderId}`, {
        method: "PATCH",
        body: { status, ...extra },
      });
      await fetchOrders();
    },
    [restaurantId, fetchOrders],
  );

  const acceptOrder = useCallback(
    (id: string, estimatedTime?: number) =>
      updateStatus(id, "ACCEPTED", estimatedTime ? { estimatedTime } : undefined),
    [updateStatus],
  );
  const rejectOrder = useCallback((id: string) => updateStatus(id, "REJECTED"), [updateStatus]);
  const markPreparing = useCallback(
    (id: string) => updateStatus(id, "PREPARING"),
    [updateStatus],
  );
  const markReady = useCallback((id: string) => updateStatus(id, "READY"), [updateStatus]);
  const markDelivered = useCallback(
    (id: string) => updateStatus(id, "DELIVERED"),
    [updateStatus],
  );

  return (
    <LiveOrdersContext.Provider
      value={{
        orders,
        loading,
        restaurantId,
        setRestaurantId,
        acceptOrder,
        rejectOrder,
        markPreparing,
        markReady,
        markDelivered,
        refresh,
      }}
    >
      {children}
    </LiveOrdersContext.Provider>
  );
}

export function useLiveOrders() {
  const ctx = useContext(LiveOrdersContext);
  if (!ctx) throw new Error("useLiveOrders must be used inside LiveOrdersProvider");
  return ctx;
}
