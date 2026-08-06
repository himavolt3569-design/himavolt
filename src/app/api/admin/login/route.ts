import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { z } from "zod";
import { createHash, timingSafeEqual } from "crypto";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { generateSecret, generateURI, verifySync } from "otplib";
import QRCode from "qrcode";

const adminLoginSchema = z.object({
  adminId: z.string().min(1).max(100),
  password: z.string().min(1).max(200),
  mfaCode: z.string().optional(),
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
  const { adminId, password, mfaCode } = parsed.data;

  const expectedId = process.env.MASTER_ADMIN_ID;
  const expectedPassword = process.env.MASTER_ADMIN_PASSWORD;
  const jwtSecret = process.env.JWT_SECRET;

  if (!expectedId || !expectedPassword || !jwtSecret) {
    return NextResponse.json(
      { error: "Admin credentials not configured on server" },
      { status: 500 },
    );
  }

  const digest = (s: string) => createHash("sha256").update(s).digest();
  const idMatch = timingSafeEqual(digest(adminId), digest(expectedId));
  const pwMatch = timingSafeEqual(digest(password), digest(expectedPassword));

  let role: "MASTER_ADMIN" | "PLATFORM_STAFF" = "MASTER_ADMIN";
  let staffId: string | undefined = undefined;
  let permissions: string[] | undefined = undefined;

  if (idMatch && pwMatch) {
    // Master Admin logged in.
    role = "MASTER_ADMIN";
  } else {
    // Try Platform Staff DB Login
    const staff = await db.platformStaff.findUnique({
      where: { email: adminId },
      include: { role: true },
    });

    if (!staff || !staff.isActive || !bcrypt.compareSync(password, staff.passwordHash)) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Passwords match
    // TEMPORARILY DISABLED: MFA is made optional/bypassed for now to allow seamless QR/Password logins.
    /*
    if (!staff.mfaEnabled) {
      if (mfaCode) {
        // Setup confirmation
        const isValid = verifySync({ token: mfaCode, secret: staff.mfaSecret! });
        if (!isValid) return NextResponse.json({ error: "Invalid MFA code" }, { status: 401 });
        // Enable MFA
        await db.platformStaff.update({
          where: { id: staff.id },
          data: { mfaEnabled: true }
        });
      } else {
        // Init Setup
        let secret = staff.mfaSecret;
        if (!secret) {
          secret = generateSecret();
          await db.platformStaff.update({
            where: { id: staff.id },
            data: { mfaSecret: secret }
          });
        }
        const otpauthUrl = generateURI({ label: staff.email, issuer: "HimalHub", secret });
        const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);
        return NextResponse.json({ 
          mfaSetupRequired: true, 
          qrCodeUrl,
          secret
        });
      }
    } else {
      // MFA Enabled, verify code
      if (!mfaCode) {
        return NextResponse.json({ mfaRequired: true });
      }
      const isValid = verifySync({ token: mfaCode, secret: staff.mfaSecret! });
      if (!isValid) return NextResponse.json({ error: "Invalid MFA code" }, { status: 401 });
    }
    */

    // Success
    role = "PLATFORM_STAFF";
    staffId = staff.id;
    permissions = staff.role.permissions;

    // Log the login for Master Admin transparency
    await db.auditLog.create({
      data: {
        action: "STAFF_LOGIN",
        entity: "PlatformStaff",
        entityId: staff.id,
        platformStaffId: staff.id,
        detail: `Platform Staff ${staff.name} logged in.`,
        ipAddress: req.headers.get("x-forwarded-for") || null,
      }
    });
  }

  // Issue a JWT valid for 12 hours
  const secret = new TextEncoder().encode(jwtSecret);
  const token = await new SignJWT({ role, staffId, permissions, iat: Date.now() })
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
