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
  addItem: (
    item: Omit<CartItem, "quantity">,
    restaurantId: string,
    restaurantSlug: string,
    currency?: string,
  ) => void;
  removeItem: (id: string) => void;
  increaseQty: (id: string) => void;
  decreaseQty: (id: string) => void;
  getItemQty: (id: string) => number;
  totalItems: number;
  subtotal: number;
  clearCart: () => void;
  /** Call this when landing on a restaurant's menu page so the right cart is loaded. */
  initForRestaurant: (restId: string, restSlug: string, cur: string) => void;
}

// Per-restaurant key keeps carts from different restaurants from overwriting each other.
function cartKey(restaurantId: string) {
  return `hh_cart_${restaurantId}`;
}

// Legacy global key (kept for backward-compat read-on-first-load only).
const LEGACY_KEY = "hh_cart";

function parseCartState(raw: string | null): CartState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.items)) return null;
    return {
      items: parsed.items,
      restaurantId: parsed.restaurantId ?? null,
      restaurantSlug: parsed.restaurantSlug ?? null,
      currency: parsed.currency ?? "NPR",
    };
  } catch {
    return null;
  }
}

function loadCartForRestaurant(restId: string): CartState | null {
  if (typeof window === "undefined") return null;
  // Try per-restaurant key first, fall back to legacy global key if it matches.
  const saved = parseCartState(localStorage.getItem(cartKey(restId)));
  if (saved && saved.items.length > 0) return saved;

  const legacy = parseCartState(localStorage.getItem(LEGACY_KEY));
  if (legacy && legacy.restaurantId === restId && legacy.items.length > 0) return legacy;

  return null;
}

function saveCartState(state: CartState) {
  if (typeof window === "undefined") return;
  try {
    const serialized = JSON.stringify(state);
    // Always write to the per-restaurant key.
    if (state.restaurantId) {
      localStorage.setItem(cartKey(state.restaurantId), serialized);
    }
    // Keep the legacy key in sync so any code that reads hh_cart still works.
    localStorage.setItem(LEGACY_KEY, serialized);
  } catch {
    // QuotaExceededError — ignore
  }
}

function emptyState(): CartState {
  return { items: [], restaurantId: null, restaurantSlug: null, currency: "NPR" };
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [restaurantSlug, setRestaurantSlug] = useState<string | null>(null);
  const [currency, setCurrency] = useState<string>("NPR");
  const initialized = useRef(false);

  // Hydrate from legacy key on first client mount only.
  // Once initForRestaurant is called, this is superseded by the per-restaurant key.
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const legacy = parseCartState(
      typeof window !== "undefined" ? localStorage.getItem(LEGACY_KEY) : null
    );
    if (legacy && legacy.items.length > 0) {
      setItems(legacy.items);
      setRestaurantId(legacy.restaurantId);
      setRestaurantSlug(legacy.restaurantSlug);
      setCurrency(legacy.currency);
    }
  }, []);

  // Persist on every change.
  useEffect(() => {
    if (!initialized.current) return;
    saveCartState({ items, restaurantId, restaurantSlug, currency });
  }, [items, restaurantId, restaurantSlug, currency]);

  /**
   * Called when the menu page mounts and knows which restaurant it's serving.
   * Loads the saved cart for that restaurant so customers always return to their
   * exact cart even after visiting a different restaurant in between.
   */
  const initForRestaurant = useCallback(
    (restId: string, restSlug: string, cur: string) => {
      // Already the right restaurant — nothing to do.
      if (restaurantId === restId) return;

      const saved = loadCartForRestaurant(restId);
      if (saved) {
        setItems(saved.items);
        setRestaurantId(restId);
        setRestaurantSlug(saved.restaurantSlug ?? restSlug);
        setCurrency(saved.currency ?? cur);
      } else {
        // No saved cart for this restaurant — start fresh (keep current items only
        // if they already belong to this restaurant, otherwise clear).
        if (restaurantId && restaurantId !== restId) {
          setItems([]);
        }
        setRestaurantId(restId);
        setRestaurantSlug(restSlug);
        setCurrency(cur);
      }
    },
    [restaurantId],
  );

  const addItem = useCallback(
    (
      item: Omit<CartItem, "quantity">,
      restId: string,
      restSlug: string,
      cur?: string,
    ) => {
      // Switching to a different restaurant — save the current cart first,
      // then check for a saved cart for the new restaurant.
      if (restaurantId && restaurantId !== restId) {
        // Current cart is already persisted; start fresh for the new restaurant.
        const savedForNew = loadCartForRestaurant(restId);
        const existingItems = savedForNew?.items ?? [];
        const updated = (() => {
          const existing = existingItems.find((i) => i.id === item.id);
          if (existing) {
            return existingItems.map((i) =>
              i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i,
            );
          }
          return [...existingItems, { ...item, quantity: 1 }];
        })();
        setItems(updated);
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
    if (typeof window !== "undefined" && restaurantId) {
      try {
        localStorage.removeItem(cartKey(restaurantId));
      } catch { /* ignore */ }
    }
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(LEGACY_KEY);
      } catch { /* ignore */ }
    }
    setItems([]);
    setRestaurantId(null);
    setRestaurantSlug(null);
    setCurrency("NPR");
  }, [restaurantId]);

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
        initForRestaurant,
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
