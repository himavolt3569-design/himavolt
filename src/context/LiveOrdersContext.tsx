"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { playSound } from "@/lib/sounds";
import { useSSE } from "@/hooks/useSSE";
import { useRealtimeSignal } from "@/hooks/useRealtimeSignal";
import { useKotPrintJobs } from "@/hooks/useKotPrintJobs";
import { restaurantKitchenTopic } from "@/lib/realtime-topics";
import { useRestaurant } from "@/context/RestaurantContext";
import { resolvePrintSettings } from "@/lib/print-settings";
import { runAcceptPrint } from "@/lib/orders/accept-print";
import { printOrderInstantly } from "@/lib/orders/print-order";

export type LiveOrderStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED";

export interface LiveOrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  kitchenStatus?: string | null;
  // Round marker — items submitted together share this. Lets the board split an
  // order into ordering rounds (initial + each add-on batch).
  createdAt?: string;
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
  /** Set for room service — those charges post to the room folio, not a bill. */
  roomNo?: string | null;
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
  /** Present once a Bill row exists — lets printing render without a fetch. */
  bill?: {
    billNo: string | null;
    subtotal: number | null;
    tax: number | null;
    serviceCharge: number | null;
    discount: number | null;
    total: number | null;
  } | null;
  deliveryFee?: number | null;
  guestName?: string | null;
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
  setOrders: React.Dispatch<React.SetStateAction<LiveOrder[]>>;
}

const LiveOrdersContext = createContext<LiveOrdersContextType | null>(null);

function ordersQueryKey(restaurantId: string | null) {
  return ["orders", "live", restaurantId] as const;
}

export function LiveOrdersProvider({ children }: { children: ReactNode }) {
  const { selectedRestaurant } = useRestaurant();
  const queryClient = useQueryClient();
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const isFirstMessage = useRef(true);
  // Memoised: `resolvePrintSettings` builds a fresh object every call, which
  // would give `acceptOrder` a new identity on every render.
  const printSettings = useMemo(
    () => resolvePrintSettings(selectedRestaurant),
    [selectedRestaurant],
  );
  useKotPrintJobs(restaurantId, printSettings.autoPrintKOT);

  const queryKey = ordersQueryKey(restaurantId);

  const { data: ordersData, isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      apiFetch<{ orders: LiveOrder[] }>(
        `/api/restaurants/${restaurantId}/orders?limit=50&live=1`,
      ).then((d) => d.orders),
    enabled: !!restaurantId,
  });
  const orders = ordersData ?? [];
  // First-load only. `isFetching` also flips true on every background refetch
  // (each realtime signal / SSE tick), which made the whole board flash a
  // loading state even though data was already on screen.
  const loading = isLoading;

  const sseUrl = restaurantId
    ? `/api/restaurants/${restaurantId}/orders/stream`
    : null;
  const { data: streamData } = useSSE<StreamMessage>(sseUrl);

  // Process incoming SSE messages — write straight into the query cache so
  // mutations, the realtime signal, and the SSE fallback all share one
  // source of truth instead of separate local state.
  useEffect(() => {
    if (!streamData || streamData.type !== "orders" || !streamData.orders)
      return;
    const incoming = streamData.orders;

    if (!isFirstMessage.current && (streamData.newPendingCount ?? 0) > 0) {
      playSound("newOrder");
    }
    isFirstMessage.current = false;
    queryClient.setQueryData<LiveOrder[]>(queryKey, incoming);

    // Stale order cleanup is handled server-side via
    // POST /api/restaurants/[id]/orders/cleanup (triggered from the
    // StaleOrdersBanner in LiveOrdersTab). No client-side auto-reject.
  }, [streamData]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset the new-order-sound gate when the restaurant changes — the query
  // cache itself already starts empty for a fresh restaurantId's query key.
  useEffect(() => {
    isFirstMessage.current = true;
  }, [restaurantId]);

  const refresh = useCallback(async () => {
    await queryClient.refetchQueries({ queryKey, exact: true });
  }, [queryClient, queryKey]);

  // Instant WebSocket push via Supabase Realtime. Any order/payment change at
  // this restaurant fires a signal and we re-pull the live feed immediately —
  // no 3s wait. The SSE stream above stays connected as a fallback (and still
  // drives the new-order sound), so nothing breaks if Realtime is unavailable.
  useRealtimeSignal(
    restaurantId ? restaurantKitchenTopic(restaurantId) : null,
    refresh,
  );

  const setOrders = useCallback<React.Dispatch<React.SetStateAction<LiveOrder[]>>>(
    (updater) => {
      queryClient.setQueryData<LiveOrder[]>(queryKey, (prev) => {
        const current = prev ?? [];
        return typeof updater === "function"
          ? (updater as (p: LiveOrder[]) => LiveOrder[])(current)
          : updater;
      });
    },
    [queryClient, queryKey],
  );

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      orderId,
      status,
      extra,
    }: {
      orderId: string;
      status: string;
      extra?: Record<string, unknown>;
    }) => {
      if (!restaurantId) return;
      await apiFetch(`/api/restaurants/${restaurantId}/orders/${orderId}`, {
        method: "PATCH",
        body: { status, ...extra },
      });
    },
    onMutate: async ({ orderId, status }) => {
      await queryClient.cancelQueries({ queryKey, exact: true });
      const previous = queryClient.getQueryData<LiveOrder[]>(queryKey);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, status: status as LiveOrderStatus } : o,
        ),
      );
      setUpdatingIds((prev) => new Set(prev).add(orderId));
      return { previous };
    },
    onError: (_err, _vars, context) => {
      // Revert the optimistic patch — the realtime signal / SSE stream will
      // bring the query back to server truth shortly after anyway.
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },
    onSettled: (_data, _err, variables) => {
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(variables.orderId);
        return next;
      });
    },
  });

  const acceptOrder = useCallback(
    async (id: string, estimatedTime?: number) => {
      // Snapshot before the optimistic patch — we need the order's type and
      // payment state to decide what (if anything) prints.
      const snapshot = queryClient
        .getQueryData<LiveOrder[]>(queryKey)
        ?.find((o) => o.id === id);
      try {
        await updateStatusMutation.mutateAsync({
          orderId: id,
          status: "ACCEPTED",
          extra: estimatedTime ? { estimatedTime } : undefined,
        });
        // Only now — the accept is committed server-side. Printing off the
        // optimistic patch would hand a guest a bill for an order that rolled
        // back. Never throws; a print failure must not fail the accept.
        if (snapshot) {
          try {
            runAcceptPrint(
              id,
              {
                type: snapshot.type,
                roomNo: snapshot.roomNo,
                paymentStatus: snapshot.payment?.status,
              },
              printSettings,
              (action) =>
                printOrderInstantly(
                  snapshot,
                  selectedRestaurant,
                  action === "PRE_BILL",
                ),
            );
          } catch {
            /* printing is best-effort — the order is accepted either way */
          }
        }
      } catch {
        /* optimistic patch already rolled back in onError */
      }
    },
    [updateStatusMutation, queryClient, queryKey, printSettings, selectedRestaurant],
  );
  const rejectOrder = useCallback(
    async (id: string, reason?: string) => {
      try {
        await updateStatusMutation.mutateAsync({
          orderId: id,
          status: "REJECTED",
          extra: reason ? { rejectReason: reason } : undefined,
        });
      } catch {
        /* optimistic patch already rolled back in onError */
      }
    },
    [updateStatusMutation],
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
        setOrders,
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
