import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { z } from "zod";
import { createHash, timingSafeEqual } from "crypto";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
// Retained for the MFA block further down, which is deliberately commented out
// ("TEMPORARILY DISABLED" — see the PLATFORM_STAFF branch). Deleting these would
// silently break re-enabling MFA.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { generateSecret, generateURI, verifySync } from "otplib";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import QRCode from "qrcode";

const adminLoginSchema = z.object({
  adminId: z.string().min(1).max(100),
  password: z.string().min(1).max(200),
  mfaCode: z.string().optional(),
});

/**
 * Constant pause before answering a failed attempt.
 *
 * The master admin is exempt from the lockout below, which means the lockout no
 * longer slows a brute-force of that one credential: a caller can tell a correct
 * guess (200) from a wrong one (429) and keep going. This delay is what keeps
 * guessing expensive instead — imperceptible to someone typing a password,
 * ruinous to a script making thousands of attempts. It is applied to every
 * failure so it leaks nothing about which half was wrong.
 */
const FAILED_ATTEMPT_DELAY_MS = 300;

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * POST /api/admin/login
 * Verify master admin credentials and issue a signed JWT cookie.
 */
export async function POST(req: NextRequest) {
  // Parsed before any rate limiting, because whether the limiter applies at all
  // now depends on who is calling — see the master-admin exemption below.
  const parsed = adminLoginSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  // `mfaCode` is accepted and validated by the schema but currently unused —
  // the MFA verification block below is commented out.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  const isMasterAdmin = idMatch && pwMatch;

  // The master admin is never locked out. It is the platform's root account and
  // there is exactly one of it: locking it out locks the operator out of their
  // own product, with no second account to recover through. Everyone else —
  // platform staff, and every wrong credential — still gets 5 attempts per 15
  // minutes. Note this deliberately trades away the lockout's value as a
  // brute-force control on the master password; `FAILED_ATTEMPT_DELAY_MS` is
  // what stands in for it.
  if (!isMasterAdmin) {
    const limit = await rateLimit(clientKey(req, "admin-login"), 15 * 60_000, 5);
    if (!limit.ok) {
      await pause(FAILED_ATTEMPT_DELAY_MS);
      return NextResponse.json(
        { error: "Too many attempts. Try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(limit.retryAfterSeconds) },
        },
      );
    }
  }

  let role: "MASTER_ADMIN" | "PLATFORM_STAFF" = "MASTER_ADMIN";
  let staffId: string | undefined = undefined;
  let permissions: string[] | undefined = undefined;

  if (isMasterAdmin) {
    // Master Admin logged in.
    role = "MASTER_ADMIN";
  } else {
    // Try Platform Staff DB Login
    const staff = await db.platformStaff.findUnique({
      where: { email: adminId },
      include: { role: true },
    });

    if (!staff || !staff.isActive || !bcrypt.compareSync(password, staff.passwordHash)) {
      await pause(FAILED_ATTEMPT_DELAY_MS);
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
