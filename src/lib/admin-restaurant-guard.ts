import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  verifyAdminJwt,
  getAdminTenantScope,
  type AdminJwtPayload,
} from "@/lib/admin-auth";

/**
 * One guard for every master-admin route that acts *on behalf of a business*.
 *
 * The older admin sub-routes each called bare `requireAdmin()`, which let a
 * PLATFORM_STAFF account write to ANY restaurant regardless of the tenant scope
 * assigned to them — the scope was only enforced on the list/delete endpoints in
 * `/api/admin/restaurants`. Every route in the management console goes through
 * here instead, so scope is checked once, in one place, on reads and writes
 * alike.
 *
 * MASTER_ADMIN bypasses both the permission list and the tenant scope: it is the
 * platform's root account and is expected to be able to reach every tenant.
 */

/**
 * Permission ids are checked as a list because the catalogue shown in
 * `RolesTab` ("restaurants.manage") and the ids the API has historically
 * checked ("tenants.update") drifted apart. Accepting either spelling means a
 * role granted through the UI actually works, without migrating stored roles.
 */
export const TENANT_VIEW_PERMISSIONS = ["tenants.view", "restaurants.view"];
export const TENANT_MANAGE_PERMISSIONS = [
  "tenants.update",
  "restaurants.manage",
];

/** Restaurant columns every management route needs. One read serves the access
 *  check and the audit line, so no handler re-reads the row just for a name. */
const RESTAURANT_SELECT = {
  id: true,
  name: true,
  slug: true,
  type: true,
  currency: true,
  ownerId: true,
} as const;

export type GuardedRestaurant = {
  id: string;
  name: string;
  slug: string;
  type: string;
  currency: string;
  ownerId: string;
};

export type AdminRestaurantAccess = {
  admin: AdminJwtPayload;
  restaurant: GuardedRestaurant;
};

/**
 * Resolve a master-admin (or in-scope platform staff) session against one
 * restaurant. Returns either the access context or the `NextResponse` the route
 * should return — so callers stay a two-line guard:
 *
 *   const guard = await requireAdminForRestaurant(req, id, TENANT_MANAGE_PERMISSIONS);
 *   if ("response" in guard) return guard.response;
 */
export async function requireAdminForRestaurant(
  req: NextRequest,
  restaurantId: string,
  permissions: string[],
): Promise<AdminRestaurantAccess | { response: NextResponse }> {
  const admin = await verifyAdminJwt(req);
  if (!admin) {
    return {
      response: NextResponse.json(
        { error: "Admin access required" },
        { status: 401 },
      ),
    };
  }

  if (admin.role === "PLATFORM_STAFF") {
    const granted = permissions.some((p) => admin.permissions?.includes(p));
    if (!granted) {
      return {
        response: NextResponse.json(
          { error: "You do not have permission to do that" },
          { status: 403 },
        ),
      };
    }

    // Re-check the account in the DB so a revoked or deactivated staff member
    // loses access immediately rather than when their JWT happens to expire.
    if (admin.staffId) {
      const staff = await db.platformStaff.findUnique({
        where: { id: admin.staffId },
        select: { isActive: true },
      });
      if (!staff?.isActive) {
        return {
          response: NextResponse.json(
            { error: "This platform account is no longer active" },
            { status: 401 },
          ),
        };
      }
    }

    const scopes = await getAdminTenantScope(admin);
    if (scopes !== null && !scopes.includes(restaurantId)) {
      return {
        response: NextResponse.json(
          { error: "Out of assigned tenant scope" },
          { status: 403 },
        ),
      };
    }
  }

  const restaurant = await db.restaurant.findUnique({
    where: { id: restaurantId },
    select: RESTAURANT_SELECT,
  });
  if (!restaurant) {
    return {
      response: NextResponse.json(
        { error: "Business not found" },
        { status: 404 },
      ),
    };
  }

  return { admin, restaurant };
}

/** Who performed the action, for audit `metadata.by`. */
export function adminActorLabel(admin: AdminJwtPayload): string {
  return admin.role === "MASTER_ADMIN"
    ? "master_admin"
    : `platform_staff:${admin.staffId ?? "unknown"}`;
}
