/**
 * In-memory presence tracker — counts who is currently using the site.
 *
 * Each `recordPresence` call refreshes a (key, scope) entry's lastSeenAt.
 * Entries older than the TTL are pruned on read; an entry is "live" if it
 * was last seen within the TTL window.
 *
 * Caveat: serverless deployments scale this per-instance. Two warm Vercel
 * instances will keep two independent presence maps and the admin will see
 * whichever one their request lands on. For multi-instance deployments this
 * should be swapped for Redis or Upstash with the same surface.
 */

export type PresenceScope = "CUSTOMER" | "OWNER" | "STAFF" | "ADMIN";

interface Entry {
  scope: PresenceScope;
  lastSeenAt: number;
  signedIn: boolean;
  restaurantId?: string;
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

export function recordPresence(
  key: string,
  scope: PresenceScope,
  options: { signedIn?: boolean; restaurantId?: string } = {},
): void {
  if (!key) return;
  const now = Date.now();
  presence.set(key, {
    scope,
    lastSeenAt: now,
    signedIn: options.signedIn ?? false,
    restaurantId: options.restaurantId,
  });
  // Cheap opportunistic prune so the map doesn't drift.
  if (presence.size % 256 === 0) prune(now);
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

export function getPresenceCounts(): PresenceCounts {
  const now = Date.now();
  prune(now);

  let signedInCustomers = 0;
  let anonymousCustomers = 0;
  let owners = 0;
  let staff = 0;
  let admins = 0;
  for (const entry of presence.values()) {
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

/** Test-only — wipe the in-memory store. Not exported via index. */
export function _resetPresenceForTests(): void {
  presence.clear();
}
