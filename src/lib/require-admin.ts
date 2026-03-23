import { cookies } from "next/headers";
import { jwtVerify } from "jose";

/**
 * Require a valid master admin session.
 * Returns { role: "MASTER_ADMIN" } if authorized, or null otherwise.
 */
export async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("master_admin_session")?.value;
  const jwtSecret = process.env.JWT_SECRET;

  if (!token || !jwtSecret) return null;

  try {
    const secret = new TextEncoder().encode(jwtSecret);
    const { payload } = await jwtVerify(token, secret);

    if (payload.role !== "MASTER_ADMIN") return null;

    return { role: "MASTER_ADMIN" as const, id: "master_admin" };
  } catch {
    return null;
  }
}
