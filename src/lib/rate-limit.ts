// Rate limiter with Upstash Redis backend when env vars are present,
// falling back to an in-memory sliding window for local dev / single instances.
//
// Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN for distributed
// deployments where in-memory state resets on every cold start.

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

// ── Upstash path ─────────────────────────────────────────────────────────────

let redis: Redis | null = null;
const upstashLimiters = new Map<string, Ratelimit>();

function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

function msToUpstashWindow(ms: number): `${number} ${"ms" | "s" | "m" | "h" | "d"}` {
  if (ms < 1_000) return `${ms} ms`;
  if (ms < 60_000) return `${Math.round(ms / 1_000)} s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)} m`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)} h`;
  return `${Math.round(ms / 86_400_000)} d`;
}

function getUpstashLimiter(windowMs: number, max: number): Ratelimit {
  const cacheKey = `${windowMs}:${max}`;
  let limiter = upstashLimiters.get(cacheKey);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: redis!,
      limiter: Ratelimit.slidingWindow(max, msToUpstashWindow(windowMs)),
      analytics: false,
    });
    upstashLimiters.set(cacheKey, limiter);
  }
  return limiter;
}

async function upstashRateLimit(
  key: string,
  windowMs: number,
  max: number,
): Promise<RateLimitResult> {
  const limiter = getUpstashLimiter(windowMs, max);
  const { success, remaining, reset } = await limiter.limit(key);
  const retryAfterSeconds = success
    ? 0
    : Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  return { ok: success, remaining, retryAfterSeconds };
}

// ── In-memory fallback ────────────────────────────────────────────────────────

const buckets = new Map<string, number[]>();

function inMemoryRateLimit(
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

  if (buckets.size > 10_000) {
    for (const [k, v] of buckets) {
      if (v[v.length - 1] < cutoff) buckets.delete(k);
    }
  }

  return { ok: true, remaining: max - recent.length, retryAfterSeconds: 0 };
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function rateLimit(
  key: string,
  windowMs: number,
  max: number,
): Promise<RateLimitResult> {
  const r = getRedis();
  if (r) return upstashRateLimit(key, windowMs, max);
  return inMemoryRateLimit(key, windowMs, max);
}

// ── Idempotency claim ─────────────────────────────────────────────────────────
// One-shot claim used to dedupe operations that don't have a durable DB unique
// (e.g. add-items-to-order). `claimOnce` returns true the FIRST time a key is
// seen within the TTL and false afterwards; `releaseClaim` frees it so a failed
// operation can be retried. Durable when Upstash is configured (production);
// falls back to per-instance in-memory state for local dev.

const claimBuckets = new Map<string, number>(); // key → expiry epoch ms

export async function claimOnce(key: string, ttlSeconds: number): Promise<boolean> {
  const r = getRedis();
  if (r) {
    const res = await r.set(key, "1", { nx: true, ex: ttlSeconds });
    return res === "OK";
  }
  const now = Date.now();
  const exp = claimBuckets.get(key);
  if (exp && exp > now) return false;
  claimBuckets.set(key, now + ttlSeconds * 1000);
  if (claimBuckets.size > 10_000) {
    for (const [k, e] of claimBuckets) if (e <= now) claimBuckets.delete(k);
  }
  return true;
}

export async function releaseClaim(key: string): Promise<void> {
  const r = getRedis();
  if (r) {
    await r.del(key);
    return;
  }
  claimBuckets.delete(key);
}

export function clientKey(req: Request, prefix: string): string {
  const h = req.headers;
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown";
  return `${prefix}:${ip}`;
}
