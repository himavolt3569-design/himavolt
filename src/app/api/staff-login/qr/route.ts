import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SignJWT } from "jose";
import { safeHandler } from "@/lib/api-helpers";
import { logAudit, getClientIp } from "@/lib/audit";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { checkStaffShift, shiftReasonToMessage } from "@/lib/staff-shifts";
import { z } from "zod";

const qrLoginSchema = z.object({
  qrToken: z.string().trim().min(10, "Invalid badge"),
});

function getJwtSecret() {
  const raw = process.env.JWT_SECRET;
  if (!raw) throw new Error("JWT_SECRET environment variable is not configured");
  return new TextEncoder().encode(raw);
}

// Scan-to-login: the QR badge encodes a URL with this token. Mirrors
// POST /api/staff-login (rate limit, shift gate, JWT shape, cookie, audit)
// but authenticates via the opaque qrToken instead of restaurantCode+PIN.
export const POST = safeHandler(
  async (req, { body }) => {
    const limit = await rateLimit(clientKey(req, "staff-login-qr"), 15 * 60_000, 10);
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many attempts. Try again later." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
      );
    }

    const { qrToken } = body;
    const INVALID_MSG = "Invalid or expired badge";

    const staffMember = await db.staffMember.findFirst({
      where: { qrToken, isActive: true },
      include: { user: true, restaurant: true },
    });

    if (!staffMember) {
      return NextResponse.json({ error: INVALID_MSG }, { status: 401 });
    }

    const shiftCheck = await checkStaffShift({
      id: staffMember.id,
      staffType: staffMember.staffType,
      role: staffMember.role,
      restaurantId: staffMember.restaurantId,
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

    const token = await new SignJWT({
      userId: staffMember.userId,
      staffId: staffMember.id,
      restaurantId: staffMember.restaurantId,
      role: staffMember.role,
      name: staffMember.user.name,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(getJwtSecret());

    const response = NextResponse.json({
      success: true,
      role: staffMember.role,
    });
    response.cookies.set({
      name: "staff_session",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24,
      path: "/",
      sameSite: "lax",
    });

    logAudit({
      action: "STAFF_LOGIN",
      entity: "StaffMember",
      entityId: staffMember.id,
      detail: `${staffMember.user.name} (${staffMember.role}) logged in via QR badge`,
      metadata: { role: staffMember.role, restaurantName: staffMember.restaurant.name, method: "qr" },
      userId: staffMember.userId,
      restaurantId: staffMember.restaurantId,
      ipAddress: getClientIp(req.headers),
    });

    return response;
  },
  { schema: qrLoginSchema },
);
