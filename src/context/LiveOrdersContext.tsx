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

export type LiveOrderStatus =
  | "new"
  | "accepted"
  | "preparing"
  | "ready"
  | "delivered"
  | "rejected";

export interface LiveOrderItem {
  name: string;
  qty: number;
  price: number;
}

export interface LiveOrder {
  id: string;
  tableNo: number;
  items: LiveOrderItem[];
  total: number;
  status: LiveOrderStatus;
  createdAt: number;
  note?: string;
}

interface LiveOrdersContextType {
  orders: LiveOrder[];
  acceptOrder: (id: string) => void;
  rejectOrder: (id: string) => void;
  markPreparing: (id: string) => void;
  markReady: (id: string) => void;
  markDelivered: (id: string) => void;
  addNewOrder: (order: Omit<LiveOrder, "id" | "createdAt">) => void;
}

const LiveOrdersContext = createContext<LiveOrdersContextType | null>(null);

const INITIAL_ORDERS: LiveOrder[] = [
  {
    id: "ORD-001",
    tableNo: 3,
    items: [
      { name: "Rotini Delight", qty: 1, price: 580 },
      { name: "Masala Chai", qty: 2, price: 80 },
    ],
    total: 740,
    status: "new",
    createdAt: Date.now() - 120000,
    note: "Less spicy please",
  },
  {
    id: "ORD-002",
    tableNo: 7,
    items: [
      { name: "Chicken Tikka Bowl", qty: 2, price: 520 },
      { name: "Fresh Lime Soda", qty: 2, price: 120 },
    ],
    total: 1280,
    status: "preparing",
    createdAt: Date.now() - 480000,
  },
  {
    id: "ORD-003",
    tableNo: 1,
    items: [
      { name: "Nepali Thali Set", qty: 3, price: 380 },
      { name: "Gulab Jamun", qty: 1, price: 180 },
    ],
    total: 1320,
    status: "ready",
    createdAt: Date.now() - 900000,
  },
  {
    id: "ORD-004",
    tableNo: 11,
    items: [
      { name: "Buddha Bowl", qty: 1, price: 450 },
      { name: "Iced Matcha Latte", qty: 1, price: 350 },
    ],
    total: 800,
    status: "new",
    createdAt: Date.now() - 60000,
    note: "No garlic",
  },
  {
    id: "ORD-005",
    tableNo: 5,
    items: [
      { name: "Craft Wheat Beer", qty: 3, price: 450 },
      { name: "Chatpate", qty: 2, price: 120 },
    ],
    total: 1590,
    status: "accepted",
    createdAt: Date.now() - 300000,
  },
];

let orderIdCounter = 6;
function newOrderId() {
  return `ORD-${String(orderIdCounter++).padStart(3, "0")}`;
}

const NEW_ORDER_DISHES: LiveOrderItem[][] = [
  [{ name: "Pani Puri", qty: 2, price: 150 }, { name: "Masala Chai", qty: 2, price: 80 }],
  [{ name: "Salmon Teriyaki", qty: 1, price: 890 }, { name: "Miso Soup", qty: 1, price: 70 }],
  [{ name: "Vegan Pad Thai", qty: 2, price: 390 }, { name: "Fresh Lime Soda", qty: 1, price: 120 }],
  [{ name: "Chocolate Lava Cake", qty: 2, price: 320 }, { name: "Iced Matcha Latte", qty: 1, price: 350 }],
];

export function LiveOrdersProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<LiveOrder[]>(INITIAL_ORDERS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const acceptOrder = useCallback((id: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: "accepted" as const } : o)),
    );
  }, []);

  const rejectOrder = useCallback((id: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: "rejected" as const } : o)),
    );
  }, []);

  const markPreparing = useCallback((id: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: "preparing" as const } : o)),
    );
  }, []);

  const markReady = useCallback((id: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: "ready" as const } : o)),
    );
  }, []);

  const markDelivered = useCallback((id: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: "delivered" as const } : o)),
    );
  }, []);

  const addNewOrder = useCallback(
    (order: Omit<LiveOrder, "id" | "createdAt">) => {
      setOrders((prev) => [
        { ...order, id: newOrderId(), createdAt: Date.now() },
        ...prev,
      ]);
    },
    [],
  );

  // Auto-progress "accepted" orders to "preparing" after 8s, "preparing" to "ready" after 15s
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setOrders((prev) =>
        prev.map((o) => {
          const age = Date.now() - o.createdAt;
          if (o.status === "accepted" && age > 8000) return { ...o, status: "preparing" as const };
          if (o.status === "preparing" && age > 15000) return { ...o, status: "ready" as const };
          return o;
        }),
      );

      // Randomly inject a new order every ~25s
      if (Math.random() < 0.04) {
        const dishes = NEW_ORDER_DISHES[Math.floor(Math.random() * NEW_ORDER_DISHES.length)];
        const total = dishes.reduce((s, d) => s + d.price * d.qty, 0);
        const tableNo = Math.floor(Math.random() * 12) + 1;
        setOrders((prev) => [
          { id: newOrderId(), tableNo, items: dishes, total, status: "new", createdAt: Date.now() },
          ...prev,
        ]);
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <LiveOrdersContext.Provider
      value={{
        orders,
        acceptOrder,
        rejectOrder,
        markPreparing,
        markReady,
        markDelivered,
        addNewOrder,
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
