import { cache } from "react";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { db } from "./db";

/**
 * Platform-admin impersonation — "manage this business as its owner".
 *
 * The master admin has no Supabase session, but every owner route and server
 * component resolves the caller through `getAuthUser()` / `getOrCreateUser()`
 * and then checks `restaurant.ownerId === user.id`. Rather than teach ~50 API
 * routes and ~50 dashboard tabs about a second kind of caller, an impersonation
 * session makes those two functions resolve **the owner of one specific
 * restaurant**. The whole owner dashboard then works unmodified.
 *
 * The security properties that make this safe to put in the hot auth path:
 *
 * - **Two cookies are required.** The impersonation JWT alone does nothing; a
 *   valid `master_admin_session` must be present too, and its identity must
 *   match the one baked into the impersonation token. Losing the admin session
 *   ends impersonation immediately.
 * - **Short-lived.** One hour, independent of the 12h admin session.
 * - **Fails closed and silent.** Any verification failure returns null and the
 *   caller falls through to the normal Supabase path, unchanged. A request with
 *   no impersonation cookie does one `cookies()` read and nothing else, so the
 *   ordinary customer/owner path is untouched.
 * - **Scope is re-checked on every request**, not just at hand-out, so revoking
 *   a platform staff member's tenant scope takes effect at once.
 *
 * What it deliberately does NOT do: narrow which routes accept it. While a
 * session is live the admin *is* the owner account everywhere, including that
 * owner's personal profile. That is the cost of reusing the real dashboard
 * rather than rebuilding it, so both ends are audited and the dashboard shows a
 * permanent banner.
 */

export const IMPERSONATION_COOKIE = "admin_impersonation";

/**
 * Readable companion cookie. Carries no authority — it exists so the client can
 * tell it is impersonating without an extra request on every page load for
 * every other visitor. The real check is always the signed cookie above.
 */
export const IMPERSONATION_UI_COOKIE = "admin_impersonation_active";

export const IMPERSONATION_TTL_SECONDS = 60 * 60; // 1 hour

export type ImpersonationPayload = {
  /** The business being managed. */
  restaurantId: string;
  /** Which admin opened it — `master_admin`, or a PlatformStaff id. */
  adminId: string;
  adminRole: "MASTER_ADMIN" | "PLATFORM_STAFF";
};

export async function signImpersonationToken(
  payload: ImpersonationPayload,
): Promise<string> {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) throw new Error("JWT_SECRET is not set");
  const secret = new TextEncoder().encode(jwtSecret);

  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${IMPERSONATION_TTL_SECONDS}s`)
    .sign(secret);
}

/**
 * Verify the impersonation session, including that it is still backed by a live
 * master-admin session belonging to the same admin. Returns null on any
 * failure — callers must treat null as "not impersonating", never as an error.
 *
 * `cache()` keeps this to one verify + one scope query per request no matter how
 * many times `getAuthUser()` is called.
 */
export const readImpersonation = cache(
  async (): Promise<ImpersonationPayload | null> => {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) return null;

    let store;
    try {
      store = await cookies();
    } catch {
      // Outside a request scope (e.g. build-time evaluation) — never impersonate.
      return null;
    }

    const token = store.get(IMPERSONATION_COOKIE)?.value;
    if (!token) return null;

    const adminToken = store.get("master_admin_session")?.value;
    if (!adminToken) return null;

    const secret = new TextEncoder().encode(jwtSecret);

    try {
      const [{ payload }, { payload: adminPayload }] = await Promise.all([
        jwtVerify(token, secret),
        jwtVerify(adminToken, secret),
      ]);

      const restaurantId = payload.restaurantId as string | undefined;
      const adminId = payload.adminId as string | undefined;
      const adminRole = payload.adminRole as ImpersonationPayload["adminRole"];

      if (!restaurantId || !adminId) return null;
      if (adminRole !== "MASTER_ADMIN" && adminRole !== "PLATFORM_STAFF") return null;

      // The impersonation token must belong to the admin currently signed in —
      // otherwise a leaked token could be replayed alongside any admin session.
      if (adminPayload.role !== adminRole) return null;
      const liveAdminId = (adminPayload.staffId as string) || "master_admin";
      if (liveAdminId !== adminId) return null;

      // Platform staff lose access the moment they are deactivated or their
      // tenant scope changes — checked here, not just when the session started.
      if (adminRole === "PLATFORM_STAFF") {
        const staff = await db.platformStaff.findUnique({
          where: { id: adminId },
          select: { isActive: true },
        });
        if (!staff?.isActive) return null;

        const scopes = await db.platformStaffTenantScope.findMany({
          where: { platformStaffId: adminId },
          select: { restaurantId: true },
        });
        if (scopes.length > 0 && !scopes.some((s) => s.restaurantId === restaurantId)) {
          return null;
        }
      }

      return { restaurantId, adminId, adminRole };
    } catch {
      return null;
    }
  },
);

/**
 * The owner account an impersonating admin is currently acting as, or null.
 * This is what `getAuthUser()` / `getOrCreateUser()` return during a session.
 */
export const getImpersonatedOwner = cache(async () => {
  const session = await readImpersonation();
  if (!session) return null;

  const restaurant = await db.restaurant.findUnique({
    where: { id: session.restaurantId },
    select: { ownerId: true },
  });
  if (!restaurant) return null;

  const owner = await db.user.findUnique({ where: { id: restaurant.ownerId } });

  // A deleted or blacklisted owner is not a usable identity — the same rule the
  // normal auth path applies, so impersonation can never be a way around it.
  if (!owner || owner.isDeleted || owner.isBlacklisted) return null;

  // `getOrCreateUser` upgrades a CUSTOMER who owns a restaurant to OWNER on
  // sign-in, and impersonation short-circuits that. An owner who has not signed
  // in since acquiring the business would otherwise land on the customer
  // dashboard. They demonstrably own this restaurant, so report OWNER — in
  // memory only, since a read path should not write.
  if (owner.role === "CUSTOMER") return { ...owner, role: "OWNER" as const };

  return owner;
});

/** Describes the live session for the dashboard banner. */
export async function getImpersonationBanner() {
  const session = await readImpersonation();
  if (!session) return null;

  const restaurant = await db.restaurant.findUnique({
    where: { id: session.restaurantId },
    select: {
      id: true,
      name: true,
      slug: true,
      owner: { select: { name: true, email: true } },
    },
  });
  if (!restaurant) return null;

  return {
    active: true as const,
    restaurantId: restaurant.id,
    restaurantName: restaurant.name,
    restaurantSlug: restaurant.slug,
    ownerName: restaurant.owner?.name ?? null,
    ownerEmail: restaurant.owner?.email ?? null,
    adminRole: session.adminRole,
  };
}
