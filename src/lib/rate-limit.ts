// In-memory sliding-window rate limiter.
// Caveat: on serverless (Vercel), each cold-start instance gets a fresh Map,
// so the effective limit scales with the number of warm instances. Still
// provides meaningful brute-force resistance on login/payment endpoints.
// For stronger guarantees, swap for Upstash or Redis with the same signature.

const buckets = new Map<string, number[]>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function rateLimit(
  key: string,
  windowMs: number,
  max: number,
): RateLimitResult {
  const now = Date.now();
  const cutoff = now - windowMs;
  const existing = buckets.get(key) ?? [];
  const recent = existing.filter((t) => t > cutoff);

  if (recent.length >= max) {
    buckets.set(key, recent);
    const oldest = recent[0];
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)),
    };
  }

  recent.push(now);
  buckets.set(key, recent);

  // Occasional cleanup so the Map doesn't grow unbounded in long-lived instances
  if (buckets.size > 10_000) {
    for (const [k, v] of buckets) {
      if (v[v.length - 1] < cutoff) buckets.delete(k);
    }
  }

  return { ok: true, remaining: max - recent.length, retryAfterSeconds: 0 };
}

export function clientKey(req: Request, prefix: string): string {
  const h = req.headers;
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown";
  return `${prefix}:${ip}`;
}
