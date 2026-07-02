/**
 * Generate a client-side idempotency key for an order submit (Phase 2.5c).
 * Sent as `idempotencyKey` on POST /orders so a duplicated request (double
 * fire / network retry) resolves to the same order server-side instead of
 * creating a second one.
 */
export function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
