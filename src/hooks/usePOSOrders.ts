"use client";

import { useState, useEffect, useRef } from "react";
import { useSSE, type SSEStatus } from "./useSSE";
import { playSound } from "@/lib/sounds";

export interface POSOrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  addOns?: string | null;
}

export interface POSOrderPayment {
  method: string;
  status: string;
  transactionId?: string | null;
}

export interface POSOrder {
  id: string;
  orderNo: string;
  tableNo: number | null;
  roomNo: string | null;
  guestName: string | null;
  status: string;
  type: string;
  subtotal: number;
  tax: number;
  total: number;
  deliveryFee: number;
  note: string | null;
  estimatedTime: number | null;
  isHeld: boolean;
  heldAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: POSOrderItem[];
  user?: { name: string; email: string } | null;
  payment?: POSOrderPayment | null;
}

interface StreamMessage {
  type: "orders" | "heartbeat";
  orders?: POSOrder[];
  newPendingCount?: number;
}

interface UsePOSOrdersResult {
  orders: POSOrder[];
  connectionStatus: SSEStatus;
  reconnect: () => void;
}

/**
 * Single SSE connection for all POS components.
 * Call once at the page level and pass `orders` as props to child components.
 */
export function usePOSOrders(restaurantId: string | null): UsePOSOrdersResult {
  const url = restaurantId ? `/api/restaurants/${restaurantId}/orders/stream` : null;
  const { data, status, reconnect } = useSSE<StreamMessage>(url);
  const [orders, setOrders] = useState<POSOrder[]>([]);
  const isFirstMessage = useRef(true);

  useEffect(() => {
    if (!data || data.type !== "orders" || !data.orders) return;
    // Don't play sound on initial load — only on subsequent new pending orders
    if (!isFirstMessage.current && (data.newPendingCount ?? 0) > 0) {
      playSound("newOrder");
    }
    isFirstMessage.current = false;
    setOrders(data.orders);
  }, [data]);

  // Reset when restaurant changes
  useEffect(() => {
    isFirstMessage.current = true;
    setOrders([]);
  }, [restaurantId]);

  return { orders, connectionStatus: status, reconnect };
}
