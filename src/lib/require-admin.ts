import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { db } from "./db";
import { permissionsInclude } from "./platform-permissions";

/**
 * Require a valid platform admin session, optionally carrying a specific
 * permission.
 *
 * `requireAdmin()` with no argument accepts **any** admin session — including a
 * PLATFORM_STAFF account with the narrowest possible role. That was how every
 * route in this folder was guarded, which meant a "read-only support" role could
 * delete payments, settle hardware commission and rewrite the payment gateway
 * credentials. Pass the permission the route actually represents; the ids come
 * from `src/lib/platform-permissions.ts`, which the role builder renders from,
 * so the two cannot drift.
 *
 * MASTER_ADMIN always passes — it is the platform's root account.
 */
export async function requireAdmin(permission?: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get("master_admin_session")?.value;
  const jwtSecret = process.env.JWT_SECRET;

  if (!token || !jwtSecret) return null;

  try {
    const secret = new TextEncoder().encode(jwtSecret);
    const { payload } = await jwtVerify(token, secret);

    if (payload.role !== "MASTER_ADMIN" && payload.role !== "PLATFORM_STAFF") return null;

    const id = (payload.staffId as string) || "master_admin";

    if (payload.role === "PLATFORM_STAFF") {
      if (permission) {
        const granted = payload.permissions as string[] | undefined;
        // Alias-aware, so a role stored with a legacy spelling still resolves.
        if (!permissionsInclude(granted, permission)) return null;
      }

      // Deactivating a platform account takes effect now, not whenever their
      // 12h token happens to expire.
      if (payload.staffId) {
        const staff = await db.platformStaff.findUnique({
          where: { id: payload.staffId as string },
          select: { isActive: true },
        });
        if (!staff?.isActive) return null;
      }
    }

    return {
      role: payload.role as "MASTER_ADMIN" | "PLATFORM_STAFF",
      id,
    };
  } catch {
    return null;
  }
}
