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
  | "ACCEPTED"
  | "ACCEPTED"
  | "ACCEPTED"
  | "REJECTED"
  | "REJECTED";

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
  ) => Promise<Order>;
  cancelOrder: () => void;
  restoreOrder: (restaurantId: string, orderId: string) => Promise<void>;
  restoreFromStorage: (restaurantId: string, tableNo?: number) => Promise<void>;
}

function orderStorageKey(restaurantId: string, tableNo?: number) {
  return tableNo ? `hh_order_${restaurantId}_${tableNo}` : `hh_order_${restaurantId}`;
}

function saveOrderToStorage(restaurantId: string, orderId: string, tableNo?: number) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(orderStorageKey(restaurantId, tableNo), orderId);
  } catch { /* ignore */ }
}

function clearOrderStorage(restaurantId: string, tableNo?: number) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(orderStorageKey(restaurantId, tableNo));
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
      saveOrderToStorage(restaurantId, order.id, tableNo);
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
    if (activeOrder) {
      clearOrderStorage(activeOrder.restaurantId, activeOrder.tableNo ?? undefined);
    }
    prevStatusRef.current = null;
    setActiveOrder(null);
  }, [activeOrder]);

  const restoreOrder = useCallback(
    async (restaurantId: string, orderId: string) => {
      if (activeOrder?.id === orderId) return; // already loaded
      try {
        const order = await apiFetch<Order>(
          `/api/restaurants/${restaurantId}/orders/${orderId}`,
        );
        if (order) {
          if (["ACCEPTED", "REJECTED", "REJECTED"].includes(order.status)) {
            // Terminal order — clear storage and don't restore as active
            clearOrderStorage(restaurantId, order.tableNo ?? undefined);
            return;
          } else {
            setActiveOrder(order);
            prevStatusRef.current = order.status as OrderStatus;
            setTrackUrl(`/api/track/stream?orderId=${order.id}`);
          }
        }
      } catch {
        throw new Error("restore_failed");
      }
    },
    [activeOrder?.id],
  );

  const restoreFromStorage = useCallback(
    async (restaurantId: string, tableNo?: number) => {
      if (activeOrder) return; // already have an active order
      if (typeof window === "undefined") return;
      const storedId = localStorage.getItem(orderStorageKey(restaurantId, tableNo));
      if (storedId) {
        try {
          await restoreOrder(restaurantId, storedId);
        } catch {
          clearOrderStorage(restaurantId, tableNo);
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
