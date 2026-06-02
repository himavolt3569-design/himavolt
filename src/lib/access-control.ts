import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { getStaffSession, StaffPayload } from "@/lib/staff-auth";
import { STAFF_MANAGER_ROLES } from "@/lib/staff-roles";

export type AccessContext =
  | { kind: "owner"; userId: string }
  | { kind: "staff"; staff: StaffPayload };

export async function getRestaurantAccess(
  req: NextRequest,
  restaurantId: string,
): Promise<AccessContext | null> {
  const staff = await getStaffSession(req);
  if (staff && staff.restaurantId === restaurantId) {
    return { kind: "staff", staff };
  }
  const user = await getOrCreateUser();
  if (!user) return null;
  const restaurant = await db.restaurant.findFirst({
    where: { id: restaurantId, ownerId: user.id },
    select: { id: true },
  });
  if (!restaurant) return null;
  return { kind: "owner", userId: user.id };
}

export async function requireOwnerOrStaffManager(
  req: NextRequest,
  restaurantId: string,
): Promise<AccessContext | null> {
  const access = await getRestaurantAccess(req, restaurantId);
  if (!access) return null;
  if (access.kind === "staff") {
    if (!(STAFF_MANAGER_ROLES as readonly string[]).includes(access.staff.role)) {
      return null;
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
