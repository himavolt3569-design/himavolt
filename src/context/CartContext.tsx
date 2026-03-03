"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

interface CartContextType {
  items: CartItem[];
  restaurantId: string | null;
  restaurantSlug: string | null;
  addItem: (item: Omit<CartItem, "quantity">, restaurantId: string, restaurantSlug: string) => void;
  removeItem: (id: string) => void;
  increaseQty: (id: string) => void;
  decreaseQty: (id: string) => void;
  getItemQty: (id: string) => number;
  totalItems: number;
  subtotal: number;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [restaurantSlug, setRestaurantSlug] = useState<string | null>(null);

  const addItem = useCallback(
    (item: Omit<CartItem, "quantity">, restId: string, restSlug: string) => {
      if (restaurantId && restaurantId !== restId) {
        setItems([{ ...item, quantity: 1 }]);
        setRestaurantId(restId);
        setRestaurantSlug(restSlug);
        return;
      }
      setRestaurantId(restId);
      setRestaurantSlug(restSlug);
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
  }, []);

  return (
    <CartContext.Provider
      value={{
        items,
        restaurantId,
        restaurantSlug,
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
