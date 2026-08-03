/**
 * Presence tracker — who is currently using the site, and who they are.
 *
 * Each `recordPresence` call refreshes a (key, scope) entry's lastSeenAt plus a
 * small, ephemeral identity snapshot (name/email/city/current page). Entries
 * older than the TTL are pruned on read; an entry is "live" if it was last seen
 * within the TTL window.
 *
 * Backend:
 *   - Upstash Redis when UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are
 *     set, so presence is accurate across serverless instances. Stored in a
 *     single hash keyed `presence:live` (field = presence key, value = entry),
 *     with the whole hash given a safety TTL so it self-cleans when traffic stops.
 *   - Otherwise an in-memory Map, which on serverless scales per-instance (two
 *     warm Vercel instances keep two independent maps). This mirrors the
 *     rate-limit module's Upstash-or-memory shape.
 *
 * Nothing here is persisted to the database — the identity fields live only for
 * the TTL window and exist purely to power the master-admin live view.
 */

import { Redis } from "@upstash/redis";

export type PresenceScope = "CUSTOMER" | "OWNER" | "STAFF" | "ADMIN";

/** Ephemeral identity snapshot attached to a live entry. */
export interface PresenceIdentity {
  /** Stable id for the actor: userId, staffId, or an anon presence id. */
  id?: string;
  /** For staff entries: the linked User.id, so the live view can open the
   *  same user detail drawer used everywhere else. */
  userId?: string;
  name?: string;
  email?: string;
  phone?: string;
  imageUrl?: string;
  /** Human role label, e.g. "Owner", "Cashier", "Guest". */
  roleLabel?: string;
  restaurantId?: string;
  city?: string;
  country?: string;
  /** Current page pathname (no query string). */
  path?: string;
}

interface Entry extends PresenceIdentity {
  scope: PresenceScope;
  lastSeenAt: number;
  signedIn: boolean;
}

// Keys are namespaced by scope so a user-id collision between, say, a User
// row and a StaffMember row doesn't conflate two different actors.
//   "user:<userId>"        → signed-in customer / owner / admin (via User table)
//   "staff:<staffId>"      → staff JWT session
//   "admin:master"         → master admin session (only one role; all admins share)
//   "anon:<presenceId>"    → unauthenticated visitor
const presence = new Map<string, Entry>();

const PRESENCE_TTL_MS = 5 * 60_000; // 5 min sliding window
const MAX_ENTRIES = 100_000; // hard cap so a runaway loop can't OOM the process
const REDIS_HASH_KEY = "presence:live";
const REDIS_HASH_TTL_SECONDS = 60 * 60; // safety expiry on the whole hash

// ── Redis backend (optional) ──────────────────────────────────────────────────

let redis: Redis | null = null;
let redisResolved = false;

function getRedis(): Redis | null {
  if (redisResolved) return redis;
  redisResolved = true;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) redis = new Redis({ url, token });
  return redis;
}

// ── In-memory prune ───────────────────────────────────────────────────────────

function prune(now = Date.now()) {
  const cutoff = now - PRESENCE_TTL_MS;
  for (const [k, v] of presence) {
    if (v.lastSeenAt < cutoff) presence.delete(k);
  }
  // Belt-and-braces eviction if pruning didn't bring us under the cap.
  if (presence.size > MAX_ENTRIES) {
    const entries = [...presence.entries()].sort(
      (a, b) => a[1].lastSeenAt - b[1].lastSeenAt,
    );
    const drop = entries.slice(0, presence.size - MAX_ENTRIES);
    for (const [k] of drop) presence.delete(k);
  }
}

/** Strip undefined identity fields so the stored entry stays compact. */
function buildEntry(
  scope: PresenceScope,
  signedIn: boolean,
  identity: PresenceIdentity,
  now: number,
): Entry {
  const entry: Record<string, unknown> = { scope, signedIn, lastSeenAt: now };
  for (const [k, v] of Object.entries(identity)) {
    if (v !== undefined && v !== null && v !== "") {
      entry[k] = v;
    }
  }
  return entry as unknown as Entry;
}

export interface RecordPresenceOptions extends PresenceIdentity {
  signedIn?: boolean;
}

export async function recordPresence(
  key: string,
  scope: PresenceScope,
  options: RecordPresenceOptions = {},
): Promise<void> {
  if (!key) return;
  const now = Date.now();
  const { signedIn = false, ...identity } = options;
  const entry = buildEntry(scope, signedIn, identity, now);

  const r = getRedis();
  if (r) {
    try {
      await r.hset(REDIS_HASH_KEY, { [key]: entry });
      // Refresh the safety TTL so the hash disappears if the site goes quiet.
      await r.expire(REDIS_HASH_KEY, REDIS_HASH_TTL_SECONDS);
      return;
    } catch (err) {
      // Never let a presence write break a page request — fall back to memory.
      console.error("[Presence] Redis hset failed, using memory:", err);
    }
  }

  presence.set(key, entry);
  // Cheap opportunistic prune so the map doesn't drift.
  if (presence.size % 256 === 0) prune(now);
}

