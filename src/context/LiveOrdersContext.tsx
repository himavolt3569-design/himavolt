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
import { playSound } from "@/lib/sounds";
import { useSSE } from "@/hooks/useSSE";
import { useRealtimeSignal } from "@/hooks/useRealtimeSignal";
import { useKotPrintJobs } from "@/hooks/useKotPrintJobs";
import { restaurantKitchenTopic } from "@/lib/realtime-topics";
import { useRestaurant } from "@/context/RestaurantContext";
import { resolvePrintSettings } from "@/lib/print-settings";

export type LiveOrderStatus =
  | "PENDING"
  | "ACCEPTED"
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

interface StreamMessage {
  type: "orders" | "heartbeat";
  orders?: LiveOrder[];
  newPendingCount?: number;
}

interface LiveOrdersContextType {
  orders: LiveOrder[];
  loading: boolean;
  updatingIds: Set<string>;
  restaurantId: string | null;
  setRestaurantId: (id: string | null) => void;
  acceptOrder: (
    id: string,
    estimatedTime?: number,
    forcePrint?: boolean,
  ) => Promise<void>;
  rejectOrder: (id: string, reason?: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const LiveOrdersContext = createContext<LiveOrdersContextType | null>(null);

export function LiveOrdersProvider({ children }: { children: ReactNode }) {
  const { selectedRestaurant } = useRestaurant();
  const [orders, setOrders] = useState<LiveOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const isFirstMessage = useRef(true);
  const printSettings = resolvePrintSettings(selectedRestaurant);
  useKotPrintJobs(restaurantId, printSettings.autoPrintKOT);

  const sseUrl = restaurantId
    ? `/api/restaurants/${restaurantId}/orders/stream`
    : null;
  const { data: streamData } = useSSE<StreamMessage>(sseUrl);

  // Process incoming SSE messages
  useEffect(() => {
    if (!streamData || streamData.type !== "orders" || !streamData.orders)
      return;
    const incoming = streamData.orders;

    if (!isFirstMessage.current && (streamData.newPendingCount ?? 0) > 0) {
      playSound("newOrder");
    }
    isFirstMessage.current = false;
    setOrders(incoming);

    // Stale order cleanup is handled server-side via
    // POST /api/restaurants/[id]/orders/cleanup (triggered from the
    // StaleOrdersBanner in LiveOrdersTab). No client-side auto-reject.
  }, [streamData]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset when restaurant changes
  useEffect(() => {
    isFirstMessage.current = true;
    setOrders([]);
  }, [restaurantId]);

  // One-off fetch used after mutations (for immediate server-truth sync)
  const fetchOrders = useCallback(async () => {
    if (!restaurantId) return;
    try {
      const data = await apiFetch<{ orders: LiveOrder[] }>(
        `/api/restaurants/${restaurantId}/orders?limit=50&live=1`,
      );
      setOrders(data.orders);
    } catch {
      /* ignore */
    }
  }, [restaurantId]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchOrders();
    setLoading(false);
  }, [fetchOrders]);

  // Instant WebSocket push via Supabase Realtime. Any order/payment change at
  // this restaurant fires a signal and we re-pull the live feed immediately —
  // no 3s wait. The SSE stream above stays connected as a fallback (and still
  // drives the new-order sound), so nothing breaks if Realtime is unavailable.
  useRealtimeSignal(
    restaurantId ? restaurantKitchenTopic(restaurantId) : null,
    fetchOrders,
  );

  const updateStatus = useCallback(
    async (
      orderId: string,
      status: string,
      extra?: Record<string, unknown>,
    ) => {
      if (!restaurantId) return;

      // Optimistic update — instantly reflect the new status in UI
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, status: status as LiveOrderStatus } : o,
        ),
      );
      setUpdatingIds((prev) => new Set(prev).add(orderId));

      let ok = false;
      try {
        await apiFetch(`/api/restaurants/${restaurantId}/orders/${orderId}`, {
          method: "PATCH",
          body: { status, ...extra },
        });
        ok = true;
        // SSE will push updated state within ~3s; one-off fetch ensures immediate consistency
        await fetchOrders();
      } catch {
        // Revert on failure — refetch real state
        await fetchOrders();
      } finally {
        setUpdatingIds((prev) => {
          const next = new Set(prev);
          next.delete(orderId);
          return next;
        });
      }
      return ok;
    },
    [restaurantId, fetchOrders],
  );

  const acceptOrder = useCallback(
    async (id: string, estimatedTime?: number) => {
      await updateStatus(
        id,
        "ACCEPTED",
        estimatedTime ? { estimatedTime } : undefined,
      );
    },
    [updateStatus],
  );
  const rejectOrder = useCallback(
    async (id: string, reason?: string) => {
      await updateStatus(id, "REJECTED", reason ? { rejectReason: reason } : undefined);
    },
    [updateStatus],
  );

  return (
    <LiveOrdersContext.Provider
      value={{
        orders,
        loading,
        updatingIds,
        restaurantId,
        setRestaurantId,
        acceptOrder,
        rejectOrder,
        refresh,
      }}
    >
      {children}
    </LiveOrdersContext.Provider>
  );
}

export function useLiveOrders() {
  const ctx = useContext(LiveOrdersContext);
  if (!ctx)
    throw new Error("useLiveOrders must be used inside LiveOrdersProvider");
  return ctx;
}
