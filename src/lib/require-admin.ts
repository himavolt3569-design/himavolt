import { getAuthUser } from "./auth";

/**
 * Require that the current user has the ADMIN role.
 * Returns the user if authorized, or null otherwise.
 */
export async function requireAdmin() {
  const user = await getAuthUser();
  if (!user || user.role !== "ADMIN") return null;
  return user;
}
