import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SignJWT } from "jose";
import { safeHandler } from "@/lib/api-helpers";
import { staffLoginSchema } from "@/lib/validations";
import { logAudit, getClientIp } from "@/lib/audit";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { checkStaffShift, shiftReasonToMessage } from "@/lib/staff-shifts";
import { verifyPin } from "@/lib/pin";

function getJwtSecret() {
  const raw = process.env.JWT_SECRET;
  if (!raw)
    throw new Error("JWT_SECRET environment variable is not configured");
  return new TextEncoder().encode(raw);
}

export const POST = safeHandler(
  async (_req, { body }) => {
    const limit = rateLimit(clientKey(_req, "staff-login"), 15 * 60_000, 10);
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many attempts. Try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(limit.retryAfterSeconds) },
        },
      );
    }

    const { restaurantCode, pin, rememberMe } = body;

    const INVALID_CREDENTIALS_MSG = "Invalid Restaurant Code or PIN";

    // 1. Find Restaurant by code
    const restaurant = await db.restaurant.findUnique({
      where: { restaurantCode },
      include: {
        staff: {
          where: { isActive: true },
          include: { user: true },
        },
      },
    });

    if (!restaurant) {
      return NextResponse.json(
        { error: INVALID_CREDENTIALS_MSG },
        { status: 401 },
      );
    }

    // 2. Verify PIN against each active staff member (hashed or legacy plaintext)
    let staffMember = null;
    for (const member of restaurant.staff) {
      if (await verifyPin(pin, member.pin)) {
        staffMember = member;
        break;
      }
    }
    if (!staffMember) {
      return NextResponse.json(
        { error: INVALID_CREDENTIALS_MSG },
        { status: 401 },
      );
    }

    // 1b. Shift gate — SHIFT_BASED staff only get in during their window.
    const shiftCheck = await checkStaffShift({
      id: staffMember.id,
      staffType: staffMember.staffType,
      role: staffMember.role,
      restaurantId: restaurant.id,
    });

    if (!shiftCheck.allowed) {
      return NextResponse.json(
        {
          error: shiftReasonToMessage(shiftCheck.reason),
          reason: shiftCheck.reason,
          nextShiftStartsAt: shiftCheck.nextShiftStartsAt?.toISOString(),
        },
        { status: 403 },
      );
    }

    // 2. Generate JWT
    const jwtExpiry = rememberMe ? "30d" : "24h";
    const cookieMaxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24;
    const token = await new SignJWT({
      userId: staffMember.userId,
      staffId: staffMember.id,
      restaurantId: restaurant.id,
      role: staffMember.role,
      name: staffMember.user.name,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(jwtExpiry)
      .sign(getJwtSecret());

    // 3. Set HTTP-Only Cookie
    const response = NextResponse.json({
      success: true,
      role: staffMember.role,
    });
    response.cookies.set({
      name: "staff_session",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: cookieMaxAge,
      path: "/",
      sameSite: "lax",
    });

    logAudit({
      action: "STAFF_LOGIN",
      entity: "StaffMember",
      entityId: staffMember.id,
      detail: `${staffMember.user.name} (${staffMember.role}) logged in`,
      metadata: { role: staffMember.role, restaurantName: restaurant.name },
      userId: staffMember.userId,
      restaurantId: restaurant.id,
      ipAddress: getClientIp(_req.headers),
    });

    return response;
  },
  { schema: staffLoginSchema },
);
