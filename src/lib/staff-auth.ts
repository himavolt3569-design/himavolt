import { NextRequest } from "next/server";
import { jwtVerify } from "jose";

/**
 * Shared staff session helper used by API routes.
 *
 * IMPORTANT: Never fall back to a default secret — if JWT_SECRET is
 * unset the verification will fail, which is the safe default.
 */

function getSecret() {
  const raw = process.env.JWT_SECRET;
  if (!raw) {
    console.warn("[Auth] JWT_SECRET env var is not set — staff auth will fail");
    return null;
  }
  return new TextEncoder().encode(raw);
}

export interface StaffPayload {
  staffId: string;
  restaurantId: string;
  role: string;
}

export async function getStaffSession(
  req: NextRequest,
): Promise<StaffPayload | null> {
  const token = req.cookies.get("staff_session")?.value;
  if (!token) return null;

  const secret = getSecret();
  if (!secret) return null;

  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as StaffPayload;
  } catch {
    return null;
  }
}

/**
 * Verify the staff member belongs to the given restaurant.
 * Returns the payload on success, null on failure.
 */
export async function requireStaffForRestaurant(
  req: NextRequest,
  restaurantId: string,
): Promise<StaffPayload | null> {
  const session = await getStaffSession(req);
  if (!session) return null;
  if (session.restaurantId !== restaurantId) return null;
  return session;
}
