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
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api-client";

export interface StaffMember {
  id: string;
  role: string;
  staffType: string;
  isActive: boolean;
  createdAt: string;
  userId: string;
  restaurantId: string;
  qrToken: string | null;
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
  latitude: number | null;
  longitude: number | null;
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
  serviceChargeRate?: number;
  serviceChargeEnabled?: boolean;
  printCounterWidth?: number;
  printKitchenWidth?: number;
  printShowLogo?: boolean;
  printShowFeedbackQR?: boolean;
  printAutoReceipt?: boolean;
  printAutoKOT?: boolean;
  counterPayEnabled: boolean;
  directPayEnabled: boolean;
  prepaidEnabled: boolean;
  hotelAdvanceType?: string;
  hotelAdvanceValue?: number;
  roomServiceEnabled?: boolean;
  roomServiceCharge?: number;
  featuresEnabled?: string[];
  featuresDisabled?: string[];
  posEnabled?: boolean;
  posActivatedAt?: string | null;
  posTerminalName?: string | null;
  posOpeningCash?: number;
  posWelcomeSeenAt?: string | null;
  posCustomerModeEnabled?: boolean;
  posCustomerExitCombo?: {
    ctrl: boolean;
    shift: boolean;
    alt: boolean;
    key: string;
  } | null;
  staff: StaffMember[];
  _count: { orders: number; menuItems: number };
}

interface RestaurantContextType {
  restaurants: Restaurant[];
  selectedRestaurant: Restaurant | null;
  loading: boolean;
  hasFetched: boolean;
  fetchRestaurants: () => Promise<void>;
  fetchIfNeeded: () => Promise<void>;
  createRestaurant: (data: {
    name: string;
    phone: string;
    countryCode?: string;
    type: string;
    address?: string;
    city?: string;
    latitude: number;
    longitude: number;
    phoneOwnershipConfirmed: true;
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
    },
  ) => Promise<
    StaffMember & { _generatedPin?: string; _restaurantCode?: string }
  >;
  removeStaff: (restaurantId: string, staffId: string) => Promise<void>;
  toggleStaffActive: (restaurantId: string, staffId: string) => Promise<void>;
  updateStaffRole: (
    restaurantId: string,
    staffId: string,
    role: string,
  ) => Promise<void>;
}

const RestaurantContext = createContext<RestaurantContextType | null>(null);

