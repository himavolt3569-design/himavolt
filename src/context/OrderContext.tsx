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

export type OrderStep = "ordered" | "preparing" | "ready" | "delivered";

export interface Order {
  id: string;
  step: OrderStep;
  items: { name: string; qty: number; price: number }[];
  total: number;
  createdAt: number;
}

interface OrderContextType {
  activeOrder: Order | null;
  placeOrder: (items: { name: string; qty: number; price: number }[], total: number) => void;
  cancelOrder: () => void;
}

const OrderContext = createContext<OrderContextType | null>(null);

const STEP_SEQUENCE: OrderStep[] = ["ordered", "preparing", "ready", "delivered"];
const STEP_DELAYS = [0, 6000, 10000, 14000];

export function OrderProvider({ children }: { children: ReactNode }) {
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  const placeOrder = useCallback(
    (items: { name: string; qty: number; price: number }[], total: number) => {
      clearTimers();
      const id = `HH-${String(Math.floor(10000 + Math.random() * 90000))}`;
      const order: Order = { id, step: "ordered", items, total, createdAt: Date.now() };
      setActiveOrder(order);

      STEP_SEQUENCE.forEach((step, i) => {
        if (i === 0) return;
        const t = setTimeout(() => {
          setActiveOrder((prev) => (prev && prev.id === id ? { ...prev, step } : prev));
        }, STEP_DELAYS[i]);
        timersRef.current.push(t);
      });
    },
    [],
  );

  const cancelOrder = useCallback(() => {
    clearTimers();
    setActiveOrder(null);
  }, []);

  useEffect(() => () => clearTimers(), []);

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
