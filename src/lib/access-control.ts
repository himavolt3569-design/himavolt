import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { getStaffSession, StaffPayload } from "@/lib/staff-auth";
import { STAFF_MANAGER_ROLES, STAFF_BILLING_ROLES } from "@/lib/staff-roles";

export type AccessContext =
  | { kind: "owner"; userId: string }
  | { kind: "staff"; staff: StaffPayload };

/**
 * Resolve the logged-in Supabase user as the owner of this restaurant, if they
 * are. Independent of any staff cookie — used as a fallback so an owner carrying
 * a lingering/low-privilege POS staff cookie is never denied access to their own
 * restaurant.
 */
async function getOwnerAccess(
  restaurantId: string,
): Promise<AccessContext | null> {
  const user = await getOrCreateUser();
  if (!user) return null;
  const restaurant = await db.restaurant.findFirst({
    where: { id: restaurantId, ownerId: user.id },
    select: { id: true },
  });
  if (!restaurant) return null;
  return { kind: "owner", userId: user.id };
}

export async function getRestaurantAccess(
  req: NextRequest,
  restaurantId: string,
): Promise<AccessContext | null> {
  const staff = await getStaffSession(req);
  if (staff && staff.restaurantId === restaurantId) {
    return { kind: "staff", staff };
  }
  return getOwnerAccess(restaurantId);
}

export async function requireOwnerOrStaffManager(
  req: NextRequest,
  restaurantId: string,
): Promise<AccessContext | null> {
  const access = await getRestaurantAccess(req, restaurantId);
  if (!access) return null;
  if (access.kind === "staff") {
    if (!(STAFF_MANAGER_ROLES as readonly string[]).includes(access.staff.role)) {
      // Staff role is too low — but the caller might be the OWNER carrying a
      // stray POS staff cookie. Fall back to an ownership check before denying.
      return getOwnerAccess(restaurantId);
    }
  }
  return access;
}

/**
 * Owner, or staff in a billing role (SUPER_ADMIN, MANAGER, CASHIER).
 * Used for booking, guest check-in and advance-payment actions — the
 * front-desk/cashier surface. Waiters and chefs are rejected.
 */
export async function requireOwnerOrStaffBilling(
  req: NextRequest,
  restaurantId: string,
): Promise<AccessContext | null> {
  const access = await getRestaurantAccess(req, restaurantId);
  if (!access) return null;
  if (access.kind === "staff") {
    if (!(STAFF_BILLING_ROLES as readonly string[]).includes(access.staff.role)) {
      // Staff role is too low — fall back to an ownership check so an owner with
      // a stray low-privilege POS staff cookie isn't locked out.
      return getOwnerAccess(restaurantId);
    }
  }
  return access;
}

export async function requireOwnerOnly(
  req: NextRequest,
  restaurantId: string,
): Promise<AccessContext | null> {
  const access = await getRestaurantAccess(req, restaurantId);
  if (!access || access.kind !== "owner") return null;
  return access;
}
