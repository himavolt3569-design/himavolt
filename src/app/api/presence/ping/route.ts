import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { randomBytes } from "crypto";
import { getAuthUser } from "@/lib/auth";
import { getStaffSession } from "@/lib/staff-auth";
import { recordPresence, type PresenceScope } from "@/lib/presence";
import { rateLimit, clientKey } from "@/lib/rate-limit";

const PRESENCE_COOKIE = "presence_id";

function newAnonId(): string {
  return randomBytes(16).toString("hex");
}

/**
 * POST /api/presence/ping
 *
 * Heartbeat the master-admin live-presence dashboard with. The server is the
 * source of truth for what scope this caller belongs to — clients can't claim
 * to be staff or an owner. Resolution order:
 *
 *   1. master_admin_session JWT (cookie)  → ADMIN
 *   2. staff_session JWT (cookie)         → STAFF
 *   3. Supabase user                      → OWNER (User.role = OWNER) or
 *                                            CUSTOMER (signed-in)
 *   4. Otherwise                          → CUSTOMER (anonymous, presence_id cookie)
 */
export async function POST(req: NextRequest) {
  // Rate-limit so a runaway tab can't spam thousands of pings/min.
  const limit = rateLimit(clientKey(req, "presence-ping"), 60_000, 30);
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many pings" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  let scope: PresenceScope = "CUSTOMER";
  let key = "";
  let signedIn = false;
  let restaurantId: string | undefined;
  const setAnonCookie = !req.cookies.get(PRESENCE_COOKIE)?.value;

  // 1. Master admin session
  const adminToken = req.cookies.get("master_admin_session")?.value;
  if (adminToken && process.env.JWT_SECRET) {
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      const { payload } = await jwtVerify(adminToken, secret);
      if (payload?.role === "MASTER_ADMIN") {
        scope = "ADMIN";
        key = "admin:master";
        signedIn = true;
      }
    } catch {
      // fall through to the next strategy
    }
  }

  // 2. Staff JWT (only if we didn't already match admin)
  if (!key) {
    const staff = await getStaffSession(req);
    if (staff) {
      scope = "STAFF";
      key = `staff:${staff.staffId}`;
      restaurantId = staff.restaurantId;
      signedIn = true;
    }
  }

  // 3. Signed-in Supabase user → role lookup against the User table
  if (!key) {
    try {
      const user = await getAuthUser();
      if (user) {
        scope = user.role === "OWNER" || user.role === "ADMIN" ? "OWNER" : "CUSTOMER";
        key = `user:${user.id}`;
        signedIn = true;
      }
    } catch {
      // ignore — fall through to anonymous
    }
  }

  // 4. Anonymous visitor — stable presence_id cookie so refreshes don't
  // double-count. The cookie is server-issued and HttpOnly, so the client
  // can't fabricate one.
  let issuedAnonId: string | null = null;
  if (!key) {
    let anonId = req.cookies.get(PRESENCE_COOKIE)?.value;
    if (!anonId || !/^[a-f0-9]{32}$/.test(anonId)) {
      anonId = newAnonId();
      issuedAnonId = anonId;
    }
    scope = "CUSTOMER";
    key = `anon:${anonId}`;
    signedIn = false;
  }

  recordPresence(key, scope, { signedIn, restaurantId });

  const res = NextResponse.json({ ok: true, scope });

  if (issuedAnonId || setAnonCookie) {
    const value =
      issuedAnonId ?? req.cookies.get(PRESENCE_COOKIE)?.value ?? newAnonId();
    res.cookies.set({
      name: PRESENCE_COOKIE,
      value,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year — cookie is just an identifier, not auth
    });
  }

  return res;
}
