"use client";

import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { apiFetch } from "@/lib/api-client";

/**
 * The standard way to load a restaurant-scoped list in the dashboard.
 *
 * Three problems it exists to prevent, all of which were live in production and
 * all of which are easy to reintroduce by hand-rolling a fetch:
 *
 * 1. THE EMPTY-STATE LIE. Tabs rendered `list.length === 0 ? <Empty/> : …`,
 *    which asserts "this venue has no items" before the first byte arrives.
 *    Users saw "No tables configured" over a venue with 20 tables. Gate every
 *    empty state on `isFirstLoad`, and prefer `isConfirmedEmpty` when you want
 *    to be explicit.
 *
 * 2. THE WATERFALL. Screens waited for RestaurantContext's /api/restaurants
 *    round-trip before fetching their own data. Measured on /tables: page
 *    interactive at 267ms, data request not issued until 1782ms. Pair this hook
 *    with `useResolvedRestaurantId`, which falls back to the persisted selection
 *    so the request goes out on the first render.
 *
 * 3. NO PERSISTENCE. React Query's cache is in-memory and dies on refresh —
 *    exactly when a dashboard feels worst. `persist: true` mirrors the last good
 *    response to localStorage and replays it as initialData, so a revisit paints
 *    real content on the first frame and revalidates behind it.
 *
 * The snapshot is always treated as stale, so a refetch ALWAYS follows: the user
 * never acts on old data for longer than one round-trip, they just don't stare
 * at a blank box first.
 */

const SNAPSHOT_PREFIX = "hh_res_v1_";
const SNAPSHOT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function snapshotKey(resource: string, restaurantId: string) {
  return `${SNAPSHOT_PREFIX}${resource}_${restaurantId}`;
}

function readSnapshot<T>(
  resource: string,
  restaurantId: string | undefined,
): T | undefined {
  if (!restaurantId || typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(snapshotKey(resource, restaurantId));
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as { ts: number; data: T };
    if (!parsed || parsed.data === undefined) return undefined;
    if (Date.now() - parsed.ts > SNAPSHOT_MAX_AGE_MS) return undefined;
    return parsed.data;
  } catch {
    return undefined; // corrupt / quota / private mode — just fetch normally
  }
}

function writeSnapshot<T>(
  resource: string,
  restaurantId: string | undefined,
  data: T,
) {
  if (!restaurantId || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      snapshotKey(resource, restaurantId),
      JSON.stringify({ ts: Date.now(), data }),
    );
  } catch {
    /* snapshot is an optimisation, never a requirement */
  }
}

/** Drop every persisted snapshot. Call on sign-out so the next account can't
 *  paint the previous one's data from localStorage. */
export function clearAllResourceSnapshots() {
  if (typeof window === "undefined") return;
  try {
    Object.keys(window.localStorage)
      .filter((k) => k.startsWith(SNAPSHOT_PREFIX) || k.startsWith("hh_tables_v1_"))
      .forEach((k) => window.localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

export const resourceQueryKey = (
  resource: string,
  restaurantId: string | undefined,
) => [resource, restaurantId ?? null] as const;

export interface RestaurantResourceOptions<T> {
  /** Stable slug — becomes the query key and the snapshot key. e.g. "inventory" */
  resource: string;
  restaurantId: string | undefined;
  /** Build the API path. Only called with a defined id. */
  path: (restaurantId: string) => string;
  /** Persist to localStorage for instant repeat paints. Default true.
   *  Turn OFF for anything sensitive or fast-moving enough that a stale first
   *  frame would mislead (e.g. live payment state). */
  persist?: boolean;
  staleTime?: number;
  refetchInterval?: number | false;
  /** apiFetch GET cache TTL. 0 (default) leaves React Query as the only cache —
   *  two caches over one endpoint is what caused the tables/QR split-brain. */
  cacheTtl?: number;
  /** Normalise an inconsistent payload (e.g. `T[] | { items: T[] }`). */
  select?: (raw: unknown) => T;
}

export function useRestaurantResource<T>(opts: RestaurantResourceOptions<T>) {
  const {
    resource,
    restaurantId,
    path,
    persist = true,
    staleTime = 30_000,
    refetchInterval,
    cacheTtl = 0,
    select,
  } = opts;

  const query = useQuery({
    queryKey: resourceQueryKey(resource, restaurantId),
    queryFn: async () => {
      const raw = await apiFetch<unknown>(path(restaurantId as string), { cacheTtl });
      const data = (select ? select(raw) : raw) as T;
      if (persist) writeSnapshot(resource, restaurantId, data);
      return data;
    },
    enabled: !!restaurantId,
    staleTime,
    ...(refetchInterval !== undefined ? { refetchInterval } : {}),
    ...(persist
      ? {
          initialData: () => readSnapshot<T>(resource, restaurantId),
          initialDataUpdatedAt: 0, // always stale => always revalidate
        }
      : {}),
  });

  const hasData = query.data !== undefined;

  return {
    ...query,
    data: query.data as T | undefined,
    /**
     * "We have nothing to show yet" — the ONLY safe gate for an empty state.
     * An unknown restaurantId counts as loading: an unknown restaurant is not an
     * empty restaurant.
     */
    isFirstLoad: !restaurantId || (!hasData && query.isPending),
    /** True once we can honestly say the resource resolved and is empty. */
    isConfirmedEmpty:
      !!restaurantId &&
      hasData &&
      Array.isArray(query.data) &&
      (query.data as unknown[]).length === 0,
  };
}

/** Invalidate one resource for one restaurant. */
export function useInvalidateResource(
  resource: string,
  restaurantId: string | undefined,
) {
  const queryClient = useQueryClient();
  return useCallback(
    () =>
      queryClient.invalidateQueries({
        queryKey: resourceQueryKey(resource, restaurantId),
      }),
    [queryClient, resource, restaurantId],
  );
}

/** Write into a resource's cache — for optimistic update handlers. */
export function useSetResource<T>(
  resource: string,
  restaurantId: string | undefined,
) {
  const queryClient = useQueryClient();
  return useCallback(
    (updater: React.SetStateAction<T>) => {
      queryClient.setQueryData<T>(
        resourceQueryKey(resource, restaurantId),
        (prev) =>
          typeof updater === "function"
            ? (updater as (p: T | undefined) => T)(prev)
            : updater,
      );
    },
    [queryClient, resource, restaurantId],
  );
}

export function invalidateResource(
  queryClient: QueryClient,
  resource: string,
  restaurantId: string | undefined,
) {
  return queryClient.invalidateQueries({
    queryKey: resourceQueryKey(resource, restaurantId),
  });
}
