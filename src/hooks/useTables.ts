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

/* ── Persisted snapshot ────────────────────────────────────────────────────
 * React Query's cache is in-memory, so it dies on every hard refresh — which
 * is precisely when this screen felt worst: a full network round-trip before a
 * single table appeared.
 *
 * We mirror the last successful response into localStorage and feed it back as
 * `initialData`. A revisit paints the real table grid on the FIRST frame, then
 * revalidates in the background and reconciles. Stale-while-revalidate, scoped
 * to one screen, with no extra dependency.
 *
 * The snapshot is deliberately treated as already-stale (initialDataUpdatedAt: 0)
 * so React Query always refetches behind it — the user never acts on old data
 * for longer than one round-trip, they just don't stare at a blank box first.
 */
const SNAPSHOT_PREFIX = "hh_tables_v1_";
const SNAPSHOT_MAX_AGE_MS = 24 * 60 * 60 * 1000; // a day-old grid still beats a blank one

function snapshotKey(restaurantId: string) {
  return `${SNAPSHOT_PREFIX}${restaurantId}`;
}

function readSnapshot(restaurantId: string | undefined): TablesResponse | undefined {
  if (!restaurantId || typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(snapshotKey(restaurantId));
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as { ts: number; data: TablesResponse };
    if (!parsed?.data || Date.now() - parsed.ts > SNAPSHOT_MAX_AGE_MS) return undefined;
    if (!Array.isArray(parsed.data.tables)) return undefined;
    return parsed.data;
  } catch {
    return undefined; // corrupt/quota/private-mode — fall through to a normal fetch
  }
}

function writeSnapshot(restaurantId: string | undefined, data: TablesResponse) {
  if (!restaurantId || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      snapshotKey(restaurantId),
      JSON.stringify({ ts: Date.now(), data }),
    );
  } catch {
    /* quota exceeded — the snapshot is an optimisation, never a requirement */
  }
}

export function useTables(restaurantId: string | undefined) {
  const query = useQuery({
    queryKey: tablesQueryKey(restaurantId),
    queryFn: async () => {
      const data = await apiFetch<TablesResponse>(
        `/api/restaurants/${restaurantId}/tables`,
        { cacheTtl: 0 },
      );
      writeSnapshot(restaurantId, data);
      return data;
    },
    enabled: !!restaurantId,
    // Paint instantly from cache when switching between the Tables and QR
    // sub-tabs; revalidate in the background.
    staleTime: 30_000,
    refetchInterval: 30_000,
    // Paint the last known grid on the first frame of a fresh page load.
    initialData: () => readSnapshot(restaurantId),
    // Mark it stale immediately so a refetch always follows.
    initialDataUpdatedAt: 0,
  });

  const hasData = !!query.data;

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
     * "We have nothing to show yet" — the ONLY safe signal for rendering an
     * empty state.
     *
     * Note `!restaurantId` counts as loading. It previously did not, and that
     * was the bug: while RestaurantContext was still resolving, this returned
     * false, so consumers concluded the fetch had finished and found nothing —
     * and rendered "No tables configured" over a venue with 20 tables. An
     * unknown restaurant is not an empty restaurant.
     */
    isFirstLoad: !restaurantId || (!hasData && query.isPending),
    /** True once we can honestly say the list is empty. */
    isConfirmedEmpty: !!restaurantId && hasData && (query.data?.tables?.length ?? 0) === 0,
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
