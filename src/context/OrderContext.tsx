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

export type OrderStatus =
  | "PENDING"
  | "ACCEPTED"
  | "PREPARING"
  | "READY"
  | "DELIVERED"
  | "CANCELLED"
  | "REJECTED";

export type PaymentMethodType = "ESEWA" | "KHALTI" | "BANK" | "CASH";

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
  tableNo: number | null;
  status: OrderStatus;
  subtotal: number;
  tax: number;
  total: number;
  note: string | null;
  type: string;
  estimatedTime: number | null;
  createdAt: string;
  items: OrderItem[];
  restaurantId: string;
  // Delivery fields
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
  ) => Promise<Order>;
  cancelOrder: () => void;
}

const OrderContext = createContext<OrderContextType | null>(null);

export function OrderProvider({ children }: { children: ReactNode }) {
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback(
    (restaurantId: string, orderId: string) => {
      stopPolling();
      pollRef.current = setInterval(async () => {
        try {
          const order = await apiFetch<Order>(
            `/api/restaurants/${restaurantId}/orders/${orderId}`,
          );
          setActiveOrder(order);
          if (
            order.status === "DELIVERED" ||
            order.status === "CANCELLED" ||
            order.status === "REJECTED"
          ) {
            stopPolling();
          }
        } catch {
          /* ignore poll errors */
        }
      }, 5000);
    },
    [stopPolling],
  );

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
    ) => {
      const order = await apiFetch<Order>(
        `/api/restaurants/${restaurantId}/orders`,
        {
          method: "POST",
          body: {
            items,
            tableNo: orderType === "DINE_IN" ? tableNo : undefined,
            note,
            type: orderType,
            paymentMethod: paymentMethod || "CASH",
            // Delivery fields
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
      startPolling(restaurantId, order.id);
      return order;
    },
    [startPolling],
  );

  const cancelOrder = useCallback(() => {
    stopPolling();
    setActiveOrder(null);
  }, [stopPolling]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  return (
    <OrderContext.Provider value={{ activeOrder, placeOrder, cancelOrder }}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrder() {
  const ctx = useContext(OrderContext);
  if (!ctx) throw new Error("useOrder must be used inside OrderProvider");
  return ctx;
}
