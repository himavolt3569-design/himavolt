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

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

interface CartState {
  items: CartItem[];
  restaurantId: string | null;
  restaurantSlug: string | null;
  currency: string;
}

interface CartContextType {
  items: CartItem[];
  restaurantId: string | null;
  restaurantSlug: string | null;
  currency: string;
  addItem: (item: Omit<CartItem, "quantity">, restaurantId: string, restaurantSlug: string, currency?: string) => void;
  removeItem: (id: string) => void;
  increaseQty: (id: string) => void;
  decreaseQty: (id: string) => void;
  getItemQty: (id: string) => number;
  totalItems: number;
  subtotal: number;
  clearCart: () => void;
}

const STORAGE_KEY = "hh_cart";

function loadCart(): CartState {
  if (typeof window === "undefined") return { items: [], restaurantId: null, restaurantSlug: null, currency: "NPR" };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { items: [], restaurantId: null, restaurantSlug: null, currency: "NPR" };
    const parsed = JSON.parse(raw);
    return {
      items: Array.isArray(parsed.items) ? parsed.items : [],
      restaurantId: parsed.restaurantId ?? null,
      restaurantSlug: parsed.restaurantSlug ?? null,
      currency: parsed.currency ?? "NPR",
    };
  } catch {
    return { items: [], restaurantId: null, restaurantSlug: null, currency: "NPR" };
  }
}

function saveCart(state: CartState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // QuotaExceededError — ignore
  }
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => loadCart().items);
  const [restaurantId, setRestaurantId] = useState<string | null>(() => loadCart().restaurantId);
  const [restaurantSlug, setRestaurantSlug] = useState<string | null>(() => loadCart().restaurantSlug);
  const [currency, setCurrency] = useState<string>(() => loadCart().currency);
  const initialized = useRef(false);

  // Hydrate from localStorage on mount (client only)
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const saved = loadCart();
    if (saved.items.length > 0) {
      setItems(saved.items);
      setRestaurantId(saved.restaurantId);
      setRestaurantSlug(saved.restaurantSlug);
      setCurrency(saved.currency);
    }
  }, []);

  // Persist to localStorage on every change
  useEffect(() => {
    if (!initialized.current) return;
    saveCart({ items, restaurantId, restaurantSlug, currency });
  }, [items, restaurantId, restaurantSlug, currency]);

  const addItem = useCallback(
    (item: Omit<CartItem, "quantity">, restId: string, restSlug: string, cur?: string) => {
      if (restaurantId && restaurantId !== restId) {
        setItems([{ ...item, quantity: 1 }]);
        setRestaurantId(restId);
        setRestaurantSlug(restSlug);
        if (cur) setCurrency(cur);
        return;
      }
      setRestaurantId(restId);
      setRestaurantSlug(restSlug);
      if (cur) setCurrency(cur);
      setItems((prev) => {
        const existing = prev.find((i) => i.id === item.id);
        if (existing) {
          return prev.map((i) =>
            i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i,
          );
        }
        return [...prev, { ...item, quantity: 1 }];
      });
    },
    [restaurantId],
  );

  const removeItem = useCallback(
    (id: string) => setItems((prev) => prev.filter((i) => i.id !== id)),
    [],
  );

  const increaseQty = useCallback(
    (id: string) =>
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, quantity: i.quantity + 1 } : i)),
      ),
    [],
  );

  const decreaseQty = useCallback(
    (id: string) =>
      setItems((prev) =>
        prev
          .map((i) => (i.id === id ? { ...i, quantity: i.quantity - 1 } : i))
          .filter((i) => i.quantity > 0),
      ),
    [],
  );

  const getItemQty = useCallback(
    (id: string) => items.find((i) => i.id === id)?.quantity ?? 0,
    [items],
  );

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const clearCart = useCallback(() => {
    setItems([]);
    setRestaurantId(null);
    setRestaurantSlug(null);
    setCurrency("NPR");
    if (typeof window !== "undefined") {
      try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    }
  }, []);

  return (
    <CartContext.Provider
      value={{
        items,
        restaurantId,
        restaurantSlug,
        currency,
        addItem,
        removeItem,
        increaseQty,
        decreaseQty,
        getItemQty,
        totalItems,
        subtotal,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
