import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logAudit, getClientIp } from "@/lib/audit";
import {
  requireAdminForRestaurant,
  adminActorLabel,
  TENANT_IMPERSONATE_PERMISSIONS,
} from "@/lib/admin-restaurant-guard";
import { verifyAdminJwt } from "@/lib/admin-auth";
import {
  IMPERSONATION_COOKIE,
  IMPERSONATION_UI_COOKIE,
  IMPERSONATION_TTL_SECONDS,
  signImpersonationToken,
  getImpersonationBanner,
  readImpersonation,
} from "@/lib/impersonation";

/**
 * Start / inspect / end a "manage this business as its owner" session.
 *
 * Both ends are audited deliberately. While a session is live the admin resolves
 * as the owner, so the audit rows written in between carry the owner's userId —
 * the start and stop rows are what make that window attributable.
 */

const COOKIE_BASE = {
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: IMPERSONATION_TTL_SECONDS,
};

/** GET — what the dashboard banner reads. */
export async function GET() {
  const banner = await getImpersonationBanner();
  return NextResponse.json(banner ?? { active: false }, {
    headers: { "Cache-Control": "no-store" },
  });
}

/** POST { restaurantId } — open the owner dashboard for that business. */
export async function POST(req: NextRequest) {
  const { restaurantId } = await req.json().catch(() => ({}));
  if (!restaurantId || typeof restaurantId !== "string") {
    return NextResponse.json({ error: "restaurantId is required" }, { status: 400 });
  }

  // Its own permission, not the one that covers editing a menu: for the length
  // of this session the holder acts as the owner, everywhere.
  const guard = await requireAdminForRestaurant(
    req,
    restaurantId,
    TENANT_IMPERSONATE_PERMISSIONS,
  );
  if ("response" in guard) return guard.response;

  // The owner identity must be usable, or the dashboard would load as a
  // signed-out shell with no explanation.
  const owner = await db.user.findUnique({
    where: { id: guard.restaurant.ownerId },
    select: { id: true, name: true, email: true, isDeleted: true, isBlacklisted: true },
  });
  if (!owner || owner.isDeleted) {
    return NextResponse.json(
      { error: "This business has no owner account to manage it as." },
      { status: 409 },
    );
  }
  if (owner.isBlacklisted) {
    return NextResponse.json(
      { error: "The owner account is blocked. Unblock it before managing this business." },
      { status: 409 },
    );
  }

  const adminId =
    guard.admin.role === "MASTER_ADMIN" ? "master_admin" : (guard.admin.staffId ?? "");
  if (!adminId) {
    return NextResponse.json({ error: "Admin identity missing" }, { status: 401 });
  }

  const token = await signImpersonationToken({
    restaurantId,
    adminId,
    adminRole: guard.admin.role,
  });

  logAudit({
    action: "ADMIN_IMPERSONATION_STARTED",
    entity: "Restaurant",
    entityId: restaurantId,
    detail: `Platform admin began managing "${guard.restaurant.name}" as owner ${owner.email ?? owner.id}`,
    metadata: {
      by: adminActorLabel(guard.admin),
      ownerId: owner.id,
      expiresInSeconds: IMPERSONATION_TTL_SECONDS,
    },
    restaurantId,
    ipAddress: getClientIp(req.headers),
  });

  const res = NextResponse.json({
    success: true,
    redirectTo: "/dashboard",
    restaurantId,
    restaurantName: guard.restaurant.name,
    expiresInSeconds: IMPERSONATION_TTL_SECONDS,
  });

  res.cookies.set(IMPERSONATION_COOKIE, token, { ...COOKIE_BASE, httpOnly: true });
  // Readable marker so the client knows to resolve an impersonated session
  // without every other visitor paying for an extra request. Carries no
  // authority of its own.
  res.cookies.set(IMPERSONATION_UI_COOKIE, "1", { ...COOKIE_BASE, httpOnly: false });

  return res;
}

/** DELETE — end the session and go back to being the admin. */
export async function DELETE(req: NextRequest) {
  const session = await readImpersonation();

  // Clearing must work even for an already-expired or unverifiable session —
  // an operator pressing "Exit" should never be stuck holding a stale cookie.
  const res = NextResponse.json({ success: true });
  res.cookies.set(IMPERSONATION_COOKIE, "", { ...COOKIE_BASE, httpOnly: true, maxAge: 0 });
  res.cookies.set(IMPERSONATION_UI_COOKIE, "", { ...COOKIE_BASE, httpOnly: false, maxAge: 0 });

  if (session) {
    const admin = await verifyAdminJwt(req);
    logAudit({
      action: "ADMIN_IMPERSONATION_ENDED",
      entity: "Restaurant",
      entityId: session.restaurantId,
      detail: `Platform admin stopped managing this business as its owner`,
      metadata: {
        by: admin ? adminActorLabel(admin) : session.adminId,
      },
      restaurantId: session.restaurantId,
      ipAddress: getClientIp(req.headers),
    });
  }

  return res;
}
