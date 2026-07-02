import { QueryClient } from "@tanstack/react-query";

// apiFetch() already retries transient 502/503/504 (prod runs a 1-connection
// Prisma pool) and times out via AbortController — retrying again here would
// stack backoff on top of backoff. SSE/Realtime signals drive real freshness
// for live data, so a background refetch-on-focus storm across staff tabs is
// pure downside against that same pool.
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: 0,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}
