"use client";

import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { apiFetch } from "@/lib/api-client";

/**
 * Single source of truth for a restaurant's table list.
 *
 * Every surface that shows tables (the Tables board, the QR Codes grid) reads
 * through this hook so they share ONE React Query cache entry. Previously the
 * two tabs each fetched `/tables` through a different cache — React Query here,
 * apiFetch's own GET cache there — which meant the same page could show a
 * populated QR grid next to an empty table board, and a mutation in one view
 * left the other stale until its TTL expired.
 *
 * `cacheTtl: 0` bypasses apiFetch's internal GET cache deliberately: React Query
 * is the cache. Letting apiFetch also cache this path made the post-create
 * reconcile read a stale list and clobber the just-added table.
 */

export interface TableSessionOrder {
  id: string;
  orderNo: string;
  status: string;
  total: number;
  guestName: string | null;
  user: { name: string | null } | null;
  payment: { status: string; method: string } | null;
}

export interface TableSession {
  id: string;
  startedAt: string;
  order: TableSessionOrder | null;
}

export interface Table {
  id: string;
  tableNo: number;
  qrToken?: string | null;
  label: string | null;
  capacity: number;
  isActive: boolean;
  isOccupied: boolean;
  session: TableSession | null;
}

export interface TablesResponse {
  tables: Table[];
  restaurant: { slug?: string; name?: string } | null;
}

/** Stable key so every consumer — and every invalidation — targets the same entry. */
export const tablesQueryKey = (restaurantId: string | undefined) =>
  ["tables", restaurantId ?? null] as const;

const EMPTY: Table[] = [];

export function useTables(restaurantId: string | undefined) {
  const query = useQuery({
    queryKey: tablesQueryKey(restaurantId),
    queryFn: () =>
      apiFetch<TablesResponse>(`/api/restaurants/${restaurantId}/tables`, {
        cacheTtl: 0,
      }),
    enabled: !!restaurantId,
    // Paint instantly from cache when switching between the Tables and QR
    // sub-tabs; revalidate in the background.
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  return {
    ...query,
    tables: query.data?.tables ?? EMPTY,
    meta: query.data?.restaurant
      ? {
          slug: query.data.restaurant.slug ?? "",
          name: query.data.restaurant.name ?? "",
        }
      : null,
    /**
     * True only when there is genuinely nothing to show yet. `isLoading` alone
     * is true whenever the query is disabled (no restaurantId), which is what
     * made tabs render an empty board instead of a skeleton while the
     * restaurant id was still resolving.
     */
    isFirstLoad: !!restaurantId && query.isPending && !query.data,
  };
}

/** Write into the shared cache — used by optimistic update handlers. */
export function useSetTables(restaurantId: string | undefined) {
  const queryClient = useQueryClient();
  return useCallback(
    (updater: React.SetStateAction<Table[]>) => {
      queryClient.setQueryData<TablesResponse>(
        tablesQueryKey(restaurantId),
        (prev) => ({
          restaurant: prev?.restaurant ?? null,
          tables:
            typeof updater === "function"
              ? (updater as (p: Table[]) => Table[])(prev?.tables ?? [])
              : updater,
        }),
      );
    },
    [queryClient, restaurantId],
  );
}

/** Refetch the shared list. One cache now, so no cross-cache invalidation needed. */
export function useInvalidateTables(restaurantId: string | undefined) {
  const queryClient = useQueryClient();
  return useCallback(
    () => queryClient.invalidateQueries({ queryKey: tablesQueryKey(restaurantId) }),
    [queryClient, restaurantId],
  );
}

/** Non-hook variant for callers that already hold a QueryClient. */
export function invalidateTables(
  queryClient: QueryClient,
  restaurantId: string | undefined,
) {
  return queryClient.invalidateQueries({ queryKey: tablesQueryKey(restaurantId) });
}