// ── Reads ─────────────────────────────────────────────────────────────────────

/** Read all live (non-stale) entries from whichever backend is active. */
async function readLiveEntries(
  now: number,
): Promise<Array<{ key: string; entry: Entry }>> {
  const cutoff = now - PRESENCE_TTL_MS;
  const r = getRedis();

  if (r) {
    try {
      const all = (await r.hgetall<Record<string, Entry>>(REDIS_HASH_KEY)) ?? {};
      const live: Array<{ key: string; entry: Entry }> = [];
      const stale: string[] = [];
      for (const [key, entry] of Object.entries(all)) {
        if (!entry || typeof entry.lastSeenAt !== "number") {
          stale.push(key);
          continue;
        }
        if (entry.lastSeenAt < cutoff) stale.push(key);
        else live.push({ key, entry });
      }
      // Opportunistically evict stale fields so the hash stays bounded.
      if (stale.length > 0) {
        r.hdel(REDIS_HASH_KEY, ...stale).catch(() => {});
      }
      return live;
    } catch (err) {
      console.error("[Presence] Redis hgetall failed, using memory:", err);
    }
  }

  prune(now);
  return [...presence.entries()].map(([key, entry]) => ({ key, entry }));
}

export interface PresenceCounts {
  /** Sum of every live actor across all scopes. */
  total: number;
  /** Live signed-in customer accounts (User.role = CUSTOMER). */
  signedInCustomers: number;
  /** Live anonymous visitors browsing menus / scanning QR codes. */
  anonymousCustomers: number;
  /** signedInCustomers + anonymousCustomers — what most dashboards want. */
  customers: number;
  /** Live restaurant owners (User.role = OWNER) on the site. */
  owners: number;
  /** Live staff members with an active staff JWT session. */
  staff: number;
  /** Live master-admin sessions. */
  admins: number;
  /** Refreshed at the moment of the count. */
  generatedAt: string;
  /** Window length in seconds — how recent a ping has to be to count. */
  ttlSeconds: number;
}

function countEntries(
  entries: Array<{ key: string; entry: Entry }>,
  now: number,
): PresenceCounts {
  let signedInCustomers = 0;
  let anonymousCustomers = 0;
  let owners = 0;
  let staff = 0;
  let admins = 0;
  for (const { entry } of entries) {
    switch (entry.scope) {
      case "CUSTOMER":
        if (entry.signedIn) signedInCustomers++;
        else anonymousCustomers++;
        break;
      case "OWNER":
        owners++;
        break;
      case "STAFF":
        staff++;
        break;
      case "ADMIN":
        admins++;
        break;
    }
  }
  const customers = signedInCustomers + anonymousCustomers;
  return {
    total: customers + owners + staff + admins,
    signedInCustomers,
    anonymousCustomers,
    customers,
    owners,
    staff,
    admins,
    generatedAt: new Date(now).toISOString(),
    ttlSeconds: Math.round(PRESENCE_TTL_MS / 1000),
  };
}

export async function getPresenceCounts(): Promise<PresenceCounts> {
  const now = Date.now();
  const entries = await readLiveEntries(now);
  return countEntries(entries, now);
}

/** One live actor, flattened for the master-admin live view. */
export interface LiveEntry extends PresenceIdentity {
  key: string;
  scope: PresenceScope;
  signedIn: boolean;
  lastSeenAt: number;
  secondsAgo: number;
}

export interface LivePresence {
  counts: PresenceCounts;
  entries: LiveEntry[];
}

export async function getLivePresence(): Promise<LivePresence> {
  const now = Date.now();
  const raw = await readLiveEntries(now);
  const counts = countEntries(raw, now);
  const entries: LiveEntry[] = raw
    .map(({ key, entry }) => ({
      key,
      scope: entry.scope,
      signedIn: entry.signedIn,
      lastSeenAt: entry.lastSeenAt,
      secondsAgo: Math.max(0, Math.round((now - entry.lastSeenAt) / 1000)),
      id: entry.id,
      userId: entry.userId,
      name: entry.name,
      email: entry.email,
      phone: entry.phone,
      imageUrl: entry.imageUrl,
      roleLabel: entry.roleLabel,
      restaurantId: entry.restaurantId,
      city: entry.city,
      country: entry.country,
      path: entry.path,
    }))
    .sort((a, b) => b.lastSeenAt - a.lastSeenAt);
  return { counts, entries };
}

/** Test-only — wipe the in-memory store. Not exported via index. */
export function _resetPresenceForTests(): void {
  presence.clear();
}
