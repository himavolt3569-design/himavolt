import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";

/**
 * POST /api/admin/login
 * Verify master admin credentials and issue a signed JWT cookie.
 */
export async function POST(req: NextRequest) {
  const { adminId, password } = await req.json();

  const expectedId = process.env.MASTER_ADMIN_ID;
  const expectedPassword = process.env.MASTER_ADMIN_PASSWORD;
  const jwtSecret = process.env.JWT_SECRET;

  if (!expectedId || !expectedPassword || !jwtSecret) {
    return NextResponse.json(
      { error: "Admin credentials not configured on server" },
      { status: 500 },
    );
  }

  if (adminId !== expectedId || password !== expectedPassword) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // Issue a JWT valid for 12 hours
  const secret = new TextEncoder().encode(jwtSecret);
  const token = await new SignJWT({ role: "MASTER_ADMIN", iat: Date.now() })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret);

  const res = NextResponse.json({ success: true });

  res.cookies.set("master_admin_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 12 * 60 * 60, // 12 hours
  });

  return res;
}
