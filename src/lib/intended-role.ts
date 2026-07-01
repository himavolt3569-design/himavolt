/**
 * Intended-role handoff for OAuth sign-up.
 *
 * Google OAuth bounces the browser off-site (Google -> Supabase -> app), and
 * the `?role=OWNER` query param we attach to `redirectTo` is not guaranteed to
 * survive that round-trip (Supabase redirect/Site-URL handling can drop it).
 * To make role selection reliable we ALSO stash it in a short-lived first-party
 * cookie before kicking off OAuth. Because it's SameSite=Lax it is sent on the
 * top-level navigation back to `/auth/callback`, so the server can recover the
 * intended role even when the query param is gone.
 *
 * This is a non-sensitive UX hint only — the server still refuses to grant
 * ADMIN and treats the DB as the source of truth for existing accounts.
 */
export const INTENDED_ROLE_COOKIE = "hh_intended_role";

export type IntendedRole = "OWNER" | "CUSTOMER";

/** Persist the chosen role just before starting an OAuth redirect (client). */
export function rememberIntendedRole(role: IntendedRole) {
  if (typeof document === "undefined") return;
  const secure = location.protocol === "https:" ? "; secure" : "";
  // 10 minutes is plenty for the OAuth round-trip.
  document.cookie = `${INTENDED_ROLE_COOKIE}=${role}; path=/; max-age=600; samesite=lax${secure}`;
}

/** Clear any stale intended-role hint (client). */
export function clearIntendedRole() {
  if (typeof document === "undefined") return;
  document.cookie = `${INTENDED_ROLE_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

/** Read back whatever intent (if any) is already on file (client). */
export function getIntendedRole(): IntendedRole | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${INTENDED_ROLE_COOKIE}=([^;]*)`),
  );
  return normalizeIntendedRole(match ? decodeURIComponent(match[1]) : undefined);
}

/** Normalize an arbitrary value into a safe role (never ADMIN). */
export function normalizeIntendedRole(value: unknown): IntendedRole | undefined {
  if (typeof value !== "string") return undefined;
  const v = value.toUpperCase();
  if (v === "OWNER") return "OWNER";
  if (v === "CUSTOMER") return "CUSTOMER";
  return undefined;
}
