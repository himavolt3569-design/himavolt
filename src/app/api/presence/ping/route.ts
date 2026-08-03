import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { randomBytes } from "crypto";
import { getAuthUser } from "@/lib/auth";
import { getStaffSession } from "@/lib/staff-auth";
import { recordPresence, type PresenceScope, type PresenceIdentity } from "@/lib/presence";
import { rateLimit, clientKey } from "@/lib/rate-limit";

const PRESENCE_COOKIE = "presence_id";

function newAnonId(): string {
  return randomBytes(16).toString("hex");
}

/** Approximate location tagged on the request by the Vercel edge network. */
function readGeo(req: NextRequest): { city?: string; country?: string } {
  const rawCity = req.headers.get("x-vercel-ip-city");
  const country = req.headers.get("x-vercel-ip-country") || undefined;
  let city: string | undefined;
  if (rawCity) {
    try {
      city = decodeURIComponent(rawCity);
    } catch {
      city = rawCity;
    }
  }
  return { city, country: country || undefined };
}

/** Turn a role enum into a short human label for the live view. */
function roleLabel(role: string): string {
  const r = role.toUpperCase();
  if (r === "OWNER") return "Owner";
  if (r === "ADMIN") return "Admin";
  if (r === "CUSTOMER") return "Customer";
  // Staff roles come through in various casings, e.g. SUPER_ADMIN.
  return r
    .toLowerCase()
    .split("_")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

/**
 * POST /api/presence/ping
 *
 * Heartbeat the master-admin live-presence view. The server is the source of
 * truth for what scope this caller belongs to — clients can't claim to be staff
 * or an owner. Resolution order:
 *
 *   1. master_admin_session JWT (cookie)  → ADMIN
 *   2. staff_session JWT (cookie)         → STAFF
 *   3. Supabase user                      → OWNER (User.role = OWNER/ADMIN) or
 *                                            CUSTOMER (signed-in)
 *   4. Otherwise                          → CUSTOMER (anonymous, presence_id cookie)
 *
 * The client sends the current pathname in the body so the admin can see which
 * page each person is on. Identity fields are ephemeral (5-min TTL) and only
 * feed the live view — nothing is persisted.
 */
export async function POST(req: NextRequest) {
  // Rate-limit so a runaway tab can't spam thousands of pings/min.
  const limit = await rateLimit(clientKey(req, "presence-ping"), 60_000, 30);
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many pings" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  // Current page pathname (query stripped, length-capped) — best-effort.
  let path: string | undefined;
  try {
    const body = await req.json();
    if (body && typeof body.path === "string") {
      path = body.path.split("?")[0].slice(0, 200);
    }
  } catch {
    // no/invalid body — path stays undefined
  }

  const geo = readGeo(req);

  let scope: PresenceScope = "CUSTOMER";
  let key = "";
  let signedIn = false;
  const identity: PresenceIdentity = { ...geo, path };
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
        identity.id = "master_admin";
        identity.name = "Master Admin";
        identity.roleLabel = "Master Admin";
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
      signedIn = true;
      identity.id = staff.staffId;
      identity.userId = staff.userId || undefined;
      identity.name = staff.name;
      identity.roleLabel = roleLabel(staff.role);
      identity.restaurantId = staff.restaurantId;
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
        identity.id = user.id;
        identity.name = user.name;
        identity.email = user.email;
        identity.phone = user.phone ?? undefined;
        identity.imageUrl = user.imageUrl ?? undefined;
        identity.roleLabel = roleLabel(user.role);
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
    identity.id = anonId;
    identity.roleLabel = "Guest";
  }

  await recordPresence(key, scope, { signedIn, ...identity });

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
