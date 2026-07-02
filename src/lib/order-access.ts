import { NextRequest, NextResponse } from "next/server";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { getOrCreateUser } from "@/lib/auth";
import { getStaffSession } from "@/lib/staff-auth";
import { db } from "@/lib/db";

/**
 * Per-order track tokens. The token is HMAC(orderId) using the JWT_SECRET, so
 * we don't need a DB column to store it — we can recompute and verify any
 * cookie value the client returns. Guests who placed an order get the cookie
 * set on the POST response and use it to read /track, /bill, /cancel, etc.
 *
 * For authenticated users we also accept the user's session, and for staff
 * we accept the staff JWT — those paths bypass the cookie check.
 */

function getSecret(): Buffer | null {
  const raw = process.env.JWT_SECRET;
  if (!raw) return null;
  return Buffer.from(raw, "utf8");
}

export function makeOrderTrackToken(orderId: string): string | null {
  const secret = getSecret();
  if (!secret) return null;
  return createHmac("sha256", secret).update(orderId).digest("hex");
}

export function trackCookieName(orderId: string): string {
  return `track_${orderId}`;
}

/** Apply Set-Cookie on a response so the caller can read this order later. */
export function setOrderTrackCookie(
  res: NextResponse,
  orderId: string,
): void {
  const token = makeOrderTrackToken(orderId);
  if (!token) return;
  res.cookies.set({
    name: trackCookieName(orderId),
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 24h — enough to track + cancel + bill the order
  });
}

interface OrderContext {
  id: string;
  userId: string | null;
  restaurantId: string;
}

/**
 * Returns true if the request is authorised to read/modify the given order.
 * Cheap helper — accepts:
 *   - the order's owning user (signed-in customer)
 *   - a staff session bound to the order's restaurant
 *   - a track-cookie matching HMAC(orderId)  (guest path, set by order POST)
 */
export async function canAccessOrder(
  req: NextRequest,
  order: OrderContext,
): Promise<boolean> {
  // Staff session for the same restaurant — fastest path, avoid the DB lookup
  // in getOrCreateUser when staff are calling these routes.
  const staff = await getStaffSession(req);
  if (staff && staff.restaurantId === order.restaurantId) return true;

  // Authenticated owner of the order or restaurant owner
  try {
    const user = await getOrCreateUser();
    if (user) {
      if (order.userId && user.id === order.userId) return true;
      
      const restaurant = await db.restaurant.findUnique({
        where: { id: order.restaurantId },
        select: { ownerId: true }
      });
      if (restaurant && restaurant.ownerId === user.id) return true;
    }
  } catch {
    // ignore — fall through to track-cookie check
  }

  // Track-cookie path (guests + people with their own freshly-placed order).
  const cookie = req.cookies.get(trackCookieName(order.id))?.value;
  if (!cookie) return false;
  const expected = makeOrderTrackToken(order.id);
  if (!expected) return false;

  // Constant-time compare on equal-length buffers; otherwise reject.
  const a = Buffer.from(cookie, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || a.length === 0) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Generate a random hex string. Used for one-off identifiers if needed. */
export function randomHex(bytes = 16): string {
  return randomBytes(bytes).toString("hex");
}
