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

export type OrderStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "COMPLETED"
  | "CANCELLED";

export type PaymentMethodType = "ESEWA" | "KHALTI" | "BANK" | "CASH" | "COUNTER" | "DIRECT";

export type OrderType = "DINE_IN" | "DELIVERY" | "TAKEAWAY";

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

export interface OrderPayment {
  method: string;
  status: string;
  paidAt: string | null;
}

export interface OrderDelivery {
  id: string;
  status: string;
  estimatedMins: number | null;
  fee: number;
  driver?: {
    name: string;
    phone: string;
    vehicleType: string;
    vehicleNo: string | null;
    currentLat: number | null;
    currentLng: number | null;
  } | null;
}

export interface Order {
  id: string;
  orderNo: string;
  trackToken?: string | null;
  kitchenStatus?: string | null;
  tableNo: number | null;
  roomNo: string | null;
  status: OrderStatus;
  subtotal: number;
  tax: number;
  total: number;
  note: string | null;
  type: string;
  estimatedTime: number | null;
  acceptedAt: string | null;
  preparingAt: string | null;
  createdAt: string;
  items: OrderItem[];
  restaurantId: string;
  deliveryAddress: string | null;
  deliveryPhone: string | null;
  deliveryFee: number;
  delivery?: OrderDelivery | null;
  payment?: OrderPayment | null;
  bill?: {
    billNo: string;
    total: number;
  } | null;
}

export interface DeliveryInfo {
  address: string;
  phone: string;
  lat?: number;
  lng?: number;
  note?: string;
}

interface TrackMessage {
  type: "order" | "heartbeat" | "error";
  order?: Order;
}

interface OrderContextType {
  activeOrder: Order | null;
  placeOrder: (
    restaurantId: string,
    items: {
      name: string;
      quantity: number;
      price: number;
      menuItemId?: string;
    }[],
    orderType: OrderType,
    tableNo?: number,
    note?: string,
    paymentMethod?: PaymentMethodType,
    deliveryInfo?: DeliveryInfo,
    roomNo?: string,
    tableSessionId?: string,
    couponCode?: string,
    idempotencyKey?: string,
  ) => Promise<Order>;
  addToOrder: (
    restaurantId: string,
    orderId: string,
    items: {
      name: string;
      quantity: number;
      price: number;
      menuItemId?: string;
    }[],
    note?: string,
    idempotencyKey?: string,
    tableSessionId?: string | null,
  ) => Promise<Order>;
  cancelOrder: () => void;
  restoreOrder: (restaurantId: string, orderId: string) => Promise<void>;
  restoreFromStorage: (restaurantId: string, tableSessionId?: string | null) => Promise<void>;
}

export interface TrackTokenData {
  trackToken: string;
  restaurantId: string;
  tableSessionId: string | null;
  createdAt: string;
}

function orderStorageKey(restaurantId: string, tableSessionId?: string | null) {
  return `himavolt:lastTrackToken:${restaurantId}:${tableSessionId || "none"}`;
}

function recentTokensKey(restaurantId: string) {
  return `himavolt:trackTokens:${restaurantId}`;
}

export function getRecentTrackTokens(restaurantId: string): TrackTokenData[] {
  if (typeof window === "undefined") return [];
  try {
    const key = recentTokensKey(restaurantId);
    const existing = localStorage.getItem(key);
    return existing ? JSON.parse(existing) : [];
  } catch {
    return [];
  }
}

function saveOrderToStorage(restaurantId: string, trackToken: string, tableSessionId?: string | null) {
  if (typeof window === "undefined") return;
  try {
    // Save as last track token
    localStorage.setItem(orderStorageKey(restaurantId, tableSessionId), trackToken);
    
    // Also save to recent history
    const key = recentTokensKey(restaurantId);
    const existing = localStorage.getItem(key);
    let history: TrackTokenData[] = existing ? JSON.parse(existing) : [];
    
    // Remove if already exists to push to front
    history = history.filter(t => t.trackToken !== trackToken);
    
    history.unshift({
      trackToken,
      restaurantId,
      tableSessionId: tableSessionId || null,
      createdAt: new Date().toISOString()
    });
    
    if (history.length > 20) history = history.slice(0, 20);
    
    localStorage.setItem(key, JSON.stringify(history));
  } catch { /* ignore */ }
}

function clearOrderStorage(restaurantId: string, tableSessionId?: string | null) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(orderStorageKey(restaurantId, tableSessionId));
    // We intentionally do NOT clear the recent history so completed orders remain visible
  } catch { /* ignore */ }
}

const OrderContext = createContext<OrderContextType | null>(null);

