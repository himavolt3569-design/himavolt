const BASE =
  typeof window !== "undefined"
    ? ""
    : process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

interface CacheEntry<T = unknown> {
  data: T;
  ts: number;
}
const GET_CACHE = new Map<string, CacheEntry>();
const DEFAULT_CACHE_TTL = 30_000;
const MAX_CACHE_ENTRIES = 100;

function pruneCache() {
  if (GET_CACHE.size <= MAX_CACHE_ENTRIES) return;
  const sorted = [...GET_CACHE.entries()].sort((a, b) => a[1].ts - b[1].ts);
  const toRemove = sorted.slice(0, sorted.length - MAX_CACHE_ENTRIES);
  for (const [key] of toRemove) GET_CACHE.delete(key);
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
};

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
  } = options;

  if (typeof window !== "undefined" && method === "GET" && cacheTtl > 0) {
    const cached = GET_CACHE.get(path);
    if (cached && Date.now() - cached.ts < cacheTtl) {
      return cached.data as T;
    }
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    cache,
    credentials: "include",
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
    throw new Error(msg);
  }

  const data = await res.json();

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
}
