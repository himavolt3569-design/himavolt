import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { z } from "zod";
import { timingSafeEqual } from "crypto";

const adminLoginSchema = z.object({
  adminId: z.string().min(1).max(100),
  password: z.string().min(1).max(200),
});

/**
 * POST /api/admin/login
 * Verify master admin credentials and issue a signed JWT cookie.
 */
export async function POST(req: NextRequest) {
  const limit = await rateLimit(clientKey(req, "admin-login"), 15 * 60_000, 5);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
  }

  const parsed = adminLoginSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { adminId, password } = parsed.data;

  const expectedId = process.env.MASTER_ADMIN_ID;
  const expectedPassword = process.env.MASTER_ADMIN_PASSWORD;
  const jwtSecret = process.env.JWT_SECRET;

  if (!expectedId || !expectedPassword || !jwtSecret) {
    return NextResponse.json(
      { error: "Admin credentials not configured on server" },
      { status: 500 },
    );
  }

  // Constant-time comparison prevents timing-based credential enumeration.
  const idMatch = timingSafeEqual(Buffer.from(adminId), Buffer.from(expectedId));
  const pwMatch = timingSafeEqual(Buffer.from(password), Buffer.from(expectedPassword));
  if (!idMatch || !pwMatch) {
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