export function OrderProvider({ children }: { children: ReactNode }) {
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [trackUrl, setTrackUrl] = useState<string | null>(null);
  const prevStatusRef = useRef<OrderStatus | null>(null);

  const { data: trackData } = useSSE<TrackMessage>(trackUrl);

  // Process incoming SSE updates
  useEffect(() => {
    if (!trackData || trackData.type !== "order" || !trackData.order) return;
    const order = trackData.order;

    // Play sound when order transitions to READY
    if (
      order.status === "ACCEPTED" &&
      prevStatusRef.current !== null &&
      prevStatusRef.current !== "ACCEPTED"
    ) {
      playSound("orderReady");
    }
    prevStatusRef.current = order.status;
    setActiveOrder(order);

    // Stop tracking on terminal status — server closes the stream too
    if (["ACCEPTED", "REJECTED", "REJECTED"].includes(order.status)) {
      setTrackUrl(null);
    }
  }, [trackData]);

  const placeOrder = useCallback(
    async (
      restaurantId: string,
      items: {
        name: string;
        quantity: number;
        price: number;
        menuItemId?: string;
      }[],
      orderType: OrderType,
      tableNo?: number,
      note?: string,
      paymentMethod?: PaymentMethodType,
      deliveryInfo?: DeliveryInfo,
      roomNo?: string,
      tableSessionId?: string,
      couponCode?: string,
      idempotencyKey?: string,
    ) => {
      const order = await apiFetch<Order>(
        `/api/restaurants/${restaurantId}/orders`,
        {
          method: "POST",
          body: {
            items,
            tableNo: orderType === "DINE_IN" && tableNo != null ? String(tableNo) : undefined,
            roomNo: roomNo || undefined,
            note,
            type: orderType,
            paymentMethod: paymentMethod || "CASH",
            tableSessionId: tableSessionId || undefined,
            couponCode: couponCode || undefined,
            idempotencyKey: idempotencyKey || undefined,
            ...(orderType === "DELIVERY" && deliveryInfo
              ? {
                  deliveryAddress: deliveryInfo.address,
                  deliveryPhone: deliveryInfo.phone,
                  deliveryLat: deliveryInfo.lat,
                  deliveryLng: deliveryInfo.lng,
                  deliveryNote: deliveryInfo.note,
                }
              : {}),
          },
        },
      );
      setActiveOrder(order);
      if (order.trackToken) {
        saveOrderToStorage(restaurantId, order.trackToken, tableSessionId);
      }
      prevStatusRef.current = null;
      setTrackUrl(`/api/track/stream?orderId=${order.id}`);
      return order;
    },
    [],
  );

  const addToOrder = useCallback(
    async (
      restaurantId: string,
      orderId: string,
      items: {
        name: string;
        quantity: number;
        price: number;
        menuItemId?: string;
      }[],
      note?: string,
      idempotencyKey?: string,
      tableSessionId?: string | null,
    ) => {
      const order = await apiFetch<Order>(
        `/api/restaurants/${restaurantId}/orders`,
        {
          method: "POST",
          body: {
            items,
            addToOrderId: orderId,
            note,
            type: "DINE_IN",
            paymentMethod: "CASH",
            idempotencyKey: idempotencyKey || undefined,
            // A table guest proves ownership via tableSessionId; an anonymous
            // guest with no table session is authorised server-side by the
            // track cookie set on the original order POST (auto-sent here).
            tableSessionId: tableSessionId || undefined,
          },
        },
      );
      setActiveOrder(order);
      prevStatusRef.current = null;
      setTrackUrl(`/api/track/stream?orderId=${order.id}`);
      return order;
    },
    [],
  );

  const cancelOrder = useCallback(() => {
    setTrackUrl(null);
    if (activeOrder && activeOrder.trackToken) {
      // We don't have tableSessionId easily accessible here, but we could try to clear both?
      // For now, orderStorageKey expects tableSessionId. The context doesn't store tableSessionId natively.
      // But we can clear the "none" fallback.
      clearOrderStorage(activeOrder.restaurantId, null);
    }
    prevStatusRef.current = null;
    setActiveOrder(null);
  }, [activeOrder]);

  const restoreOrder = useCallback(
    async (restaurantId: string, trackToken: string) => {
      if (activeOrder?.trackToken === trackToken) return; // already loaded
      try {
        const order = await apiFetch<Order>(`/api/order-track/${encodeURIComponent(trackToken)}`);
        if (order) {
          if (["ACCEPTED", "REJECTED", "REJECTED"].includes(order.status)) {
            // Terminal order — clear storage and don't restore as active
            // We can't clear easily without tableSessionId here, but we can clear "none".
            clearOrderStorage(restaurantId, null);
            return;
          } else {
            setActiveOrder(order);
            prevStatusRef.current = order.status as OrderStatus;
            setTrackUrl(`/api/order-track/${encodeURIComponent(trackToken)}/stream`);
          }
        }
      } catch {
        throw new Error("restore_failed");
      }
    },
    [activeOrder?.trackToken],
  );

  const restoreFromStorage = useCallback(
    async (restaurantId: string, tableSessionId?: string | null) => {
      if (activeOrder) return; // already have an active order
      if (typeof window === "undefined") return;
      let storedToken = localStorage.getItem(orderStorageKey(restaurantId, tableSessionId));
      
      // If we didn't find one for the specific session (or none), try to find ANY active token for this restaurant
      if (!storedToken) {
        const prefix = `himavolt:lastTrackToken:${restaurantId}:`;
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(prefix)) {
            storedToken = localStorage.getItem(key);
            break;
          }
        }
      }

      if (storedToken) {
        try {
          await restoreOrder(restaurantId, storedToken);
        } catch {
          clearOrderStorage(restaurantId, tableSessionId);
        }
      }
    },
    [activeOrder, restoreOrder],
  );

  return (
    <OrderContext.Provider value={{ activeOrder, placeOrder, addToOrder, cancelOrder, restoreOrder, restoreFromStorage }}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrder() {
  const ctx = useContext(OrderContext);
  if (!ctx) throw new Error("useOrder must be used inside OrderProvider");
  return ctx;
}
