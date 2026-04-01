"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api-client";

export interface StaffMember {
  id: string;
  pin: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  userId: string;
  restaurantId: string;
  user: {
    name: string;
    email: string;
    phone: string | null;
    imageUrl: string | null;
  };
}

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  phone: string;
  countryCode: string;
  type: string;
  address: string;
  city: string;
  restaurantCode: string | null;
  imageUrl: string | null;
  coverUrl: string | null;
  isActive: boolean;
  tableCount: number;
  openingTime: string;
  closingTime: string;
  rating: number;
  totalOrders: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  taxRate: number;
  taxEnabled: boolean;
  counterPayEnabled: boolean;
  directPayEnabled: boolean;
  prepaidEnabled: boolean;
  staff: StaffMember[];
  _count: { orders: number; menuItems: number };
}

interface RestaurantContextType {
  restaurants: Restaurant[];
  selectedRestaurant: Restaurant | null;
  loading: boolean;
  fetchRestaurants: () => Promise<void>;
  createRestaurant: (data: {
    name: string;
    phone: string;
    countryCode?: string;
    type: string;
    address?: string;
    city?: string;
  }) => Promise<Restaurant>;
  deleteRestaurant: (id: string) => Promise<void>;
  updateRestaurant: (
    id: string,
    data: Record<string, unknown>,
  ) => Promise<void>;
  selectRestaurant: (id: string) => void;
  clearSelection: () => void;
  addStaff: (
    restaurantId: string,
    data: {
      name: string;
      email: string;
      phone?: string;
      role: string;
      pin: string;
    },
  ) => Promise<StaffMember & { _generatedPin?: string; _restaurantCode?: string }>;
  removeStaff: (restaurantId: string, staffId: string) => Promise<void>;
  toggleStaffActive: (restaurantId: string, staffId: string) => Promise<void>;
}

const RestaurantContext = createContext<RestaurantContextType | null>(null);

export function RestaurantProvider({ children }: { children: ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] =
    useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRestaurants = useCallback(async () => {
    if (!isSignedIn) {
      setRestaurants([]);
      return;
    }
    setLoading(true);
    try {
      const data = await apiFetch<Restaurant[]>("/api/restaurants");
      setRestaurants(data);
      setSelectedRestaurant((prev) => {
        if (!prev) return null;
        return data.find((r) => r.id === prev.id) ?? null;
      });
    } catch {
      setRestaurants([]);
    } finally {
      setLoading(false);
    }
  }, [isSignedIn]);

  useEffect(() => {
    if (isLoaded) {
      fetchRestaurants();
    }
  }, [isLoaded, fetchRestaurants]);

  const createRestaurant = useCallback(
    async (data: {
      name: string;
      phone: string;
      countryCode?: string;
      type: string;
      address?: string;
      city?: string;
    }) => {
      const restaurant = await apiFetch<Restaurant>("/api/restaurants", {
        method: "POST",
        body: data,
      });
      await fetchRestaurants();
      return restaurant;
    },
    [fetchRestaurants],
  );

  const deleteRestaurant = useCallback(
    async (id: string) => {
      await apiFetch(`/api/restaurants/${id}`, { method: "DELETE" });
      await fetchRestaurants();
    },
    [fetchRestaurants],
  );

  const updateRestaurant = useCallback(
    async (id: string, data: Record<string, unknown>) => {
      await apiFetch(`/api/restaurants/${id}`, { method: "PATCH", body: data });
      await fetchRestaurants();
    },
    [fetchRestaurants],
  );

  const selectRestaurant = useCallback(
    (id: string) => {
      const found = restaurants.find((r) => r.id === id);
      if (found) setSelectedRestaurant(found);
    },
    [restaurants],
  );

  const clearSelection = useCallback(() => setSelectedRestaurant(null), []);

  const addStaff = useCallback(
    async (
      restaurantId: string,
      data: {
        name: string;
        email: string;
        phone?: string;
        role: string;
        pin: string;
      },
    ) => {
      const res = await apiFetch<StaffMember & { _generatedPin?: string; _restaurantCode?: string }>(
        `/api/restaurants/${restaurantId}/staff`,
        { method: "POST", body: data },
      );
      await fetchRestaurants();
      return res;
    },
    [fetchRestaurants],
  );

  const removeStaff = useCallback(
    async (restaurantId: string, staffId: string) => {
      await apiFetch(`/api/restaurants/${restaurantId}/staff/${staffId}`, {
        method: "DELETE",
      });
      await fetchRestaurants();
    },
    [fetchRestaurants],
  );

  const toggleStaffActive = useCallback(
    async (restaurantId: string, staffId: string) => {
      const restaurant = restaurants.find((r) => r.id === restaurantId);
      const member = restaurant?.staff.find((s) => s.id === staffId);
      if (!member) return;
      await apiFetch(`/api/restaurants/${restaurantId}/staff/${staffId}`, {
        method: "PATCH",
        body: { isActive: !member.isActive },
      });
      await fetchRestaurants();
    },
    [restaurants, fetchRestaurants],
  );

  return (
    <RestaurantContext.Provider
      value={{
        restaurants,
        selectedRestaurant,
        loading,
        fetchRestaurants,
        createRestaurant,
        deleteRestaurant,
        updateRestaurant,
        selectRestaurant,
        clearSelection,
        addStaff,
        removeStaff,
        toggleStaffActive,
      }}
    >
      {children}
    </RestaurantContext.Provider>
  );
}

export function useRestaurant() {
  const ctx = useContext(RestaurantContext);
  if (!ctx)
    throw new Error("useRestaurant must be used inside RestaurantProvider");
  return ctx;
}
