import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SignJWT } from "jose";
import { safeHandler } from "@/lib/api-helpers";
import { staffLoginSchema } from "@/lib/validations";
import { logAudit, getClientIp } from "@/lib/audit";

function getJwtSecret() {
  const raw = process.env.JWT_SECRET;
  if (!raw)
    throw new Error("JWT_SECRET environment variable is not configured");
  return new TextEncoder().encode(raw);
}

export const POST = safeHandler(
  async (_req, { body }) => {
    const { restaurantCode, pin } = body;

    // 1. Find Restaurant by code
    const restaurant = await db.restaurant.findUnique({
      where: { restaurantCode },
      include: {
        staff: {
          where: { pin, isActive: true },
          include: { user: true },
        },
      },
    });

    if (!restaurant) {
      return NextResponse.json(
        { error: "Invalid Restaurant Code" },
        { status: 401 },
      );
    }

    const staffMember = restaurant.staff[0];
    if (!staffMember) {
      return NextResponse.json(
        { error: "Invalid PIN or inactive account" },
        { status: 401 },
      );
    }

    // 2. Generate JWT
    const token = await new SignJWT({
      userId: staffMember.userId,
      staffId: staffMember.id,
      restaurantId: restaurant.id,
      role: staffMember.role,
      name: staffMember.user.name,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
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
      maxAge: 60 * 60 * 24, // 24 hours
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
