import { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { db } from "./db";
import { permissionsInclude } from "./platform-permissions";

export type AdminJwtPayload = {
  role: "MASTER_ADMIN" | "PLATFORM_STAFF";
  staffId?: string;
  permissions?: string[];
  iat?: number;
  exp?: number;
};

export async function verifyAdminJwt(req: NextRequest): Promise<AdminJwtPayload | null> {
  const adminCookie = req.cookies.get("master_admin_session")?.value;
  if (!adminCookie || !process.env.JWT_SECRET) return null;
  
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(adminCookie, secret);
    
    if (payload.role !== "MASTER_ADMIN" && payload.role !== "PLATFORM_STAFF") {
      return null;
    }
    
    return payload as AdminJwtPayload;
  } catch {
    return null;
  }
}

/**
 * Checks if the current admin session has the required permission.
 * MASTER_ADMIN implicitly has all permissions.
 */
export async function requireAdminPermission(
  req: NextRequest, 
  requiredPermission: string
): Promise<AdminJwtPayload | null> {
  const payload = await verifyAdminJwt(req);
  if (!payload) return null;

  if (payload.role === "MASTER_ADMIN") {
    return payload;
  }

  if (payload.role === "PLATFORM_STAFF") {
    // Alias-aware: a role stored with the old `restaurants.manage` spelling
    // still satisfies a route asking for `tenants.update`. See
    // src/lib/platform-permissions.ts for why two vocabularies exist.
    if (!permissionsInclude(payload.permissions, requiredPermission)) return null;
    
    // Also check if account is active in DB to handle real-time revocation
    if (payload.staffId) {
       const staff = await db.platformStaff.findUnique({
          where: { id: payload.staffId },
          select: { isActive: true }
       });
       if (!staff || !staff.isActive) return null;
    }

    return payload;
  }

  return null;
}

/**
 * Gets tenant restrictions for the current platform staff.
 * Returns null if the user is MASTER_ADMIN (no restrictions).
 * Returns an array of restaurantIds if the user is restricted.
 */
export async function getAdminTenantScope(payload: AdminJwtPayload): Promise<string[] | null> {
  if (payload.role === "MASTER_ADMIN") return null;
  
  if (!payload.staffId) return [];

  const scopes = await db.platformStaffTenantScope.findMany({
    where: { platformStaffId: payload.staffId },
    select: { restaurantId: true }
  });

  return scopes.map(s => s.restaurantId);
}
