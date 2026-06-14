const BASE =
  typeof window !== "undefined"
    ? ""
    : process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

interface CacheEntry<T = unknown> {
  data: T;
  ts: number;
}
// Map preserves insertion order — re-inserting on hit gives us O(1) LRU
// without a sort. The previous sort-based eviction was O(n log n) on every
// cache miss past 100 entries.
const GET_CACHE = new Map<string, CacheEntry>();
const IN_FLIGHT_GETS = new Map<string, Promise<unknown>>();
const DEFAULT_CACHE_TTL = 60_000;
const MAX_CACHE_ENTRIES = 200;

// Client-side request ceiling. The server already enforces a 15s statement
// timeout (see src/lib/db.ts), so a request that runs longer than this is
// effectively dead — abort it rather than holding the tab in a blank loading
// state forever. Generous enough not to abort a slow-but-succeeding query.
const REQUEST_TIMEOUT_MS = 20_000;
// Transient HTTP statuses worth a quick retry — these come from pool
// saturation (prod runs a 1-connection Prisma pool) and are usually gone by
// the next attempt.
const RETRYABLE_STATUSES = new Set([502, 503, 504]);
const MAX_GET_RETRIES = 2;

function pruneCache() {
  while (GET_CACHE.size > MAX_CACHE_ENTRIES) {
    const oldest = GET_CACHE.keys().next().value;
    if (!oldest) break;
    GET_CACHE.delete(oldest);
  }
}

export function invalidateApiCache(pathPrefix?: string) {
  if (!pathPrefix) {
    GET_CACHE.clear();
    return;
  }
  for (const key of GET_CACHE.keys()) {
    if (key.startsWith(pathPrefix)) GET_CACHE.delete(key);
  }
}

type FetchOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  cache?: RequestCache;
  cacheTtl?: number;
  /** Override the default per-attempt timeout (ms). */
  timeoutMs?: number;
};

/** Error carrying the HTTP status so callers/retry logic can branch on it. */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Single network attempt with an abort-based timeout. Rejects with an ApiError
 * (carrying the status) on a non-OK response, or a generic Error on
 * network/timeout failure.
 */
async function attempt<T>(
  url: string,
  method: string,
  cache: RequestCache,
  headers: Record<string, string>,
  body: unknown,
  timeoutMs: number,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method,
      cache,
      credentials: "include",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Request failed" }));
      const msg = error.error || `API error: ${res.status}`;
      if (error.issues) {
        console.error(`[API ${res.status}] ${msg}`, error.issues);
      }
      throw new ApiError(msg, res.status);
    }

    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("Request timed out. Please try again.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const {
    method = "GET",
    body,
    headers = {},
    cache = "no-store",
    cacheTtl = DEFAULT_CACHE_TTL,
    timeoutMs = REQUEST_TIMEOUT_MS,
  } = options;

  const isCacheableGet =
    typeof window !== "undefined" && method === "GET" && cacheTtl > 0;

  if (isCacheableGet) {
    const cached = GET_CACHE.get(path);
    if (cached && Date.now() - cached.ts < cacheTtl) {
      // Refresh insertion order so this entry isn't the next eviction victim.
      GET_CACHE.delete(path);
      GET_CACHE.set(path, cached);
      return cached.data as T;
    }

    const inFlight = IN_FLIGHT_GETS.get(path);
    if (inFlight) return inFlight as Promise<T>;
  }

  const url = `${BASE}${path}`;

  const request = (async () => {
    // GETs are idempotent — retry transient pool/network failures so a single
    // saturated lambda doesn't surface as a blank tab. Mutations are NOT
    // retried automatically (could double-write); they only get the timeout.
    const maxAttempts = method === "GET" ? MAX_GET_RETRIES + 1 : 1;

    let lastErr: unknown;
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const data = await attempt<T>(url, method, cache, headers, body, timeoutMs);

        if (typeof window !== "undefined") {
          if (method === "GET" && cacheTtl > 0) {
            GET_CACHE.set(path, { data, ts: Date.now() });
            pruneCache();
          } else if (method !== "GET") {
            const basePath = path.split("?")[0];
            const segments = basePath.split("/").slice(0, 4).join("/");
            invalidateApiCache(segments);
          }
        }

        return data;
      } catch (err) {
        lastErr = err;
        const isLastAttempt = i === maxAttempts - 1;
        const retryable =
          err instanceof ApiError
            ? RETRYABLE_STATUSES.has(err.status)
            : true; // network error / timeout — worth one more try
        if (isLastAttempt || !retryable) throw err;
        await sleep(300 * (i + 1)); // 300ms, 600ms backoff
      }
    }
    throw lastErr;
  })();

  if (isCacheableGet) {
    IN_FLIGHT_GETS.set(path, request);
    request.then(
      () => IN_FLIGHT_GETS.delete(path),
      () => IN_FLIGHT_GETS.delete(path),
    );
  }

  return request;
}