// Persist the owner's last-selected restaurant so a reload re-opens it instead
// of always falling back to the first restaurant in the list.
const SELECTED_KEY = "himavolt:selectedRestaurantId";
function readStoredRestaurantId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(SELECTED_KEY);
  } catch {
    return null;
  }
}
function writeStoredRestaurantId(id: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (id) window.localStorage.setItem(SELECTED_KEY, id);
    else window.localStorage.removeItem(SELECTED_KEY);
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

// On a hard refresh the restaurant list is fetched exactly once. If that single
// request fails (prod's 1-connection Prisma pool can 503 / time out during the
// refresh request storm, or a brief session race returns 401), the dashboard
// must not be permanently stranded with no restaurant — so we retry the load a
// few times with exponential backoff before surfacing an empty state.
const MAX_FETCH_RETRIES = 5;

export function RestaurantProvider({ children }: { children: ReactNode }) {
  const { isSignedIn, isLoaded, refreshRole } = useAuth();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] =
    useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const hasFetchedRef = useRef(false);
  const fetchingRef = useRef(false);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryAttemptRef = useRef(0);
  // Stable handle to the latest fetch fn so the backoff retry can re-invoke it
  // without making fetchRestaurants depend on itself.
  const fetchRef = useRef<() => Promise<void>>(async () => {});

  const fetchRestaurants = useCallback(async () => {
    if (!isSignedIn) {
      setRestaurants([]);
      return;
    }
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);
    try {
      // cacheTtl: 0 — always fetch the list fresh. This function is the
      // reconcile step after staff/restaurant mutations, and apiFetch's default
      // 60s GET cache made those refetches return the pre-mutation list (child
      // writes only bust the `/api/restaurants/:id` prefix, never the list key),
      // so edits looked like they "did nothing until a refresh".
      const data = await apiFetch<Restaurant[]>("/api/restaurants", { cacheTtl: 0 });
      setRestaurants(data);
      hasFetchedRef.current = true;
      setHasFetched(true);
      retryAttemptRef.current = 0;
      setSelectedRestaurant((prev) => {
        // Prefer the current selection, then the last-selected (localStorage),
        // then the first restaurant — so we never land on a blank dashboard
        // when any restaurant exists (e.g. the selected one was deleted).
        const storedId = readStoredRestaurantId();
        return (
          (prev ? data.find((r) => r.id === prev.id) : undefined) ??
          (storedId ? data.find((r) => r.id === storedId) : undefined) ??
          data[0] ??
          null
        );
      });
    } catch {
      // Transient failure — keep any restaurants we already have (don't blank
      // the dashboard) and retry with backoff. Only surface the empty/"create
      // your first restaurant" state once retries are spent, so a flaky load
      // doesn't wrongly look like an owner with zero restaurants.
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      if (retryAttemptRef.current < MAX_FETCH_RETRIES) {
        const delay = Math.min(1000 * 2 ** retryAttemptRef.current, 8000);
        retryAttemptRef.current += 1;
        retryTimerRef.current = setTimeout(() => {
          void fetchRef.current();
        }, delay);
      } else {
        setHasFetched(true);
      }
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  }, [isSignedIn]);

  // Keep the stable handle pointed at the latest fetch fn for the backoff retry.
  useEffect(() => {
    fetchRef.current = fetchRestaurants;
  }, [fetchRestaurants]);

  const fetchIfNeeded = useCallback(async () => {
    if (hasFetchedRef.current || !isLoaded || !isSignedIn) return;
    await fetchRestaurants();
  }, [isLoaded, isSignedIn, fetchRestaurants]);

  useEffect(() => {
    if (!isSignedIn) {
      hasFetchedRef.current = false;
      fetchingRef.current = false;
      retryAttemptRef.current = 0;
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      setRestaurants([]);
    }
  }, [isSignedIn]);

  // Clear any pending retry timer on unmount.
  useEffect(() => {
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

  // Patch a single restaurant in both the list and the current selection so a
  // mutation reflects on click without a full refetch round-trip.
  const patchRestaurant = useCallback(
    (id: string, fn: (r: Restaurant) => Restaurant) => {
      setRestaurants((prev) => prev.map((r) => (r.id === id ? fn(r) : r)));
      setSelectedRestaurant((prev) =>
        prev && prev.id === id ? fn(prev) : prev,
      );
    },
    [],
  );

  const createRestaurant = useCallback(
    async (data: {
      name: string;
      phone: string;
      countryCode?: string;
      type: string;
      address?: string;
      city?: string;
      latitude: number;
      longitude: number;
      phoneOwnershipConfirmed: true;
    }) => {
      const restaurant = await apiFetch<Restaurant>("/api/restaurants", {
        method: "POST",
        body: data,
      });
      // The POST returns the full shape (staff + _count) — merge it straight
      // into state and select it instead of refetching the whole list.
      setRestaurants((prev) =>
        prev.some((r) => r.id === restaurant.id)
          ? prev.map((r) => (r.id === restaurant.id ? restaurant : r))
          : [...prev, restaurant],
      );
      setSelectedRestaurant(restaurant);
      writeStoredRestaurantId(restaurant.id);
      // Creating a restaurant upgrades a CUSTOMER to OWNER server-side; refresh
      // the cached role in the background so the owner UI appears without
      // blocking the create flow on an extra round-trip. The default category
      // tree is seeded inline by the POST handler, so Menu → Categories is
      // already populated — nothing to trigger here.
      void refreshRole();
      return restaurant;
    },
    [refreshRole],
  );

  const deleteRestaurant = useCallback(
    async (id: string) => {
      const snapshot = restaurants;
      const selectedSnapshot = selectedRestaurant;
      const remaining = snapshot.filter((r) => r.id !== id);
      setRestaurants(remaining);
      // If the active restaurant was deleted, fall back to the next one that
      // still exists (not null) so the dashboard doesn't go blank.
      if (selectedRestaurant?.id === id) {
        const next = remaining[0] ?? null;
        setSelectedRestaurant(next);
        writeStoredRestaurantId(next?.id ?? null);
      }
      try {
        await apiFetch(`/api/restaurants/${id}`, { method: "DELETE" });
      } catch (err) {
        // Full rollback — restore list, active selection, and persisted id.
        setRestaurants(snapshot);
        setSelectedRestaurant(selectedSnapshot);
        writeStoredRestaurantId(selectedSnapshot?.id ?? null);
        throw err;
      }
    },
    [restaurants, selectedRestaurant],
  );

  const updateRestaurant = useCallback(
    async (id: string, data: Record<string, unknown>) => {
      patchRestaurant(id, (r) => ({ ...r, ...(data as Partial<Restaurant>) }));
      try {
        await apiFetch(`/api/restaurants/${id}`, { method: "PATCH", body: data });
      } catch (err) {
        await fetchRestaurants(); // reconcile from server on failure
        throw err;
      }
    },
    [patchRestaurant, fetchRestaurants],
  );

  const selectRestaurant = useCallback(
    (id: string) => {
      const found = restaurants.find((r) => r.id === id);
      if (found) {
        setSelectedRestaurant(found);
        writeStoredRestaurantId(found.id);
      }
    },
    [restaurants],
  );

  const clearSelection = useCallback(() => {
    setSelectedRestaurant(null);
    writeStoredRestaurantId(null);
  }, []);

  const addStaff = useCallback(
    async (
      restaurantId: string,
      data: {
        name: string;
        email: string;
        phone?: string;
        role: string;
      },
    ) => {
      const res = await apiFetch<
        StaffMember & { _generatedPin?: string; _restaurantCode?: string }
      >(`/api/restaurants/${restaurantId}/staff`, {
        method: "POST",
        body: data,
      });
      // Strip the one-time PIN/code metadata before merging into the directory;
      // upsert handles the reactivated-member case (same id returned).
      const { _generatedPin, _restaurantCode, ...member } = res;
      void _generatedPin;
      void _restaurantCode;
      const m = member as StaffMember;
      patchRestaurant(restaurantId, (r) => ({
        ...r,
        staff: r.staff.some((s) => s.id === m.id)
          ? r.staff.map((s) => (s.id === m.id ? m : s))
          : [...r.staff, m],
      }));
      return res;
    },
    [patchRestaurant],
  );

  const removeStaff = useCallback(
    async (restaurantId: string, staffId: string) => {
      patchRestaurant(restaurantId, (r) => ({
        ...r,
        staff: r.staff.filter((s) => s.id !== staffId),
      }));
      try {
        await apiFetch(`/api/restaurants/${restaurantId}/staff/${staffId}`, {
          method: "DELETE",
        });
      } catch (err) {
        await fetchRestaurants();
        throw err;
      }
    },
    [patchRestaurant, fetchRestaurants],
  );

  const toggleStaffActive = useCallback(
    async (restaurantId: string, staffId: string) => {
      const restaurant = restaurants.find((r) => r.id === restaurantId);
      const member = restaurant?.staff.find((s) => s.id === staffId);
      if (!member) return;
      const nextActive = !member.isActive;
      patchRestaurant(restaurantId, (r) => ({
        ...r,
        staff: r.staff.map((s) =>
          s.id === staffId ? { ...s, isActive: nextActive } : s,
        ),
      }));
      try {
        await apiFetch(`/api/restaurants/${restaurantId}/staff/${staffId}`, {
          method: "PATCH",
          body: { isActive: nextActive },
        });
      } catch (err) {
        await fetchRestaurants();
        throw err;
      }
    },
    [restaurants, patchRestaurant, fetchRestaurants],
  );

  const updateStaffRole = useCallback(
    async (restaurantId: string, staffId: string, role: string) => {
      const restaurant = restaurants.find((r) => r.id === restaurantId);
      const member = restaurant?.staff.find((s) => s.id === staffId);
      if (!member || member.role === role) return;
      const prevRole = member.role;
      // Optimistic: the new role badge shows instantly. Previously this went
      // through a full /api/restaurants refetch which read that list's 60s cache
      // (child mutations only bust the /api/restaurants/:id prefix, not the list)
      // — so the change appeared to do nothing until the cache expired.
      patchRestaurant(restaurantId, (r) => ({
        ...r,
        staff: r.staff.map((s) => (s.id === staffId ? { ...s, role } : s)),
      }));
      try {
        await apiFetch(`/api/restaurants/${restaurantId}/staff/${staffId}`, {
          method: "PATCH",
          body: { role },
        });
      } catch (err) {
        patchRestaurant(restaurantId, (r) => ({
          ...r,
          staff: r.staff.map((s) =>
            s.id === staffId ? { ...s, role: prevRole } : s,
          ),
        }));
        throw err;
      }
    },
    [restaurants, patchRestaurant],
  );

  return (
    <RestaurantContext.Provider
      value={{
        restaurants,
        selectedRestaurant,
        loading,
        hasFetched,
        fetchRestaurants,
        fetchIfNeeded,
        createRestaurant,
        deleteRestaurant,
        updateRestaurant,
        selectRestaurant,
        clearSelection,
        addStaff,
        removeStaff,
        toggleStaffActive,
        updateStaffRole,
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

  useEffect(() => {
    ctx.fetchIfNeeded();
  }, [ctx.fetchIfNeeded]); // eslint-disable-line react-hooks/exhaustive-deps

  return ctx;
}

export function useOptionalRestaurant() {
  const ctx = useContext(RestaurantContext);
  useEffect(() => {
    if (ctx) ctx.fetchIfNeeded();
  }, [ctx]); // eslint-disable-line react-hooks/exhaustive-deps
  return ctx;
}
